import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { PDFDocument as PDFLib } from 'pdf-lib';

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
        const form = pdfDoc.getForm();

        // Helper to safely set fields
        const safeSet = (fieldName: string, value: string | number | boolean | undefined | null) => {
            if (value === undefined || value === null) return;
            try {
                const field = form.getField(fieldName);
                if (field) {
                    // Handle Checkboxes (if value is 'X', boolean true, or 'x')
                    if (field.constructor.name === 'PDFCheckBox') {
                        if (value === true || value === 'X' || value === 'x') {
                            form.getCheckBox(fieldName).check();
                        }
                    } else if (field.constructor.name === 'PDFTextField') {
                        // Handle Text Fields
                        form.getTextField(fieldName).setText(String(value));
                    } else if (field.constructor.name === 'PDFDropdown') {
                        // Handle Dropdowns (best effort select or text)
                        try {
                            form.getDropdown(fieldName).select(String(value));
                        } catch {
                            // If option doesn't exist, try setting as text if allowed, or ignore
                        }
                    }
                }
            } catch (err) {
                // Ignore missing fields
            }
        };

        // --- 1. TITULAR ---
        safeSet('titular_nombre', data.titularNombre);
        safeSet('titular_nif', data.titularNif);
        safeSet('titular_direccion', data.titularDireccion); // Assuming existing in data
        // safeSet('titular_cp', ...); 
        // safeSet('titular_municipio', ...);

        // --- 2. EMPLAZAMIENTO ---
        safeSet('emplazamiento_direccion', data.direccion);
        safeSet('emplazamiento_municipio', data.municipio);
        safeSet('emplazamiento_cp', data.cp);
        safeSet('emplazamiento_provincia', 'ALICANTE'); // Default or from data
        safeSet('emplazamiento_ref_catastral', data.refCatastral);

        // --- 3. USO ---
        // Example logic for checkboxes based on 'uso' field
        if (data.uso === 'VIVIENDA') safeSet('uso_vivienda', true);
        else if (data.uso === 'LOCAL') safeSet('uso_local', true);
        else if (data.uso === 'INDUSTRIAl') safeSet('uso_industrial', true);

        safeSet('superficie', data.superficie);
        safeSet('potencia_prevista', data.potenciaContracted); // or potenciaAdmisible
        safeSet('tension', data.tensionNominal); // e.g. "230" or "400"

        // --- 4. ACOMETIDA & LGA (Caja General Proteccion) ---
        // safeSet('cgp_esquema', data.cgpEsquema); 
        // safeSet('lga_nivel_aislamiento', ...);

        // --- 5. DERIVACIÓN INDIVIDUAL (DI) ---
        safeSet('di_tipo_cable', data.diMaterial); // Cobre/Alum
        safeSet('di_aislamiento', data.diAislamiento); // RZ1-K
        safeSet('di_seccion', data.diSeccion); // 10, 16, 25...
        safeSet('di_conductor_cpc', data.diCpc); // Si/No or section
        safeSet('di_longitud', data.diLongitud);

        // --- 6. PROTECCIONES (CGMP) ---
        if (data.cuadros && data.cuadros.length > 0) {
            const principal = data.cuadros[0];
            if (principal.mainBreaker) {
                safeSet('iga_intensidad', principal.mainBreaker.amperage);
                safeSet('iga_poder_corte', '6000'); // Standard household
                safeSet('iga_polos', principal.mainBreaker.poles);
            }

            // PCS (Sobretensiones)
            safeSet('pms_tipo', 'II'); // Standard
            safeSet('pms_intensidad_max', '15'); // kA default

            // Diferenciales (Summary of first one usually)
            if (principal.differentials && principal.differentials.length > 0) {
                const diff1 = principal.differentials[0];
                safeSet('id_intensidad', diff1.amperage);
                safeSet('id_sensibilidad', diff1.sensitivity);
            }
        }

        // --- 7. TIERRA ---
        safeSet('tierra_resistencia', data.tierraResistencia); // Ohms
        safeSet('tierra_aislamiento', data.aislamientoResistencia); // MOhms

        // --- MERGE GENERATED SCHEMATIC (ANEXO) ---
        // The MTD template usually has blank pages at the end or we append the unifilar
        // Here we just save the form data. The merging with the Schematic happens OUTSIDE calls usually,
        // or we append the schematic page here if 'schematicPath' is provided.

        form.flatten();
        const filledPdfBytes = await pdfDoc.save();

        // If we have a schematic PDF generated separately, merge it
        if (data.schematicPath && fs.existsSync(data.schematicPath)) {
            const finalDoc = await PDFLib.load(filledPdfBytes);

            const schematicBytes = fs.readFileSync(data.schematicPath);
            const schematicDoc = await PDFLib.load(schematicBytes);

            const schematicPages = await finalDoc.copyPages(schematicDoc, schematicDoc.getPageIndices());
            schematicPages.forEach((page) => finalDoc.addPage(page));

            const finalBytes = await finalDoc.save();
            fs.writeFileSync(outputPath, finalBytes);
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

export const generateSchematicPDF = async (data: any, outputPath: string) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 20, size: 'A3', layout: 'landscape' }); // A3 Landscape for more width
        const stream = fs.createWriteStream(outputPath);

        doc.pipe(stream);

        // Layout Constants
        const MARGIN = 40;
        const PAGE_WIDTH = 1190.55; // A3 Landscape
        const PAGE_HEIGHT = 841.89;
        const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);
        const HEADER_Y = 100; // IGA and Header line Y position
        const BUS_Y = 200;    // Main Horizontal Bus Y position
        const DIFF_Y = 250;   // Differentials Y position
        const CIRC_START_Y = 350; // Circuits start Y position

        const DIFF_SPACING = 120; // Width reserved per differential column

        let currentPage = 1;
        let diffIndex = 0; // Global index of differentials processed

        // --- FRAME & TITLE BLOCK ---
        const drawFrame = () => {
            doc.lineWidth(1).strokeColor('black');
            doc.rect(MARGIN, MARGIN, CONTENT_WIDTH, PAGE_HEIGHT - (MARGIN * 2)).stroke();

            // Title Block (Bottom Right)
            const boxW = 300, boxH = 100;
            const boxX = PAGE_WIDTH - MARGIN - boxW;
            const boxY = PAGE_HEIGHT - MARGIN - boxH;
            doc.rect(boxX, boxY, boxW, boxH).stroke();

            doc.font('Helvetica-Bold').fontSize(10).text('ESQUEMA UNIFILAR (S.T. Horizontal)', boxX + 10, boxY + 10);
            doc.font('Helvetica').fontSize(8).text(`TITULAR: ${data.clientName || ''}`, boxX + 10, boxY + 30);
            doc.text(`DIRECCIÓN: ${data.address || ''}`, boxX + 10, boxY + 45);
            doc.text(`Hoja ${currentPage}`, boxX + 250, boxY + 80);
        };

        // --- DRAWING LOGIC ---

        // Flatten all differentials from all cuadros (assuming single main cuadro for unifilar logic usually)
        // If multiple cuadros, we might need a super-bus or separate sheets. 
        // For this implementation, we take the first cuadro's components as the "General Panel".
        const mainCuadro = data.cuadros && data.cuadros[0] ? data.cuadros[0] : null;
        const differentials = mainCuadro ? (mainCuadro.differentials || []) : [];
        const mainBreaker = mainCuadro ? mainCuadro.mainBreaker : null;

        const drawPage = () => {
            drawFrame();

            // 1. Origin & IGA (Only on Page 1)
            let currentX = MARGIN + 50;

            if (currentPage === 1) {
                // Feed Line
                doc.lineWidth(2).strokeColor('black');
                doc.moveTo(MARGIN, HEADER_Y).lineTo(currentX, HEADER_Y).stroke();

                // IGA
                drawMagnetotermico(doc, currentX, HEADER_Y, 'IGA', mainBreaker?.amperage || 0, mainBreaker?.poles || 2);

                // Surge Protection (optional, draw next to IGA)
                drawSurgeProtection(doc, currentX + 40, HEADER_Y);

                // Line down to Bus
                doc.moveTo(currentX, HEADER_Y + 10).lineTo(currentX, BUS_Y).stroke();

                currentX += 80; // Advance X for first differential
            } else {
                // Continuity Arrow Incoming
                doc.lineWidth(2).strokeColor('black');
                // Arrow Head
                doc.moveTo(MARGIN + 10, BUS_Y - 5).lineTo(MARGIN + 20, BUS_Y).lineTo(MARGIN + 10, BUS_Y + 5).stroke();
                // Line
                doc.moveTo(MARGIN + 20, BUS_Y).lineTo(currentX, BUS_Y).stroke();

                // Continuity Label
                doc.font('Helvetica-Bold').fontSize(10).text(`${currentPage - 1}`, MARGIN + 5, BUS_Y - 15);
            }

            // 2. Draw Horizontal Bus & Differentials
            const startBusX = currentPage === 1 ? (MARGIN + 50) : (MARGIN + 20); // Connect back to IGA drop or Arrow

            // Loop through differentials until space runs out
            const maxPageX = PAGE_WIDTH - MARGIN - 50; // Leave space for outgoing arrow

            // Start iterating from where we left off
            let firstDiffOnPage = true;

            // Draw Main Bus Segment for this page (we'll extend it as we go)
            doc.lineWidth(3).strokeColor('black'); // Thicker bus
            const busStartX = startBusX;
            let busEndX = busStartX;

            while (diffIndex < differentials.length) {
                if (currentX + DIFF_SPACING > maxPageX) {
                    // Page Full -> Draw Outgoing Arrow and Break
                    doc.lineWidth(2).strokeColor('black');
                    doc.moveTo(busEndX, BUS_Y).lineTo(maxPageX, BUS_Y).stroke(); // Extend bus to edge
                    // Arrow
                    doc.moveTo(maxPageX, BUS_Y).lineTo(maxPageX + 10, BUS_Y - 5).stroke();
                    doc.moveTo(maxPageX, BUS_Y).lineTo(maxPageX + 10, BUS_Y + 5).stroke();
                    doc.moveTo(maxPageX, BUS_Y).lineTo(maxPageX + 10, BUS_Y).lineTo(maxPageX + 10, BUS_Y).stroke(); // just end line

                    doc.font('Helvetica-Bold').fontSize(10).text(`${currentPage}`, maxPageX + 5, BUS_Y - 15);

                    doc.addPage({ margin: 20, size: 'A3', layout: 'landscape' });
                    currentPage++;
                    drawPage(); // Recurse for next page
                    return; // Exit this function frame
                }

                // Draw Differential
                const diff = differentials[diffIndex];

                // Bus connection point

                // Draw drop line from Bus to Diff
                doc.lineWidth(1).strokeColor('black');
                doc.moveTo(currentX, BUS_Y).lineTo(currentX, DIFF_Y).stroke();

                // Differential Symbol
                drawDiferencial(doc, currentX, DIFF_Y, diff.name || `ID${diffIndex + 1}`, diff.amperage, diff.sensitivity, diff.poles);

                // Updated Bus End
                busEndX = currentX;

                // 3. Circuits (Vertical/Tree below Diff)
                const circuits = diff.circuits || [];
                let circY = CIRC_START_Y;

                circuits.forEach((circ: any, cIdx: number) => {
                    // Vertical line from Diff to Circuits
                    if (cIdx === 0) {
                        doc.moveTo(currentX, DIFF_Y + 15).lineTo(currentX, circY).stroke();
                    } else {
                        // Branching logic? Or just vertical stack?
                        // User image shows tree-like structure or vertical drops.
                        // Let's do a vertical drop with horizontal branches
                        doc.moveTo(currentX, circY - 30).lineTo(currentX, circY).stroke();
                    }

                    // Magnetothermic Symbol
                    drawMagnetotermico(doc, currentX, circY, circ.name || `C${cIdx + 1}`, circ.amperage, circ.poles);

                    // Circuit Text (Right side)
                    doc.font('Helvetica').fontSize(7).text(`${circ.description || ''} (${circ.section || '?'}mm²)`, currentX + 15, circY + 15, { width: 80 });

                    circY += 60; // Spacing for next circuit
                });

                currentX += DIFF_SPACING;
                diffIndex++;
            }

            // Finish Bus line for final page
            doc.lineWidth(3).strokeColor('black').moveTo(startBusX, BUS_Y).lineTo(busEndX + 20, BUS_Y).stroke();
        };

        // Start Drawing
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
