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
app.use(express.static(path.join(process.cwd(), '../frontend/dist')));

// Serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

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
    res.sendFile(path.join(process.cwd(), '../frontend/dist/index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
