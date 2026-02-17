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

// Magnetotermico: Diagonal switch (line + X/half-arrow) + Semi-circle/Square for Thermal/Magnetic
function drawMagnetotermico(doc: PDFKit.PDFDocument, x: number, y: number, label: string, amperage: number, poles: number) {
    const size = 10;

    // Symbol Structure:
    // Line in
    // Switch (Diagonal)
    // Cross/Curve (Thermal/Magnetic)
    // Line out

    doc.save();
    doc.translate(x, y);

    // Vertical line (Circuit)
    doc.moveTo(0, -10).lineTo(0, 10).stroke();

    // Switch (Diagonal open) - UNE style: Line with a detached diagonal
    doc.moveTo(0, -5).lineTo(8, -12).stroke(); // The arm

    // "X" or ">" on the line usually denotes the breaker function
    // UNE 60617-7: Magnetothermal is often a switch + box or specific curve
    // Simplified Professional representation:
    // Box logic or Standard Symbol:
    // Switch: / 
    // Thermal: |> (half triangle)
    // Magnetic: \ (half cross)

    // Let's use a clear, standard symbol:
    // Contact
    doc.moveTo(-2, -5).lineTo(0, -5).stroke(); // Terminal

    // Protection (Square container or symbol on line)
    // We will draw the symbol "on top" of the line for clarity

    // Thermal (Semi-circle or Rectangle)
    doc.rect(-4, 0, 8, 8).stroke();
    // Magnetic (Semi-circle)
    doc.path('M -4 4 Q 0 0 4 4').stroke();

    doc.restore();

    // Labels: Always to the RIGHT of the component to avoid overlapping the line
    doc.font('Helvetica').fontSize(6).fillColor('black');
    if (label) {
        doc.text(label, x + 10, y - 8);
    }
    doc.text(`${amperage}A`, x + 10, y + 2);
    if (poles > 0) doc.text(`${poles}P`, x + 10, y + 8);
}

// Diferencial: Oval/Toroid with switch
function drawDiferencial(doc: PDFKit.PDFDocument, x: number, y: number, label: string, amperage: number, sensitivity: number, poles: number) {
    doc.save();
    doc.translate(x, y);

    // Vertical Line
    doc.moveTo(0, -10).lineTo(0, 10).stroke();

    // Switch arm
    doc.moveTo(0, -5).lineTo(8, -12).stroke();

    // Toroid (Oval) - The distinct feature of ID
    doc.ellipse(0, 5, 6, 3).stroke();

    // Link to switch (Dashed line typically, simplified here)
    doc.dash(1, { space: 1 });
    doc.moveTo(6, 5).lineTo(6, -8).stroke();
    doc.undash();

    doc.restore();

    // Labels
    doc.font('Helvetica').fontSize(6).fillColor('black');
    if (label) doc.text(label, x + 12, y - 10);
    doc.text(`ID ${amperage}A`, x + 12, y);
    doc.text(`${sensitivity}mA`, x + 12, y + 7);
}

// Sobretensiones (Surge): Two rectangles/varistors connected to ground
function drawSobretensiones(doc: PDFKit.PDFDocument, x: number, y: number) {
    doc.save();
    doc.translate(x, y);

    // Line from Phase
    doc.moveTo(0, -10).lineTo(0, -5).stroke();
    // Box (Varistor)
    doc.rect(-5, -5, 10, 10).stroke();
    // Diagonal in box (Varistor symbol)
    doc.moveTo(-5, -5).lineTo(5, 5).stroke();

    // Ground text
    doc.moveTo(0, 5).lineTo(0, 10).stroke();
    // Ground symbol lines
    doc.moveTo(-4, 10).lineTo(4, 10).stroke();
    doc.moveTo(-2, 12).lineTo(2, 12).stroke();
    doc.moveTo(-1, 14).lineTo(1, 14).stroke();

    doc.restore();

    doc.font('Helvetica').fontSize(6).text('PMS', x + 8, y - 3);
}


// --- MAIN GENERATION FUNCTION ---

