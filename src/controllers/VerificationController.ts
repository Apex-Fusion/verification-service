import {Request, Response} from 'express';
import {ScriptManager} from '../services/ScriptManager';

const scriptManager = new ScriptManager();

export const listScripts = (req: Request, res: Response) => {
    res.json({scripts: scriptManager.listScripts()});
};

export const getScript = (req: Request, res: Response) => {
    const { name } = req.params;
    try {
        const script = scriptManager.getScript(name);
        res.json(script);
    } catch (error) {
        const err = error as Error;
        res.status(404).json({ error: err.message });
    }
};

export const executeScript = async (req: Request, res: Response) => {
    const {name} = req.params;
    const params = req.body;
    try {
        const result :any = await scriptManager.executeScript(name, params);
        let finalResponse: any = {result: ""};

        if (typeof result === "boolean") {
            // If result is a boolean, map it directly to a string.
            finalResponse.result = result ? "success" : "validation_failed";
        } else if (typeof result === "object" && result !== null) {
            // Check if this is a detailed response object (has result, message, and optionally data)
            if (result.hasOwnProperty('result') && result.hasOwnProperty('message')) {
                // This is a detailed response, pass it through directly
                finalResponse = result;
            } else if (result.hasOwnProperty('result') && result.hasOwnProperty('comment')) {
                // Legacy format with boolean result and comment
                finalResponse.result = result.result ? "success" : "validation_failed";
                finalResponse.message = result.comment;
            } else {
                // Fallback for other object types
                finalResponse.result = String(result);
            }
        } else {
            // Optionally, handle any other unexpected types.
            finalResponse.result = String(result);
        }

        res.json(finalResponse);
    } catch (error) {
        const err = error as Error; // Type assertion here
        res.status(400).json({error: err.message});
    }
};