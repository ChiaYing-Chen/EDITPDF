#!/bin/bash
# Exit immediately if a command exits with a non-zero status.
set -e

echo "🚀 Starting deployment process..."

# Step 1: Build the project using Vite
echo "📦 Building the project with Vite..."
npm run build

# Step 2: Clean up old docs directory and create a new one
echo "🧹 Clearing old docs directory and preparing for new build..."
rm -rf docs
mkdir docs

# Step 3: Copy the contents of dist to docs
echo "🚚 Copying build output to docs directory..."
cp -r dist/* docs/

# Step 4: Create .nojekyll file to disable Jekyll on GitHub Pages
echo "📄 Creating .nojekyll file..."
touch docs/.nojekyll

echo "✅ Deployment build is complete and ready in the 'docs' folder."
echo "下一步，請執行以下指令將變更推送到 GitHub："
echo "git add . && git commit -m \"chore: deploy to GitHub Pages\" && git push"
