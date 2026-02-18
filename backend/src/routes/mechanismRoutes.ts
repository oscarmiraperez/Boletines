
import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import {
    getProjects,
    createProject,
    updateProject,
    getProjectDetails,
    deleteProject,
    createRoom,
    updateRoom,
    deleteRoom,
    copyRoom,
    upsertItem,
    generatePdf
} from '../controllers/mechanismController';

const router = express.Router();

router.use(authenticateToken);

// Projects
router.get('/projects', getProjects);
router.post('/projects', createProject);
router.put('/projects/:id', updateProject);
router.get('/projects/:id', getProjectDetails);
router.delete('/projects/:id', deleteProject);

// Rooms
router.post('/rooms', createRoom);
router.post('/rooms/copy', copyRoom); // Custom action
router.put('/rooms/:id', updateRoom);
router.delete('/rooms/:id', deleteRoom);

// Items
router.post('/items', upsertItem);
router.post('/projects/:id/pdf', generatePdf);

export default router;
