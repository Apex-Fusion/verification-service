import {VerificationPlugin} from '../interfaces/VerificationPlugin';
import * as fs from 'fs';
import * as path from 'path';
import {watch} from 'fs';
import {VerificationScript} from '../interfaces/VerificationScript';

export class ScriptManager {
    private scripts: Map<string, VerificationPlugin> = new Map();
    private scriptsDir = path.join(__dirname, '../scripts');

    constructor() {
        this.loadScripts();
        this.watchScriptsFolder();
    }

    private loadScripts() {
        const newScripts: Map<string, VerificationPlugin> = new Map();

        fs.readdirSync(this.scriptsDir).forEach((scriptFolder) => {
            const manifestPath = path.join(this.scriptsDir, scriptFolder, 'manifest.json');
            console.log(`Loading manifest from: ${manifestPath}`);
            if (fs.existsSync(manifestPath)) {
                try {
                    const manifestContent = require(manifestPath);
                    const {name, description, path: scriptPath, parameters} = manifestContent;
                    const scriptModule = require(path.join(this.scriptsDir, scriptFolder, scriptPath));
                    const scriptInstance: VerificationScript = new scriptModule[name]();
                    const verificationPluginInstance: VerificationPlugin = {
                        method: scriptInstance,
                        name,
                        description,
                        path: scriptPath,
                        parameters
                    };

                    newScripts.set(scriptInstance.name, verificationPluginInstance);
                } catch (err) {
                    console.error(`Failed to load script from ${manifestPath}:`, err);
                }
            }
        });

        this.scripts = newScripts;
        console.log("Scripts reloaded:", JSON.stringify(this.listScripts(), null, 2));
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
        return await script.method.execute(params);
    }

    listScripts(): any[] {
        return Array.from(this.scripts.values()).map(plugin => ({
            name: plugin.name,
            description: plugin.description,
            parameters: plugin.parameters
        }));
    }

    getScript(name: string): VerificationPlugin {
        const script = this.scripts.get(name);
        if (!script) {
            throw new Error(`No script registered with name ${name}.`);
        }
        return script;
    }
}