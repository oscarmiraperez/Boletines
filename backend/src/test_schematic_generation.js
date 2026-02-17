
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

// Mock Data mimicking the Prisma structure found in documentController
const mockData = {
    clientName: "Juan Pérez",
    address: "C/ Mayor 123",
    contractedPower: "5.75",
    cuadros: [
        {
            name: "Cuadro General",
            mainBreaker: { amperage: 40, poles: 2 },
            differentials: [
                {
                    amperage: 40,
                    sensitivity: 30,
                    poles: 2,
                    circuits: [
                        { name: "C1", description: "Alumbrado", amperage: 10, poles: 2, section: 1.5 },
                        { name: "C2", description: "Enchufes", amperage: 16, poles: 2, section: 2.5 },
                    ]
                },
                {
                    amperage: 40,
                    sensitivity: 30,
                    poles: 2,
                    circuits: [
                        { name: "C3", description: "Cocina", amperage: 25, poles: 2, section: 6 },
                        { name: "C4", description: "Lavadora", amperage: 20, poles: 2, section: 4 },
                        { name: "C5", description: "Baño", amperage: 16, poles: 2, section: 2.5 }
                    ]
                }
            ]
        },
        {
            name: "Cuadro Secundario (Empty)",
            mainBreaker: { amperage: 25, poles: 2 },
            differentials: []
        }
    ]
};

// COPIED LOGIC FROM pdfService.ts
const generateSchematicPDF = async (data, outputPath) => {
    return new Promise((resolve, reject) => {
        // A4 size: 595.28 x 841.89 points
        const doc = new PDFDocument({ autoFirstPage: true, size: 'A4', margin: 40 });
        const stream = fs.createWriteStream(outputPath);

        doc.pipe(stream);

        // Helper to draw frame and title block (cajetín) on current page
        const drawFrameAndTitleBlock = () => {
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

        if (data.cuadros && data.cuadros.length > 0) {
            data.cuadros.forEach((cuadro) => {
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

                    diffs.forEach((diff) => {
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

                            circuits.forEach((circ, idx) => {
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

        doc.end();
        stream.on('finish', () => resolve(outputPath));
        stream.on('error', reject);
    });
};

function drawMagnetotermico(doc, x, y, label, amperage, poles) {
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

function drawDiferencial(doc, x, y, label, amperage, sensitivity, poles) {
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

function drawSobretensiones(doc, x, y) {
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

const run = async () => {
    try {
        const outputDir = path.join(process.cwd(), 'generated_docs');
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        const outputPath = path.join(outputDir, 'test_schematic_data.pdf');

        console.log('Generating Schemtic with mock data...');
        await generateSchematicPDF(mockData, outputPath);
        console.log('Success! Path:', outputPath);
    } catch (e) {
        console.error('Failed:', e);
    }
}

run();
