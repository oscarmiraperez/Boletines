import PDFDocument from 'pdfkit';
import fs from 'fs';

// --- CONSTANTS ---
const PAGE_WIDTH = 1190.55; // A3 Landscape (420mm)
const PAGE_HEIGHT = 841.89; // (297mm)
const LEFT_MARGIN_BINDING = 56.7; // 20mm
const OTHER_MARGINS = 28.35;        // 10mm

// Y Positions
const HEADER_Y = 120;      // Origin/IGA height
const MAIN_BUS_Y = 220;    // Main Horizontal Bus
const DIFF_Y = 300;        // Differentials
const SUB_BUS_Y = 400;     // Sub-buses for circuits
const CIRC_Y = 450;        // Circuits (Breakers)
const TABLE_START_Y = 570; // Start of the data table
const TABLE_HEIGHT = 150;  // Height of the table

// Spacing
const CIRCUIT_WIDTH = 60;   // Increased width for better readability
const BLOCK_GAP = 20;

// --- SYMBOL DRAWING HELPERS ---

const drawSymbolText = (doc: PDFKit.PDFDocument, text: string, x: number, y: number, fontSize: number = 7, align: 'center' | 'left' | 'right' = 'center', rotate: boolean = false) => {
    doc.save();
    doc.font('Helvetica').fontSize(fontSize).fillColor('black');
    if (rotate) {
        doc.translate(x, y);
        doc.rotate(-90);
        doc.text(text, 0, 0, { align: 'left' });
    } else {
        doc.text(text, x - 30, y, { width: 60, align });
    }
    doc.restore();
};

const drawMagnetotermico = (doc: PDFKit.PDFDocument, x: number, y: number, label: string, amperage: number, poles: number, pdc: string = '6kA') => {
    doc.save();
    doc.translate(x, y);
    doc.lineWidth(1).strokeColor('black');

    // Line In
    doc.moveTo(0, -15).lineTo(0, -5).stroke();
    // Switch Element
    doc.moveTo(0, -5).lineTo(8, 6).stroke(); // Blade
    doc.moveTo(0, 6).lineTo(0, 15).stroke(); // Line Out

    // Thermal/Magnetic indicator (X)
    doc.moveTo(2, -2).lineTo(6, 4).stroke();
    doc.moveTo(6, -2).lineTo(2, 4).stroke();

    doc.restore();

    // Labels
    if (label) drawSymbolText(doc, label, x, y - 25, 7, 'center');
    drawSymbolText(doc, `${amperage}A`, x + 8, y - 2, 7, 'left');
    drawSymbolText(doc, `${poles}P`, x + 8, y + 6, 6, 'left');
};

const drawDiferencial = (doc: PDFKit.PDFDocument, x: number, y: number, label: string, amperage: number, sensitivity: number) => {
    doc.save();
    doc.translate(x, y);
    doc.strokeColor('black').lineWidth(1);

    // Line In/Out
    doc.moveTo(0, -15).lineTo(0, 15).stroke();
    // Toroid
    doc.ellipse(0, 0, 12, 6).stroke();
    // Linkage
    doc.dash(1, { space: 1 });
    doc.moveTo(0, -5).lineTo(4, -12).stroke();
    doc.undash();

    doc.restore();

    // Labels
    if (label) drawSymbolText(doc, label, x, y - 25, 7, 'center');
    drawSymbolText(doc, `ID ${amperage}A`, x + 10, y - 4, 7, 'left');
    drawSymbolText(doc, `${sensitivity}mA`, x + 10, y + 4, 7, 'left');
};

const drawSurgeProtection = (doc: PDFKit.PDFDocument, x: number, y: number) => {
    doc.save();
    doc.translate(x, y);
    doc.strokeColor('black').lineWidth(1);
    doc.moveTo(0, -15).lineTo(0, 0).stroke();
    doc.rect(-10, 0, 20, 20).stroke();
    doc.moveTo(0, 20).lineTo(0, 28).stroke();
    // Ground
    doc.moveTo(-8, 28).lineTo(8, 28).stroke();
    doc.moveTo(-5, 30).lineTo(5, 30).stroke();
    doc.moveTo(-2, 32).lineTo(2, 32).stroke();
    doc.restore();
    drawSymbolText(doc, 'P. Sobretens.', x, y + 40, 6, 'center');
};

