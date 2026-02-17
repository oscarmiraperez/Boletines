import { Request, Response } from 'express';
import prisma from '../db';

interface AuthRequest extends Request {
    user?: any;
}

export const getExpedientes = async (req: AuthRequest, res: Response) => {
    try {
        const { role, id: userId } = req.user;
        const { status, search } = req.query;

        const whereConditions: any[] = [
            { isDeleted: false } // Default: only active records
        ];

        // 1. Role-based Access Control
        if (role === 'TECNICO') {
            whereConditions.push({
                OR: [
                    { operatorId: userId },
                    { technicalId: userId }
                ]
            });
        } else if (role !== 'ADMIN') {
            // OPERARIO or others: strict own data
            whereConditions.push({ operatorId: userId });
        }
        // ADMIN sees all

        // 2. Status Filter
        if (status) {
            whereConditions.push({ status: String(status) });
        }

        // 3. Search Filter (Code, Client Name, Address)
        if (search) {
            const searchStr = String(search);
            whereConditions.push({
                OR: [
                    { code: { contains: searchStr, mode: 'insensitive' } },
                    { installation: { client: { name: { contains: searchStr, mode: 'insensitive' } } } },
                    { installation: { address: { contains: searchStr, mode: 'insensitive' } } },
                    { installation: { municipality: { contains: searchStr, mode: 'insensitive' } } }
                ]
            });
        }

        const whereClause = {
            AND: whereConditions
        };

        const expedientes = await prisma.expediente.findMany({
            where: whereClause,
            include: {
                installation: {
                    include: {
                        client: true
                    }
                },
                operator: {
                    select: { name: true, email: true }
                },
                // technical: { select: { name: true, email: true } }, // Include if relation exists
                authorization: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(expedientes);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching expedientes' });
    }
};

export const getExpedienteById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const expediente = await prisma.expediente.findFirst({ // findFirst to handle isDeleted check if needed
            where: { id },
            include: {
                installation: {
                    include: { client: true }
                },
                operator: true,
                technical: true,
                authorization: true,
                derivacion: { include: { photos: true } },
                cuadros: {
                    include: {
                        mainBreaker: true,
                        differentials: { include: { circuits: true } }
                    }
                },
                verificaciones: true,
                documents: true
            }
        });

        if (!expediente) {
            return res.status(404).json({ error: 'Expediente not found' });
        }

        // Parse mtdData if it's a string (SQLite workaround)
        if (expediente.mtdData && typeof expediente.mtdData === 'string') {
            try {
                expediente.mtdData = JSON.parse(expediente.mtdData);
            } catch (e) {
                console.error('Error parsing expediente mtdData:', e);
                expediente.mtdData = {} as any;
            }
        }

        // Parse client mtdData if exists
        if (expediente.installation?.client?.mtdData && typeof expediente.installation.client.mtdData === 'string') {
            try {
                (expediente.installation.client as any).mtdData = JSON.parse(expediente.installation.client.mtdData);
            } catch (e) {
                // ignore
            }
        }

        res.json(expediente);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching expediente' });
    }
};

export const createExpediente = async (req: AuthRequest, res: Response) => {
    try {
        console.log('Creating Expediente. Body:', JSON.stringify(req.body, null, 2));
        const {
            type,
            client, // { name, nif, phone, email }
            installation, // { address, municipality, postalCode, cups, ... }
            mtdData // Capture mtdData if sent
        } = req.body;

        const operatorId = req.user.id;

        // Generate YYMM-XXXX code
        const date = new Date();
        const yy = date.getFullYear().toString().slice(-2);
        const mm = (date.getMonth() + 1).toString().padStart(2, '0');
        const prefix = `${yy}${mm}-`;

        // Find last code with this prefix
        const lastExpediente = await prisma.expediente.findFirst({
            where: { code: { startsWith: prefix } },
            orderBy: { code: 'desc' }
        });

        let nextSequence = 1;
        if (lastExpediente) {
            const parts = lastExpediente.code.split('-');
            if (parts.length === 2 && !isNaN(parseInt(parts[1]))) {
                nextSequence = parseInt(parts[1]) + 1;
            }
        }

        const code = `${prefix}${nextSequence.toString().padStart(4, '0')}`;

        // Transaction to create Client, Installation, and Expediente
        const result = await prisma.$transaction(async (tx) => {
            // 1. Find or Create Client
            let clientRecord;
            if (client.id) {
                clientRecord = await tx.client.findUnique({ where: { id: client.id } });
            } else if (client.nif) {
                // Try to find by NIF to avoid duplicates
                clientRecord = await tx.client.findFirst({ where: { nif: client.nif } });
            }

            if (!clientRecord) {
                console.log('Creating new client:', client.nif);
                clientRecord = await tx.client.create({
                    data: {
                        name: client.name,
                        nif: client.nif,
                        phone: client.phone,
                        email: client.email
                    }
                });
            } else {
                console.log('Using existing client:', clientRecord.id);
            }

            // 2. Create Installation
            // Ensure contractedPower is a number
            let cPower = 0;
            if (installation.contractedPower) {
                const parsed = parseFloat(installation.contractedPower);
                if (!isNaN(parsed)) cPower = parsed;
            }

            const installationRecord = await tx.installation.create({
                data: {
                    clientId: clientRecord.id,
                    address: installation.address,
                    municipality: installation.municipality,
                    postalCode: installation.postalCode,
                    cups: installation.cups,
                    contractedPower: cPower,
                    retailer: installation.retailer,
                    tariff: installation.tariff,
                    observations: installation.observations
                }
            });

            // 3. Create Expediente
            const expediente = await tx.expediente.create({
                data: {
                    code,
                    type,
                    status: 'SIN_VISITAR' as any,
                    operatorId,
                    installationId: installationRecord.id,
                    isDeleted: false,
                    mtdData: mtdData ? JSON.stringify(mtdData) : undefined // Stringify if present
                }
            });

            return expediente;
        });

        res.status(201).json(result);
    } catch (error: any) {
        console.error('Error creating expediente:', error);
        res.status(500).json({
            error: 'Error setting up expediente',
            details: error.message || String(error)
        });
    }
};

export const updateExpediente = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { role, id: userId } = req.user;

        // RBAC Verification
        if (role === 'TECNICO') {
            const existing = await prisma.expediente.findUnique({
                where: { id },
                select: { operatorId: true, technicalId: true }
            });

            if (!existing) return res.status(404).json({ error: 'Expediente not found' });

            if (existing.operatorId !== userId && existing.technicalId !== userId) {
                return res.status(403).json({ error: 'No tienes permiso para modificar este expediente' });
            }
        }

        const data = { ...req.body }; // Clone to avoid mutation if referenced elsewhere

        // Stringify mtdData if present (SQLite workaround)
        if (data.mtdData && typeof data.mtdData === 'object') {
            data.mtdData = JSON.stringify(data.mtdData);
        }

        const updated = await prisma.expediente.update({
            where: { id },
            data
        });

        res.json(updated);
    } catch (error) {
        console.error('Error updating expediente:', error);
        res.status(500).json({ error: 'Error updating expediente' });
    }
};

export const deleteExpediente = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { role } = req.user;

        // RBAC: Only ADMIN can delete (soft delete)
        // Or maybe OFICINA too? Let's restrict to ADMIN for safety as requested "Operar solo sobre sus propios..."
        // but typically delete is sensitive. Let's allow ADMIN only for now, or based on strict requirements.
        // User said: "Operar solo sobre sus propios expedientes o también sobre los expedientes de otros usuarios"
        // Let's assume TECNICO cannot delete.

        if (role !== 'ADMIN') {
            return res.status(403).json({ error: 'Solo los administradores pueden eliminar expedientes' });
        }

        // Soft delete
        await prisma.expediente.update({
            where: { id },
            data: { isDeleted: true, status: 'ANULADO' }
        });
        res.json({ message: 'Expediente deleted (logical)' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting expediente' });
    }
};
