# S3 Bucket Setup Guide

## Quick Setup Options

### Option 1: Automated Script (Recommended)

**PowerShell (Windows):**
```powershell
cd H:\Pestimator.com
.\setup-s3-bucket.ps1
```

**Bash (Mac/Linux):**
```bash
cd H:\Pestimator.com
chmod +x setup-s3-bucket.sh
./setup-s3-bucket.sh
```

### Option 2: AWS Console (Manual)

If you prefer to create the bucket manually:

1. **Go to AWS S3 Console**
   - https://s3.console.aws.amazon.com/s3/buckets

2. **Click "Create bucket"**

3. **Configure bucket:**
   - **Name**: `pestimator-data-production` (must be globally unique)
   - **Region**: `us-east-1` (or your preferred region)
   - **Block all public access**: ✅ Enable (checked)
   - **Bucket Versioning**: Enable
   - **Default encryption**: AES-256 (SSE-S3)

4. **Click "Create bucket"**

### Option 3: AWS CLI (Manual Commands)

```bash
# Set your bucket name (must be globally unique)
BUCKET_NAME="pestimator-data-$(date +%s)"
REGION="us-east-1"

# Create bucket
aws s3api create-bucket \
    --bucket $BUCKET_NAME \
    --region $REGION

# Enable versioning
aws s3api put-bucket-versioning \
    --bucket $BUCKET_NAME \
    --versioning-configuration Status=Enabled

# Block public access
aws s3api put-public-access-block \
    --bucket $BUCKET_NAME \
    --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Enable encryption
aws s3api put-bucket-encryption \
    --bucket $BUCKET_NAME \
    --server-side-encryption-configuration '{
        "Rules": [{
            "ApplyServerSideEncryptionByDefault": {
                "SSEAlgorithm": "AES256"
            }
        }]
    }'

echo "Bucket Name: $BUCKET_NAME"
echo "Region: $REGION"
```

## IAM Permissions for Amplify

Your AWS Amplify app needs S3 permissions. The Amplify service role should have these permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::YOUR-BUCKET-NAME",
                "arn:aws:s3:::YOUR-BUCKET-NAME/*"
            ]
        }
    ]
}
```

### How to Add S3 Permissions to Amplify:

1. **Go to AWS IAM Console**
   - https://console.aws.amazon.com/iam/

2. **Find Amplify Service Role**
   - Roles → Search for "amplify"
   - Should be named something like `amplifyconsole-backend-role`

3. **Add Inline Policy**
   - Click on the role
   - Click "Add permissions" → "Create inline policy"
   - Paste the JSON above (replace YOUR-BUCKET-NAME)
   - Name it "S3Access"
   - Click "Create policy"

## After Creating the Bucket

### Update Amplify Environment Variables:

1. Go to AWS Amplify Console
2. Select your app (ApexToolFactory)
3. Click "Environment variables" in left menu
4. Click "Manage variables"
5. Add these variables:

| Variable | Value |
|----------|-------|
| `AWS_REGION` | `us-east-1` (or your region) |
| `S3_BUCKET` | Your bucket name from script output |
| `ADMIN_PASSPHRASE` | Choose a secure password |
| `SESSION_PASSWORD` | (Keep existing value) |

6. **Remove old Supabase variables** (optional):
   - `DATABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

7. Click "Save"

### Trigger New Deployment:

After saving variables:
1. Go to "Deployments" tab
2. Click "Redeploy this version" on any recent deployment
3. OR push a new commit to trigger deployment
4. Watch the build logs - it should complete in 3-5 minutes!

## Troubleshooting

### Error: "Bucket name already exists"
- S3 bucket names are globally unique
- Try a different name with more randomness
- The scripts add a timestamp to help with this

### Error: "Access Denied"
- Check that your AWS CLI is configured: `aws configure`
- Verify you have S3 permissions in your IAM user/role
- Run: `aws s3 ls` to test access

### Error: "Invalid region"
- Valid regions: us-east-1, us-west-2, eu-west-1, etc.
- Change the `REGION` variable in the script

## Bucket Structure

Your app will create this structure automatically:

```
pestimator-data-xxx/
├── orgs/
│   └── default/
│       ├── meta.json
│       ├── index.json
│       ├── customers/
│       │   └── {customer-id}.json
│       ├── properties/
│       │   └── {property-id}.json
│       ├── templates/
│       │   └── {template-id}.json
│       └── quotes/
│           └── {quote-id}.json
```

## Cost Estimate

S3 is very affordable for this use case:
- **Storage**: ~$0.023/GB/month
- **Requests**: ~$0.005 per 1,000 PUT requests
- **Expected cost**: **< $1/month** for typical usage

## Security Notes

✅ Public access is blocked
✅ Encryption at rest is enabled
✅ Versioning is enabled (you can recover deleted data)
✅ CORS is configured for web access
✅ No sensitive data should be stored unencrypted

## Next Steps After Setup

1. ✅ S3 bucket created
2. ✅ Environment variables added to Amplify
3. ✅ IAM permissions configured
4. ⏳ Deploy the application
5. ✅ Test creating a quote
6. ✅ Verify data appears in S3

Your application is now ready to deploy! 🚀


