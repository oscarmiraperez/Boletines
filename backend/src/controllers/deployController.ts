import { Request, Response } from 'express';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export const fixDb = async (req: Request, res: Response) => {
    // 2026-02-17: Dedicated route to force DB schema push and debug errors
    try {
        console.log('--- Starting Manual DB Push ---');
        // Use npx for robustness (path independence)
        const cmd = 'npx prisma db push --accept-data-loss --skip-generate';

        const { stdout, stderr } = await execPromise(cmd, {
            timeout: 30000, // Increased timeout
            env: { ...process.env, FORCE_COLOR: '1' }
        });

        console.log('DB Push Result:', stdout);

        res.json({
            success: true,
            message: 'Database structure pushed successfully!',
            stdout,
            stderr
        });
    } catch (error: any) {
        console.error('DB Push Failed:', error);
        res.status(500).json({
            success: false,
            error: 'DB Push Failed',
            details: error.message,
            stdout: error.stdout,
            stderr: error.stderr
        });
    }
};
