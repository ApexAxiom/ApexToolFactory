# Complete Deployment Troubleshooting Checklist

## ✅ Pre-Deployment Checklist

### 1. Code Fixes
- [x] `lib/auth.ts` - Fixed TypeScript error (use `as any` for iron-session)
- [x] `lib/s3.ts` - Handles auto-provided `AWS_REGION`
- [x] `package.json` - Cleaned up, no Prisma references
- [x] `amplify.yml` - Correct configuration present in repo

### 2. S3 Bucket Setup
- [ ] S3 bucket created: `pestimator-data-1760984255`
- [ ] Bucket in `us-east-1` region
- [ ] Versioning enabled
- [ ] Public access blocked

### 3. AWS Amplify Configuration
- [ ] App created in AWS Amplify
- [ ] Connected to GitHub repository
- [ ] Branch: `main` is configured
- [ ] Build settings use `amplify.yml` from repo

### 4. Environment Variables in Amplify
- [ ] `S3_BUCKET` = `pestimator-data-1760984255`
- [ ] `ADMIN_PASSPHRASE` = `ApexPest2024!Secure#Admin`
- [ ] `SESSION_PASSWORD` = (existing value)
- [ ] **DO NOT ADD** `AWS_REGION` (auto-provided)

### 5. IAM Permissions
- [ ] Found Amplify service role in IAM
- [ ] Added inline policy named `S3Access`
- [ ] Policy grants: GetObject, PutObject, DeleteObject, ListBucket
- [ ] Policy applies to bucket: `pestimator-data-1760984255`

### 6. Git Repository
- [ ] All changes committed
- [ ] Pushed to `main` branch
- [ ] Latest commit includes all fixes

---

## 🔍 Build Configuration Verification

### Expected amplify.yml Content:
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - nvm install 20
        - nvm use 20
        - corepack enable
        - corepack prepare pnpm@8.15.4 --activate
        - pnpm install --no-frozen-lockfile
    build:
      commands:
        - pnpm build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .pnpm-store/**/*
```

### Verify in Amplify Console:
1. Go to: Amplify → Your App → Build settings
2. Check that "amplify.yml" is detected
3. If not detected, manually set build commands:
   - **preBuild**: See commands above
   - **Build**: `pnpm build`
   - **baseDirectory**: `.next`

---

## 🐛 Common Issues & Solutions

### Issue 1: "Build stuck in pending"
**Symptoms:** Deployment shows "Deploy pending" for >10 minutes
**Solution:**
1. Cancel the deployment
2. Wait 2 minutes
3. Trigger manual redeploy
4. If persists, check AWS Amplify service health

### Issue 2: "TypeScript error in lib/auth.ts"
**Symptoms:** Build fails with type compatibility error
**Solution:** 
- Verify `lib/auth.ts` line 28 uses `as any` (not `as unknown as RequestCookies`)
- Run `COMPLETE_FIX.bat` to apply correct fix

### Issue 3: "AWS_REGION environment variable error"
**Symptoms:** Error says "cannot start with AWS prefix"
**Solution:**
- **DO NOT** manually add `AWS_REGION` to Amplify
- AWS provides it automatically
- Code handles fallback: `process.env.AWS_REGION || "us-east-1"`

### Issue 4: "S3 Access Denied"
**Symptoms:** Build succeeds but runtime errors accessing S3
**Solution:**
1. Go to IAM Console
2. Find Amplify service role
3. Verify S3Access policy exists
4. Check policy JSON has correct bucket name
5. Redeploy after fixing

### Issue 5: "Missing SESSION_PASSWORD"
**Symptoms:** Build fails with "Missing env: SESSION_PASSWORD"
**Solution:**
- Check environment variables in Amplify
- Ensure `SESSION_PASSWORD` is set (should already exist)
- Must be 32+ characters

### Issue 6: "amplify.yml not detected"
**Symptoms:** Build uses default settings, not your config
**Solution:**
1. Verify `amplify.yml` exists in repo root
2. Amplify Console → Build settings → Edit
3. Set "Build specification" to "Use amplify.yml from repository"
4. If option not available, manually enter build commands

---

## 📊 Expected Build Timeline

| Phase | Duration | What Happens |
|-------|----------|--------------|
| **Setup** | 30s | Clone repo, setup environment |
| **preBuild** | 1-2 min | Install Node 20, pnpm, dependencies |
| **Build** | 1-2 min | Run `pnpm build`, compile TypeScript |
| **Deploy** | 30s-1min | Deploy to Amplify hosting |
| **Total** | **3-5 minutes** | Complete deployment |

### 🚨 If build takes >10 minutes:
- Check build logs for where it's stuck
- Cancel and retry
- Check for infrastructure issues

---

## 🔧 Manual Build Test (Local)

Want to test before deploying? Run locally:

```powershell
cd H:\Pestimator.com

# Install dependencies
pnpm install

# Type check (should pass with no errors)
pnpm typecheck

# Build (should complete successfully)
pnpm build
```

**Expected result:** No TypeScript errors, successful build

---

## 🆘 If All Else Fails

### Nuclear Option: Recreate Amplify App

1. **Export current settings:**
   - Note environment variables
   - Save build configuration
   - Document IAM role name

2. **Delete Amplify app:**
   - Amplify Console → Your App → Actions → Delete app
   - Confirm deletion

3. **Create new app:**
   - Click "New app" → "Host web app"
   - Connect GitHub → Select repository → Branch: main
   - **IMPORTANT:** Check "Existing amplify.yml found" ✅
   - Add environment variables
   - Deploy

4. **Reconfigure IAM:**
   - Add S3Access policy to new service role

### When to do this:
- Only if deployment is consistently stuck
- After trying all other solutions
- As absolute last resort

---

## 📞 Getting Help

### Check These Resources:
1. Build logs in Amplify Console (full output)
2. AWS Service Health Dashboard
3. This troubleshooting guide
4. AWS Amplify Documentation

### Information to Gather:
- Full build log output
- Environment variables (redact sensitive values)
- IAM policy JSON
- amplify.yml content
- Error messages (exact text)

---

## ✅ Success Indicators

You'll know deployment succeeded when:
1. ✅ Build completes in 3-5 minutes
2. ✅ No TypeScript errors in build logs
3. ✅ "Deployment completed successfully" message
4. ✅ Application URL is accessible
5. ✅ Can log in with `ADMIN_PASSPHRASE`
6. ✅ Can create a quote (tests S3 integration)

---

## 🎯 Current Status

Based on latest attempt:
- ❌ TypeScript error in lib/auth.ts line 28
- ✅ amplify.yml is correct
- ✅ Environment variables added
- ⏳ IAM permissions (needs verification)
- ✅ S3 bucket created

**Next action:** Run `COMPLETE_FIX.bat` to fix TypeScript error and deploy


