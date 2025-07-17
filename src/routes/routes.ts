import express from 'express';
import { listScripts, executeScript, getScript } from '../controllers/VerificationController';

const router = express.Router();

router.get('/scripts', listScripts);
router.get('/scripts/:name', getScript);
router.post('/scripts/:name', executeScript);

export default router;