const drawProfessionalFrame = (doc: PDFKit.PDFDocument) => {
    doc.save();
    doc.lineWidth(1.5).strokeColor('black');
    // Main boundary (UNE 1035)
    doc.rect(LEFT_MARGIN_BINDING, OTHER_MARGINS, PAGE_WIDTH - LEFT_MARGIN_BINDING - OTHER_MARGINS, PAGE_HEIGHT - (OTHER_MARGINS * 2)).stroke();

    // Grid markers (optional but nice)
    doc.lineWidth(0.5).fontSize(8);
    // Vertical (A, B, C...)
    const vSteps = ['D', 'C', 'B', 'A'];
    vSteps.forEach((label, i) => {
        const y = OTHER_MARGINS + (i + 0.5) * ((PAGE_HEIGHT - 2 * OTHER_MARGINS) / 4);
        doc.text(label, LEFT_MARGIN_BINDING - 15, y);
        doc.text(label, PAGE_WIDTH - OTHER_MARGINS + 5, y);
    });
    // Horizontal (1, 2, 3...)
    for (let i = 1; i <= 8; i++) {
        const x = LEFT_MARGIN_BINDING + (i - 0.5) * ((PAGE_WIDTH - LEFT_MARGIN_BINDING - OTHER_MARGINS) / 8);
        doc.text(i.toString(), x, OTHER_MARGINS - 15);
        doc.text(i.toString(), x, PAGE_HEIGHT - OTHER_MARGINS + 5);
    }
    doc.restore();
};

const drawCajetin = (doc: PDFKit.PDFDocument, data: any, pageNum: number, totalPages: number) => {
    const boxW = 524; // 185mm (UNE Standard)
    const boxH = 90;
    const x = PAGE_WIDTH - OTHER_MARGINS - boxW;
    const y = PAGE_HEIGHT - OTHER_MARGINS - boxH;

    doc.save();
    doc.lineWidth(1).strokeColor('black');
    doc.rect(x, y, boxW, boxH).stroke();

    // Table lines
    doc.moveTo(x, y + 30).lineTo(x + boxW, y + 30).stroke();
    doc.moveTo(x + 350, y).lineTo(x + 350, y + 90).stroke(); // Shift vertical separator
    doc.moveTo(x + 350, y + 45).lineTo(x + boxW, y + 45).stroke();

    // Content
    doc.font('Helvetica-Bold').fontSize(14).text('ESQUEMA UNIFILAR (MTD)', x + 10, y + 10);
    doc.font('Helvetica').fontSize(9);
    doc.text(`Expediente: ${data.expedienteId || 'N/A'}`, x + 360, y + 10);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, x + 360, y + 40);

    doc.text(`Instalación: ${data.address || ''}`, x + 10, y + 40);
    doc.text(`Titular: ${data.clientName || ''}`, x + 10, y + 55);
    doc.text(`Población: ${data.municipality || ''}`, x + 10, y + 70);

    doc.font('Helvetica-Bold').text(`PLANO Nº: ${pageNum} de ${totalPages}`, x + 360, y + 60);
    doc.fontSize(8).text('Escala: S/E', x + 360, y + 75);

    doc.restore();
};

// --- MAIN GENERATOR FUNCTION ---

