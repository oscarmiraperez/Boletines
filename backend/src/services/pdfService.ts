import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { PDFDocument as PDFLib, PDFDict, PDFName, PDFNumber, PDFBool } from 'pdf-lib';
import { generateUnifilarA3 } from '../utils/drawUnifilar';

// Helper to log debug messages to a file
const logDebug = (message: string) => {
    const logPath = path.join(process.cwd(), 'pdf_debug.log');
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`);
};

export const fillOfficialMTD = async (templatePath: string, data: any, outputPath: string) => {
    try {
        const existingPdfBytes = fs.readFileSync(templatePath);
        const pdfDoc = await PDFLib.load(existingPdfBytes);

        // --- WORKAROUND FOR RICH TEXT FIELDS CRASH ---
        // This is necessary because pdf-lib throws when trying to access fields with the RichText flag.
        // We strip the /RV (Rich Value) and /DS (Default Style) entries from all field dictionaries.
        const entries = pdfDoc.context.enumerateIndirectObjects();
        for (const [ref, obj] of entries) {
            if (obj instanceof PDFDict) {
                // Heuristic: objects with /T (Title) and /FT (Field Type) are form fields
                if (obj.has(PDFName.of('T')) && obj.has(PDFName.of('FT'))) {
                    obj.delete(PDFName.of('RV'));
                    obj.delete(PDFName.of('DS'));

                    // Also clear RichText flag (bit 26, index 25)
                    const ff = obj.get(PDFName.of('Ff'));
                    if (ff instanceof PDFNumber) {
                        const currentFlags = ff.asNumber();
                        const newFlags = currentFlags & ~(1 << 25);
                        obj.set(PDFName.of('Ff'), PDFNumber.of(newFlags));
                    }
                }
            }
        }

        const form = pdfDoc.getForm();

        // Helper to safely set fields
        const safeSet = (fieldName: string, value: string | number | boolean | undefined | null) => {
            if (value === undefined || value === null || value === '') return;
            try {
                const field = form.getField(fieldName);
                if (field) {
                    if (field.constructor.name === 'PDFCheckBox' || field instanceof form.getCheckBox(fieldName).constructor) {
                        if (value === true || value === 'X' || value === 'x' || String(value).toLowerCase() === 'true') {
                            form.getCheckBox(fieldName).check();
                        }
                    } else if (field.constructor.name === 'PDFTextField' || field instanceof form.getTextField(fieldName).constructor) {
                        form.getTextField(fieldName).setText(String(value));
                    }
                }
            } catch (err) {
                logDebug(`Error setting field ${fieldName}: ${err}`);
            }
        };

        const mtd = data.mtdData || {};

        // --- FIELD MAPPING (Using actual hierarchical names from F3610) ---

        // 1. TITULAR
        const p1 = 'form1[0].Pagina1[0].seccion\\.a[0]';
        safeSet(`${p1}.A_TIT_NOM[0]`, mtd.titularNombre || data.clientName);
        safeSet(`${p1}.A_TIT_DNI[0]`, mtd.titularNif || data.clientNif);
        safeSet(`${p1}.A_TIT_DOM[0]`, mtd.titularDireccion || data.address);
        safeSet(`${p1}.A_TIT_CP[0]`, data.postalCode);
        safeSet(`${p1}.A_TIT_LOC[0]`, data.municipality);
        safeSet(`${p1}.A_TIT_PRO[0]`, 'ALICANTE');

        // 2. EMPLAZAMIENTO
        const p1b = 'form1[0].Pagina1[0].seccion\\.b[0]';
        safeSet(`${p1b}.B_EMPL[0]`, mtd.direccion || data.address);
        safeSet(`${p1b}.B_LOC[0]`, data.municipality);
        safeSet(`${p1b}.B_CP[0]`, data.postalCode);
        safeSet(`${p1b}.B_PROV[0]`, 'ALICANTE');
        safeSet(`${p1b}.B_REFCAD[0]`, mtd.refCatastral);
        safeSet(`${p1b}.B_Uso[0]`, mtd.usoInstalacion || 'vivienda');
        safeSet(`${p1b}.B_Superficie[0]`, mtd.superficie);
        safeSet(`${p1b}.B_P_Instalada[0]`, mtd.potenciaPrevista || data.contractedPower);

        // 3. CAJA GENERAL PROTECCIÓN (CGP) & LGA
        const p1c = 'form1[0].Pagina1[0].seccion\\.c[0]';
        safeSet(`${p1c}.C_ENT[0]`, mtd.cgpEsquema); // Esquema CGP
        safeSet(`${p1c}.C_DIM[0]`, mtd.cgpIntensidad); // Intensidad fusibles

        // 4. DERIVACIÓN INDIVIDUAL (DI)
        safeSet(`${p1c}.C_CABL[0]`, mtd.diSeccion); // Sección en mm2
        safeSet(`${p1c}.C_SISTI[0]`, mtd.diAislamiento); // Tipo aislamiento (RZ1-K etc)
        safeSet(`${p1c}.C_INOM[0]`, mtd.diMaterial); // Cobre / Aluminio

        // 5. PROTECCIONES (CGMP)
        if (data.cuadros && data.cuadros.length > 0) {
            const principal = data.cuadros[0];
            if (principal.mainBreaker) {
                // We use C_INNOM for IGA if available, or related fields
                safeSet(`${p1c}.C_INNOM[0]`, principal.mainBreaker.amperage);
                safeSet(`${p1c}.C_EFEM[0]`, principal.mainBreaker.poles);
            }
        }

        // 6. TIERRA
        safeSet(`${p1c}.C_RESPT[0]`, mtd.tierraResistencia || data.verificaciones?.earthResistance);
        safeSet('tierra_aislamiento', data.aislamientoResistencia); // MOhms

        // --- MERGE GENERATED SCHEMATIC (ANEXO) ---
        // The MTD template usually has blank pages at the end or we append the unifilar
        // Here we just save the form data. The merging with the Schematic happens OUTSIDE calls usually,
        // or we append the schematic page here if 'schematicPath' is provided.

        // --- PREPARE FOR SAVING ---
        // Ensure the PDF generates appearances for fields that don't have them
        const catalog = pdfDoc.catalog;
        const acroForm = catalog.getOrCreateAcroForm();
        acroForm.dict.set(PDFName.of('NeedAppearances'), PDFBool.True);

        try {
            form.flatten();
        } catch (err) {
            logDebug(`Flattening failed, falling back to unflattened: ${err}`);
        }

        const filledPdfBytes = await pdfDoc.save();

        // Generate Schematic if not provided
        let schematicPdfPath = data.schematicPath;
        if (!schematicPdfPath) {
            const tempSchematicPath = path.join(path.dirname(outputPath), `temp_schematic_${Date.now()}.pdf`);
            await generateUnifilarA3(data, tempSchematicPath);
            schematicPdfPath = tempSchematicPath;
        }

        // Merge Schematic
        if (schematicPdfPath && fs.existsSync(schematicPdfPath)) {
            // Create a NEW document to avoid messing with the template's internal state too much
            const finalDoc = await PDFLib.create();

            // Load and copy MTD pages (only first 3, as F3610 is usually 3 pages + blank instructions)
            const mtdDoc = await PDFLib.load(filledPdfBytes);
            const mtdCount = mtdDoc.getPageCount();
            const pagesToKeep = Math.min(mtdCount, 3); // Official MTD is usually 3 pages
            const mtdPages = await finalDoc.copyPages(mtdDoc, Array.from({ length: pagesToKeep }, (_, i) => i));
            mtdPages.forEach(p => finalDoc.addPage(p));

            // Load and copy all schematic pages
            const schematicBytes = fs.readFileSync(schematicPdfPath);
            const schematicDoc = await PDFLib.load(schematicBytes);
            const schematicPages = await finalDoc.copyPages(schematicDoc, schematicDoc.getPageIndices());
            schematicPages.forEach((page) => finalDoc.addPage(page));

            const finalBytes = await finalDoc.save();
            fs.writeFileSync(outputPath, finalBytes);

            // Cleanup temp file
            if (schematicPdfPath.includes('temp_schematic')) {
                fs.unlinkSync(schematicPdfPath);
            }
        } else {
            fs.writeFileSync(outputPath, filledPdfBytes);
        }

        return outputPath;

    } catch (error) {
        logDebug(`Error in fillOfficialMTD: ${error}`);
        throw error;
    }
};

// --- SYMBOL DRAWING FUNCTIONS (UNE STANDARD) ---

const drawSymbolText = (doc: PDFKit.PDFDocument, text: string, x: number, y: number, size: number = 6, align: 'center' | 'left' | 'right' = 'center') => {
    doc.font('Helvetica').fontSize(size).fillColor('black').text(text, x - 20, y, { width: 40, align });
};

// Magnetothermic: Symbol with curve and square
const drawMagnetotermico = (doc: PDFKit.PDFDocument, x: number, y: number, label: string, amperage: number, poles: number) => {
    doc.save();
    doc.translate(x, y);

    // Line in
    doc.moveTo(0, -10).lineTo(0, -5).strokeColor('black').stroke();

    // Switch symbol
    doc.moveTo(0, -5).lineTo(5, 5).stroke(); // Blade
    doc.moveTo(0, 5).lineTo(0, 10).stroke(); // Line out

    // "X" for Automatic
    doc.moveTo(2, -2).lineTo(6, 2).stroke();
    doc.moveTo(6, -2).lineTo(2, 2).stroke();

    // Square (Thermal/Magnetic)
    doc.rect(2, -6, 6, 6).stroke();

    // Poles ticks
    if (poles > 1) {
        doc.moveTo(-2, -2).lineTo(2, 2).stroke(); // simplistic multipole indication
    }

    doc.restore();

    // Text details
    doc.font('Helvetica').fontSize(6).fillColor('black');
    if (label) doc.text(label, x + 5, y - 5);
    doc.text(`${amperage}A`, x + 5, y + 2);
};

// Differential: Oval shape
const drawDiferencial = (doc: PDFKit.PDFDocument, x: number, y: number, label: string, amperage: number, sensitivity: number, poles: number) => {
    doc.save();
    doc.translate(x, y);

    // Line in
    doc.moveTo(0, -10).lineTo(0, 0).strokeColor('black').stroke();
    // Line out
    doc.moveTo(0, 5).lineTo(0, 15).stroke();

    // Switch blade
    doc.moveTo(0, 0).lineTo(8, 8).stroke();

    // Toroid (Oval)
    doc.ellipse(0, 6, 8, 4).stroke();

    doc.restore();

    // Text
    doc.font('Helvetica').fontSize(6).fillColor('black');
    if (label) doc.text(label, x + 10, y - 5);
    doc.text(`ID ${amperage}A`, x + 10, y + 2);
    doc.text(`${sensitivity}mA`, x + 10, y + 8);
};

const drawSurgeProtection = (doc: PDFKit.PDFDocument, x: number, y: number) => {
    doc.save();
    doc.translate(x, y);
    // Line from bus
    doc.moveTo(0, -10).lineTo(0, 0).strokeColor('black').stroke();
    // Box
    doc.rect(-6, 0, 12, 12).stroke();
    // Varistor symbol
    doc.moveTo(-6, 0).lineTo(6, 12).stroke();
    // Ground
    doc.moveTo(0, 12).lineTo(0, 18).stroke();
    doc.moveTo(-4, 18).lineTo(4, 18).stroke();
    doc.moveTo(-2, 20).lineTo(2, 20).stroke();
    doc.restore();
    drawSymbolText(doc, 'Sobretens.', x, y + 22);
};

// --- NEW HORIZONTAL BUS ENGINE ---

// --- NEW HORIZONTAL BUS ENGINE (Tree Topology) ---

export const generateSchematicPDF = async (data: any, outputPath: string) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 20, size: 'A3', layout: 'landscape' }); // A3 Landscape
        const stream = fs.createWriteStream(outputPath);

        doc.pipe(stream);

        // Layout Constants
        const MARGIN = 40;
        const PAGE_WIDTH = 1190.55;
        const PAGE_HEIGHT = 841.89;
        const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);

        // Y Positions
        const HEADER_Y = 150;      // Origin/IGA height
        const MAIN_BUS_Y = 250;    // Main Horizontal Bus
        const DIFF_Y = 300;        // Differentials
        const SUB_BUS_Y = 400;     // Sub-buses for circuits (below Diffs)
        const CIRC_Y = 450;        // Circuits (Breakers)
        const CIRC_TEXT_Y = 520;   // Circuit Descriptions

        // Spacing
        const CIRCUIT_SPACING = 60; // Width of one circuit
        const MIN_DIFF_SPACING = 100; // Minimum width for a Diff block (if 0 or 1 circuit)

        let currentPage = 1;
        let diffIndex = 0;

        // --- FRAME & TITLE BLOCK ---
        const drawFrame = () => {
            doc.lineWidth(1).strokeColor('black');
            doc.rect(MARGIN, MARGIN, CONTENT_WIDTH, PAGE_HEIGHT - (MARGIN * 2)).stroke();

            // Title Block
            const boxW = 350, boxH = 100;
            const boxX = PAGE_WIDTH - MARGIN - boxW;
            const boxY = PAGE_HEIGHT - MARGIN - boxH;
            doc.rect(boxX, boxY, boxW, boxH).stroke();

            doc.font('Helvetica-Bold').fontSize(12).text('ESQUEMA UNIFILAR (Distribución Horizontal)', boxX + 15, boxY + 15);
            doc.font('Helvetica').fontSize(9).text(`TITULAR: ${data.clientName || 'Sin Nombre'}`, boxX + 15, boxY + 40);
            doc.text(`DIRECCIÓN: ${data.address || ''}`, boxX + 15, boxY + 55);
            doc.font('Helvetica-Bold').fontSize(10).text(`HOJA ${currentPage}`, boxX + 280, boxY + 75);
        };

        // --- DRAWING LOGIC ---

        const mainCuadro = data.cuadros && data.cuadros[0] ? data.cuadros[0] : null;
        const differentials = mainCuadro ? (mainCuadro.differentials || []) : [];
        const mainBreaker = mainCuadro ? mainCuadro.mainBreaker : null;

        const drawPage = () => {
            drawFrame();

            // 1. Origin & IGA (Page 1) or Continuity In (Page > 1)
            let currentX = MARGIN + 80; // Start X pointer

            if (currentPage === 1) {
                // Draw IGA Structure
                // Feed Line
                doc.lineWidth(2).strokeColor('black');
                doc.moveTo(MARGIN + 40, HEADER_Y).lineTo(currentX, HEADER_Y).stroke();

                // IGA Symbol
                drawMagnetotermico(doc, currentX, HEADER_Y, 'IGA', mainBreaker?.amperage || 0, mainBreaker?.poles || 2);

                // Surge Prot (Next to IGA)
                drawSurgeProtection(doc, currentX + 40, HEADER_Y);

                // Line down to Main Bus
                doc.lineWidth(2).moveTo(currentX, HEADER_Y + 15).lineTo(currentX, MAIN_BUS_Y).stroke();

                currentX += 60; // Move Cursor for first Diff
            } else {
                // Continuation Arrow In
                doc.lineWidth(3).strokeColor('black');
                // Arrow
                doc.moveTo(MARGIN + 20, MAIN_BUS_Y).lineTo(MARGIN + 50, MAIN_BUS_Y).stroke(); // Shaft
                doc.moveTo(MARGIN + 50, MAIN_BUS_Y).lineTo(MARGIN + 40, MAIN_BUS_Y - 5).stroke(); // Tip
                doc.moveTo(MARGIN + 50, MAIN_BUS_Y).lineTo(MARGIN + 40, MAIN_BUS_Y + 5).stroke();

                doc.font('Helvetica-Bold').fontSize(12).text(`VIENE DE HOJA ${currentPage - 1}`, MARGIN + 20, MAIN_BUS_Y - 20, { width: 100, align: 'center' });

                currentX = MARGIN + 80;
            }

            // 2. Main Bus & Differentials Loop
            // The Main Bus connects all Diffs.
            const startBusX = (currentPage === 1) ? (MARGIN + 80) : (MARGIN + 50);
            let busEndX = startBusX;

            doc.lineWidth(4).strokeColor('black'); // Heavy Main Bus
            // We draw the bus segment by segment or one long line at end. Let's track X.

            while (diffIndex < differentials.length) {
                const diff = differentials[diffIndex];
                const circuits = diff.circuits || [];
                const numCircs = Math.max(1, circuits.length); // At least takes space of 1

                // Calculate Block Width for this Diff Group
                const blockWidth = Math.max(MIN_DIFF_SPACING, numCircs * CIRCUIT_SPACING);

                // Check Bounds
                if (currentX + blockWidth > PAGE_WIDTH - MARGIN - 50) {
                    // Overflow -> Page Break
                    // Draw Outgoing Arrow
                    doc.lineWidth(3).strokeColor('black');
                    doc.moveTo(busEndX, MAIN_BUS_Y).lineTo(PAGE_WIDTH - MARGIN, MAIN_BUS_Y).stroke();
                    // Arrow Tip
                    doc.moveTo(PAGE_WIDTH - MARGIN, MAIN_BUS_Y).lineTo(PAGE_WIDTH - MARGIN - 10, MAIN_BUS_Y - 5).stroke();
                    doc.moveTo(PAGE_WIDTH - MARGIN, MAIN_BUS_Y).lineTo(PAGE_WIDTH - MARGIN - 10, MAIN_BUS_Y + 5).stroke();

                    doc.font('Helvetica-Bold').fontSize(10).text(`CONTINÚA EN HOJA ${currentPage + 1}`, PAGE_WIDTH - MARGIN - 150, MAIN_BUS_Y - 20);

                    doc.addPage({ margin: 20, size: 'A3', layout: 'landscape' });
                    currentPage++;
                    drawPage();
                    return;
                }

                // Draw Differential Block
                const midBlockX = currentX + (blockWidth / 2);

                // 1. Connection from Main Bus to Diff
                doc.lineWidth(1).strokeColor('black');
                doc.moveTo(midBlockX, MAIN_BUS_Y).lineTo(midBlockX, DIFF_Y).stroke();

                // 2. Differential Symbol
                drawDiferencial(doc, midBlockX, DIFF_Y, diff.name || `ID${diffIndex + 1}`, diff.amperage, diff.sensitivity, diff.poles);

                // 3. Line down to Sub-Bus
                doc.moveTo(midBlockX, DIFF_Y + 15).lineTo(midBlockX, SUB_BUS_Y).stroke();

                // 4. Sub-Bus (Horizontal)
                // Width of sub-bus = spanning from first circuit center to last circuit center
                if (circuits.length > 0) {
                    const firstCircX = currentX + (CIRCUIT_SPACING / 2);
                    const lastCircX = currentX + ((circuits.length - 1) * CIRCUIT_SPACING) + (CIRCUIT_SPACING / 2);

                    doc.lineWidth(2).strokeColor('black');
                    doc.moveTo(firstCircX, SUB_BUS_Y).lineTo(lastCircX, SUB_BUS_Y).stroke();

                    // 5. Circuits (Magnetothermals)
                    circuits.forEach((circ: any, cIdx: number) => {
                        const circX = currentX + (cIdx * CIRCUIT_SPACING) + (CIRCUIT_SPACING / 2);

                        // Drop from Sub-Bus
                        doc.lineWidth(1).strokeColor('black');
                        doc.moveTo(circX, SUB_BUS_Y).lineTo(circX, CIRC_Y).stroke();

                        // Breaker Symbol
                        drawMagnetotermico(doc, circX, CIRC_Y, circ.name || `C${cIdx + 1}`, circ.amperage, circ.poles);

                        // Line Out
                        doc.moveTo(circX, CIRC_Y + 15).lineTo(circX, CIRC_TEXT_Y - 5).stroke();

                        // Text Info
                        doc.font('Helvetica').fontSize(7);
                        doc.text(circ.description || 'Circuito', circX - 25, CIRC_TEXT_Y, { width: 50, align: 'center' });
                        doc.text(`${circ.section || '?'}mm²`, circX - 25, CIRC_TEXT_Y + 30, { width: 50, align: 'center' });
                    });
                } else {
                    // No circuits, just a stub?
                    doc.font('Helvetica-Oblique').fontSize(8).text("(Reserva)", midBlockX - 20, SUB_BUS_Y + 20);
                }

                // Advance X
                busEndX = currentX + blockWidth;
                currentX += blockWidth;
                diffIndex++;
            }

            // Finish Main Bus for this page (if not overflowed)
            doc.lineWidth(4).strokeColor('black');
            doc.moveTo(startBusX, MAIN_BUS_Y).lineTo(busEndX, MAIN_BUS_Y).stroke();
        };

        // Execution
        if (!mainCuadro) {
            drawFrame();
            doc.text("No hay cuadros definidos.", 100, 100);
        } else {
            drawPage();
        }

        doc.end();
        stream.on('finish', () => resolve(outputPath));
        stream.on('error', reject);
    });
};


export const generateAuthorizationPDF = async (data: any, outputPath: string) => {
    // ... (Keep existing generateAuthorizationPDF logic exactly as is or verified)
    // For safety, I'll paste the previous logic condensed to ensure it's not lost if the file is overwritten
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(outputPath);
        doc.pipe(stream);

        let logoPath = path.join(process.cwd(), 'assets/logo.png');
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 50, 45, { width: 100 });
        }
        doc.moveDown(4);
        doc.font('Helvetica-Bold').fontSize(16).text('AUTORIZACIÓN DE REPRESENTACIÓN', { align: 'center', underline: true });
        doc.moveDown(2);

        // Fixed Data
        const companyName = "Instalaciones y suministros eléctricos San Vicente S.L.";
        const companyCif = "B54653746";
        const repName = "Óscar Mira Pérez";
        const repDni = "48359179T";

        doc.font('Helvetica').fontSize(12).text(
            `D./Dña. ${data.clientName || '______________________'}, con NIF ${data.clientNif || '_____________'}, ` +
            `titular del suministro con CUPS ${data.cups || '______________________'} sito en ${data.address || '______________________'}.`,
            { align: 'justify', lineGap: 5 }
        );
        doc.moveDown(2);

        doc.text(
            `POR LA PRESENTE AUTORIZA a D. ${repName} con DNI ${repDni}, ` +
            `en representación de la empresa ${companyName} con CIF ${companyCif}, ` +
            `para que actúe en mi nombre y representación ante la compañía distribuidora y los organismos competentes para realizar los trámites correspondientes a la instalación eléctrica.`,
            { align: 'justify', lineGap: 5 }
        );

        doc.moveDown(2);
        const date = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
        doc.text(`En San Vicente del Raspeig, a ${date}.`, { align: 'right' });
        doc.moveDown(4);

        // Signatures
        const startY = doc.y;

        // Client Signature
        doc.text('Firma del titular:', 50, startY);

        // Rep Signature (Optional placeholder)
        doc.text('Firma del autorizado:', 300, startY);

        doc.moveDown();
        const signatureY = doc.y;

        // Draw boxes
        doc.rect(50, signatureY, 200, 100).stroke();
        doc.rect(300, signatureY, 200, 100).stroke();

        if (data.signaturePath && fs.existsSync(data.signaturePath)) {
            try {
                doc.image(data.signaturePath, 50, signatureY, { fit: [200, 100] });
            } catch (err) {
                // ignore
            }
        }

        // Handle DNI logic
        const isDniPdf = data.dniPath && data.dniPath.toLowerCase().endsWith('.pdf');

        if (data.dniPath && fs.existsSync(data.dniPath) && !isDniPdf) {
            doc.addPage();
            doc.image(data.dniPath, { fit: [500, 400], align: 'center' });
        }

        doc.end();
        stream.on('finish', () => resolve(outputPath));
        stream.on('error', reject);
    });
};
// --- MECHANISM PDF GENERATION ---

export const generateMechanismPDF = async (project: any, outputPath: string) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const stream = fs.createWriteStream(outputPath);

        doc.pipe(stream);

        // --- Helper: Draw Table Row ---
        const drawRow = (y: number, col1: string, col2: string, isHeader: boolean = false) => {
            doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica').fontSize(10);
            doc.text(col1, 50, y, { width: 300 });
            doc.text(col2, 350, y, { width: 100, align: 'right' });

            // Underline
            doc.lineWidth(0.5).moveTo(50, y + 15).lineTo(500, y + 15).strokeColor(isHeader ? 'black' : '#cccccc').stroke();
        };

        // --- 1. HEADER ---
        doc.font('Helvetica-Bold').fontSize(18).text(project.name, { align: 'center' });
        if (project.description) {
            doc.font('Helvetica').fontSize(12).text(project.description, { align: 'center' });
        }
        doc.moveDown(2);

        // --- 2. SUMMARY SECTION ---
        doc.font('Helvetica-Bold').fontSize(14).text('RESUMEN DE MATERIALES', { underline: true });
        doc.moveDown(1);

        // Calculate Totals
        const totals: Record<string, number> = {};
        project.rooms.forEach((room: any) => {
            room.items.forEach((item: any) => {
                if (item.quantity > 0) {
                    totals[item.name] = (totals[item.name] || 0) + item.quantity;
                }
            });
        });

        // Filter and Sort Totals
        // Sort by name for now, or use a predefined order if requested (but name is fine)
        const sortedKeys = Object.keys(totals).sort();

        let currentY = doc.y;

        // Table Header
        drawRow(currentY, 'Concepto', 'Cantidad', true);
        currentY += 25;

        sortedKeys.forEach(key => {
            if (currentY > 750) { // Page Break check
                doc.addPage();
                currentY = 50;
                drawRow(currentY, 'Concepto', 'Cantidad', true);
                currentY += 25;
            }
            drawRow(currentY, key, totals[key].toString());
            currentY += 20;
        });

        // --- 3. DETAILED SECTION (Room by Room) ---
        doc.addPage();
        doc.font('Helvetica-Bold').fontSize(14).text('DETALLE POR ESTANCIA', { underline: true });
        doc.moveDown(2);

        project.rooms.forEach((room: any) => {
            // Check if room has items
            const roomItems = room.items.filter((i: any) => i.quantity > 0);
            if (roomItems.length === 0) return;

            // Check space
            if (doc.y > 650) doc.addPage();

            // Room Header
            doc.font('Helvetica-Bold').fontSize(12).fillColor('#f59e0b').text(room.name);
            doc.fillColor('black');
            doc.moveDown(0.5);

            // Room Items
            roomItems.forEach((item: any) => {
                if (doc.y > 750) doc.addPage();

                doc.font('Helvetica').fontSize(10);
                // Bullet point style
                doc.text(`• ${item.name}: `, { continued: true });
                doc.font('Helvetica-Bold').text(`${item.quantity}`);
            });

            doc.moveDown(1.5);
        });

        doc.end();
        stream.on('finish', () => resolve(outputPath));
        stream.on('error', reject);
    });
};
