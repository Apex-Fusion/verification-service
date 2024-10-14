import { Request, Response } from 'express';
import { ScriptManager } from '../services/ScriptManager';

const scriptManager = new ScriptManager();

export const listScripts = (req: Request, res: Response) => {
    res.json({ scripts: scriptManager.listScripts() });
};

export const executeScript = async (req: Request, res: Response) => {
    const { name } = req.params;
    const params = req.body;
    try {
        const result = await scriptManager.executeScript(name, params);
        res.json({ success: result });
    } catch (error) {
        const err = error as Error; // Type assertion here
        res.status(400).json({ error: err.message });
    }
};