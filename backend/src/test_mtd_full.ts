import { fillOfficialMTD } from './services/pdfService';
import path from 'path';
import fs from 'fs';

const testData = {
    clientName: "Juan Pérez",
    clientNif: "12345678Z",
    address: "C/ Mayor 1",
    municipality: "Valencia",
    postalCode: "46001",
    clientEmail: "juan@example.com",
    clientPhone: "600123456",
    contractedPower: 5.75,

    mtdData: {
        // A. Titular
        titularNombre: "Juan Pérez",
        titularNif: "12345678Z",
        direccion: "C/ Mayor 1, Valencia",

        // B. Emplazamiento
        refCatastral: "1234567890RC",
        usoInstalacion: "Vivienda",
        superficie: 100,
        potenciaPrevista: 5750,
        tensionNominal: "230",

        // C.1 Acometida / CGP
        acometidaTipo: "aerea_posada",
        acometidaPuntoConexion: "Poste P1",
        cgpUbicacion: "fachada",
        cgpEsquema: "PNZ-123",
        cgpIntensidad: 40,

        // C.2 LGA
        lgaMaterial: "cu",
        lgaSeccion: 16,
        lgaAislamiento: "RZ1-K",
        lgaInstalacion: "Bajo tubo",
        lgaDiametroTubo: 63,

        // C.3 Contadores
        numContadores: 1,
        ubicacionContadores: "Armario",

        // C.4 Derivacion Individual
        diInstalacion: "Empotrada",
        diSeccion: 10,
        diMaterial: "cu",
        diAislamiento: "ES07Z1-K",
        diDiametroTubo: 40,
        diLibreHalogenos: true,

        // C.5 Tierra
        tierraElectrodo: "Picas",
        tierraResistencia: 15,
        tierraPuntos: "Patio",
        tierraSeccion: 16,

        // C.7 Contactos Indirectos
        proteccionIndirecta: "Diferencial",

        // C.8 Sobretensiones
        sobretensiones: "Tipo 2",

        // C.9 Instalaciones Interiores
        instInteriorTipo: "Empotrada",

        // C.10 Locales Húmedos
        localesHumedos: "Baño, Cocina",

        // Instalador
        instaladorNombre: "Pedro Instalador",
        instaladorCategoria: "IBTE",
        instaladorModalidad: "M1, M2"
    },

    cuadros: [
        {
            name: "Cuadro General",
            differentials: [
                {
                    id: "diff1",
                    amperage: 40,
                    sensitivity: 30,
                    poles: 2,
                    description: "General",
                    circuits: [
                        { id: "c1", name: "C1", description: "Iluminación", amperage: 10, section: 1.5 },
                        { id: "c2", name: "C2", description: "Enchufes", amperage: 16, section: 2.5 }
                    ]
                }
            ]
        }
    ],

    verificaciones: {
        continuity: "CORRECTO",
        insulation: "CORRECTO",
        differentialTrip: "CORRECTO",
        earthResistance: "15"
    }
};

const outputPath = path.join(__dirname, '../test_mtd_full.pdf');

async function runTest() {
    console.log("Starting Full MTD PDF Generation Test...");
    try {
        await fillOfficialMTD(testData, outputPath);
        if (fs.existsSync(outputPath)) {
            console.log(`SUCCESS: PDF generated at ${outputPath}`);
        } else {
            console.error("FAILURE: PDF file was not created.");
        }
    } catch (error) {
        console.error("ERROR during PDF generation:", error);
    }
}

runTest();
