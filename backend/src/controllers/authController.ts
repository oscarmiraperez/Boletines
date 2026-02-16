import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
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

    // Helper: Timeout Promise
    const timeout = (ms: number) => new Promise((_, reject) => setTimeout(() => reject(new Error('Operation timed out')), ms));

    try {
        log('--- Initializing Admin User (Debug Mode with Auto-Repair) ---');

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
        log('Attempting DB connection via prisma.$queryRaw (5s timeout)...');
        try {
            await Promise.race([
                prisma.$queryRaw`SELECT 1`,
                timeout(5000)
            ]);
            log('DB Connection OK');
        } catch (dbError: any) {
            log(`DB Connection Failed: ${dbError.message}`);
            // Force continue only if it's NOT a timeout, maybe we can fix it?
            // Actually continue to try push if needed
        }

        // 3. Create User with Auto-Repair
        log('Attempting to create/update admin user...');
        const email = 'admin@test.com';
        const password = 'password';
        const hashedPassword = await bcrypt.hash(password, 10);

        try {
            await upsertAdmin(email, hashedPassword, 5000);
            log('User created successfully on first try.');
        } catch (upsertError: any) {
            log(`First attempt failed: ${upsertError.message}`);

            // Check if error is about missing table
            if (upsertError.message.includes('does not exist') || upsertError.message.includes('relation') || upsertError.message.includes('P2021')) {
                log('CRITICAL: Tables are missing. Attempting emergency database push...');
                try {
                    log('Running: npx --yes prisma db push --accept-data-loss --skip-generate');
                    const { stdout, stderr } = await execPromise('npx --yes prisma db push --accept-data-loss --skip-generate', { timeout: 20000 });
                    log('DB Push stdout: ' + stdout);
                    if (stderr) log('DB Push stderr: ' + stderr);

                    log('Retrying user creation after DB push...');
                    await upsertAdmin(email, hashedPassword, 5000);
                    log('User created successfully after repair.');
                } catch (pushError: any) {
                    log('FATAL: DB Push failed: ' + pushError.message);
                    if (pushError.stdout) log('stdout: ' + pushError.stdout);
                    if (pushError.stderr) log('stderr: ' + pushError.stderr);
                    throw pushError;
                }
            } else {
                throw upsertError;
            }
        }

        res.json({
            success: true,
            message: 'Admin user initialized successfully (possibly after repair)',
            user: { email: email, role: 'ADMIN' },
            logs: debugLogs
        });

    } catch (error: any) {
        console.error('Init Admin Fatal Error:', error);
        res.status(200).json({
            success: false,
            error: 'CRITICAL FAILURE',
            message: error.message,
            stack: error.stack,
            logs: debugLogs
        });
    }

    async function upsertAdmin(email: string, pass: string, ms: number) {
        // Use any explicitly to avoid type checks here for brevity/ robustness against generated client issues
        await Promise.race([
            prisma.user.upsert({
                where: { email },
                update: {},
                create: {
                    email,
                    password: pass,
                    name: 'Admin',
                    role: 'ADMIN',
                },
            }),
            timeout(ms)
        ]);
    }
};
