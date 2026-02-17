
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { PDFDocument as PDFLibDocument } from 'pdf-lib';

const run = async () => {
    try {
        const outputDir = path.join(process.cwd(), 'generated_docs');
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

        const schematicPath = path.join(outputDir, 'test_schematic.pdf');
        const mainPath = path.join(outputDir, 'test_main.pdf');

        // 1. Generate Schematic with PDFKit
        console.log('Generating Schematic...');
        await new Promise<void>((resolve, reject) => {
            const doc = new PDFDocument({ size: 'A4', margin: 40 });
            const stream = fs.createWriteStream(schematicPath);
            doc.pipe(stream);
            doc.fontSize(20).text('Schematic Content', 100, 100);
            doc.end();
            stream.on('finish', () => resolve());
            stream.on('error', reject);
        });

        // 2. Generate Main Doc (Mock Template) with PDFLib
        console.log('Generating Main Doc...');
        const mainDoc = await PDFLibDocument.create();
        const page = mainDoc.addPage();
        page.drawText('Main Document Content');
        const mainBytes = await mainDoc.save();
        fs.writeFileSync(mainPath, mainBytes);

        // 3. Merge
        console.log('Merging...');
        const pdfDoc = await PDFLibDocument.load(fs.readFileSync(mainPath));

        const schematicBytes = fs.readFileSync(schematicPath);
        console.log('Schematic Bytes read:', schematicBytes.length);

        const schematicPdf = await PDFLibDocument.load(schematicBytes);
        console.log('Schematic PDF loaded. Pages:', schematicPdf.getPageCount());

        const copiedPages = await pdfDoc.copyPages(schematicPdf, schematicPdf.getPageIndices());
        copiedPages.forEach((page) => pdfDoc.addPage(page));

        const finalBytes = await pdfDoc.save();
        const finalPath = path.join(outputDir, 'test_merged.pdf');
        fs.writeFileSync(finalPath, finalBytes);

        console.log('Merge Successful!');
        console.log('Final Path:', finalPath);

    } catch (error) {
        console.error('Merge Failed:', error);
    }
};

run();
