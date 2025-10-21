@echo off
echo ========================================
echo Committing S3 Setup and Region Fix
echo ========================================
echo.

echo Adding files to git...
git add lib/s3.ts
git add setup-s3-bucket.sh
git add setup-s3-bucket.ps1
git add S3_SETUP_GUIDE.md
git add AMPLIFY_ENV_VARS.md
git add commit-s3-changes.bat

echo.
echo Committing changes...
git commit -m "Add S3 setup scripts and fix AWS_REGION handling" -m "- Updated lib/s3.ts to use auto-provided AWS_REGION from Amplify" -m "- Added fallback to us-east-1 for local development" -m "- Created PowerShell and Bash scripts to automate S3 bucket setup" -m "- Added comprehensive documentation for S3 and environment variables" -m "- Documented that AWS_REGION is auto-provided by Amplify" -m "" -m "Environment variables needed:" -m "- S3_BUCKET (from setup script)" -m "- ADMIN_PASSPHRASE (choose your own)" -m "- SESSION_PASSWORD (already exists)" -m "- AWS_REGION (auto-provided by AWS Amplify)"

echo.
echo Pushing to remote...
git push origin main

echo.
echo ========================================
echo Done! Now add the environment variables to Amplify.
echo ========================================
pause


