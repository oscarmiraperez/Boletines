import { generateSchematicPDF } from './services/pdfService';
import path from 'path';
import fs from 'fs';

const testData = {
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
                        { name: "C3", description: "Cocina", amperage: 25, poles: 2, section: 6 },
                        { name: "C4", description: "Lavadora", amperage: 20, poles: 2, section: 4 },
                        { name: "C5", description: "Baño", amperage: 16, poles: 2, section: 2.5 },
                    ]
                },
                {
                    amperage: 25,
                    sensitivity: 30,
                    poles: 2,
                    circuits: [
                        { name: "C6", description: "Aire Acondicionado", amperage: 20, poles: 2, section: 4 },
                    ]
                }
            ]
        }
    ]
};

const outputPath = path.join(__dirname, '../test_unifilar_output.pdf');

async function runTest() {
    console.log("Starting Unifilar PDF Generation Test...");
    try {
        await generateSchematicPDF(testData, outputPath);
        if (fs.existsSync(outputPath)) {
            const stats = fs.statSync(outputPath);
            console.log(`SUCCESS: PDF generated at ${outputPath}`);
            console.log(`Size: ${stats.size} bytes`);
        } else {
            console.error("FAILURE: PDF file was not created.");
        }
    } catch (error) {
        console.error("ERROR during PDF generation:", error);
    }
}

runTest();
