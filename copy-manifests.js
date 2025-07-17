const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src/scripts');
const distDir = path.join(__dirname, 'dist/scripts');

fs.readdirSync(srcDir).forEach((folder) => {
    const manifestPath = path.join(srcDir, folder, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
        const destPath = path.join(distDir, folder);
        fs.mkdirSync(destPath, { recursive: true });
        fs.copyFileSync(manifestPath, path.join(destPath, 'manifest.json'));
        console.log(`Copied manifest for ${folder}`);
    }
});