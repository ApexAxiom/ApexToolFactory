# IAM Policy Setup for AWS Amplify S3 Access

## 🎯 **Quick Setup (5 Minutes)**

Your Amplify app needs permission to access S3 bucket: `pestimator-data-1760984255`

---

## 📋 **Step-by-Step Instructions**

### Step 1: Open IAM Console
Go to: **https://console.aws.amazon.com/iam/**

### Step 2: Find the Amplify Service Role
1. Click **"Roles"** in the left sidebar
2. In the search box, type: **`amplify`**
3. Look for a role like:
   - `amplify-pestimator-main-xxxxx-serviceRole`
   - `amplifyconsole-backend-role`
   - Any role with "amplify" in the name

   **How to identify the correct role:**
   - Trusted entity: `amplify.amazonaws.com`
   - Created around the time you set up Amplify

### Step 3: Add the S3 Policy
1. **Click on the role** to open it
2. Click the **"Permissions"** tab
3. Click **"Add permissions"** dropdown
4. Select **"Create inline policy"**

### Step 4: Paste the Policy JSON
1. Click the **"JSON"** tab
2. **Delete** any existing content
3. **Paste this exact policy:**

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "S3AccessForPestimator",
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::pestimator-data-1760984255",
                "arn:aws:s3:::pestimator-data-1760984255/*"
            ]
        }
    ]
}
```

### Step 5: Review and Create
1. Click **"Review policy"**
2. Policy name: **`S3Access`**
3. Description: **`Allows Amplify app to access S3 bucket for data storage`**
4. Click **"Create policy"**

### Step 6: Verify
1. Go back to the role's **"Permissions"** tab
2. You should see **"S3Access"** listed under policies
3. Click on it to verify the JSON is correct

---

## ✅ **Verification Checklist**

After adding the policy, verify:
- [ ] Policy name is `S3Access`
- [ ] Policy attached to Amplify service role
- [ ] Bucket ARN is `arn:aws:s3:::pestimator-data-1760984255`
- [ ] Both bucket and bucket/* resources are included
- [ ] Actions include: GetObject, PutObject, DeleteObject, ListBucket

---

## 🔍 **What Each Permission Does**

| Permission | Purpose |
|------------|---------|
| `s3:GetObject` | Read quote data, customer info, etc. |
| `s3:PutObject` | Save new quotes, update data |
| `s3:DeleteObject` | Remove old data, locks |
| `s3:ListBucket` | List quotes, check if files exist |

---

## 🚨 **Troubleshooting**

### Can't find Amplify role?
1. Go to Amplify Console
2. Click your app → Settings → General
3. Look for "Service role" section
4. Click the role name to open it in IAM

### Multiple Amplify roles?
- Use the one that's currently active for your app
- Check "Last accessed" date in IAM
- Most recent one is usually correct

### Policy already exists?
- Click on the existing S3 policy
- Verify bucket name matches: `pestimator-data-1760984255`
- If different bucket, update the ARN
- If correct, you're good to go!

### Access denied after adding policy?
- Wait 1-2 minutes for IAM changes to propagate
- Trigger a new deployment
- Check CloudWatch logs for specific errors

---

## 🎨 **Visual Guide**

```
AWS Console
    └─ IAM
        └─ Roles
            └─ amplify-*-serviceRole
                └─ Permissions Tab
                    └─ Add permissions
                        └─ Create inline policy
                            └─ JSON Tab
                                └─ Paste policy
                                    └─ Review & Create
```

---

## 📱 **Alternative: AWS CLI**

If you prefer CLI, run these commands:

```bash
# 1. Find the role name
aws iam list-roles --query "Roles[?contains(RoleName,'amplify')].RoleName"

# 2. Save policy to file
cat > s3-policy.json << 'EOF'
{
    "Version": "2012-10-17",
    "Statement": [{
        "Sid": "S3AccessForPestimator",
        "Effect": "Allow",
        "Action": [
            "s3:GetObject",
            "s3:PutObject",
            "s3:DeleteObject",
            "s3:ListBucket"
        ],
        "Resource": [
            "arn:aws:s3:::pestimator-data-1760984255",
            "arn:aws:s3:::pestimator-data-1760984255/*"
        ]
    }]
}
EOF

# 3. Attach policy (replace ROLE_NAME)
aws iam put-role-policy \
    --role-name YOUR_AMPLIFY_ROLE_NAME \
    --policy-name S3Access \
    --policy-document file://s3-policy.json

# 4. Verify
aws iam get-role-policy \
    --role-name YOUR_AMPLIFY_ROLE_NAME \
    --policy-name S3Access
```

---

## ⏭️ **Next Steps After IAM Setup**

1. ✅ IAM policy added
2. ⏭️ Run `COMPLETE_FIX.bat` to commit code fixes
3. ⏭️ Watch Amplify deployment complete
4. ⏭️ Test the application

---

## 🔐 **Security Notes**

- ✅ Policy grants access ONLY to your specific bucket
- ✅ No public access to S3 data
- ✅ Amplify app uses IAM role (no access keys in code)
- ✅ All data encrypted at rest in S3
- ✅ Minimum required permissions only

This is a secure, production-ready configuration! 🛡️


