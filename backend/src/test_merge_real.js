
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { PDFDocument: PDFLibDocument } = require('pdf-lib');

const run = async () => {
    try {
        const outputDir = path.join(process.cwd(), 'generated_docs');
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        const schematicPath = path.join(outputDir, 'test_schematic_real.pdf');
        // Use REAL template
        const templatePath = path.join(process.cwd(), 'templates/memoria en blanco.pdf');

        if (!fs.existsSync(templatePath)) {
            console.error('Template not found:', templatePath);
            return;
        }

        // 1. Generate Schematic with PDFKit
        console.log('Generating Schematic...');
        await new Promise((resolve, reject) => {
            const doc = new PDFDocument({ size: 'A4', margin: 40 });
            const stream = fs.createWriteStream(schematicPath);
            doc.pipe(stream);
            doc.fontSize(20).text('Schematic Content', 100, 100);
            doc.end();
            stream.on('finish', () => resolve());
            stream.on('error', reject);
        });

        // 2. Load Real Template
        console.log('Loading Real Template...');
        const templateBytes = fs.readFileSync(templatePath);
        const pdfDoc = await PDFLibDocument.load(templateBytes);

        console.log('Template loaded. Pages:', pdfDoc.getPageCount());

        // 3. Merge
        console.log('Merging Schematic into Template...');
        const schematicBytes = fs.readFileSync(schematicPath);
        const schematicPdf = await PDFLibDocument.load(schematicBytes);
        console.log('Schematic PDF loaded. Pages:', schematicPdf.getPageCount());

        const copiedPages = await pdfDoc.copyPages(schematicPdf, schematicPdf.getPageIndices());
        copiedPages.forEach((page) => pdfDoc.addPage(page));

        const finalBytes = await pdfDoc.save();
        const finalPath = path.join(outputDir, 'test_merged_real.pdf');
        fs.writeFileSync(finalPath, finalBytes);

        console.log('Merge Real Template Successful!');
        console.log('Final Path:', finalPath);

    } catch (error) {
        console.error('Merge Real Template Failed:', error);
    }
};

run();
