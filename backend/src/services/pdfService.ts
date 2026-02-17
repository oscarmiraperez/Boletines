import PDFDocument from 'pdfkit'; // Keep for other docs
import { PDFDocument as PDFLibDocument, PDFTextField, PDFCheckBox, PDFRadioGroup } from 'pdf-lib'; // For templates
import fs from 'fs';
import path from 'path';

const logDebug = (msg: string) => {
    const logPath = path.join(process.cwd(), 'pdf_debug.txt');
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${msg}\n`);
    console.log(`[DEBUG] ${msg}`);
};

export const fillOfficialMTD = async (data: any, outputPath: string) => {
    try {
        const templatePath = path.join(process.cwd(), 'templates/memoria en blanco.pdf');

        if (!fs.existsSync(templatePath)) {
            throw new Error('Template PDF not found');
        }

        const pdfBytes = fs.readFileSync(templatePath);
        const pdfDoc = await PDFLibDocument.load(pdfBytes);
        const form = pdfDoc.getForm();


        // Exact names based on JSON analysis and standard MTD mapping
        let mtd = data.mtdData || {};
        if (typeof mtd === 'string') {
            try {
                mtd = JSON.parse(mtd);
            } catch (e) {
                console.error('Error parsing mtdData JSON:', e);
                mtd = {};
            }
        }

        const client = data.client || {}; // Assuming data structure passed from controller
        const installation = data.installation || {};

        // Helper to format booleans/checks
        const isChecked = (val: string, target: string) => val === target;

        // Field Mapping
        const fieldMap: Record<string, string | boolean> = {
            // --- 1. DATOS DEL TITULAR (A) ---
            'A_TIT_NOM': mtd.titularNombre || data.clientName || '',
            'A_TIT_DNI': mtd.titularNif || data.clientNif || '',
            'A_TIT_DOM': mtd.direccion || data.address || '',
            'A_TIT_CP': data.postalCode || '',
            'A_TIT_LOC': data.municipality || '',
            'A_TIT_CORREO': data.clientEmail || '',
            'A_TIT_TEL': data.clientPhone || '',

            // Representante
            'A_REP_NOM': mtd.representanteNombre || '',
            'A_REP_NIF': mtd.representanteDni || '',

            // --- 2. EMPLAZAMIENTO (B) ---
            'B_EMPL': mtd.direccion || data.address || '',
            'B_LOC': data.municipality || '',
            'B_PROV': 'Valencia', // Default or from data
            'B_CP': data.postalCode || '',
            'B_REFCAD': mtd.refCatastral || '',
            'B_Uso': mtd.usoInstalacion || '',
            'B_Superficie': mtd.superficie ? String(mtd.superficie) : '',
            'B_P_Instalada': mtd.potenciaPrevista ? String(mtd.potenciaPrevista) : (data.contractedPower ? String(data.contractedPower) : ''),
            'B_N_Modulos': mtd.tensionNominal === '400' ? 'Trifásica' : 'Monofásica', // Using generic field for Tension/Fases if not specific

            // --- 3. ACOMETIDA Y ENLACE (C) ---
            // Tipo de Acometida (Checkboxes)
            'C1_CV1': isChecked(mtd.acometidaTipo, 'aerea_posada'),
            'C1_CV2': isChecked(mtd.acometidaTipo, 'aerea_tensada'),
            'C1_CV3': isChecked(mtd.acometidaTipo, 'subterranea'),
            'C1_CV4': isChecked(mtd.acometidaTipo, 'areo_subterranea'),


            'C_EMPL': mtd.acometidaPuntoConexion || '', // Punto de Conexión moved to Emplazamiento (C_EMPL)
            'C_ENT': mtd.cgpEsquema || '', // Esquema Normalizado Tipo moved to C_ENT (Entronque/Esquema?)

            'C_INOM': mtd.tensionNominal || '', // Tensión Nominal

            // CGP (Caja General Protección)
            'C3_CV1': (mtd.cgpUbicacion && mtd.cgpUbicacion.toLowerCase().includes('fachada')),
            'C3_CV2': (mtd.cgpUbicacion && mtd.cgpUbicacion.toLowerCase().includes('nicho')),
            'C3_CV3': (mtd.cgpUbicacion && mtd.cgpUbicacion.toLowerCase().includes('interior')),
            'C_OTRL': mtd.cgpUbicacion || '', // Map full text to 'Other/Emplazamiento' field as requested
            'C_INFUS': mtd.cgpIntensidad ? String(mtd.cgpIntensidad) : '',

            // LGA (Línea General Alimentación)
            'C_CABL': mtd.lgaMaterial ? (mtd.lgaMaterial === 'cu' ? 'Cobre' : 'Aluminio') : '',
            'C_DIM': mtd.lgaSeccion ? String(mtd.lgaSeccion) : '',
            'C_COND': mtd.lgaAislamiento || '',
            'C_SISTI': mtd.lgaInstalacion || '',
            // C4 fields are LGA usually? Need to check PDF carefully. 
            // Based on fields: C4_SISTI, C4_DIM. 
            'C4_SISTI': mtd.lgaInstalacion || '',
            'C4_DIM': mtd.lgaDiametroTubo ? String(mtd.lgaDiametroTubo) : '',

            // --- 4. MEDIDA (C11) ---
            'C11_CV1': isChecked(mtd.medidaSituacion, 'individual_unico_usuario'),
            'C11_CV2': isChecked(mtd.medidaSituacion, 'concentracion_varios'),
            'C11_CV3': isChecked(mtd.medidaSistema, 'directa'),
            'C11_CV4': isChecked(mtd.medidaSistema, 'indirecta'),

            'C_NCC': mtd.medidaUbicacion || '',
            // 'C11_CT1' etc. might be specific fields for location details if C_NCC is not enough

            // --- 5. DERIVACIÓN INDIVIDUAL (C7 / DI) ---
            // Using C7_ fields for DI based on 'C7_SIST', 'C7_ESUN', 'C7_CIRC'
            'C7_SIST': mtd.diInstalacion || '',
            'C7_ESUN': mtd.diSeccion ? String(mtd.diSeccion) : '',
            'C7_CIRC': mtd.diMaterial ? (mtd.diMaterial === 'cu' ? 'Cobre' : 'Aluminio') : '',
            'C8_DESC': mtd.diAislamiento || '', // C8 might be related to DI description or insulation
            'C_PCA': mtd.diDiametroTubo ? String(mtd.diDiametroTubo) : '', // Posible Canaladura Aislamiento / Tubo? 
            'C10_LBR': mtd.diLibreHalogenos ? 'Yes' : 'No', // If radio group

            // --- 6. PUESTA A TIERRA ---
            'C_PRTE': mtd.tierraElectrodo || '',
            'C_RESPT': mtd.tierraResistencia ? String(mtd.tierraResistencia) : (data.verificaciones?.earthResistance ? String(data.verificaciones.earthResistance) : ''),
            'C_CES': mtd.tierraSeccion ? String(mtd.tierraSeccion) : '',
            // 'C_PUNT': mtd.tierraPuntos || '', // Field not found in PDF template

            // --- 7. VERIFICACIONES (E) ---
            // Mapped from PDF Inspection:
            // form1[0].Pagina6[0].seccion.K[0].CasillaVerificación1_v[0] (Continuidad - Correcto/Verdadero)
            // form1[0].Pagina6[0].seccion.K[0].CasillaVerificación2_v[0] (Aislamiento - Correcto/Verdadero)
            // form1[0].Pagina6[0].seccion.K[0].CasillaVerificación5_v[0] (Diferencial - Correcto/Verdadero)
            // Note: _v suffixes seem to be 'Verdadero' (True/Correct), _c might be 'Correcto' or 'Falso'? 
            // Let's assume _v boxes are for "Favorable/Correct".

            // Logic: If continuity is CORRECTO, check CasillaVerificación1_v
            'CasillaVerificación1_v': data.verificaciones?.continuity === 'CORRECTO',
            'CasillaVerificación2_v': data.verificaciones?.insulation === 'CORRECTO',
            'CasillaVerificación5_v': data.verificaciones?.differentialTrip === 'CORRECTO',

            // Earth Resistance is numeric, usually in 'C_RESPT' (already mapped above) or maybe in Verifications section?
            // Inspection showed: form1[0].Pagina6[0].seccion.K[0].J_CT1V[0] ... J_CT2C[0] etc.
            // But let's stick to the checkboxes for now.
        };

        // Apply mapping
        const allFields = form.getFields();
        console.log(`[PDF DEBUG] Total fields found in template: ${allFields.length}`);

        // Debug Data Validation
        console.log('[PDF DEBUG] mtdData keys:', Object.keys(mtd));
        if (data.cuadros) {
            console.log(`[PDF DEBUG] Cuadros count: ${data.cuadros.length}`);
            data.cuadros.forEach((c: any, i: number) => {
                console.log(`  Cuadro[${i}]: ${c.name}, Diffs: ${c.differentials?.length}, Circs: ${c.circuits?.length}`);
            });
        } else {
            console.log('[PDF DEBUG] NO cuadros data found!');
        }

        Object.entries(fieldMap).forEach(([partialName, value]) => {
            // Robust finding: ends with .Name or .Name[0]
            const matchingFields = allFields.filter(f =>
                f.getName() === partialName ||
                f.getName().endsWith(`.${partialName}[0]`) ||
                f.getName().endsWith(`.${partialName}`)
            );

            if (matchingFields.length === 0) {
                console.warn(`[PDF DEBUG] Field NOT FOUND in PDF: ${partialName} (Value: ${value})`);
            } else {
                // console.log(`[PDF DEBUG] Field MATCHED: ${partialName} -> ${matchingFields[0].getName()}`);
            }

            matchingFields.forEach(field => {
                try {
                    if (field instanceof PDFCheckBox) {
                        if (value === true) field.check();
                        else if (value === false) field.uncheck();
                    } else if (field instanceof PDFTextField) {
                        field.setText(String(value));
                    } else if (value === 'Yes' && field instanceof PDFRadioGroup) {
                        // specialized handling for radio if needed, or select option
                        // field.select('Yes'); 
                    }
                } catch (err) {
                    console.log(`Error setting field ${field.getName()}`, err);
                }
            });
        });

        // Flatten form to prevent further editing if desired, or leave editable
        // form.flatten(); 

        // Alternative: Set all fields to ReadOnly
        const fields = form.getFields();
        fields.forEach(field => {
            field.enableReadOnly();
        });

        // ---------------------------------------------------------
        // MERGE SCHEMATIC
        // ---------------------------------------------------------
        try {
            logDebug('Starting Schematic Merge...');
            const schematicPath = outputPath.replace('.pdf', '_schematic.pdf');
            // Pass full data to use it in the title block
            await generateSchematicPDF(data, schematicPath);

            if (fs.existsSync(schematicPath)) {
                logDebug('Schematic PDF generated. Merging...');
                const schematicBytes = fs.readFileSync(schematicPath);
                const schematicPdf = await PDFLibDocument.load(schematicBytes);
                const copiedPages = await pdfDoc.copyPages(schematicPdf, schematicPdf.getPageIndices());
                copiedPages.forEach((page) => pdfDoc.addPage(page));
                fs.unlinkSync(schematicPath);
                logDebug('Schematic Merge Complete.');
            } else {
                logDebug('Schematic file NOT FOUND after generation.');
            }
        } catch (schematicError) {
            console.error('Error generating/merging schematic:', schematicError);
            logDebug(`Error merging schematic: ${schematicError}`);
        }

        // ---------------------------------------------------------
        // MERGE AUTHORIZATION (New Requirement)
        // ---------------------------------------------------------
        try {
            logDebug('Starting Authorization Merge...');
            const authPath = outputPath.replace('.pdf', '_auth.pdf');
            // Generate Auth PDF using existing helper
            await generateAuthorizationPDF(data, authPath);

            if (fs.existsSync(authPath)) {
                logDebug('Authorization PDF generated. Merging...');
                const authBytes = fs.readFileSync(authPath);
                const authPdf = await PDFLibDocument.load(authBytes);
                const copiedAuthPages = await pdfDoc.copyPages(authPdf, authPdf.getPageIndices());
                copiedAuthPages.forEach((page) => pdfDoc.addPage(page));
                fs.unlinkSync(authPath);
                logDebug('Authorization Merge Complete.');
            } else {
                logDebug('Authorization file NOT FOUND after generation.');
            }
        } catch (authError) {
            console.error('Error generating/merging authorization:', authError);
            logDebug(`Error merging authorization: ${authError}`);
        }

        const pdfBytesFinal = await pdfDoc.save();
        fs.writeFileSync(outputPath, pdfBytesFinal);
        logDebug(`Final MTD saved to ${outputPath}`);
        return outputPath;

    } catch (error) {
        logDebug(`Error filling MTD template: ${error}`);
        throw error;
    }
};

export const generateSchematicPDF = async (data: any, outputPath: string) => {
    logDebug(`Generating Schematic PDF at ${outputPath}`);
    if (data.cuadros) logDebug(`Cuadros count: ${data.cuadros.length}`);
    else logDebug('No cuadros data in generateSchematicPDF');

    return new Promise((resolve, reject) => {
        // A4 size: 595.28 x 841.89 points
        const doc = new PDFDocument({ autoFirstPage: true, size: 'A4', margin: 40 });
        const stream = fs.createWriteStream(outputPath);

        doc.pipe(stream);

        // Helper to draw frame and title block (cajetín) on current page
        const drawFrameAndTitleBlock = () => {
            try {
                // Save current margins and set to 0 to prevents auto-page-add when drawing near bottom
                const originalMargins = { ...doc.page.margins };
                doc.page.margins = { top: 0, bottom: 0, left: 0, right: 0 };

                const pageWidth = 595.28;
                const pageHeight = 841.89;
                const margin = 20;

                // 1. Frame (Border)
                doc.rect(margin, margin, pageWidth - (margin * 2), pageHeight - (margin * 2)).stroke();

                // 2. Title Block (Cajetín) - Bottom Right Corner
                const titleBlockHeight = 80;
                const titleBlockWidth = 250;
                const titleBlockX = pageWidth - margin - titleBlockWidth;
                const titleBlockY = pageHeight - margin - titleBlockHeight;

                doc.rect(titleBlockX, titleBlockY, titleBlockWidth, titleBlockHeight).fillAndStroke('white', 'black');

                // Content of Title Block
                doc.fillColor('black').fontSize(8).font('Helvetica-Bold');

                // Row 1: Empresa
                doc.text('EMPRESA INSTALADORA:', titleBlockX + 5, titleBlockY + 5);
                doc.font('Helvetica').fontSize(8).text('INSTALACIONES Y SUMINISTROS ELÉCTRICOS SAN VICENTE', titleBlockX + 5, titleBlockY + 15, { width: titleBlockWidth - 10 });

                // Row 2: Cliente / Ubicación
                doc.font('Helvetica-Bold').text('TITULAR:', titleBlockX + 5, titleBlockY + 30);
                doc.font('Helvetica').text(data.clientName || '', titleBlockX + 50, titleBlockY + 30);

                doc.font('Helvetica-Bold').text('UBICACIÓN:', titleBlockX + 5, titleBlockY + 45);
                doc.font('Helvetica').text(data.address || '', titleBlockX + 60, titleBlockY + 45, { width: titleBlockWidth - 65, height: 10, ellipsis: true });

                // Row 3: Potencia
                // Use contractedPower from data or installation object
                const power = data.contractedPower || (data.installation ? data.installation.contractedPower : '') || 'TODO';
                doc.font('Helvetica-Bold').text('POTENCIA TOTAL:', titleBlockX + 5, titleBlockY + 60);
                doc.font('Helvetica').text(`${power} kW`, titleBlockX + 85, titleBlockY + 60);

                // Restore margins
                doc.page.margins = originalMargins;
            } catch (err) {
                logDebug(`Error drawing frame: ${err}`);
                // Don't reject here, just log, otherwise it crashes loop
            }
        };

        // Event listener for adding pages to ensure frame is drawn on every page
        doc.on('pageAdded', () => {
            drawFrameAndTitleBlock();
        });

        // Draw on first page immediately
        drawFrameAndTitleBlock();

        doc.font('Helvetica-Bold').fontSize(14).text('ESQUEMA UNIFILAR (ANEXO)', { align: 'center' });
        doc.moveDown();

        const startX = 50;
        let currentY = 100;

        try {
            if (data.cuadros && data.cuadros.length > 0) {
                data.cuadros.forEach((cuadro: any) => {
                    // Check for page overflow relative to title block area (approx 740 to leave space)
                    if (currentY > 700) {
                        doc.addPage();
                        currentY = 50;
                    }

                    doc.font('Helvetica-Bold').fontSize(12).text(`Cuadro: ${cuadro.name}`, startX, currentY);
                    currentY += 40;

                    const iga = cuadro.mainBreaker;
                    const igaAmps = iga ? iga.amperage : 0;
                    const igaPoles = iga ? iga.poles : 2;

                    drawMagnetotermico(doc, startX + 40, currentY, 'IGA', igaAmps, igaPoles);
                    doc.moveTo(startX, currentY + 15).lineTo(startX + 40, currentY + 15).stroke();

                    // Draw Surge Protector (Sobretensiones) between IGA and IDs
                    const surgeX = startX + 80;
                    drawSobretensiones(doc, surgeX, currentY);
                    doc.moveTo(startX + 70, currentY + 15).lineTo(surgeX, currentY + 15).stroke();
                    doc.moveTo(surgeX + 15, currentY + 15).lineTo(startX + 120, currentY + 15).stroke();

                    const diffs = cuadro.differentials || [];
                    if (diffs.length > 0) {
                        let busX = startX + 120;
                        let busY = currentY + 15;

                        diffs.forEach((diff: any) => {
                            if (currentY > 750) {
                                doc.addPage();
                                currentY = 50;
                                busY = currentY;
                            }

                            doc.moveTo(busX, busY).lineTo(busX, currentY + 50).stroke();
                            busY = currentY + 50;

                            doc.moveTo(busX, busY).lineTo(busX + 30, busY).stroke();

                            const diffAmps = diff.amperage || 0;
                            const diffSens = diff.sensitivity || 30;
                            const diffPoles = diff.poles || 2;

                            drawDiferencial(doc, busX + 30, busY - 15, 'ID', diffAmps, diffSens, diffPoles);
                            doc.moveTo(busX + 60, busY).lineTo(busX + 90, busY).stroke();

                            const circuits = diff.circuits || [];
                            if (circuits.length > 0) {
                                let circBusX = busX + 90;
                                let circBusBottomY = busY + Math.max(0, (circuits.length - 1) * 60);

                                doc.moveTo(circBusX, busY).lineTo(circBusX, circBusBottomY).stroke();

                                circuits.forEach((circ: any, idx: number) => {
                                    let circY = busY + (idx * 60);
                                    doc.moveTo(circBusX, circY).lineTo(circBusX + 30, circY).stroke();

                                    const circAmps = circ.amperage || 0;
                                    const circPoles = circ.poles || 2;
                                    const circName = circ.name || `C${idx + 1}`;
                                    const circDesc = circ.description || '';

                                    // Draw Magnetotermico WITHOUT label below (we'll put it at the end)
                                    drawMagnetotermico(doc, circBusX + 30, circY - 15, '', circAmps, circPoles);

                                    // Text for section if exists
                                    if (circ.section) {
                                        doc.fontSize(7).text(`${circ.section}mm²`, circBusX + 75, circY + 10);
                                    }

                                    doc.moveTo(circBusX + 60, circY).lineTo(circBusX + 150, circY).stroke();

                                    // Label at the end (C1, C2...)
                                    doc.fontSize(9).font('Helvetica-Bold').text(circName, circBusX + 155, circY - 4);
                                    // Description below the label
                                    doc.fontSize(8).font('Helvetica').text(circDesc, circBusX + 160, circY + 8);
                                });
                                currentY = Math.max(currentY + 80, busY + (circuits.length * 60));
                            } else {
                                currentY += 80;
                            }
                        });
                    } else {
                        currentY += 60;
                    }
                    currentY += 20;
                });
            } else {
                doc.text('No hay cuadros configurados para el esquema.', startX, currentY);
            }
        } catch (drawError) {
            logDebug(`Error drawing components: ${drawError}`);
            reject(drawError);
            return;
        }

        doc.end();
        stream.on('finish', () => resolve(outputPath));
        stream.on('error', (err) => {
            logDebug(`Stream error in generateSchematicPDF: ${err}`);
            reject(err);
        });
    });
};

export const generateAuthorizationPDF = async (data: any, outputPath: string) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(outputPath);

        doc.pipe(stream);

        // Header with Logo
        // Try multiple paths using CWD
        let logoPath = path.join(process.cwd(), 'assets/logo.png');
        // If not found, try alternative if any, or leave it
        if (!fs.existsSync(logoPath)) {
            // Fallback to dev path if needed, or allow it to fail gracefully
            // logoPath = path.join(__dirname, '../../assets/logo.png'); 
        }

        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 50, 45, { width: 100 });
        }

        doc.moveDown(4);

        doc.font('Helvetica-Bold').fontSize(16).text('AUTORIZACIÓN DE REPRESENTACIÓN', { align: 'center', underline: true });
        doc.moveDown(2);

        // Body
        doc.font('Helvetica').fontSize(12).text(
            `D./Dña. ${data.clientName || '______________________'}, con NIF ${data.clientNif || '_____________'}, ` +
            `titular del suministro con CUPS ${data.cups || '______________________'} sito en ${data.address || '______________________'}.`,
            { align: 'justify', lineGap: 5 }
        );

        doc.moveDown(2);

        doc.text(
            'POR LA PRESENTE AUTORIZA a la empresa INSTALACIONES Y SUMINISTROS ELÉCTRICOS SAN VICENTE, ' +
            'para que actúe en mi nombre y representación ante la compañía distribuidora y los organismos competentes, ' +
            'con el fin de realizar todos los trámites necesarios para la legalización, contratación y gestión del suministro eléctrico mencionado.',
            { align: 'justify', lineGap: 5 }
        );

        doc.moveDown(2);

        const date = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
        doc.text(`En San Vicente del Raspeig, a ${date}.`, { align: 'right' });

        doc.moveDown(4);

        // Signature Area
        doc.text('Firma del titular:', 50, doc.y);
        doc.moveDown();

        const signatureY = doc.y;

        // Draw box for signature if no image, or place image
        if (data.signaturePath && fs.existsSync(data.signaturePath)) {
            try {
                doc.image(data.signaturePath, 50, signatureY, { fit: [200, 100] });
                doc.fontSize(8).fillColor('grey').text('(Firmado digitalmente)', 50, signatureY + 110);
            } catch (err) {
                console.error('Error embedding signature image:', err);
                doc.rect(50, signatureY, 200, 100).stroke();
                doc.text('Error cargando firma', 60, signatureY + 40);
            }
        } else {
            doc.rect(50, signatureY, 200, 100).stroke(); // Placeholder box
        }

        // DNI Handling (Image or PDF)
        const isDniPdf = data.dniPath && data.dniPath.toLowerCase().endsWith('.pdf');

        if (data.dniPath && fs.existsSync(data.dniPath) && !isDniPdf) {
            doc.addPage();
            doc.text('Documento de Identidad (DNI):', { align: 'center', underline: true });
            doc.moveDown();
            try {
                doc.image(data.dniPath, { fit: [500, 400], align: 'center' });
            } catch (err) {
                doc.text('Error al cargar la imagen del DNI.');
            }
        }

        doc.end();

        stream.on('finish', async () => {
            if (isDniPdf && fs.existsSync(data.dniPath)) {
                try {
                    const { PDFDocument: PDFLib } = require('pdf-lib');

                    const authPdfBytes = fs.readFileSync(outputPath);
                    const authPdfDoc = await PDFLib.load(authPdfBytes);

                    const dniPdfBytes = fs.readFileSync(data.dniPath);
                    const dniPdfDoc = await PDFLib.load(dniPdfBytes);

                    const copiedPages = await authPdfDoc.copyPages(dniPdfDoc, dniPdfDoc.getPageIndices());

                    copiedPages.forEach((page: any) => authPdfDoc.addPage(page));

                    const mergedPdfBytes = await authPdfDoc.save();
                    fs.writeFileSync(outputPath, mergedPdfBytes);

                    resolve(outputPath);
                } catch (err) {
                    console.error('Error merging DNI PDF:', err);
                    resolve(outputPath);
                }
            } else {
                resolve(outputPath);
            }
        });
        stream.on('error', reject);
    });
};


function drawMagnetotermico(doc: PDFKit.PDFDocument, x: number, y: number, label: string, amperage: number, poles: number) {
    const centerY = y + 15;

    // 1. Base Line (Unchanged, just connected)
    doc.moveTo(x, centerY).lineTo(x + 5, centerY).stroke();       // Left
    doc.moveTo(x + 25, centerY).lineTo(x + 30, centerY).stroke(); // Right

    // 2. Switch Arm (Flipped: Hinge at Right x+25, pointing Left)
    doc.save();
    doc.translate(x + 25, centerY);
    doc.rotate(-135); // Point Up-Left
    doc.moveTo(0, 0).lineTo(18, 0).stroke();

    // 3. Thermal Protection (Square Notch) - Drawn relative to blade
    doc.moveTo(7, 0).lineTo(7, -3).lineTo(11, -3).lineTo(11, 0).stroke();

    // 4. Magnetic Protection (Arrow)
    doc.moveTo(15, 0).lineTo(15, -6).stroke();
    doc.moveTo(15, -6).lineTo(13, -4).stroke();
    doc.moveTo(15, -6).lineTo(17, -4).stroke();

    doc.restore();

    // Text Data
    doc.fontSize(8).font('Helvetica-Bold');
    doc.text(label, x - 5, y + 25, { width: 40, align: 'center' });

    doc.fontSize(7).font('Helvetica');
    // Top text: Amperage and Poles
    doc.text(`${amperage}A P:${poles}`, x - 10, y - 12, { width: 50, align: 'center' });
}

function drawDiferencial(doc: PDFKit.PDFDocument, x: number, y: number, label: string, amperage: number, sensitivity: number, poles: number) {
    const centerY = y + 15;

    // 1. Base Line
    doc.moveTo(x, centerY).lineTo(x + 10, centerY).stroke();
    doc.moveTo(x + 20, centerY).lineTo(x + 30, centerY).stroke();

    // 2. Switch Arm (Flipped: Hinge at Right x+20)
    doc.save();
    doc.translate(x + 20, centerY); // Hinge moved to right side of switch gap
    doc.rotate(-135); // Point Up-Left
    doc.moveTo(0, 0).lineTo(14, 0).stroke();
    doc.restore();

    // 3. Toroid (Ellipse) - Flipped to Left side
    doc.save();
    doc.translate(x + 5, centerY); // Moved to Left (was x+25)
    doc.scale(0.6, 1);
    doc.ellipse(0, 0, 4, 8).stroke();
    doc.restore();

    // 4. Linkage Mechanism
    const boxX = x + 18;
    const boxY = centerY - 15;
    doc.rect(boxX, boxY, 5, 5).stroke();
    doc.moveTo(x + 15, centerY - 5).lineTo(boxX, boxY + 2.5).stroke();
    doc.moveTo(boxX + 5, boxY + 2.5).lineTo(x + 25, boxY + 2.5).lineTo(x + 25, centerY - 8).stroke();

    // Text Data
    doc.fontSize(8).font('Helvetica-Bold');
    doc.text(label, x - 5, y + 25, { width: 40, align: 'center' });

    doc.fontSize(7).font('Helvetica');
    doc.text(`${amperage}A`, x - 12, y - 12, { width: 30, align: 'right' });
    doc.text(`${sensitivity}mA`, x + 12, y - 12, { width: 35, align: 'left' });
    doc.text(`P:${poles}`, x - 5, y + 35, { width: 40, align: 'center' });
}

function drawSobretensiones(doc: PDFKit.PDFDocument, x: number, y: number) {
    const centerY = y + 15;

    // 1. Box (Vertical)
    doc.rect(x, centerY - 15, 12, 20).stroke();

    // 2. Ground Connection (Inside/Below)
    doc.moveTo(x + 6, centerY + 5).lineTo(x + 6, centerY + 12).stroke();
    // Ground bars
    doc.moveTo(x + 2, centerY + 12).lineTo(x + 10, centerY + 12).stroke();
    doc.moveTo(x + 4, centerY + 14).lineTo(x + 8, centerY + 14).stroke();
    doc.moveTo(x + 5.5, centerY + 16).lineTo(x + 6.5, centerY + 16).stroke();

    // 3. Connecting Line to Main (from Top)
    doc.moveTo(x + 6, centerY - 15).lineTo(x + 6, centerY - 25).lineTo(x - 25, centerY - 25).stroke();

    doc.fontSize(7).font('Helvetica-Bold').text('Protección contra', x - 15, y + 30, { width: 50, align: 'center' });
    doc.text('sobretensiones', x - 15, y + 38, { width: 50, align: 'center' });
}
