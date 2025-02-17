#!/usr/bin/env node

import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';

async function createScript() {
  const { scriptName, description } = await inquirer.prompt([
    {
      type: 'input',
      name: 'scriptName',
      message: 'Enter the script name (e.g., MyVerificationScript):',
      validate: (input) => input ? true : 'Script name cannot be empty.'
    },
    {
      type: 'input',
      name: 'description',
      message: 'Enter a description for the script (optional):',
      default: ''
    }
  ]);

  const manifestContent = {
    name: scriptName,
    description: description,
    path: `./${scriptName}`,
    parameters: []
  };

  const scriptTemplate = `import { VerificationScript } from '../../interfaces/VerificationScript';
import manifest from './manifest.json';

export class ${scriptName} implements VerificationScript {
  name = manifest.name;
  description = manifest.description;

  async execute(params: any): Promise<any> {
    console.log('Executing ${scriptName} with params:', params);
    return true;
  }
}
`;

  const targetDir = path.join(process.cwd(), 'src/scripts', scriptName);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  fs.writeFileSync(path.join(targetDir, 'manifest.json'), JSON.stringify(manifestContent, null, 2), 'utf8');
  fs.writeFileSync(path.join(targetDir, `${scriptName}.ts`), scriptTemplate, 'utf8');

  console.log(`New script scaffold created at: ${targetDir}`);
}

createScript().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});