import PDFDocument from 'pdfkit';
import fs from 'fs';

// --- CONSTANTS ---
const PAGE_WIDTH = 1190.55; // A3 Landscape
const PAGE_HEIGHT = 841.89;
const MARGIN = 40;

// Y Positions
const HEADER_Y = 100;
const MAIN_BUS_Y = 180;
const DIFF_Y = 260;
const SUB_BUS_Y = 340;
const CIRC_Y = 390;
const TABLE_START_Y = 550;

const CIRCUIT_WIDTH = 55;
const BLOCK_GAP = 15;

// --- SYMBOL DRAWING HELPERS ---

const drawSymbolText = (doc: PDFKit.PDFDocument, text: string, x: number, y: number, fontSize: number = 7, align: 'center' | 'left' | 'right' = 'center') => {
    doc.save();
    doc.font('Helvetica').fontSize(fontSize).fillColor('black');
    doc.text(text, x - 25, y, { width: 50, align });
    doc.restore();
};

const drawMagnetotermico = (doc: PDFKit.PDFDocument, x: number, y: number, label: string, amperage: number, poles: number) => {
    doc.save();
    doc.translate(x, y);
    doc.lineWidth(1).strokeColor('black');

    // Classic Representation
    doc.moveTo(0, -12).lineTo(0, -4).stroke(); // Top line
    doc.moveTo(0, -4).lineTo(6, 4).stroke();   // Switch blade
    doc.moveTo(0, 4).lineTo(0, 12).stroke();   // Bottom line

    // Thermal/Magnetic hook (Bezier instead of arc to avoid lint/missing prop)
    doc.moveTo(-3, 4).bezierCurveTo(-3, 0, 3, 0, 3, 4).stroke();

    doc.restore();

    if (label) drawSymbolText(doc, label, x, y - 22, 7, 'center');
    doc.font('Helvetica').fontSize(6);
    doc.text(`${amperage}A`, x + 8, y - 3);
    doc.text(`${poles}P`, x + 8, y + 3);
};

const drawDiferencial = (doc: PDFKit.PDFDocument, x: number, y: number, label: string, amperage: number, sensitivity: number) => {
    doc.save();
    doc.translate(x, y);
    doc.strokeColor('black').lineWidth(1);

    doc.moveTo(0, -12).lineTo(0, -4).stroke();
    doc.moveTo(0, -4).lineTo(7, 5).stroke(); // Blade
    doc.moveTo(0, 5).lineTo(0, 12).stroke();

    // Toroid
    doc.circle(0, 0, 8).stroke();

    doc.restore();

    if (label) drawSymbolText(doc, label, x, y - 22, 7, 'center');
    doc.font('Helvetica').fontSize(6);
    doc.text(`ID ${amperage}A`, x + 9, y - 3);
    doc.text(`${sensitivity}mA`, x + 9, y + 3);
};

const drawSurgeProtection = (doc: PDFKit.PDFDocument, x: number, y: number) => {
    doc.save();
    doc.translate(x, y);
    doc.strokeColor('black').lineWidth(1);
    doc.moveTo(0, -12).lineTo(0, 0).stroke();
    doc.rect(-8, 0, 16, 16).stroke();
    doc.moveTo(0, 16).lineTo(0, 22).stroke();
    // Ground
    doc.moveTo(-6, 22).lineTo(6, 22).stroke();
    doc.moveTo(-4, 24).lineTo(4, 24).stroke();
    doc.restore();
    drawSymbolText(doc, 'P. Sobretens.', x, y + 30, 6, 'center');
};

const drawCajetin = (doc: PDFKit.PDFDocument, data: any, pageNum: number, totalPages: number) => {
    const boxW = 400;
    const boxH = 70;
    const x = PAGE_WIDTH - MARGIN - boxW;
    const y = PAGE_HEIGHT - MARGIN - boxH;

    doc.save();
    doc.lineWidth(1).strokeColor('black');
    doc.rect(x, y, boxW, boxH).stroke();

    doc.font('Helvetica-Bold').fontSize(12).text('ESQUEMA UNIFILAR', x + 10, y + 10);
    doc.font('Helvetica').fontSize(8);
    doc.text(`Titular: ${data.clientName || ''}`, x + 10, y + 30);
    doc.text(`Dirección: ${data.address || ''}`, x + 10, y + 42);
    doc.text(`Expediente: ${data.expedienteId || data.code || ''}`, x + 10, y + 54);

    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, x + 280, y + 30);
    doc.font('Helvetica-Bold').text(`PLANO Nº: ${pageNum}/${totalPages}`, x + 280, y + 54);

    doc.restore();
};

// --- MAIN GENERATOR FUNCTION ---

