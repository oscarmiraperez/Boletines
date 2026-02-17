import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all independent schematics with optional filters
export const getEsquemas = async (req: Request, res: Response) => {
    try {
        const { search, power } = req.query;

        const where: any = {};

        if (search) {
            const searchStr = String(search);
            where.OR = [
                { name: { contains: searchStr, mode: 'insensitive' } },
                { client: { contains: searchStr, mode: 'insensitive' } },
                { address: { contains: searchStr, mode: 'insensitive' } }
            ];
        }

        if (power) {
            where.power = { contains: String(power), mode: 'insensitive' };
        }

        const esquemas = await prisma.esquema.findMany({
            where,
            orderBy: { updatedAt: 'desc' }
        });

        res.json(esquemas);
    } catch (error) {
        console.error('Error fetching esquemas:', error);
        res.status(500).json({ error: 'Error fetching esquemas' });
    }
};

// Get single schematic by ID
export const getEsquemaById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const esquema = await prisma.esquema.findUnique({
            where: { id }
        });

        if (!esquema) return res.status(404).json({ error: 'Esquema not found' });

        res.json(esquema);
    } catch (error) {
        console.error('Error fetching esquema:', error);
        res.status(500).json({ error: 'Error fetching esquema' });
    }
};

// Create new schematic
export const createEsquema = async (req: Request, res: Response) => {
    try {
        const { name, client, address, power, data } = req.body;

        if (!power) {
            return res.status(400).json({ error: 'Potencia instalada es obligatoria' });
        }

        const newEsquema = await prisma.esquema.create({
            data: {
                name,
                client,
                address,
                power,
                data: typeof data === 'object' ? JSON.stringify(data) : data
            }
        });

        res.status(201).json(newEsquema);
    } catch (error) {
        console.error('Error creating esquema:', error);
        res.status(500).json({ error: 'Error creating esquema' });
    }
};

// Update schematic
export const updateEsquema = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, client, address, power, data } = req.body;

        const updatedEsquema = await prisma.esquema.update({
            where: { id },
            data: {
                name,
                client,
                address,
                power,
                data: typeof data === 'object' ? JSON.stringify(data) : data
            }
        });

        res.json(updatedEsquema);
    } catch (error) {
        console.error('Error updating esquema:', error);
        res.status(500).json({ error: 'Error updating esquema' });
    }
};

// Delete schematic
export const deleteEsquema = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.esquema.delete({ where: { id } });
        res.json({ message: 'Esquema deleted' });
    } catch (error) {
        console.error('Error deleting esquema:', error);
        res.status(500).json({ error: 'Error deleting esquema' });
    }
};

import path from 'path';
import fs from 'fs';
import { generateSchematicPDF } from '../services/pdfService';

export const generateEsquemaPDF = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const esquema = await prisma.esquema.findUnique({ where: { id } });

        if (!esquema) return res.status(404).json({ error: 'Esquema not found' });

        let technicalData = {};
        try {
            technicalData = typeof esquema.data === 'string' ? JSON.parse(esquema.data) : esquema.data;
        } catch (e) {
            console.error('Error parsing esquema data', e);
        }

        const pdfData = {
            clientName: esquema.client || '',
            address: esquema.address || '',
            contractedPower: esquema.power || '',
            cuadros: (technicalData as any).cuadros || []
        };

        const fileName = `esquema-${(esquema.name || 'sin-nombre').replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${id.substring(0, 8)}.pdf`;
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
        }
        const outputPath = path.join(tempDir, fileName);

        await generateSchematicPDF(pdfData, outputPath);

        res.download(outputPath, fileName, (err) => {
            if (err) console.error('Error downloading PDF:', err);
            // fs.unlinkSync(outputPath); 
        });

    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ error: 'Error generating PDF' });
    }
};