export const generateSchematicPDF = async (data: any, outputPath: string) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 20, size: 'A4' }); // Small margin to maximize space
        const stream = fs.createWriteStream(outputPath);

        doc.pipe(stream);

        // Constants
        const PAGE_WIDTH = 595.28;
        const PAGE_HEIGHT = 841.89;
        const MARGIN = 40;
        const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);

        // Cajetín Area (Bottom Right)
        const CAJETIN_HEIGHT = 90;
        const CAJETIN_WIDTH = 240;
        const CAJETIN_X = PAGE_WIDTH - MARGIN - CAJETIN_WIDTH;
        const CAJETIN_Y = PAGE_HEIGHT - MARGIN - CAJETIN_HEIGHT;

        // Content Boundaries
        const MAX_Y = CAJETIN_Y - 30; // Leave buffer above cajetin
        const START_Y = 60;
        const START_X = MARGIN + 20;

        let currentY = START_Y;
        let currentPage = 1;

        // --- HELPER: FRAME & TITLE BLOCK ---
        const drawFrameAndTitle = () => {
            // Main Border
            doc.lineWidth(1).strokeColor('black');
            doc.rect(MARGIN, MARGIN, CONTENT_WIDTH, PAGE_HEIGHT - (MARGIN * 2)).stroke();

            // Title Block (Cajetín)
            doc.rect(CAJETIN_X, CAJETIN_Y, CAJETIN_WIDTH, CAJETIN_HEIGHT).fillAndStroke('white', 'black');

            // Cajetín Content
            const padding = 5;
            let textY = CAJETIN_Y + padding;

            doc.fillColor('black').font('Helvetica-Bold').fontSize(7);
            doc.text('EMPRESA INSTALADORA:', CAJETIN_X + padding, textY);
            doc.font('Helvetica').fontSize(9).text('INSTALACIONES Y SUMINISTROS ELÉCTRICOS SAN VICENTE', CAJETIN_X + padding, textY + 10);

            textY += 30;
            doc.font('Helvetica-Bold').fontSize(7).text('TITULAR:', CAJETIN_X + padding, textY);
            doc.font('Helvetica').fontSize(8).text(data.clientName || '', CAJETIN_X + 45, textY);

            textY += 15;
            doc.font('Helvetica-Bold').fontSize(7).text('EMPLAZAMIENTO:', CAJETIN_X + padding, textY);
            doc.font('Helvetica').fontSize(7).text(data.address || '', CAJETIN_X + padding, textY + 10, { width: CAJETIN_WIDTH - 10, height: 20, ellipsis: true });

            textY += 28;
            doc.font('Helvetica-Bold').fontSize(7).text('ESQUEMA UNIFILAR', CAJETIN_X + padding, textY);
            doc.text(`Pag. ${currentPage}`, CAJETIN_X + CAJETIN_WIDTH - 40, textY);
        };

        // Initialize First Page
        drawFrameAndTitle();
        doc.font('Helvetica-Bold').fontSize(14).text('ESQUEMA UNIFILAR', 0, MARGIN + 10, { align: 'center', width: PAGE_WIDTH });

        // --- DRAWING LOGIC ---

        if (!data.cuadros || data.cuadros.length === 0) {
            doc.text('No hay datos de cuadros eléctricos.', START_X, START_Y);
            doc.end();
            return;
        }

        // We assume "Cuadros" are sequential in the supply line for ease, or just list them.
        // For a proper unifilar, they usually follow a hierarchy. Here we list them vertically.

        data.cuadros.forEach((cuadro: any, cIdx: number) => {

            // Check Space for Cuadro Header + IGA
            if (currentY + 150 > MAX_Y) {
                // Continuation Arrow Bottom
                doc.font('Helvetica-Bold').fontSize(10).text(`Continúa en pág. ${currentPage + 1} ->`, START_X + 100, MAX_Y + 10);

                doc.addPage();
                currentPage++;
                drawFrameAndTitle();
                currentY = START_Y;

                // Continuation Arrow Top
                doc.font('Helvetica-Bold').fontSize(10).text(`<- Viene de pág. ${currentPage - 1}`, START_X + 100, MARGIN + 15);
                currentY += 20;
            }

            // Draw Cuadro Header
            doc.rect(START_X - 10, currentY, CONTENT_WIDTH - 20, 25).fillAndStroke('#f0f9ff', '#0ea5e9'); // Light blue header
            doc.fillColor('black').font('Helvetica-Bold').fontSize(11).text(`Cuadro: ${cuadro.name}`, START_X, currentY + 8);
            currentY += 50;

            // Draw IGA & Surge
            const HEADER_LINE_Y = currentY;
            const IGA_X = START_X + 20;
            const SURGE_X = START_X + 80;

            // Horizontal bus line
            doc.lineWidth(1.5).moveTo(START_X, HEADER_LINE_Y).lineTo(START_X + 150, HEADER_LINE_Y).stroke();

            // IGA
            if (cuadro.mainBreaker) {
                drawMagnetotermico(doc, IGA_X, HEADER_LINE_Y, 'IGA', cuadro.mainBreaker.amperage, cuadro.mainBreaker.poles);
            }
            // Surge (Sobretensiones)
            drawSobretensiones(doc, SURGE_X, HEADER_LINE_Y);

            // Move down to Differentials
            currentY += 40;

            // Vertical drop to Diff Bus
            const DIFF_BUS_X = START_X + 40; // Indented
            doc.lineWidth(1).moveTo(IGA_X, HEADER_LINE_Y + 10).lineTo(DIFF_BUS_X, currentY).stroke();

            if (cuadro.differentials && cuadro.differentials.length > 0) {
                cuadro.differentials.forEach((diff: any) => {

                    // Logic to check space. A differential takes space + its circuits space.
                    // Approx: Diff header (40) + Circuits (N * 30)
                    const requiredSpace = 60 + (diff.circuits?.length || 0) * 35;

                    if (currentY + requiredSpace > MAX_Y) {
                        // Continuation Arrow Bottom
                        doc.fillColor('black').font('Helvetica-Bold').text(`Continúa en pág. ${currentPage + 1} (Circuitos del ${cuadro.name}) ...`, START_X + 100, MAX_Y + 5);

                        doc.addPage();
                        currentPage++;
                        drawFrameAndTitle();
                        currentY = START_Y;

                        // Continuation Arrow Top
                        doc.text(`... Viene de pág. ${currentPage - 1} (Cuadro ${cuadro.name})`, START_X + 100, MARGIN + 15);
                        currentY += 30;
                    }

                    // Draw Differential
                    const diffY = currentY;
                    // Bus line down
                    doc.moveTo(DIFF_BUS_X, diffY - 20).lineTo(DIFF_BUS_X, diffY).stroke();
                    // Horizontal to ID
                    doc.moveTo(DIFF_BUS_X, diffY).lineTo(DIFF_BUS_X + 20, diffY).stroke();

                    drawDiferencial(doc, DIFF_BUS_X + 30, diffY, diff.description, diff.amperage, diff.sensitivity, diff.poles);

                    // Circuits Bus
                    const CIRC_BUS_X = DIFF_BUS_X + 80;
                    doc.moveTo(DIFF_BUS_X + 40, diffY).lineTo(CIRC_BUS_X, diffY).stroke(); // Line from ID to Circ Bus

                    let circuitY = diffY;

                    if (diff.circuits && diff.circuits.length > 0) {
                        // Drawing Circuits vertical list
                        diff.circuits.forEach((circ: any, idx: number) => {
                            circuitY = diffY + (idx * 35);

                            // Check mid-circuit overflow (unlikely but possible if strict)
                            if (circuitY > MAX_Y - 20) {
                                // Simple page break for circuits
                                doc.addPage();
                                currentPage++;
                                drawFrameAndTitle();
                                currentY = START_Y;
                                circuitY = START_Y;
                                // Re-draw bus line context if needed, strictly speaking we connect visually
                            }

                            // Vertical bus continuation
                            if (idx > 0) {
                                doc.moveTo(CIRC_BUS_X, diffY).lineTo(CIRC_BUS_X, circuitY).stroke();
                            }

                            // Horizontal to Breaker
                            doc.moveTo(CIRC_BUS_X, circuitY).lineTo(CIRC_BUS_X + 20, circuitY).stroke();

                            drawMagnetotermico(doc, CIRC_BUS_X + 30, circuitY, circ.name || `C${idx + 1}`, circ.amperage, circ.poles);

                            // Line out
                            doc.moveTo(CIRC_BUS_X + 40, circuitY).lineTo(CIRC_BUS_X + 60, circuitY).stroke();

                            // Description Text
                            doc.font('Helvetica').fontSize(7).fillColor('#333');
                            doc.text(circ.description || 'Uso Gral.', CIRC_BUS_X + 65, circuitY - 3);
                            doc.fillColor('#666').fontSize(6);
                            if (circ.section) doc.text(`${circ.section}mm²`, CIRC_BUS_X + 65, circuitY + 6);
                        });

                        // Update Y for next differential
                        currentY = circuitY + 50;
                    } else {
                        currentY += 50;
                    }
                });
            } else {
                currentY += 40;
            }

            // Space between cuadros
            currentY += 20;

        }); // End Cuadros Loop


        // Finalize
        doc.end();
        stream.on('finish', () => resolve(outputPath));
        stream.on('error', (err) => reject(err));
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
