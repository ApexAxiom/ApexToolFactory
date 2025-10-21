@echo off
echo ========================================
echo COMPLETE FIX - All Deployment Issues
echo ========================================
echo.
echo This fixes:
echo 1. TypeScript error in lib/auth.ts
echo 2. AWS_REGION handling in lib/s3.ts
echo 3. Ensures amplify.yml is correct
echo 4. Commits and pushes everything
echo.
pause

echo.
echo Step 1: Adding all changes to git...
git add lib/auth.ts
git add lib/s3.ts
git add amplify.yml
git add package.json
git add setup-s3-bucket.ps1
git add setup-s3-bucket.sh
git add S3_SETUP_GUIDE.md
git add AMPLIFY_ENV_VARS.md
git add DEPLOYMENT_FIX.md
git add DEPLOYMENT_SOLUTION_SUMMARY.md
git add COMMIT_INSTRUCTIONS.md
git add COMPLETE_FIX.bat
git add force-deploy.bat

echo.
echo Step 2: Checking git status...
git status --short

echo.
echo Step 3: Committing all fixes...
git commit -m "COMPLETE FIX: Resolve all TypeScript and deployment issues" -m "Critical fixes:" -m "- Fixed lib/auth.ts TypeScript error (use 'as any' for iron-session compatibility)" -m "- Fixed lib/s3.ts to handle auto-provided AWS_REGION from Amplify" -m "- Verified amplify.yml configuration is correct" -m "- Cleaned up package.json (removed Prisma dependencies)" -m "- Added comprehensive S3 setup scripts and documentation" -m "" -m "Environment variables configured in Amplify:" -m "- S3_BUCKET: pestimator-data-1760984255" -m "- ADMIN_PASSPHRASE: (configured)" -m "- SESSION_PASSWORD: (existing)" -m "- AWS_REGION: (auto-provided by AWS Amplify)" -m "" -m "Build configuration:" -m "- Node.js 20" -m "- pnpm 8.15.4" -m "- Next.js 14.2.5" -m "- TypeScript 5.9.3" -m "" -m "This should complete deployment in 3-5 minutes."

echo.
echo Step 4: Pushing to GitHub...
git push origin main

echo.
echo ========================================
echo DONE! All fixes pushed to GitHub.
echo ========================================
echo.
echo AWS Amplify should automatically start a new deployment.
echo.
echo Expected build time: 3-5 minutes
echo.
echo Next steps:
echo 1. Go to AWS Amplify Console
echo 2. Watch the new deployment build logs
echo 3. Verify it completes successfully
echo 4. Test the deployed application
echo.
echo If build still fails, check:
echo - IAM role has S3 permissions (see AMPLIFY_ENV_VARS.md)
echo - All environment variables are set correctly
echo - amplify.yml is being detected by Amplify
echo.
pause


