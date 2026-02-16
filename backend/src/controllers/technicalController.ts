import { Request, Response } from 'express';
import prisma from '../db';

// --- Derivacion Individual ---

export const upsertDerivacion = async (req: Request, res: Response) => {
    try {
        const { expedienteId } = req.params;
        const { section, material, insulation, channeling, description } = req.body;

        // Check if expediente exists
        const expediente = await prisma.expediente.findUnique({ where: { id: expedienteId } });
        if (!expediente) return res.status(404).json({ error: 'Expediente not found' });

        const derivacion = await prisma.derivacionIndividual.upsert({
            where: { expedienteId },
            update: {
                section,
                material,
                insulation,
                channeling,
                description
            },
            create: {
                expedienteId,
                section,
                material,
                insulation,
                channeling,
                description
            }
        });

        res.json(derivacion);
    } catch (error) {
        res.status(500).json({ error: 'Error saving derivacion data' });
    }
};

// --- Cuadros & Protections ---

export const createCuadro = async (req: Request, res: Response) => {
    try {
        const { expedienteId } = req.params;
        const { name, description } = req.body;

        const cuadro = await prisma.cuadro.create({
            data: {
                expedienteId,
                name,
                description
            }
        });

        res.status(201).json(cuadro);
    } catch (error) {
        res.status(500).json({ error: 'Error creating cuadro' });
    }
};

export const updateCuadroComponents = async (req: Request, res: Response) => {
    try {
        const { cuadroId } = req.params;
        const { mainBreaker, differentials } = req.body;
        // differentials is an array of { poles, amperage, sensitivity, description, circuits: [] }

        // Transaction to replace components
        await prisma.$transaction(async (tx) => {
            // 1. Update Main Breaker
            if (mainBreaker) {
                await tx.mainBreaker.upsert({
                    where: { cuadroId },
                    update: { poles: mainBreaker.poles, amperage: mainBreaker.amperage },
                    create: { cuadroId, poles: mainBreaker.poles, amperage: mainBreaker.amperage }
                });
            }

            // 2. Clear existing differentials and circuits (Simplest strategy for full sync)
            // Note: This deletes data. If preserving IDs is important, we'd need diff logic.
            // For this app, full replacement on save is usually acceptable for these nested lists.
            const existingDiffs = await tx.differential.findMany({ where: { cuadroId }, select: { id: true } });
            const diffIds = existingDiffs.map(d => d.id);

            // Delete circuits linked to these diffs
            await tx.circuit.deleteMany({ where: { differentialId: { in: diffIds } } });
            // Delete differentials
            await tx.differential.deleteMany({ where: { cuadroId } });

            // 3. Create new structure
            for (const diff of differentials) {
                const createdDiff = await tx.differential.create({
                    data: {
                        cuadroId,
                        poles: diff.poles,
                        amperage: diff.amperage,
                        sensitivity: diff.sensitivity,
                        description: diff.description
                    }
                });

                if (diff.circuits && diff.circuits.length > 0) {
                    await tx.circuit.createMany({
                        data: diff.circuits.map((circ: any) => ({
                            cuadroId,
                            differentialId: createdDiff.id,
                            poles: circ.poles,
                            amperage: circ.amperage,
                            description: circ.description
                        }))
                    });
                }
            }
        });

        const updatedCuadro = await prisma.cuadro.findUnique({
            where: { id: cuadroId },
            include: {
                mainBreaker: true,
                differentials: { include: { circuits: true } }
            }
        });

        res.json(updatedCuadro);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error updating quadro components' });
    }
};

export const deleteCuadro = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // Prisma cascading delete should handle sub-resources if configured, 
        // but explicit delete is safer if schema doesn't have onDelete: Cascade
        // Assuming schema relies on default logic, we might need manual cleanup or rely on Relation setup.
        // For now, simple delete.
        await prisma.cuadro.delete({ where: { id } });
        res.json({ message: 'Cuadro deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting cuadro' });
    }
};

// --- Verificaciones ---

export const upsertVerificaciones = async (req: Request, res: Response) => {
    try {
        const { expedienteId } = req.params;
        const { continuity, insulation, earthResistance, differentialTrip, notes } = req.body;

        const verificacion = await prisma.verificacion.upsert({
            where: { expedienteId },
            update: {
                continuity,
                insulation,
                earthResistance,
                differentialTrip,
                notes
            },
            create: {
                expedienteId,
                continuity,
                insulation,
                earthResistance,
                differentialTrip,
                notes
            }
        });

        res.json(verificacion);
    } catch (error) {
        res.status(500).json({ error: 'Error saving verificaciones' });
    }
};

export const uploadCuadroPhoto = async (req: Request, res: Response) => {
    try {
        const { cuadroId } = req.params;
        const { type } = req.body; // 'frontal' or 'interior'

        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        if (!['frontal', 'interior'].includes(type) && type !== undefined) return res.status(400).json({ error: 'Invalid photo type' });

        // If type is not provided in body, maybe infer from fieldname? 
        // But let's assume client sends 'type' in body (FormData text field)

        // Actually, let's just update based on the 'type' field
        const updateData: any = {};
        // We save the filename so we can serve it via static route /uploads/:filename
        if (type === 'frontal') updateData.photoFrontal = req.file.filename;
        else if (type === 'interior') updateData.photoInterior = req.file.filename;
        else return res.status(400).json({ error: 'Invalid photo type' });

        const cuadro = await prisma.cuadro.update({
            where: { id: cuadroId },
            data: updateData
        });

        res.json({ message: 'Photo uploaded', filename: req.file.filename, cuadro });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error uploading photo' });
    }
};
