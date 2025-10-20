# Manual Commit Instructions

## Summary of Changes Made

I've fixed the AWS Amplify deployment issues. Here are the files that were modified:

### 1. `lib/auth.ts` (CRITICAL FIX)
**Line 23-24:** Changed the type assertion to fix the TypeScript compilation error:
```typescript
// Changed from:
if (typeof (cookieStore as Partial<RequestCookies>).set !== "function") {

// To:
if (typeof (cookieStore as unknown as any).set !== "function") {
```

### 2. `package.json` (CRITICAL FIX)
- **Removed Prisma scripts** from the build command (line 8)
- **Cleaned up dependencies** to only include what's actually used
- **Removed all Prisma-related scripts and dependencies**

### 3. New Files Created
- `DEPLOYMENT_FIX.md` - Documentation of all fixes
- `deploy-fix.ps1` - PowerShell script to automate commit/push
- `COMMIT_INSTRUCTIONS.md` - This file

### 4. Files Removed
- `src/lib/supabase.ts` - Leftover from old codebase
- `tatus` and `tatus --short` - Accidentally created files

## To Complete the Deployment

### Option 1: Run the PowerShell Script
Open a **NEW** PowerShell terminal (not the one with the pager issue) and run:
```powershell
cd H:\Pestimator.com
.\deploy-fix.ps1
```

### Option 2: Manual Git Commands
Open a **NEW** terminal and run:
```bash
cd H:\Pestimator.com

# Add the modified files
git add lib/auth.ts
git add package.json
git add DEPLOYMENT_FIX.md
git add COMMIT_INSTRUCTIONS.md
git add deploy-fix.ps1

# Remove the src directory if it still exists
git rm -rf src

# Commit with a descriptive message
git commit -m "Fix AWS Amplify deployment: TypeScript error and package.json cleanup

- Fixed TypeScript error in lib/auth.ts (line 23) by changing type assertion
- Cleaned up package.json to remove Prisma dependencies and scripts
- Removed unused dependencies from package.json
- Added DEPLOYMENT_FIX.md documentation
- Removed leftover src directory

This should resolve the build failure on AWS Amplify."

# Push to trigger new deployment
git push origin main
```

## What This Fixes

1. **TypeScript Compilation Error**: The build was failing because of a type mismatch in `lib/auth.ts` line 23
2. **Missing Prisma Scripts**: The build command referenced scripts that don't exist anymore
3. **Bloated Dependencies**: Removed unused packages that could cause conflicts

## Expected Result

After pushing these changes, AWS Amplify will:
1. Clone the repository
2. Install dependencies with pnpm
3. Run `pnpm build` (which now runs `next build` without Prisma steps)
4. Successfully compile TypeScript without errors
5. Deploy the application

## Environment Variables to Verify in AWS Amplify

Make sure these are set in your Amplify console:
- `SESSION_PASSWORD` - 32+ character secret for iron-session
- `ADMIN_PASSPHRASE` - Admin authentication password
- `AWS_REGION` - AWS region (e.g., us-east-1)
- `S3_BUCKET` - Your S3 bucket name
- `NODE_ENV` - Should be "production"

## Next Steps

1. Commit and push the changes (using one of the options above)
2. Go to AWS Amplify console
3. Watch the build logs
4. The build should complete successfully this time!

If you encounter any other issues, check the Amplify build logs and let me know.