export const generateUnifilarA3 = async (data: any, outputPath: string) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ autoFirstPage: false, size: 'A3', layout: 'landscape' });
        const stream = fs.createWriteStream(outputPath);
        doc.pipe(stream);

        // Pre-process circuits into pages
        const allDiffs = data.cuadros?.[0]?.differentials || [];
        const pages: any[][] = [];
        let currentPageDiffs: any[] = [];
        let usedWidth = 0;
        const MAX_WIDTH = PAGE_WIDTH - LEFT_MARGIN_BINDING - OTHER_MARGINS - 100;

        allDiffs.forEach((diff: any) => {
            const numCircs = Math.max(1, diff.circuits?.length || 1);
            const blockWidth = numCircs * CIRCUIT_WIDTH + BLOCK_GAP;

            if (usedWidth + blockWidth > MAX_WIDTH && currentPageDiffs.length > 0) {
                pages.push(currentPageDiffs);
                currentPageDiffs = [];
                usedWidth = 0;
            }
            currentPageDiffs.push(diff);
            usedWidth += blockWidth;
        });
        if (currentPageDiffs.length > 0) pages.push(currentPageDiffs);

        // If no pages (no diffs), add one empty
        if (pages.length === 0) pages.push([]);

        // Render Pages
        pages.forEach((pageDiffs, pIdx) => {
            doc.addPage({ size: 'A3', layout: 'landscape' });
            drawProfessionalFrame(doc);
            drawCajetin(doc, data, pIdx + 1, pages.length);

            let currentX = LEFT_MARGIN_BINDING + 60;

            // Page Header (IGA - only on first page or all? Usually all is fine)
            drawMagnetotermico(doc, currentX, HEADER_Y, 'IGA', data.mainBreaker?.amperage || 40, data.mainBreaker?.poles || 2);
            drawSurgeProtection(doc, currentX + 60, HEADER_Y);

            // Connection to Bus
            doc.lineWidth(1.5).strokeColor('black').moveTo(currentX, HEADER_Y + 15).lineTo(currentX, MAIN_BUS_Y).stroke();

            // Table Header Labels
            doc.font('Helvetica-Bold').fontSize(8);
            doc.text('CIRCUITO', LEFT_MARGIN_BINDING + 5, TABLE_START_Y + 10);
            doc.text('CABLE mm²', LEFT_MARGIN_BINDING + 5, TABLE_START_Y + 40);
            doc.text('DESTINO', LEFT_MARGIN_BINDING + 5, TABLE_START_Y + 70);

            // Lines
            doc.lineWidth(1).moveTo(LEFT_MARGIN_BINDING, TABLE_START_Y).lineTo(PAGE_WIDTH - OTHER_MARGINS, TABLE_START_Y).stroke();
            doc.moveTo(LEFT_MARGIN_BINDING, TABLE_START_Y + 30).lineTo(PAGE_WIDTH - OTHER_MARGINS, TABLE_START_Y + 30).stroke();
            doc.moveTo(LEFT_MARGIN_BINDING, TABLE_START_Y + 60).lineTo(PAGE_WIDTH - OTHER_MARGINS, TABLE_START_Y + 60).stroke();
            doc.moveTo(LEFT_MARGIN_BINDING, TABLE_START_Y + 150).lineTo(PAGE_WIDTH - OTHER_MARGINS, TABLE_START_Y + 150).stroke();

            // Draw Diff Blocks
            let busStartX = currentX;
            let busEndX = currentX;

            pageDiffs.forEach((diff, dIdx) => {
                const numCircs = Math.max(1, diff.circuits?.length || 1);
                const blockWidth = numCircs * CIRCUIT_WIDTH;
                const diffCenterX = currentX + (blockWidth / 2);

                // Diff
                doc.lineWidth(1).moveTo(diffCenterX, MAIN_BUS_Y).lineTo(diffCenterX, DIFF_Y).stroke();
                drawDiferencial(doc, diffCenterX, DIFF_Y, diff.name, diff.amperage, diff.sensitivity);

                // Sub-bus
                doc.moveTo(diffCenterX, DIFF_Y + 15).lineTo(diffCenterX, SUB_BUS_Y).stroke();
                const startCX = currentX + (CIRCUIT_WIDTH / 2);
                const endCX = currentX + (numCircs - 1) * CIRCUIT_WIDTH + (CIRCUIT_WIDTH / 2);
                doc.lineWidth(2).moveTo(startCX, SUB_BUS_Y).lineTo(endCX, SUB_BUS_Y).stroke();

                // Circuits
                diff.circuits?.forEach((circ: any, cIdx: number) => {
                    const circX = currentX + cIdx * CIRCUIT_WIDTH + (CIRCUIT_WIDTH / 2);
                    doc.lineWidth(1).moveTo(circX, SUB_BUS_Y).lineTo(circX, CIRC_Y).stroke();
                    drawMagnetotermico(doc, circX, CIRC_Y, circ.name, circ.amperage, circ.poles);

                    // Table Column
                    const colL = circX - (CIRCUIT_WIDTH / 2);
                    const colR = circX + (CIRCUIT_WIDTH / 2);
                    doc.lineWidth(0.5).dash(2, { space: 2 }).moveTo(circX, CIRC_Y + 20).lineTo(circX, TABLE_START_Y).stroke();
                    doc.undash();
                    doc.lineWidth(0.5).moveTo(colR, TABLE_START_Y).lineTo(colR, TABLE_START_Y + 150).stroke();
                    if (dIdx === 0 && cIdx === 0) doc.moveTo(colL, TABLE_START_Y).lineTo(colL, TABLE_START_Y + 150).stroke();

                    // Table Text
                    doc.fontSize(8).font('Helvetica');
                    doc.text(circ.name || '', colL, TABLE_START_Y + 10, { width: CIRCUIT_WIDTH, align: 'center' });
                    doc.text(`${circ.section || ''}`, colL, TABLE_START_Y + 40, { width: CIRCUIT_WIDTH, align: 'center' });
                    doc.fontSize(7).text(circ.description || '', colL + 2, TABLE_START_Y + 70, { width: CIRCUIT_WIDTH - 4, align: 'center' });
                });

                currentX += blockWidth + BLOCK_GAP;
                busEndX = currentX - BLOCK_GAP;
            });

            // Main Bus
            doc.lineWidth(2).moveTo(busStartX, MAIN_BUS_Y).lineTo(busEndX, MAIN_BUS_Y).stroke();
        });

        doc.end();
        stream.on('finish', () => resolve(outputPath));
        stream.on('error', reject);
    });
};
