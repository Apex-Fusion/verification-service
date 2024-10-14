import {VerificationScript} from '../interfaces/VerificationScript';
import * as fs from 'fs';
import * as path from 'path';
import {watch} from 'fs';

export class ScriptManager {
    private scripts: Map<string, VerificationScript> = new Map();
    private scriptsDir = path.join(__dirname, '../scripts');

    constructor() {
        this.loadScripts();
        this.watchScriptsFolder();
    }

    private loadScripts() {
        const newScripts: Map<string, VerificationScript> = new Map();

        fs.readdirSync(this.scriptsDir).forEach((scriptFolder) => {
            const manifestPath = path.join(this.scriptsDir, scriptFolder, 'manifest.json');
            if (fs.existsSync(manifestPath)) {
                try {
                    const {name, path: scriptPath} = require(manifestPath);
                    const scriptModule = require(path.join(this.scriptsDir, scriptFolder, scriptPath));
                    const scriptInstance: VerificationScript = new scriptModule[name]();
                    newScripts.set(scriptInstance.name, scriptInstance);
                } catch (err) {
                    console.error(`Failed to load script from ${manifestPath}:`, err);
                }
            }
            console.log(`Loading manifest from: ${manifestPath}`);
        });

        this.scripts = newScripts;
        console.log('Scripts reloaded:', this.listScripts());
    }

    private watchScriptsFolder() {
        watch(this.scriptsDir, {recursive: true}, (eventType, filename) => {
            console.log(`Detected ${eventType} on ${filename}. Reloading scripts...`);
            this.loadScripts();
        });
    }

    async executeScript(name: string, params: any): Promise<boolean> {
        const script = this.scripts.get(name);
        if (!script) {
            throw new Error(`No script registered with name ${name}.`);
        }
        return await script.execute(params);
    }

    listScripts(): string[] {
        return Array.from(this.scripts.keys());
    }
}
