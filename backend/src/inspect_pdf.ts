
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

async function inspect() {
    try {
        const pdfPath = path.join(__dirname, '../templates/memoria en blanco.pdf');
        console.log('Reading PDF from:', pdfPath);

        if (!fs.existsSync(pdfPath)) {
            console.error('File not found!');
            return;
        }

        const pdfBytes = fs.readFileSync(pdfPath);
        const pdfDoc = await PDFDocument.load(pdfBytes);

        const form = pdfDoc.getForm();
        const fields = form.getFields();

        const fieldNames = fields.map(f => ({
            name: f.getName(),
            type: f.constructor.name
        }));

        console.log(`Found ${fields.length} fields. Writing to pdf_fields.json...`);
        fs.writeFileSync(path.join(__dirname, '../pdf_fields.json'), JSON.stringify(fieldNames, null, 2));
        console.log('Done.');

    } catch (error) {
        console.error('Error inspecting PDF:', error);
    }
}

inspect();
