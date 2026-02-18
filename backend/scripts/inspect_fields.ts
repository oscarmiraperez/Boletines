import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

async function listFields() {
    const templatePath = path.join(process.cwd(), 'templates', 'F3610 (1).pdf');
    const pdfBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    console.log(`Total fields: ${fields.length}`);
    fields.forEach(f => {
        console.log(`${f.getName()} [${f.constructor.name}]`);
    });
}

listFields();
