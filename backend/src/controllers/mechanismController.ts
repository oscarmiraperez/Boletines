
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// --- PROJECTS ---

export const getProjects = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const projects = await prisma.mechanismProject.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
            include: {
                _count: {
                    select: { rooms: true }
                }
            }
        });
        res.json(projects);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching projects' });
    }
};

export const getProjectDetails = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const project = await prisma.mechanismProject.findUnique({
            where: { id },
            include: {
                rooms: {
                    orderBy: { name: 'asc' }, // Or creation order if we add a 'order' field later
                    include: {
                        items: true
                    }
                }
            }
        });

        if (!project) return res.status(404).json({ error: 'Project not found' });

        res.json(project);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching project details' });
    }
};

export const createProject = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { name, description } = req.body;

        const project = await prisma.mechanismProject.create({
            data: {
                userId,
                name,
                description
            }
        });

        res.json(project);
    } catch (error) {
        res.status(500).json({ error: 'Error creating project' });
    }
};

export const deleteProject = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // Verify ownership could be added here
        await prisma.mechanismProject.delete({
            where: { id }
        });
        res.json({ message: 'Project deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting project' });
    }
};

// --- ROOMS ---

export const createRoom = async (req: Request, res: Response) => {
    try {
        const { projectId, name, count } = req.body; // count for creating multiple copies if needed

        if (count && count > 1) {
            // Bulk create "Dormitorio 1", "Dormitorio 2", etc.
            // Simplified logic: strict naming or exact copies? 
            // The prompt asked for "Dormitorio 1, Dormitorio 2".
            // If name is "Dormitorio", we append " 1", " 2".

            const promises = [];
            for (let i = 1; i <= count; i++) {
                promises.push(prisma.mechanismRoom.create({
                    data: {
                        projectId,
                        name: `${name} ${i}`
                    }
                }));
            }
            const rooms = await Promise.all(promises);
            res.json(rooms);
        } else {
            const room = await prisma.mechanismRoom.create({
                data: {
                    projectId,
                    name
                }
            });
            res.json(room);
        }
    } catch (error) {
        res.status(500).json({ error: 'Error creating room' });
    }
};

export const updateRoom = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        const room = await prisma.mechanismRoom.update({
            where: { id },
            data: { name }
        });
        res.json(room);
    } catch (error) {
        res.status(500).json({ error: 'Error updating room' });
    }
};

export const deleteRoom = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.mechanismRoom.delete({
            where: { id }
        });
        res.json({ message: 'Room deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting room' });
    }
};

export const copyRoom = async (req: Request, res: Response) => {
    try {
        const { roomId, count } = req.body;

        // 1. Fetch original room text & items
        const originalRoom = await prisma.mechanismRoom.findUnique({
            where: { id: roomId },
            include: { items: true }
        });

        if (!originalRoom) return res.status(404).json({ error: 'Room not found' });

        // 2. Create copies
        // Naming strategy: "Original (Copy)" or "Original 1, 2"?
        // Prompt said: "Preguntar cuántas copias crear... Crear copias numeradas".

        const baseName = originalRoom.name;
        const newRooms = [];

        for (let i = 1; i <= (count || 1); i++) {
            // Create Room
            const newRoom = await prisma.mechanismRoom.create({
                data: {
                    projectId: originalRoom.projectId,
                    name: `${baseName} (Copia ${i})` // Simplest unique naming
                }
            });

            // Copy Items
            if (originalRoom.items.length > 0) {
                const itemsData = originalRoom.items.map(item => ({
                    roomId: newRoom.id,
                    name: item.name,
                    quantity: item.quantity
                }));

                await prisma.mechanismItem.createMany({
                    data: itemsData
                });
            }

            newRooms.push(newRoom);
        }

        res.json(newRooms);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error copying room' });
    }
};

// --- ITEMS ---

export const upsertItem = async (req: Request, res: Response) => {
    try {
        const { roomId, name, quantity } = req.body;

        // Upsert: Create if new, Update if exists
        // Since we have a unique constraint on [roomId, name], we can use upsert or just manual check

        // Prisma upsert requires a unique identifier (where).
        // The composite unique key is named automatically typically: roomId_name

        const item = await prisma.mechanismItem.upsert({
            where: {
                roomId_name: {
                    roomId,
                    name
                }
            },
            update: {
                quantity
            },
            create: {
                roomId,
                name,
                quantity
            }
        });

        res.json(item);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error updating item' });
    }
};
// --- PDF ---

import { generateMechanismPDF } from '../services/pdfService';
import path from 'path';
import fs from 'fs';

export const generatePdf = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const project = await prisma.mechanismProject.findUnique({
            where: { id },
            include: {
                rooms: {
                    orderBy: { name: 'asc' },
                    include: { items: true }
                }
            }
        });

        if (!project) return res.status(404).json({ error: 'Project not found' });

        const fileName = `mecanismos-${id}-${Date.now()}.pdf`;
        const outputPath = path.join(process.cwd(), 'temp', fileName);

        // Ensure temp dir exists
        if (!fs.existsSync(path.join(process.cwd(), 'temp'))) {
            fs.mkdirSync(path.join(process.cwd(), 'temp'));
        }

        await generateMechanismPDF(project, outputPath);

        res.download(outputPath, `mecanismos-${project.name}.pdf`, (err) => {
            if (err) console.error(err);
            // Cleanup?
            try {
                fs.unlinkSync(outputPath);
            } catch (e) { /* ignore */ }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error generating PDF' });
    }
};
