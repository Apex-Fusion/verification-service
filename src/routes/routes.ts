import express from 'express';
import { listScripts, executeScript } from '../controllers/VerificationController';

const router = express.Router();

router.get('/scripts', listScripts);
router.post('/scripts/:name', executeScript);

export default router;
