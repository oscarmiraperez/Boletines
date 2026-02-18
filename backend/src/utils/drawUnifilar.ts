import PDFDocument from 'pdfkit';
import fs from 'fs';

// --- CONSTANTS ---
const MARGIN = 40;
const PAGE_WIDTH = 1190.55; // A3 Landscape
const PAGE_HEIGHT = 841.89;
const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);

// Y Positions
const HEADER_Y = 100;      // Origin/IGA height
const MAIN_BUS_Y = 200;    // Main Horizontal Bus
const DIFF_Y = 280;        // Differentials
const SUB_BUS_Y = 380;     // Sub-buses for circuits
const CIRC_Y = 430;        // Circuits (Breakers)
const TABLE_START_Y = 550; // Start of the data table
const TABLE_HEIGHT = 150;  // Height of the table

// Spacing
const CIRCUIT_SPACING = 50;
const MIN_DIFF_SPACING = 80;

// --- SYMBOL DRAWING HELPERS ---

const drawSymbolText = (doc: PDFKit.PDFDocument, text: string, x: number, y: number, fontSize: number = 6, align: 'center' | 'left' | 'right' = 'center', rotate: boolean = false) => {
    doc.save();
    doc.font('Helvetica').fontSize(fontSize).fillColor('black');
    if (rotate) {
        doc.translate(x, y);
        doc.rotate(-90);
        doc.text(text, 0, 0, { align: 'left' });
    } else {
        doc.text(text, x - 20, y, { width: 40, align });
    }
    doc.restore();
};

const drawMagnetotermico = (doc: PDFKit.PDFDocument, x: number, y: number, label: string, amperage: number, poles: number, pdc: string = '6kA') => {
    doc.save();
    doc.translate(x, y);
    doc.lineWidth(1).strokeColor('black'); // STRICTLY BLACK

    // Line In
    doc.moveTo(0, -15).lineTo(0, -5).stroke();

    // Switch Element
    doc.moveTo(0, -5).lineTo(6, 4).stroke(); // Blade
    doc.moveTo(0, 4).lineTo(0, 15).stroke(); // Line Out

    // "X" (Automatic)
    doc.moveTo(1, -2).lineTo(5, 2).stroke();
    doc.moveTo(5, -2).lineTo(1, 2).stroke();

    // Thermal/Magnetic Box
    doc.rect(-3, -3, 6, 6).stroke();

    doc.restore();

    // Labels
    doc.font('Helvetica').fontSize(6).fillColor('black');
    if (label) drawSymbolText(doc, label, x, y - 20, 6, 'center');
    drawSymbolText(doc, `${amperage}A`, x + 5, y, 6, 'left');
    drawSymbolText(doc, `pdc ${pdc}`, x + 5, y + 6, 5, 'left');
};

const drawDiferencial = (doc: PDFKit.PDFDocument, x: number, y: number, label: string, amperage: number, sensitivity: number, poles: number) => {
    doc.save();
    doc.translate(x, y);
    doc.strokeColor('black'); // STRICTLY BLACK
    doc.lineWidth(1);

    // Line In/Out
    doc.moveTo(0, -15).lineTo(0, 15).stroke();

    // Toroid (Oval)
    doc.ellipse(0, 0, 10, 5).stroke();

    // Trip Linkage (Dashed line from oval to switch)
    doc.dash(1, { space: 1 });
    doc.moveTo(0, -5).lineTo(2, -10).stroke();
    doc.undash();

    doc.restore();

    // Labels
    doc.font('Helvetica').fontSize(6).fillColor('black');
    if (label) drawSymbolText(doc, label, x, y - 20, 6, 'center');
    drawSymbolText(doc, `ID ${amperage}A`, x + 8, y - 3, 6, 'left');
    drawSymbolText(doc, `${sensitivity}mA`, x + 8, y + 5, 6, 'left');
};

const drawSurgeProtection = (doc: PDFKit.PDFDocument, x: number, y: number) => {
    doc.save();
    doc.translate(x, y);
    doc.strokeColor('black'); // STRICTLY BLACK

    // Line from bus
    doc.moveTo(0, -15).lineTo(0, 0).stroke();

    // Box
    doc.rect(-8, 0, 16, 16).stroke();

    // Varistor spacing & Ground
    doc.moveTo(0, 16).lineTo(0, 24).stroke();
    // Ground symbol
    doc.moveTo(-6, 24).lineTo(6, 24).stroke();
    doc.moveTo(-4, 26).lineTo(4, 26).stroke();
    doc.moveTo(-2, 28).lineTo(2, 28).stroke();

    doc.restore();
    drawSymbolText(doc, 'Protección\nSobretensiones', x, y + 35, 6, 'center');
};

// --- MAIN GENERATOR FUNCTION ---

