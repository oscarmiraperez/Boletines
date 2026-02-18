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

    doc.moveTo(0, -12).lineTo(0, -4).stroke();
    doc.moveTo(0, -4).lineTo(6, 4).stroke();
    doc.moveTo(0, 4).lineTo(0, 12).stroke();
    doc.moveTo(-3, 4).bezierCurveTo(-3, 0, 3, 0, 3, 4).stroke();

    doc.restore();

    if (label) drawSymbolText(doc, label, x, y - 22, 7, 'center');
    doc.font('Helvetica').fontSize(6);
    doc.text(`${amperage}A`, x + 8, y - 3);
    doc.text(`${poles}P`, x + 8, y + 3);
};

const drawDiferencial = (doc: PDFKit.PDFDocument, x: number, y: number, label: string, amperage: number, sensitivity: number, type: string = 'AC') => {
    doc.save();
    doc.translate(x, y);
    doc.strokeColor('black').lineWidth(1);

    doc.moveTo(0, -12).lineTo(0, -4).stroke();
    doc.moveTo(0, -4).lineTo(7, 5).stroke();
    doc.moveTo(0, 5).lineTo(0, 12).stroke();
    doc.circle(0, 0, 8).stroke();

    doc.restore();

    if (label) drawSymbolText(doc, label, x, y - 22, 7, 'center');
    doc.font('Helvetica').fontSize(6);
    doc.text(`ID ${amperage}A`, x + 9, y - 5);
    doc.text(`${sensitivity}mA`, x + 9, y + 1);

    // Bold type letter (Spec 3.2)
    doc.font('Helvetica-Bold').fontSize(7).text(type, x + 9, y + 7);
};

const drawContinuityArrow = (doc: PDFKit.PDFDocument, x: number, y: number, ref: number, direction: 'right' | 'left') => {
    doc.save();
    doc.translate(x, y);
    doc.lineWidth(1).strokeColor('black');
    if (direction === 'right') {
        doc.moveTo(0, 0).lineTo(15, 0).stroke();
        doc.moveTo(10, -5).lineTo(15, 0).lineTo(10, 5).stroke();
        doc.font('Helvetica-Bold').fontSize(10).text(ref.toString(), 18, -4);
    } else {
        doc.moveTo(0, 0).lineTo(-15, 0).stroke();
        doc.moveTo(-10, -5).lineTo(-15, 0).lineTo(-10, 5).stroke();
        doc.font('Helvetica-Bold').fontSize(10).text(ref.toString(), -28, -4);
    }
    doc.restore();
};

