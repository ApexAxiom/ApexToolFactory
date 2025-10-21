@echo off
echo ========================================
echo Force New Deployment
echo ========================================
echo.

echo This will commit all pending changes and force a new deployment.
echo.

echo Adding all files...
git add -A

echo.
echo Committing changes...
git commit -m "Add S3 setup and fix AWS_REGION handling - Force deploy" -m "- Updated lib/s3.ts to handle auto-provided AWS_REGION" -m "- Added S3 bucket setup scripts and documentation" -m "- Environment variables configured in Amplify" -m "" -m "Bucket: pestimator-data-1760984255" -m "Region: us-east-1 (auto-provided by AWS)" -m "" -m "This commit forces a fresh deployment after pending issues."

echo.
echo Pushing to trigger new deployment...
git push origin main

echo.
echo ========================================
echo Done! A new deployment should start in AWS Amplify.
echo Go check the Amplify console.
echo ========================================
echo.
pause


