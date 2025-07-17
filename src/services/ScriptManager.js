"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.ScriptManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const fs_1 = require("fs");
class ScriptManager {
    constructor() {
        this.scripts = new Map();
        this.scriptsDir = path.join(__dirname, '../scripts');
        this.loadScripts();
        this.watchScriptsFolder();
    }
    loadScripts() {
        const newScripts = new Map();
        fs.readdirSync(this.scriptsDir).forEach((scriptFolder) => {
            const manifestPath = path.join(this.scriptsDir, scriptFolder, 'manifest.json');
            if (fs.existsSync(manifestPath)) {
                const { name, path: scriptPath } = require(manifestPath);
                const scriptModule = require(path.join(this.scriptsDir, scriptFolder, scriptPath));
                const scriptInstance = new scriptModule[name]();
                newScripts.set(scriptInstance.name, scriptInstance);
            }
        });
        this.scripts = newScripts;
        console.log('Scripts reloaded:', this.listScripts());
    }
    watchScriptsFolder() {
        (0, fs_1.watch)(this.scriptsDir, { recursive: true }, (eventType, filename) => {
            console.log(`Detected ${eventType} on ${filename}. Reloading scripts...`);
            this.loadScripts();
        });
    }
    executeScript(name, params) {
        return __awaiter(this, void 0, void 0, function* () {
            const script = this.scripts.get(name);
            if (!script) {
                throw new Error(`No script registered with name ${name}.`);
            }
            return yield script.execute(params);
        });
    }
    listScripts() {
        return Array.from(this.scripts.keys());
    }
}
exports.ScriptManager = ScriptManager;
