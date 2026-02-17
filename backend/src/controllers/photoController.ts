import { Request, Response } from 'express';
import prisma from '../db';
import path from 'path';
import fs from 'fs';

// Helper to resolve paths
const resolvePath = (filePath: string) => {
    if (path.isAbsolute(filePath)) return filePath;
    return path.join(process.cwd(), filePath);
};

export const uploadExpedientePhoto = async (req: Request, res: Response) => {
    try {
        const { expedienteId } = req.params;
        const { name } = req.body;

        if (!req.file) {
            return res.status(400).json({ error: 'No se ha subido ninguna imagen' });
        }

        if (!name || name.trim() === '') {
            // Delete the uploaded file if validation fails
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({ error: 'El nombre de la foto es obligatorio' });
        }

        // Check limit (max 5)
        const photoCount = await prisma.expedientePhoto.count({
            where: { expedienteId }
        });

        if (photoCount >= 5) {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({ error: 'Límite de 5 fotos por expediente alcanzado' });
        }

        const relativePath = `uploads/${req.file.filename}`;

        const photo = await prisma.expedientePhoto.create({
            data: {
                expedienteId,
                url: relativePath,
                name: name.trim()
            }
        });

        res.status(201).json(photo);
    } catch (error) {
        console.error('Error uploading photo:', error);
        res.status(500).json({ error: 'Error al subir la foto' });
    }
};

export const deleteExpedientePhoto = async (req: Request, res: Response) => {
    try {
        const { id, photoId } = req.params; // id is expedienteId, photoId is photoId

        const photo = await prisma.expedientePhoto.findUnique({
            where: { id: photoId }
        });

        if (!photo) {
            return res.status(404).json({ error: 'Foto no encontrada' });
        }

        // Verify it belongs to the expediente
        if (photo.expedienteId !== id) {
            return res.status(403).json({ error: 'La foto no pertenece a este expediente' });
        }

        // Remove from DB
        await prisma.expedientePhoto.delete({
            where: { id: photoId }
        });

        // Remove file from disk
        const fullPath = resolvePath(photo.url);
        if (fs.existsSync(fullPath)) {
            try {
                fs.unlinkSync(fullPath);
            } catch (err) {
                console.error('Error deleting file from disk:', err);
                // Continue, as DB record is deleted
            }
        }

        res.json({ message: 'Foto eliminada correctamente' });
    } catch (error) {
        console.error('Error deleting photo:', error);
        res.status(500).json({ error: 'Error al eliminar la foto' });
    }
};

export const getExpedientePhotos = async (req: Request, res: Response) => {
    try {
        const { expedienteId } = req.params;
        const photos = await prisma.expedientePhoto.findMany({
            where: { expedienteId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(photos);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener las fotos' });
    }
};
