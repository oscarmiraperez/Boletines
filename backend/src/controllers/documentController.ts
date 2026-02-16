import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { generateAuthorizationPDF, fillOfficialMTD } from '../services/pdfService';
import prisma from '../db';

// Configure Multer for uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

export const upload = multer({ storage: storage });

export const uploadSignature = async (req: Request, res: Response) => {
    try {
        const { expedienteId } = req.params;
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        // Store relative path
        const relativePath = `uploads/${req.file.filename}`;

        // Update Authorization record with signature path
        await prisma.authorization.upsert({
            where: { expedienteId },
            update: { signaturePath: relativePath },
            create: {
                expedienteId,
                signaturePath: relativePath
            }
        });

        res.json({ message: 'Signature uploaded', path: relativePath });
    } catch (error) {
        res.status(500).json({ error: 'Error uploading signature' });
    }
};

export const uploadDNI = async (req: Request, res: Response) => {
    try {
        const { expedienteId } = req.params;
        if (!req.file) {
            console.error('uploadDNI: No file received');
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log('uploadDNI: File received', req.file.filename);

        // Store relative path
        const relativePath = `uploads/${req.file.filename}`;

        await prisma.authorization.upsert({
            where: { expedienteId },
            update: { idCardPath: relativePath },
            create: {
                expedienteId,
                idCardPath: relativePath
            }
        });

        res.json({ message: 'DNI uploaded', path: relativePath });
    } catch (error) {
        console.error('Error uploading DNI:', error);
        res.status(500).json({ error: 'Error uploading DNI' });
    }
};

export const generateAuthDoc = async (req: Request, res: Response) => {
    try {
        const { expedienteId } = req.params;

        // Fetch data
        const expediente = await prisma.expediente.findUnique({
            where: { id: expedienteId },
            include: {
                installation: { include: { client: true } },
                authorization: true,
                derivacion: true,
                verificaciones: true,
                cuadros: {
                    include: {
                        mainBreaker: true,
                        differentials: {
                            include: {
                                circuits: true
                            }
                        }
                    }
                }
            }
        });

        if (!expediente) return res.status(404).json({ error: 'Expediente not found' });

        // Resolve paths (handle relative vs absolute)
        const resolvePath = (filePath: string | null | undefined) => {
            if (!filePath) return undefined;
            if (path.isAbsolute(filePath)) return filePath;
            return path.join(process.cwd(), filePath);
        };

        const data = {
            clientName: expediente.installation.client.name,
            clientNif: expediente.installation.client.nif,
            cups: expediente.installation.cups,
            address: `${expediente.installation.address}, ${expediente.installation.municipality}`,
            signaturePath: resolvePath(expediente.authorization?.signaturePath),
            dniPath: resolvePath(expediente.authorization?.idCardPath)
        };

        const outputDir = path.join(__dirname, '../../generated_docs');
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        const outputPath = path.join(outputDir, `auth-${expediente.code}.pdf`);

        await generateAuthorizationPDF(data, outputPath);

        // Save PDF path to DB
        await prisma.authorization.update({
            where: { expedienteId },
            data: { pdfPath: outputPath }
        });

        res.download(outputPath);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error generating PDF' });
    }
};

export const generateMTDDoc = async (req: Request, res: Response) => {
    try {
        const { expedienteId } = req.params;

        const expediente = await prisma.expediente.findUnique({
            where: { id: expedienteId },
            include: {
                installation: { include: { client: true } },
                derivacion: true,
                cuadros: {
                    include: {
                        mainBreaker: true,
                        differentials: {
                            include: {
                                circuits: true
                            }
                        }
                    }
                },
                verificaciones: true // Include verificaciones relation
            }
        });

        if (!expediente) return res.status(404).json({ error: 'Expediente not found' });

        const mtdJson = ((expediente as any).mtdData as any) || {};

        // Map Prisma data to MTD expectations
        const mtdDataMap = {
            // Titular (Allow override)
            titularNombre: mtdJson.titularNombre || expediente.installation.client.name,
            titularNif: mtdJson.titularNif || expediente.installation.client.nif,
            direccion: mtdJson.direccion || expediente.installation.address,

            // ... (fields from mtdData JSON or defaults)
            refCatastral: mtdJson.refCatastral || '',
            usoInstalacion: mtdJson.usoInstalacion || 'Vivienda',
            superficie: mtdJson.superficie || 0,

            potenciaPrevista: mtdJson.potenciaPrevista || expediente.installation.contractedPower,
            tensionNominal: mtdJson.tensionNominal || '230',

            // Acometida 
            acometidaTipo: mtdJson.acometidaTipo || 'aerea_posada',
            acometidaPuntoConexion: mtdJson.acometidaPuntoConexion || '',
            cgpUbicacion: mtdJson.cgpUbicacion || 'fachada',
            cgpEsquema: mtdJson.cgpEsquema || '',
            cgpIntensidad: mtdJson.cgpIntensidad || '',

            // LGA
            lgaMaterial: mtdJson.lgaMaterial || 'cu',
            lgaSeccion: mtdJson.lgaSeccion || 0,
            lgaDiametroTubo: mtdJson.lgaDiametroTubo || 0,
            lgaInstalacion: mtdJson.lgaInstalacion || '',

            // Medida
            medidaSituacion: mtdJson.medidaSituacion || 'individual_unico_usuario',
            medidaUbicacion: mtdJson.medidaUbicacion || '',
            medidaSistema: mtdJson.medidaSistema || 'directa',

            // Derivación Individual
            diInstalacion: mtdJson.diInstalacion || expediente.derivacion?.channeling || '',
            diSeccion: mtdJson.diSeccion || expediente.derivacion?.section || 0,
            diMaterial: mtdJson.diMaterial || (expediente.derivacion?.material === 'COBRE' ? 'cu' : 'al'),
            diAislamiento: mtdJson.diAislamiento || expediente.derivacion?.insulation || '',
            diDiametroTubo: mtdJson.diDiametroTubo || 0,
            diLibreHalogenos: mtdJson.diLibreHalogenos || false,

            // Puesta a Tierra
            tierraElectrodo: mtdJson.tierraElectrodo || 'Picas',
            tierraResistencia: mtdJson.tierraResistencia || expediente.verificaciones?.earthResistance || 20,
            tierraPuntos: mtdJson.tierraPuntos || '',
            tierraSeccion: mtdJson.tierraSeccion || 0,
        };

        const data = {
            clientName: expediente.installation.client.name,
            clientNif: expediente.installation.client.nif,
            cups: expediente.installation.cups,
            address: expediente.installation.address,
            municipality: expediente.installation.municipality,
            postalCode: expediente.installation.postalCode,
            contractedPower: expediente.installation.contractedPower,

            mtdData: mtdDataMap, // Pass the specific mapped data
            cuadros: expediente.cuadros, // Pass full objects for table mapping
            verificaciones: expediente.verificaciones // Include verificaciones relation
        };

        const safeCode = expediente.code.replace(/[^a-zA-Z0-9]/g, '_');
        const outputDir = path.join(process.cwd(), 'generated_docs');
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
        const outputPath = path.join(outputDir, `mtd-${safeCode}.pdf`);

        // Switch to Official Template Filler
        await fillOfficialMTD(data, outputPath);

        res.download(outputPath);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error generating MTD' });
    }
};
