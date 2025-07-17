# Verification Service

The **Verification Service** is a modular platform for dynamically loading and executing various verification scripts used by **Apex Fusion Reputation System**. Scripts can be created and integrated independently, allowing flexibility for developers and third-party contributors to extend the service’s capabilities.

## Table of Contents

- [Installation](#installation)
- [How to Add New Verification Scripts](#how-to-add-new-verification-scripts)
  - [1. Create a New Script Directory](#1-create-a-new-script-directory)
  - [2. Add a Manifest File](#2-add-a-manifest-file)
  - [3. Implement the Verification Script](#3-implement-the-verification-script)
  - [4. Test the Script](#4-test-the-script)
- [API Routes](#api-routes)
- [Best Practices](#best-practices)

---

## Installation

1. Clone the repository and navigate to the project directory:

    ```bash
    git clone https://github.com/Apex-Fusion/verification-service.git
    cd verification-service
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Build the project:

    ```bash
    npm run build
    ```

4. Start the server:

    ```bash
    npm start
    ```

The server should now be running at `http://localhost:3000`.

## How to Add New Verification Scripts

Follow these steps to create a new verification script for the Verification Service.

### 1. Create a New Script Directory

You can use the provided generator script to create a new script. Use PascalCase for consistency.

```bash
npm run generate
```

If you want to do it manually, navigate to the `src/scripts` folder and create a new directory named after your script. 

```bash
cd src/scripts
mkdir MyNewVerification
```

### 2. Add a Manifest File

Inside the new script directory, create a `manifest.json` file to define the script’s metadata. This file tells the service how to load and recognize your script.

- **name**: Name of your script class.
- **description**: Short description of what your script does.
- **path**: Path to your script file relative to the manifest.

#### Example `manifest.json`:

```json
{
  "name": "MyNewVerification",
  "description": "Description of MyNewVerification script.",
  "path": "./MyNewVerification",
  "parameters": [
    {
      "name": "params",
      "type": "any",
      "required": false,
      "description": "Arbitrary parameters for verification. Customize this as needed for specific verification requirements."
    }
  ]
}
```

### 3. Implement the Verification Script

Create a TypeScript file for your script in the same directory. Implement the `VerificationScript` interface, which requires a `name`, `description`, and `execute` method.

#### Example `MyNewVerification.ts`:

```typescript
import { VerificationScript } from '../../interfaces/VerificationScript';
import manifest from './manifest.json';

export class MyNewVerification implements VerificationScript {
    name = manifest.name;
    description = manifest.description;

    async execute(params: any): Promise<boolean> {
        console.log('Executing MyNewVerification with params:', params);
        // Add your verification logic here
        return true;
    }
}
```

### 4. Test the Script

Once your script is added, it will be hot-loaded by the server. You can test it using the API endpoints.

1. **List All Scripts**:
   ```bash
   curl http://localhost:3000/api/scripts
   ```

2. **Execute Your Script**:
   Replace `MyNewVerification` with your script name:

   ```bash
   curl -X POST http://localhost:3000/api/scripts/MyNewVerification \
        -H "Content-Type: application/json" \
        -d '{"param1": "value1"}'
   ```

## API Routes

- **List all scripts**: `GET /api/scripts`
  - Returns a list of all registered scripts.
- **Execute a script**: `POST /api/scripts/:name`
  - Executes a specified script, with parameters sent in the request body as JSON.

## Best Practices

- **Unique Script Names**: Ensure that your script's name is unique to avoid conflicts with other scripts.
- **Error Handling**: Include error handling in your `execute` method to manage potential issues gracefully.
- **Lightweight Execution**: Aim to keep scripts focused on a single task to ensure modularity.
- **Testing**: Test scripts individually using the provided API routes to ensure they work as expected before deploying.