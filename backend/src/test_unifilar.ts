import { generateSchematicPDF } from './services/pdfService';
import path from 'path';
import fs from 'fs';

const testData = {
    id: "test-001",
    origen: "editor_suelto",
    derivacion: {
        tension: 230,
        seccion: 6,
        material: "Cu",
        aislamiento: "RZ1-K",
        texto_nomenclatura: "2x6 mm2 Cu RZ1-K AS"
    },
    cuadros: [
        {
            id: "cuadro-1",
            name: "Cuadro General",
            dispositivos: [
                {
                    id: "iga-1",
                    tipo: "magnetotermico",
                    num_polos: 2,
                    calibre_A: 40,
                    etiqueta_texto: "IGA 40A",
                    hijos: [
                        {
                            id: "diff-1",
                            tipo: "diferencial",
                            num_polos: 2,
                            calibre_A: 40,
                            sensibilidad_mA: 30,
                            tipo_diferencial: "AC",
                            etiqueta_texto: "Diferencial 1",
                            hijos: [
                                {
                                    id: "p1",
                                    tipo: "magnetotermico",
                                    num_polos: 2,
                                    calibre_A: 10,
                                    etiqueta_texto: "Magneto 10A",
                                    hijos: [
                                        {
                                            id: "f1",
                                            tipo: "final_circuito",
                                            uso_base: "Alumbrado",
                                            nombre_circuito_final: "Alumbrado",
                                            codigo_circuito: "C1",
                                            etiqueta_texto: "Alumbrado",
                                            hijos: []
                                        }
                                    ]
                                }
                            ]
                        }
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