export const generateUnifilarA3 = async (data: any, outputPath: string) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: MARGIN, size: 'A3', layout: 'landscape' });
        const stream = fs.createWriteStream(outputPath);

        doc.pipe(stream);

        // --- FRAME & HEADER ---
        doc.lineWidth(1).strokeColor('black');
        doc.rect(MARGIN, MARGIN, CONTENT_WIDTH, PAGE_HEIGHT - (MARGIN * 2)).stroke();

        // Title Block
        const boxW = 350, boxH = 80;
        const boxX = PAGE_WIDTH - MARGIN - boxW;
        const boxY = PAGE_HEIGHT - MARGIN - boxH;
        doc.rect(boxX, boxY, boxW, boxH).stroke();

        doc.font('Helvetica-Bold').fontSize(14).text('ESQUEMA UNIFILAR', boxX + 10, boxY + 10);
        doc.font('Helvetica').fontSize(10).text(`Titular: ${data.clientName}`, boxX + 10, boxY + 35);
        doc.text(`Dirección: ${data.address}`, boxX + 10, boxY + 50);

        // --- DRAW DIAGRAM ---
        let currentX = MARGIN + 80;

        // IGA
        drawMagnetotermico(doc, currentX, HEADER_Y, 'IGA', data.mainBreaker?.amperage || 40, data.mainBreaker?.poles || 2, '10kA');
        drawSurgeProtection(doc, currentX + 50, HEADER_Y);

        // Main Bus Line
        doc.lineWidth(2).strokeColor('black');
        doc.moveTo(currentX, HEADER_Y + 15).lineTo(currentX, MAIN_BUS_Y).stroke();

        // --- TABLE STRUCTURE ---
        // Draw Table Header Labels
        const ROW_H = 30;
        const ROW_1_Y = TABLE_START_Y;
        const ROW_2_Y = TABLE_START_Y + ROW_H;
        const ROW_3_Y = TABLE_START_Y + (ROW_H * 2);

        // Labels Column
        doc.font('Helvetica-Bold').fontSize(8);
        doc.text('CIRCUITO', MARGIN + 5, ROW_1_Y + 10);
        doc.text('CABLE mm²', MARGIN + 5, ROW_2_Y + 10);
        doc.text('DESTINO', MARGIN + 5, ROW_3_Y + 10);

        // Horizontal Table Lines
        doc.lineWidth(1).strokeColor('black');
        doc.moveTo(MARGIN, TABLE_START_Y).lineTo(PAGE_WIDTH - MARGIN, TABLE_START_Y).stroke();
        doc.moveTo(MARGIN, ROW_2_Y).lineTo(PAGE_WIDTH - MARGIN, ROW_2_Y).stroke();
        doc.moveTo(MARGIN, ROW_3_Y).lineTo(PAGE_WIDTH - MARGIN, ROW_3_Y).stroke();
        doc.moveTo(MARGIN, ROW_3_Y + 80).lineTo(PAGE_WIDTH - MARGIN, ROW_3_Y + 80).stroke(); // Bottom of table

        // --- CIRCUITS LOOP ---
        const differentials = data.cuadros?.[0]?.differentials || [];
        let busStartX = currentX;
        let busEndX = currentX;

        differentials.forEach((diff: any, idx: number) => {
            const numCircs = Math.max(1, diff.circuits?.length || 1);
            const blockSize = numCircs * CIRCUIT_SPACING;
            const diffCenterX = currentX + (blockSize / 2);

            // Diff Symbol & Line
            doc.lineWidth(1).strokeColor('black');
            doc.moveTo(diffCenterX, MAIN_BUS_Y).lineTo(diffCenterX, DIFF_Y).stroke();
            drawDiferencial(doc, diffCenterX, DIFF_Y, diff.name, diff.amperage, diff.sensitivity, 2);

            // Sub Bus Line
            doc.moveTo(diffCenterX, DIFF_Y + 15).lineTo(diffCenterX, SUB_BUS_Y).stroke();
            const startCircX = currentX + (CIRCUIT_SPACING / 2);
            const endCircX = currentX + ((numCircs - 1) * CIRCUIT_SPACING) + (CIRCUIT_SPACING / 2);
            doc.lineWidth(2).strokeColor('black').moveTo(startCircX, SUB_BUS_Y).lineTo(endCircX, SUB_BUS_Y).stroke();

            // Circuits
            diff.circuits?.forEach((circ: any, cIdx: number) => {
                const circX = currentX + (cIdx * CIRCUIT_SPACING) + (CIRCUIT_SPACING / 2);

                // Draw Breaker
                doc.lineWidth(1).strokeColor('black').moveTo(circX, SUB_BUS_Y).lineTo(circX, CIRC_Y).stroke();
                drawMagnetotermico(doc, circX, CIRC_Y, circ.name, circ.amperage, circ.poles);

                // Line down to Table
                doc.lineWidth(0.5).dash(2, { space: 2 }).moveTo(circX, CIRC_Y + 20).lineTo(circX, TABLE_START_Y).stroke();
                doc.undash();

                // Draw Table Vertical Separators
                const colLeft = circX - (CIRCUIT_SPACING / 2);
                const colRight = circX + (CIRCUIT_SPACING / 2);
                doc.lineWidth(0.5).strokeColor('black');
                doc.moveTo(colRight, TABLE_START_Y).lineTo(colRight, ROW_3_Y + 80).stroke();
                if (cIdx === 0 && idx === 0) { // First line
                    doc.moveTo(colLeft, TABLE_START_Y).lineTo(colLeft, ROW_3_Y + 80).stroke();
                }

                // Fill Table Data
                doc.font('Helvetica').fontSize(8).fillColor('black');
                // Circuit Name
                doc.text(circ.name || `C${cIdx + 1}`, colLeft, ROW_1_Y + 10, { width: CIRCUIT_SPACING, align: 'center' });
                // Cable Section
                doc.text(`${circ.section}`, colLeft, ROW_2_Y + 10, { width: CIRCUIT_SPACING, align: 'center' });
                // Destination (Multiline)
                doc.fontSize(7);
                doc.text(circ.description || '', colLeft + 2, ROW_3_Y + 5, { width: CIRCUIT_SPACING - 4, align: 'center', height: 75 });
            });

            currentX += blockSize + 10; // Spacing between diff blocks
            busEndX = currentX - 10;
        });

        // Main Bus Draw
        doc.lineWidth(3).strokeColor('black');
        doc.moveTo(busStartX, MAIN_BUS_Y).lineTo(busEndX, MAIN_BUS_Y).stroke();

        doc.end();
        stream.on('finish', () => resolve(outputPath));
        stream.on('error', reject);
    });
};
