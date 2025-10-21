# Deployment Fix Script
# This script commits and pushes the TypeScript and package.json fixes

Write-Host "Adding files to git..." -ForegroundColor Green
git add lib/auth.ts
git add package.json
git add DEPLOYMENT_FIX.md

Write-Host "Removing src directory..." -ForegroundColor Green
if (Test-Path "src") {
    Remove-Item -Path "src" -Recurse -Force
}

Write-Host "Committing changes..." -ForegroundColor Green
git commit -m "Fix AWS Amplify deployment: TypeScript error and package.json cleanup

- Fixed TypeScript error in lib/auth.ts (line 23) by changing type assertion
- Cleaned up package.json to remove Prisma dependencies and scripts
- Removed unused dependencies from package.json
- Added DEPLOYMENT_FIX.md documentation
- Removed leftover src directory

This should resolve the build failure on AWS Amplify."

Write-Host "Pushing to remote..." -ForegroundColor Green
git push origin main

Write-Host "Done! Check AWS Amplify for new deployment." -ForegroundColor Green


