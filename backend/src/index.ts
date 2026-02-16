import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Configure dotenv
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from frontend build (Production & Preview)
// We use __dirname to be relative to the built file (backend/dist/index.js or backend/src/index.ts)
const frontendPath = path.join(__dirname, '../../frontend/dist');
console.log('--- DEBUG PATHS ---');
console.log('__dirname:', __dirname);
console.log('process.cwd():', process.cwd());
console.log('Calculated frontendPath:', frontendPath);

import fs from 'fs';
if (fs.existsSync(frontendPath)) {
    console.log('Frontend path EXISTS.');
    console.log('Contents:', fs.readdirSync(frontendPath));
} else {
    console.error('Frontend path DOES NOT EXIST!');
    // Try to list parent dirs to see where we are
    try {
        console.log('Parent dir contents:', fs.readdirSync(path.join(__dirname, '../../')));
    } catch (e) {
        console.log('Could not list parent dir');
    }
}
console.log('-------------------');

app.use(express.static(frontendPath));

// Serve uploaded files
const uploadsPath = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsPath));

// Routes
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import expedienteRoutes from './routes/expedienteRoutes';
import technicalRoutes from './routes/technicalRoutes';
import documentRoutes from './routes/documentRoutes';

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/expedientes', expedienteRoutes);
app.use('/api/technical', technicalRoutes);
app.use('/api/documents', documentRoutes);

// Basic health check route
app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', message: 'Backend is running' });
});

// SPA Fallback: Serve index.html for any other route (must be last)
app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
