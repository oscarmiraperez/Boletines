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

        // Explicitly remove XFA to avoid conflicts in hybrid forms
        acroForm.dict.delete(PDFName.of('XFA'));

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
            // Load the already filled PDF as the BASE document to preserve form fields correctly
            const mtdDoc = await PDFLib.load(filledPdfBytes);

            // Remove any trailing pages from the official MTD (usually only 3 pages are needed)
            const totalMtdPages = mtdDoc.getPageCount();
            if (totalMtdPages > 3) {
                // Delete from last to index 3 (4th page)
                for (let i = totalMtdPages - 1; i >= 3; i--) {
                    mtdDoc.removePage(i);
                }
            }

            // Load and copy all schematic pages into the MTD document
            const schematicBytes = fs.readFileSync(schematicPdfPath);
            const schematicDoc = await PDFLib.load(schematicBytes);
            const schematicPages = await mtdDoc.copyPages(schematicDoc, schematicDoc.getPageIndices());
            schematicPages.forEach((page) => mtdDoc.addPage(page));

            const finalBytes = await mtdDoc.save();
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

// --- SCHEMATIC GENERATION (Consolidated) ---

export const generateSchematicPDF = async (data: any, outputPath: string) => {
    try {
        logDebug(`Generating schematic PDF for: ${data.clientName}`);

        // Ensure temp directory exists (caller usually does this but let's be safe)
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // We use the consolidated drawer from drawUnifilar.ts
        // This ensures the classic style is preserved across all PDF outputs.
        await generateUnifilarA3(data, outputPath);

        logDebug(`Schematic PDF generated successfully: ${outputPath}`);
        return outputPath;
    } catch (error) {
        logDebug(`Error in generateSchematicPDF: ${error}`);
        throw error;
    }
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
