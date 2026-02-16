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

    // Helper: Timeout Promise
    const timeout = (ms: number) => new Promise((_, reject) => setTimeout(() => reject(new Error('Operation timed out')), ms));

    try {
        log('--- Initializing Admin User (Debug Mode) ---');

        // 1. Check Environment
        const dbUrl = process.env.DATABASE_URL;
        log(`DATABASE_URL exists: ${!!dbUrl}`);
        if (dbUrl) {
            // Log structure but hide password
            const sanitizedUrl = dbUrl.replace(/:([^@]+)@/, ':****@');
            log(`DATABASE_URL: ${sanitizedUrl}`);
        } else {
            throw new Error('DATABASE_URL is missing in environment variables!');
        }

        // 2. Check DB Connection with TIMEOUT
        log('Attempting DB connection via prisma.$queryRaw (5s timeout)...');
        try {
            await Promise.race([
                prisma.$queryRaw`SELECT 1`,
                timeout(5000)
            ]);
            log('DB Connection OK');
        } catch (dbError: any) {
            log(`DB Connection Failed: ${dbError.message}`);
            // Force error to be thrown to catch block
            throw new Error(`Database connection failed/timed out: ${dbError.message}`);
        }

        // 3. Create User with TIMEOUT
        log('Attempting to create/update admin user (5s timeout)...');
        const email = 'admin@test.com';
        const password = 'password';

        log('Hashing password...');
        const hashedPassword = await bcrypt.hash(password, 10);

        log('Upserting user...');
        const user: any = await Promise.race([
            prisma.user.upsert({
                where: { email },
                update: {},
                create: {
                    email,
                    password: hashedPassword,
                    name: 'Admin',
                    role: 'ADMIN',
                },
            }),
            timeout(5000)
        ]);
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
