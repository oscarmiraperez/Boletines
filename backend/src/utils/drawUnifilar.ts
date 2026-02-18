import PDFDocument from 'pdfkit';
import fs from 'fs';

// --- CONSTANTS ---
const MARGIN = 40;
const PAGE_WIDTH = 1190.55; // A3 Landscape
const PAGE_HEIGHT = 841.89;
const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);

// Y Positions
const HEADER_Y = 150;      // Origin/IGA height
const MAIN_BUS_Y = 250;    // Main Horizontal Bus
const DIFF_Y = 300;        // Differentials
const SUB_BUS_Y = 400;     // Sub-buses for circuits
const CIRC_Y = 450;        // Circuits (Breakers)
const CIRC_TEXT_Y = 520;   // Circuit Descriptions

// Spacing
const CIRCUIT_SPACING = 60;
const MIN_DIFF_SPACING = 100;

// --- SYMBOL DRAWING HELPERS ---

const drawSymbolText = (doc: PDFKit.PDFDocument, text: string, x: number, y: number, fontSize: number = 6, align: 'center' | 'left' | 'right' = 'center', rotate: boolean = false) => {
    doc.save();
    doc.font('Helvetica').fontSize(fontSize).fillColor('black');
    if (rotate) {
        doc.translate(x, y);
        doc.rotate(-90);
        doc.text(text, 0, 0, { align: 'left' }); // Rotated text usually aligns left from the point
    } else {
        doc.text(text, x - 20, y, { width: 40, align });
    }
    doc.restore();
};

const drawMagnetotermico = (doc: PDFKit.PDFDocument, x: number, y: number, label: string, amperage: number, poles: number, pdc: string = '6kA') => {
    doc.save();
    doc.translate(x, y);
    doc.lineWidth(1).strokeColor('red'); // User requested style (Red symbols seen in images)

    // Line In
    doc.moveTo(0, -10).lineTo(0, -5).stroke();

    // Switch Blade (Open)
    doc.moveTo(0, -5).lineTo(8, -15).stroke(); // Blade angled up/right to indicate open? Or standard closed? 
    // Standard unifilar usually shows CLOSED or OPEN. Let's stick to the subtle angled line of the previous implementation but refined.
    // Actually, IEC symbol: Line fits into a circle? No.
    // Let's copy the visual from Image 1: Line vertical. Small diagonal cross for mechanism.

    // Vertical Line (closed state representation for diagram)
    // doc.moveTo(0, -5).lineTo(0, 5).stroke();

    // Mechanism: "X" on the line
    doc.moveTo(-3, -3).lineTo(3, 3).stroke();
    doc.moveTo(3, -3).lineTo(-3, 3).stroke();

    // Thermal (Square)
    doc.rect(-4, 3, 8, 8).stroke();

    // Magnetic (Semi-circle on top of square? or inside?)
    // Reference Image 1: It's small. 
    // Let's stick to the previous implementation which was clean: Switch blade + X + Square.

    // Re-doing strictly:
    doc.strokeColor('black'); // Back to black by default unless specified, but user images were red.
    // Let's use Red for the symbol to match the "Reference" they liked.
    doc.strokeColor('#cc0000');

    // Line In
    doc.moveTo(0, -15).lineTo(0, -5).stroke();

    // Switch Element
    doc.moveTo(0, -5).lineTo(6, 4).stroke(); // Blade
    doc.moveTo(0, 4).lineTo(0, 15).stroke(); // Line Out

    // "X" (Automatic)
    doc.moveTo(1, -2).lineTo(5, 2).stroke();
    doc.moveTo(5, -2).lineTo(1, 2).stroke();

    // Thermal/Magnetic Box
    // doc.rect(2, -6, 6, 6).stroke(); // Replaced with separate triggers if needed, but box is common

    // Proper IEC:
    // Thermal: Semi-circle
    // Magnetic: 
    // Let's keep it simple: "PIA" symbol.
    doc.rect(-3, -3, 6, 6).stroke(); // Small box on the line?

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
    doc.strokeColor('#cc0000');
    doc.lineWidth(1);

    // Line In/Out
    doc.moveTo(0, -15).lineTo(0, 15).stroke();

    // Switch Blade
    // doc.moveTo(0, -5).lineTo(8, -15).stroke(); // Open style

    // Toroid (Oval)
    doc.ellipse(0, 0, 10, 5).stroke();

    // Trip Linkage (Dashed line from oval to switch)
    doc.dash(1, { space: 1 });
    doc.moveTo(0, -5).lineTo(2, -10).stroke(); // Visual indication
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
    doc.strokeColor('#cc0000');

    // Line from bus
    doc.moveTo(0, -15).lineTo(0, 0).stroke();

    // Box
    doc.rect(-8, 0, 16, 16).stroke();

    // Varistor spacing
    // Ground connection
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

        // Recursively draw differentials and circuits
        // ... (Logic from pdfService adapted here)

        // Simplified loop for now to verify integration
        const differentials = data.cuadros?.[0]?.differentials || [];
        let busStartX = currentX;
        let busEndX = currentX;

        differentials.forEach((diff: any, idx: number) => {
            const numCircs = Math.max(1, diff.circuits?.length || 1);
            const blockSize = numCircs * CIRCUIT_SPACING;
            const diffCenterX = currentX + (blockSize / 2);

            // Diff
            doc.lineWidth(1).strokeColor('black');
            doc.moveTo(diffCenterX, MAIN_BUS_Y).lineTo(diffCenterX, DIFF_Y).stroke();
            drawDiferencial(doc, diffCenterX, DIFF_Y, diff.name, diff.amperage, diff.sensitivity, 2);

            // Sub Bus
            doc.moveTo(diffCenterX, DIFF_Y + 15).lineTo(diffCenterX, SUB_BUS_Y).stroke();

            // Circuits
            const startCircX = currentX + (CIRCUIT_SPACING / 2);
            const endCircX = currentX + ((numCircs - 1) * CIRCUIT_SPACING) + (CIRCUIT_SPACING / 2);
            doc.lineWidth(2).strokeColor('black').moveTo(startCircX, SUB_BUS_Y).lineTo(endCircX, SUB_BUS_Y).stroke();

            diff.circuits?.forEach((circ: any, cIdx: number) => {
                const circX = currentX + (cIdx * CIRCUIT_SPACING) + (CIRCUIT_SPACING / 2);
                doc.lineWidth(1).strokeColor('black').moveTo(circX, SUB_BUS_Y).lineTo(circX, CIRC_Y).stroke();
                drawMagnetotermico(doc, circX, CIRC_Y, circ.name, circ.amperage, circ.poles);

                // Vertical Text Desc
                doc.save();
                doc.translate(circX, CIRC_TEXT_Y);
                doc.rotate(-90);
                doc.font('Helvetica').fontSize(7).fillColor('black');
                doc.text(`${circ.description} (${circ.section}mm²)`, 0, 0);
                doc.restore();
            });

            currentX += blockSize + 20; // Spacing between diff blocks
            busEndX = currentX - 20;
        });

        // Main Bus Draw
        doc.lineWidth(3).strokeColor('black');
        doc.moveTo(busStartX, MAIN_BUS_Y).lineTo(busEndX, MAIN_BUS_Y).stroke();

        doc.end();
        stream.on('finish', () => resolve(outputPath));
        stream.on('error', reject);
    });
};
