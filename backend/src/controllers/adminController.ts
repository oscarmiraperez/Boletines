import { Request, Response } from 'express';
import prisma from '../db';

export const exportData = async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany();
        const clients = await prisma.client.findMany(); // Assuming Client model exists
        const installations = await prisma.installation.findMany();
        const expedientes = await prisma.expediente.findMany();
        const authorizations = await prisma.authorization.findMany();
        const derivaciones = await prisma.derivacionIndividual.findMany();
        const derivacionPhotos = await prisma.derivacionPhoto.findMany();
        const cuadros = await prisma.cuadro.findMany();
        const mainBreakers = await prisma.mainBreaker.findMany();
        const differentials = await prisma.differential.findMany();
        const circuits = await prisma.circuit.findMany();
        const verificaciones = await prisma.verificacion.findMany();
        const documents = await prisma.document.findMany();
        const esquemas = await prisma.esquema.findMany();
        const expedientePhotos = await prisma.expedientePhoto.findMany();

        const data = {
            users,
            clients,
            installations,
            expedientes,
            authorizations,
            derivaciones,
            derivacionPhotos,
            cuadros,
            mainBreakers,
            differentials,
            circuits,
            verificaciones,
            documents,
            esquemas,
            expedientePhotos
        };

        res.json(data);
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Error exporting data' });
    }
};

export const importData = async (req: Request, res: Response) => {
    try {
        const data = req.body;

        // Use a transaction to ensure data integrity
        await prisma.$transaction(async (tx) => {
            // Helper to safely import batch
            const safeImport = async (model: any, rows: any[]) => {
                if (!rows || !rows.length) return;
                for (const row of rows) {
                    // We try to create. If it fails (likely duplicate), we ignore it.
                    // Using findUnique + create is safer than createMany for cross-db compatibility warnings
                    // assuming 'id' is present and is the PK.
                    try {
                        // Check if exists to avoid throwing errors
                        const count = await model.count({ where: { id: row.id } });
                        if (count === 0) {
                            await model.create({ data: row });
                        }
                    } catch (e) {
                        console.warn('Skipping duplicate or error:', row.id, e);
                    }
                }
            };

            await safeImport(tx.user, data.users);
            await safeImport(tx.client, data.clients);
            await safeImport(tx.installation, data.installations);
            await safeImport(tx.expediente, data.expedientes);
            await safeImport(tx.authorization, data.authorizations);
            await safeImport(tx.derivacionIndividual, data.derivaciones);
            await safeImport(tx.derivacionPhoto, data.derivacionPhotos);
            await safeImport(tx.cuadro, data.cuadros);
            await safeImport(tx.mainBreaker, data.mainBreakers);
            await safeImport(tx.differential, data.differentials);
            await safeImport(tx.circuit, data.circuits);
            await safeImport(tx.verificacion, data.verificaciones);
            await safeImport(tx.document, data.documents);
            await safeImport(tx.expedientePhoto, data.expedientePhotos);
            await safeImport(tx.esquema, data.esquemas);
        });

        res.json({ message: 'Data imported successfully' });
    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ error: 'Error importing data', details: String(error) });
    }
};
