"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeScript = exports.listScripts = void 0;
const ScriptManager_1 = require("../services/ScriptManager");
const scriptManager = new ScriptManager_1.ScriptManager();
const listScripts = (req, res) => {
    res.json({ scripts: scriptManager.listScripts() });
};
exports.listScripts = listScripts;
const executeScript = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name } = req.params;
    const params = req.body;
    try {
        const result = yield scriptManager.executeScript(name, params);
        res.json({ success: result });
    }
    catch (error) {
        const err = error; // Type assertion here
        res.status(400).json({ error: err.message });
    }
});
exports.executeScript = executeScript;
