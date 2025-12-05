import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runCommand = (command) => {
    try {
        execSync(command, { stdio: 'inherit' });
    } catch (error) {
        console.error(`Failed to execute command: ${command}`);
        process.exit(1);
    }
};

const copyRecursiveSync = (src, dest) => {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();

    if (isDirectory) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest);
        }
        fs.readdirSync(src).forEach((childItemName) => {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
};

console.log("🚀 Starting deployment process...");

// Step 1: Build the project using Vite
console.log("📦 Building the project with Vite...");
runCommand('npm run build');

// Step 2: Clean up old docs directory and create a new one
console.log("🧹 Clearing old docs directory and preparing for new build...");
const docsDir = path.join(__dirname, 'docs');
if (fs.existsSync(docsDir)) {
    fs.rmSync(docsDir, { recursive: true, force: true });
}
fs.mkdirSync(docsDir);

// Step 3: Copy the contents of dist to docs
console.log("🚚 Copying build output to docs directory...");
const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
    copyRecursiveSync(distDir, docsDir);
} else {
    console.error("Error: dist directory not found!");
    process.exit(1);
}

// Step 4: Copy PWA files to docs
console.log("📄 Copying PWA essential files (service-worker.js, manifest.json)...");
const filesToCopy = ['service-worker.js', 'manifest.json'];
filesToCopy.forEach(file => {
    const srcPath = path.join(__dirname, file);
    const destPath = path.join(docsDir, file);
    if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
    } else {
        console.warn(`Warning: ${file} not found.`);
    }
});

// Step 5: Create .nojekyll file to disable Jekyll on GitHub Pages
console.log("🚫 Creating .nojekyll file...");
fs.writeFileSync(path.join(docsDir, '.nojekyll'), '');

console.log("✅ Deployment build is complete and ready in the 'docs' folder.");
console.log("下一步，請執行以下指令將變更推送到 GitHub：");
console.log("git add . && git commit -m \"chore: deploy to GitHub Pages\" && git push");
