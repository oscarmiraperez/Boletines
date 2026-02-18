import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../db';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

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

};


export const initAdmin = async (req: Request, res: Response) => {
    const debugLogs: string[] = [];
    const log = (msg: string) => {
        console.log(msg);
        debugLogs.push(msg);
    };

    try {
        log('--- Initializing Admin User (Lightweight Mode) ---');

        // 1. Check Environment
        const dbUrl = process.env.DATABASE_URL;
        log(`DATABASE_URL exists: ${!!dbUrl}`);
        if (dbUrl) {
            const sanitizedUrl = dbUrl.replace(/:([^@]+)@/, ':****@');
            log(`DATABASE_URL: ${sanitizedUrl}`);
        } else {
            throw new Error('DATABASE_URL is missing in environment variables!');
        }

        // 2. Check DB Connection
        log('Checking DB connection...');
        await prisma.$queryRaw`SELECT 1`;
        log('DB Connection OK');

        // 3. Create User
        log('Upserting admin user...');
        const email = 'admin@test.com';
        const password = 'password';
        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.upsert({
            where: { email },
            update: {},
            create: {
                email,
                password: hashedPassword,
                name: 'Admin',
                role: 'ADMIN',
            },
        });
        log('User created successfully.');

        res.json({
            success: true,
            message: 'Admin user initialized successfully',
            user: { email: email, role: 'ADMIN' },
            logs: debugLogs
        });

    } catch (error: any) {
        console.error('Init Admin Error:', error);
        res.status(200).json({
            success: false,
            error: 'FAILURE',
            message: error.message,
            stack: error.stack,
            logs: debugLogs
        });
    }
};
