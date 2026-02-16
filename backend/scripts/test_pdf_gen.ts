
import { generateSchematicPDF } from '../src/services/pdfService';
import path from 'path';
import fs from 'fs';

const mockData = {
    cuadros: [
        {
            name: "Cuadro General MOCK",
            mainBreaker: { amperage: 40, poles: 2 },
            differentials: [
                {
                    id: "d1",
                    amperage: 40,
                    sensitivity: 30,
                    description: "General Housing",
                    circuits: [
                        { id: "c1", name: "C1", amperage: 10, section: 1.5, description: "Lighting" },
                        { id: "c2", name: "C2", amperage: 16, section: 2.5, description: "Sockets" },
                        { id: "c3", name: "C3", amperage: 20, section: 4, description: "Washing Machine" }
                    ]
                },
                {
                    id: "d2",
                    amperage: 25,
                    sensitivity: 30,
                    description: "Wet Areas",
                    circuits: [
                        { id: "c4", name: "C4", amperage: 16, section: 2.5, description: "Bathroom" }
                    ]
                }
            ]
        }
    ]
};

const outputDir = path.join(__dirname, '../temp_output');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const outputPath = path.join(outputDir, 'test_schematic.pdf');

async function run() {
    console.log("Generating test PDF...");
    try {
        await generateSchematicPDF(mockData, outputPath);
        console.log(`PDF generated successfully at: ${outputPath}`);
    } catch (error) {
        console.error("Error generating PDF:", error);
    }
}

run();