export const generateUnifilarA3 = async (data: any, outputPath: string) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 40, size: 'A3', layout: 'landscape' });
        const stream = fs.createWriteStream(outputPath);
        doc.pipe(stream);

        const MARGIN = 40;
        const PAGE_WIDTH = 1190.55;
        const PAGE_HEIGHT = 841.89;

        // Y Positions (Classic)
        const HEADER_Y = 120;
        const MAIN_BUS_Y = 200;
        const DIFF_Y = 280;
        const SUB_BUS_Y = 360;
        const CIRC_Y = 410;
        const TEXT_Y = 500;

        const CIRCUIT_W = 60;
        const DIFF_BLOCK_MIN_W = 100;

        const mainCuadro = data.cuadros?.[0] || {};
        const differentials = mainCuadro.differentials || [];
        const mainBreaker = mainCuadro.mainBreaker || { amperage: 40, poles: 2 };

        let currentPage = 1;

        const drawFrame = (pNum: number) => {
            doc.lineWidth(1).strokeColor('black').rect(MARGIN, MARGIN, PAGE_WIDTH - 2 * MARGIN, PAGE_HEIGHT - 2 * MARGIN).stroke();
            // Simple Title Block
            const bW = 300, bH = 60;
            const bX = PAGE_WIDTH - MARGIN - bW;
            const bY = PAGE_HEIGHT - MARGIN - bH;
            doc.rect(bX, bY, bW, bH).stroke();
            doc.font('Helvetica-Bold').fontSize(12).text('ESQUEMA UNIFILAR', bX + 10, bY + 10);
            doc.font('Helvetica').fontSize(8);
            doc.text(`Expediente: ${data.code || ''}`, bX + 10, bY + 30);
            doc.text(`Página: ${pNum}`, bX + 240, bY + 45);
        };

        const drawPage = (diffs: any[], pNum: number) => {
            doc.addPage({ size: 'A3', layout: 'landscape' });
            drawFrame(pNum);

            let currentX = MARGIN + 100;

            // IGA (Only on page 1)
            if (pNum === 1) {
                doc.lineWidth(1).strokeColor('black');
                doc.moveTo(MARGIN + 40, HEADER_Y).lineTo(currentX, HEADER_Y).stroke();
                drawMagnetotermico(doc, currentX, HEADER_Y, 'IGA', mainBreaker.amperage, mainBreaker.poles);
                drawSurgeProtection(doc, currentX + 50, HEADER_Y);
                doc.lineWidth(2).moveTo(currentX, HEADER_Y + 12).lineTo(currentX, MAIN_BUS_Y).stroke();
            } else {
                doc.lineWidth(2).moveTo(MARGIN + 20, MAIN_BUS_Y).lineTo(currentX, MAIN_BUS_Y).stroke();
            }

            let busStartX = currentX;
            let busEndX = currentX;

            diffs.forEach((diff) => {
                const circs = diff.circuits || [];
                const blockW = Math.max(DIFF_BLOCK_MIN_W, circs.length * CIRCUIT_W);
                const midX = currentX + blockW / 2;

                // Drop to Diff
                doc.lineWidth(1).moveTo(midX, MAIN_BUS_Y).lineTo(midX, DIFF_Y).stroke();
                drawDiferencial(doc, midX, DIFF_Y, diff.name, diff.amperage, diff.sensitivity);

                // Diff to Sub-bus
                doc.moveTo(midX, DIFF_Y + 12).lineTo(midX, SUB_BUS_Y).stroke();

                if (circs.length > 0) {
                    const firstX = currentX + CIRCUIT_W / 2;
                    const lastX = currentX + (circs.length - 1) * CIRCUIT_W + CIRCUIT_W / 2;
                    doc.lineWidth(2).moveTo(firstX, SUB_BUS_Y).lineTo(lastX, SUB_BUS_Y).stroke();

                    circs.forEach((circ: any, cIdx: number) => {
                        const cx = currentX + cIdx * CIRCUIT_W + CIRCUIT_W / 2;
                        doc.lineWidth(1).moveTo(cx, SUB_BUS_Y).lineTo(cx, CIRC_Y).stroke();
                        drawMagnetotermico(doc, cx, CIRC_Y, circ.name, circ.amperage, circ.poles);

                        // Line to text
                        doc.moveTo(cx, CIRC_Y + 12).lineTo(cx, TEXT_Y - 5).stroke();
                        doc.font('Helvetica').fontSize(7);
                        doc.text(circ.description || '', cx - 25, TEXT_Y, { width: 50, align: 'center' });
                        doc.text(`${circ.section || ''}mm²`, cx - 25, TEXT_Y + 30, { width: 50, align: 'center' });
                    });
                }

                currentX += blockW + 20;
                busEndX = currentX - 20;
            });

            doc.lineWidth(2).moveTo(busStartX, MAIN_BUS_Y).lineTo(busEndX, MAIN_BUS_Y).stroke();
        };

        // Split diffs into pages of ~12 circuits
        const chunks: any[][] = [];
        let curr: any[] = [];
        let cCount = 0;
        differentials.forEach(d => {
            const count = (d.circuits || []).length;
            if (cCount + count > 12 && curr.length > 0) {
                chunks.push(curr);
                curr = [];
                cCount = 0;
            }
            curr.push(d);
            cCount += Math.max(2, count); // count blocks 
        });
        if (curr.length > 0) chunks.push(curr);
        if (chunks.length === 0) chunks.push([]);

        chunks.forEach((chunk, i) => drawPage(chunk, i + 1));

        doc.end();
        stream.on('finish', () => resolve(outputPath));
        stream.on('error', reject);
    });
};
