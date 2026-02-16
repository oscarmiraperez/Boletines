import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../db';

export const register = async (req: Request, res: Response) => {
    try {
        const { email, password, name } = req.body;

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role: 'TECNICO',
            },
        });

        res.status(201).json({ message: 'User created successfully', userId: user.id });
    } catch (error) {
        res.status(500).json({ error: 'Error registering user' });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET as string,
            { expiresIn: '24h' }
        );

        res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    } catch (error) {
        res.status(500).json({ error: 'Error logging in' });
    }

    export const initAdmin = async (req: Request, res: Response) => {
        try {
            console.log('--- Initializing Admin User ---');
            // 1. Create default admin if not exists
            const email = 'admin@test.com';
            const password = 'password';
            const hashedPassword = await bcrypt.hash(password, 10);

            const user = await prisma.user.upsert({
                where: { email },
                update: {},
                create: {
                    email,
                    password: hashedPassword,
                    name: 'Admin',
                    role: 'ADMIN',
                },
            });

            res.json({ message: 'Admin user initialized', user: { email: user.email, role: user.role } });
        } catch (error: any) {
            console.error('Init Admin Error:', error);
            res.status(500).json({ error: 'Error initializing admin', details: error.message });
        }
    };
