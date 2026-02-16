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

};


export const initAdmin = async (req: Request, res: Response) => {
    const debugLogs: string[] = [];
    const log = (msg: string) => {
        console.log(msg);
        debugLogs.push(msg);
    };

    try {
        log('--- Initializing Admin User (Debug Mode) ---');

        // 1. Check Environment
        const dbUrl = process.env.DATABASE_URL;
        log(`DATABASE_URL exists: ${!!dbUrl}`);
        if (dbUrl) {
            log(`DATABASE_URL prefix: ${dbUrl.substring(0, 15)}...`);
        } else {
            throw new Error('DATABASE_URL is missing in environment variables!');
        }

        // 2. Check DB Connection
        log('Attempting DB connection via prisma.$queryRaw...');
        try {
            await prisma.$queryRaw`SELECT 1`;
            log('DB Connection OK');
        } catch (dbError: any) {
            log(`DB Connection Failed: ${dbError.message}`);
            throw new Error(`Database connection failed: ${dbError.message}`);
        }

        // 3. Create User
        log('Attempting to create/update admin user...');
        const email = 'admin@test.com';
        const password = 'password';

        log('Hashing password...');
        const hashedPassword = await bcrypt.hash(password, 10);
        log('Password hashed.');

        log('Upserting user to database...');
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
        log(`User created/found: ${user.id}`);

        res.json({
            success: true,
            message: 'Admin user initialized successfully',
            user: { email: user.email, role: user.role },
            logs: debugLogs
        });

    } catch (error: any) {
        console.error('Init Admin Fatal Error:', error);
        // Return 200 to ensure the user can SEE the error in the browser
        res.status(200).json({
            success: false,
            error: 'CRITICAL FAILURE',
            message: error.message,
            stack: error.stack,
            logs: debugLogs
        });
    }
};
