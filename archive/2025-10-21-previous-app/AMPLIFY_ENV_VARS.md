# AWS Amplify Environment Variables Setup

## Required Variables (Add These)

| Variable | Value | Notes |
|----------|-------|-------|
| `S3_BUCKET` | `pestimator-data-XXXXXXXX` | From setup script output |
| `ADMIN_PASSPHRASE` | Your secure password | Choose any strong password |
| `SESSION_PASSWORD` | (Keep existing) | Already configured ✅ |

## Auto-Provided by AWS (Don't Add These)

| Variable | Provided By | Notes |
|----------|-------------|-------|
| `AWS_REGION` | AWS Amplify | Automatically set based on deployment region |
| `AWS_ACCESS_KEY_ID` | AWS Amplify | From IAM role |
| `AWS_SECRET_ACCESS_KEY` | AWS Amplify | From IAM role |
| `NODE_ENV` | AWS Amplify | Automatically set to "production" |

## Optional Cleanup (Can Remove)

These Supabase variables are no longer used:
- ❌ `DATABASE_URL`
- ❌ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ❌ `NEXT_PUBLIC_SUPABASE_URL`
- ❌ `SUPABASE_SERVICE_ROLE_KEY`

## Step-by-Step Instructions

### 1. Get Your S3 Bucket Name

Run the setup script:
```powershell
cd H:\Pestimator.com
.\setup-s3-bucket.ps1
```

Copy the bucket name from the output (looks like: `pestimator-data-1729455789`)

### 2. Add Variables to Amplify

1. Go to AWS Amplify Console
2. Select your app (ApexToolFactory)
3. Click "**Hosting environments**" → "**main**"
4. Click "**Environment variables**" in left menu
5. Click "**Manage variables**" button

### 3. Add Each Variable

**Add S3_BUCKET:**
- Click "Add variable"
- Variable: `S3_BUCKET`
- Value: `pestimator-data-XXXXXXXX` (your actual bucket name)
- Branch: `All branches`

**Add ADMIN_PASSPHRASE:**
- Click "Add variable"
- Variable: `ADMIN_PASSPHRASE`
- Value: Choose a secure password (e.g., `MySecurePassword123!`)
- Branch: `All branches`

**Keep SESSION_PASSWORD:**
- Already exists ✅
- Don't modify it

### 4. Save and Deploy

1. Click "**Save**" button
2. AWS will automatically trigger a redeploy
3. OR go to "**Deployments**" tab and click "**Redeploy this version**"

## Verification

After deployment completes, check:
- ✅ Build completes in 3-5 minutes (not 60+ minutes)
- ✅ No TypeScript errors
- ✅ Application is accessible
- ✅ Can create quotes (data saves to S3)

## Troubleshooting

### Error: "S3_BUCKET is not defined"
- Make sure you saved the environment variable
- Redeploy after adding variables

### Error: "Access Denied" to S3
- Check IAM role has S3 permissions (see S3_SETUP_GUIDE.md)
- Verify bucket name is correct
- Ensure bucket exists in the same AWS account

### Error: "Cannot start with AWS prefix"
- This is expected for `AWS_REGION`
- Don't add it manually - AWS provides it automatically
- The code handles this with fallback: `AWS_REGION || "us-east-1"`

## Summary

**Total variables you need to add: 2**
1. `S3_BUCKET`
2. `ADMIN_PASSPHRASE`

**Variables that already exist: 1**
1. `SESSION_PASSWORD` ✅

**Variables auto-provided by AWS: 1**
1. `AWS_REGION` (don't add manually)

That's it! Simple and clean. 🎯


