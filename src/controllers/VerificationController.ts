import {Request, Response} from 'express';
import {ScriptManager} from '../services/ScriptManager';

const scriptManager = new ScriptManager();

export const listScripts = (req: Request, res: Response) => {
    res.json({scripts: scriptManager.listScripts()});
};

export const executeScript = async (req: Request, res: Response) => {
    const {name} = req.params;
    const params = req.body;
    try {
        const result :any = await scriptManager.executeScript(name, params);
        let finalResponse: { result: string; message?: string } = {result: ""};

        if (typeof result === "boolean") {
            // If result is a boolean, map it directly to a string.
            finalResponse.result = result ? "success" : "validation_failed";
        } else if (typeof result === "object" && result !== null) {
            // Assuming the object always has a `result` key (boolean) and a `message` key.
            finalResponse.result = result.result ? "success" : "validation_failed";
            finalResponse.message = result.comment;
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