export const generateUnifilarA3 = async (data: any, outputPath: string) => {
    return new Promise((resolve, reject) => {
        const mainCuadro = data.cuadros?.[0] || {};
        const derivation = data.derivacion || {};

        // Helper to flatten
        const flattenToClassic = (roots: any[]) => {
            const iga = roots.find(d => d.tipo === 'magnetotermico' && d.etiqueta_texto?.toUpperCase().includes('IGA'));
            const diffs: any[] = [];
            const findDiffs = (nodes: any[]) => {
                nodes.forEach(node => {
                    if (node.tipo === 'diferencial') {
                        const circuits: any[] = [];
                        const traverseForFinals = (n: any) => {
                            if (n.tipo === 'final_circuito') circuits.push(n);
                            else if (n.hijos) n.hijos.forEach((h: any) => {
                                if (n.tipo === 'magnetotermico' && h.tipo === 'final_circuito') {
                                    h._parentAmperage = n.calibre_A;
                                    h._parentPoles = n.num_polos;
                                }
                                traverseForFinals(h);
                            });
                        };
                        traverseForFinals(node);
                        diffs.push({
                            name: node.etiqueta_texto || 'DIF',
                            amperage: node.calibre_A || 40,
                            sensitivity: node.sensibilidad_mA || 30,
                            type: node.tipo_diferencial || 'AC',
                            circuits: circuits.map(c => ({
                                name: c.codigo_circuito || '',
                                description: c.nombre_circuito_final || c.etiqueta_texto || '',
                                amperage: c._parentAmperage || 16,
                                poles: c._parentPoles || 2,
                                section: c.seccion || 2.5
                            }))
                        });
                    } else if (node.hijos) findDiffs(node.hijos);
                });
            };
            findDiffs(roots);
            return { iga: iga || roots[0], diffs };
        };

        const { iga, diffs: flattenedDiffs } = flattenToClassic(mainCuadro.dispositivos || []);

        // Spec 8.1: A4 vs A3
        const totalCircuits = flattenedDiffs.reduce((acc, d) => acc + (d.circuits?.length || 0), 0);
        const circuitW = 60;
        const requiredW = 200 + totalCircuits * circuitW;

        const isA3 = requiredW > 700; // threshold for A4 landscape
        const pageSize = isA3 ? 'A3' : 'A4';
        const pageW = isA3 ? 1190.55 : 841.89;
        const pageH = isA3 ? 841.89 : 595.28;

        const doc = new PDFDocument({ margin: 40, size: pageSize, layout: 'landscape' });
        const stream = fs.createWriteStream(outputPath);
        doc.pipe(stream);

        const MARGIN = 40;
        const HEADER_Y = 100;
        const MAIN_BUS_Y = 160;
        const DIFF_Y = 240;
        const SUB_BUS_Y = 320;
        const CIRC_Y = 370;
        const TEXT_Y = 460;

        const drawPage = (chunk: any[], pNum: number, tPages: number) => {
            if (pNum > 1) doc.addPage({ size: pageSize, layout: 'landscape' });

            // Frame & Cajetin
            doc.lineWidth(1).strokeColor('black').rect(MARGIN, MARGIN, pageW - 2 * MARGIN, pageH - 2 * MARGIN).stroke();
            const bW = 250, bH = 50;
            doc.rect(pageW - MARGIN - bW, pageH - MARGIN - bH, bW, bH).stroke();
            doc.font('Helvetica-Bold').fontSize(10).text('ESQUEMA UNIFILAR', pageW - MARGIN - bW + 10, pageH - MARGIN - bH + 10);
            doc.font('Helvetica').fontSize(7);
            doc.text(`Página: ${pNum}/${tPages}`, pageW - MARGIN - bW + 10, pageH - MARGIN - bH + 25);
            doc.text(`Titular: ${data.clientName || ''}`, pageW - MARGIN - bW + 10, pageH - MARGIN - bH + 35);

            let currentX = MARGIN + 60;

            if (pNum === 1) {
                doc.lineWidth(1).moveTo(MARGIN + 20, HEADER_Y).lineTo(currentX, HEADER_Y).stroke();
                drawMagnetotermico(doc, currentX, HEADER_Y, iga?.etiqueta_texto || 'IGA', iga?.calibre_A || 40, iga?.num_polos || 2);
                if (derivation.texto_nomenclatura) {
                    doc.font('Helvetica-Bold').fontSize(8).text(derivation.texto_nomenclatura, MARGIN + 20, HEADER_Y - 20);
                }
                doc.lineWidth(2).moveTo(currentX, HEADER_Y + 12).lineTo(currentX, MAIN_BUS_Y).stroke();
            } else {
                // Continuation Arrow From Prev
                drawContinuityArrow(doc, MARGIN + 20, MAIN_BUS_Y, pNum - 1, 'left');
                doc.lineWidth(2).moveTo(MARGIN + 20, MAIN_BUS_Y).lineTo(currentX, MAIN_BUS_Y).stroke();
            }

            let startX = currentX;
            chunk.forEach(diff => {
                const bw = Math.max(100, (diff.circuits?.length || 0) * circuitW);
                const midX = currentX + bw / 2;
                doc.lineWidth(1).moveTo(midX, MAIN_BUS_Y).lineTo(midX, DIFF_Y).stroke();
                drawDiferencial(doc, midX, DIFF_Y, diff.name, diff.amperage, diff.sensitivity, diff.type);
                doc.moveTo(midX, DIFF_Y + 12).lineTo(midX, SUB_BUS_Y).stroke();

                const cX = currentX + circuitW / 2;
                const lX = currentX + (diff.circuits.length - 1) * circuitW + circuitW / 2;
                doc.lineWidth(2).moveTo(cX, SUB_BUS_Y).lineTo(lX, SUB_BUS_Y).stroke();

                diff.circuits.forEach((circ: any, idx: number) => {
                    const x = currentX + idx * circuitW + circuitW / 2;
                    doc.lineWidth(1).moveTo(x, SUB_BUS_Y).lineTo(x, CIRC_Y).stroke();
                    drawMagnetotermico(doc, x, CIRC_Y, circ.name, circ.amperage, circ.poles);
                    doc.moveTo(x, CIRC_Y + 12).lineTo(x, TEXT_Y - 5).stroke();
                    doc.font('Helvetica').fontSize(6).text(circ.description, x - 25, TEXT_Y, { width: 50, align: 'center' });
                    doc.text(`${circ.section || ''} mm²`, x - 25, TEXT_Y + 25, { width: 50, align: 'center' });
                });
                currentX += bw + 20;
            });
            doc.lineWidth(2).moveTo(startX, MAIN_BUS_Y).lineTo(currentX - 20, MAIN_BUS_Y).stroke();

            if (pNum < tPages) {
                drawContinuityArrow(doc, currentX, MAIN_BUS_Y, pNum, 'right');
            }
        };

        const maxCircuitsPerPage = isA3 ? 14 : 8;
        const chunks: any[][] = [];
        let curr: any[] = [];
        let cCount = 0;
        flattenedDiffs.forEach(d => {
            const count = d.circuits?.length || 0;
            if (cCount + count > maxCircuitsPerPage && curr.length > 0) {
                chunks.push(curr);
                curr = [];
                cCount = 0;
            }
            curr.push(d);
            cCount += count;
        });
        if (curr.length > 0) chunks.push(curr);
        if (chunks.length === 0) chunks.push([]);

        chunks.forEach((chunk, i) => drawPage(chunk, i + 1, chunks.length));
        doc.end();
        stream.on('finish', () => resolve(outputPath));
        stream.on('error', reject);
    });
};
