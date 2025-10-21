#!/bin/bash

# S3 Bucket Setup Script for Pestimator/ApexToolFactory
# This script creates an S3 bucket with proper configuration for the application

set -e

echo "========================================="
echo "S3 Bucket Setup for Pestimator"
echo "========================================="
echo ""

# Configuration
BUCKET_NAME="pestimator-data-$(date +%s)"  # Unique bucket name with timestamp
REGION="us-east-1"  # Default region, change if needed

echo "Bucket Name: $BUCKET_NAME"
echo "Region: $REGION"
echo ""

# Create the S3 bucket
echo "Creating S3 bucket..."
if [ "$REGION" = "us-east-1" ]; then
    # us-east-1 doesn't need LocationConstraint
    aws s3api create-bucket \
        --bucket "$BUCKET_NAME" \
        --region "$REGION"
else
    # Other regions need LocationConstraint
    aws s3api create-bucket \
        --bucket "$BUCKET_NAME" \
        --region "$REGION" \
        --create-bucket-configuration LocationConstraint="$REGION"
fi

echo "✓ Bucket created successfully!"
echo ""

# Enable versioning (recommended for data safety)
echo "Enabling versioning..."
aws s3api put-bucket-versioning \
    --bucket "$BUCKET_NAME" \
    --versioning-configuration Status=Enabled

echo "✓ Versioning enabled!"
echo ""

# Block public access (security best practice)
echo "Blocking public access..."
aws s3api put-public-access-block \
    --bucket "$BUCKET_NAME" \
    --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

echo "✓ Public access blocked!"
echo ""

# Enable server-side encryption
echo "Enabling server-side encryption..."
aws s3api put-bucket-encryption \
    --bucket "$BUCKET_NAME" \
    --server-side-encryption-configuration '{
        "Rules": [{
            "ApplyServerSideEncryptionByDefault": {
                "SSEAlgorithm": "AES256"
            },
            "BucketKeyEnabled": true
        }]
    }'

echo "✓ Encryption enabled!"
echo ""

# Create lifecycle rule to optimize costs (optional)
echo "Setting up lifecycle policy..."
aws s3api put-bucket-lifecycle-configuration \
    --bucket "$BUCKET_NAME" \
    --lifecycle-configuration '{
        "Rules": [{
            "Id": "DeleteOldVersions",
            "Status": "Enabled",
            "NoncurrentVersionExpiration": {
                "NoncurrentDays": 30
            }
        }]
    }'

echo "✓ Lifecycle policy configured!"
echo ""

# Add CORS configuration for web access
echo "Configuring CORS..."
aws s3api put-bucket-cors \
    --bucket "$BUCKET_NAME" \
    --cors-configuration '{
        "CORSRules": [{
            "AllowedOrigins": ["*"],
            "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
            "AllowedHeaders": ["*"],
            "ExposeHeaders": ["ETag"],
            "MaxAgeSeconds": 3000
        }]
    }'

echo "✓ CORS configured!"
echo ""

echo "========================================="
echo "Setup Complete!"
echo "========================================="
echo ""
echo "Your S3 bucket details:"
echo "  Bucket Name: $BUCKET_NAME"
echo "  Region: $REGION"
echo "  Versioning: Enabled"
echo "  Encryption: AES256"
echo "  Public Access: Blocked"
echo ""
echo "Add these to AWS Amplify Environment Variables:"
echo "  AWS_REGION=$REGION"
echo "  S3_BUCKET=$BUCKET_NAME"
echo ""
echo "Next steps:"
echo "1. Go to AWS Amplify Console"
echo "2. Click 'Manage variables'"
echo "3. Add the environment variables above"
echo "4. Also add: ADMIN_PASSPHRASE=<your-secure-password>"
echo "5. Save and trigger a new deployment"
echo ""


