@echo off
echo ========================================
echo AWS Amplify Deployment Fix
echo ========================================
echo.

echo Adding files to git...
git add lib/auth.ts
git add package.json
git add DEPLOYMENT_FIX.md
git add COMMIT_INSTRUCTIONS.md
git add DEPLOYMENT_SOLUTION_SUMMARY.md
git add deploy-fix.ps1
git add deploy-fix.bat

echo.
echo Removing src directory if it exists...
if exist src (
    git rm -rf src
    rmdir /s /q src 2>nul
)

echo.
echo Committing changes...
git commit -m "Fix AWS Amplify deployment: TypeScript error and package.json cleanup" -m "- Fixed TypeScript error in lib/auth.ts (line 23) by changing type assertion" -m "- Cleaned up package.json to remove Prisma dependencies and scripts" -m "- Removed unused dependencies from package.json" -m "- Added comprehensive deployment documentation" -m "- Removed leftover src directory" -m "" -m "This resolves the build failure on AWS Amplify."

echo.
echo Pushing to remote...
git push origin main

echo.
echo ========================================
echo Done! Check AWS Amplify for new deployment.
echo ========================================
pause


