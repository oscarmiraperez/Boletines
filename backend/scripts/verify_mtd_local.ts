
import { fillOfficialMTD } from '../src/services/pdfService';
import path from 'path';
import fs from 'fs';

async function test() {
    const templatePath = path.join(__dirname, '../templates/F3610 (1).pdf');
    const outputPath = path.join(__dirname, '../test_mtd_output.pdf');

    const mockData = {
        clientName: "CLIENTE DE PRUEBA SL",
        clientNif: "B12345678",
        address: "CALLE FALSA 123",
        municipality: "SAN VICENTE DEL RASPEIG",
        postalCode: "03690",
        contractedPower: 5.75,
        cuadros: [
            {
                name: "Cuadro Principal",
                mainBreaker: { amperage: 40, poles: 2 },
                differentials: [
                    {
                        name: "ID 1", amperage: 40, sensitivity: 30, poles: 2, circuits: [
                            { name: "C1", amperage: 16, poles: 2, section: 2.5, description: "ALUMBRADO" },
                            { name: "C2", amperage: 16, poles: 2, section: 2.5, description: "TOmas de uso general" },
                            { name: "C3", amperage: 25, poles: 2, section: 6, description: "COCINA Y HORNO" },
                            { name: "C4", amperage: 20, poles: 2, section: 4, description: "LAVADORA Y LAVAVAJILLAS" },
                            { name: "C5", amperage: 16, poles: 2, section: 2.5, description: "BAOS Y AUXILIAR COCINA" }
                        ]
                    },
                    {
                        name: "ID 2", amperage: 40, sensitivity: 30, poles: 2, circuits: [
                            { name: "C6", amperage: 16, poles: 2, section: 2.5, description: "AIRE ACONDICIONADO" },
                            { name: "C7", amperage: 16, poles: 2, section: 2.5, description: "SECADORA" },
                            { name: "C8", amperage: 10, poles: 2, section: 1.5, description: "EXTERIORES" },
                            { name: "C9", amperage: 16, poles: 2, section: 2.5, description: "GARAJE" },
                            { name: "C10", amperage: 16, poles: 2, section: 2.5, description: "HABITACIONES" }
                        ]
                    },
                    {
                        name: "ID 3", amperage: 40, sensitivity: 30, poles: 2, circuits: [
                            { name: "C11", amperage: 16, poles: 2, section: 2.5, description: "PISCINA" },
                            { name: "C12", amperage: 16, poles: 2, section: 2.5, description: "ILUMINACION EXTERIOR" },
                            { name: "C13", amperage: 16, poles: 2, section: 2.5, description: "TOMAS AUXILIARES" },
                            { name: "C14", amperage: 25, poles: 2, section: 6, description: "CARGA VEHICULO ELECTRICO" },
                            { name: "C15", amperage: 16, poles: 2, section: 2.5, description: "TRASTERO" }
                        ]
                    },
                    {
                        name: "ID 4", amperage: 40, sensitivity: 30, poles: 2, circuits: [
                            { name: "C16", amperage: 16, poles: 2, section: 2.5, description: "SOTANO" },
                            { name: "C17", amperage: 16, poles: 2, section: 2.5, description: "BUHARDILLA" },
                            { name: "C18", amperage: 16, poles: 2, section: 2.5, description: "LUCES EMERGENCIA" },
                            { name: "C19", amperage: 40, poles: 4, section: 10, description: "SUB-CUADRO GARAJE" }
                        ]
                    }
                ]
            }
        ],
        mtdData: {
            refCatastral: "1234567890ABCDE",
            potenciaPrevista: 5.75,
            usoInstalacion: "Vivienda",
            superficie: 90,
            cgpEsquema: "Esquema 2",
            cgpIntensidad: 63,
            diMaterial: "Cobre",
            diAislamiento: "RZ1-K",
            diSeccion: 16,
            diDiametroTubo: 40,
            tierraResistencia: 12
        },
        verificaciones: {
            earthResistance: 12
        }
    };

    console.log("Starting MTD generation test...");
    try {
        if (!fs.existsSync(templatePath)) {
            console.error(`ERROR: Template not found at ${templatePath}`);
            return;
        }

        await fillOfficialMTD(templatePath, mockData, outputPath);
        console.log(`SUCCESS: PDF generated at ${outputPath}`);
    } catch (err) {
        console.error("FAILED: Error generating PDF:");
        console.error(err);
    }
}

test();
