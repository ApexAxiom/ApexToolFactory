# S3 Bucket Setup Script for Pestimator/ApexToolFactory (PowerShell)
# This script creates an S3 bucket with proper configuration for the application

Write-Host "=========================================" -ForegroundColor Green
Write-Host "S3 Bucket Setup for Pestimator" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""

# Configuration
$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$BUCKET_NAME = "pestimator-data-$timestamp"
$REGION = "us-east-1"  # Change if you prefer a different region

Write-Host "Bucket Name: $BUCKET_NAME" -ForegroundColor Cyan
Write-Host "Region: $REGION" -ForegroundColor Cyan
Write-Host ""

# Check if AWS CLI is installed
try {
    $awsVersion = aws --version 2>&1
    Write-Host "✓ AWS CLI found: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ AWS CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "  https://aws.amazon.com/cli/" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Create the S3 bucket
Write-Host "Creating S3 bucket..." -ForegroundColor Yellow
try {
    if ($REGION -eq "us-east-1") {
        aws s3api create-bucket --bucket $BUCKET_NAME --region $REGION 2>&1 | Out-Null
    } else {
        aws s3api create-bucket --bucket $BUCKET_NAME --region $REGION --create-bucket-configuration LocationConstraint=$REGION 2>&1 | Out-Null
    }
    Write-Host "✓ Bucket created successfully!" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to create bucket: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Enable versioning
Write-Host "Enabling versioning..." -ForegroundColor Yellow
aws s3api put-bucket-versioning --bucket $BUCKET_NAME --versioning-configuration Status=Enabled
Write-Host "✓ Versioning enabled!" -ForegroundColor Green
Write-Host ""

# Block public access
Write-Host "Blocking public access..." -ForegroundColor Yellow
aws s3api put-public-access-block --bucket $BUCKET_NAME --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
Write-Host "✓ Public access blocked!" -ForegroundColor Green
Write-Host ""

# Enable encryption
Write-Host "Enabling server-side encryption..." -ForegroundColor Yellow
$encryptionConfig = @"
{
    "Rules": [{
        "ApplyServerSideEncryptionByDefault": {
            "SSEAlgorithm": "AES256"
        },
        "BucketKeyEnabled": true
    }]
}
"@
$encryptionConfig | aws s3api put-bucket-encryption --bucket $BUCKET_NAME --server-side-encryption-configuration file:///dev/stdin
Write-Host "✓ Encryption enabled!" -ForegroundColor Green
Write-Host ""

# Lifecycle policy
Write-Host "Setting up lifecycle policy..." -ForegroundColor Yellow
$lifecycleConfig = @"
{
    "Rules": [{
        "Id": "DeleteOldVersions",
        "Status": "Enabled",
        "NoncurrentVersionExpiration": {
            "NoncurrentDays": 30
        }
    }]
}
"@
$lifecycleConfig | aws s3api put-bucket-lifecycle-configuration --bucket $BUCKET_NAME --lifecycle-configuration file:///dev/stdin
Write-Host "✓ Lifecycle policy configured!" -ForegroundColor Green
Write-Host ""

# CORS configuration
Write-Host "Configuring CORS..." -ForegroundColor Yellow
$corsConfig = @"
{
    "CORSRules": [{
        "AllowedOrigins": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
        "AllowedHeaders": ["*"],
        "ExposeHeaders": ["ETag"],
        "MaxAgeSeconds": 3000
    }]
}
"@
$corsConfig | aws s3api put-bucket-cors --bucket $BUCKET_NAME --cors-configuration file:///dev/stdin
Write-Host "✓ CORS configured!" -ForegroundColor Green
Write-Host ""

Write-Host "=========================================" -ForegroundColor Green
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your S3 bucket details:" -ForegroundColor Cyan
Write-Host "  Bucket Name: $BUCKET_NAME" -ForegroundColor White
Write-Host "  Region: $REGION" -ForegroundColor White
Write-Host "  Versioning: Enabled" -ForegroundColor White
Write-Host "  Encryption: AES256" -ForegroundColor White
Write-Host "  Public Access: Blocked" -ForegroundColor White
Write-Host ""
Write-Host "Add these to AWS Amplify Environment Variables:" -ForegroundColor Yellow
Write-Host "  AWS_REGION=$REGION" -ForegroundColor White
Write-Host "  S3_BUCKET=$BUCKET_NAME" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Go to AWS Amplify Console" -ForegroundColor White
Write-Host "2. Click 'Manage variables'" -ForegroundColor White
Write-Host "3. Add the environment variables above" -ForegroundColor White
Write-Host "4. Also add: ADMIN_PASSPHRASE=<your-secure-password>" -ForegroundColor White
Write-Host "5. Save and trigger a new deployment" -ForegroundColor White
Write-Host ""

# Save configuration to file
$config = @"
AWS_REGION=$REGION
S3_BUCKET=$BUCKET_NAME
"@
$config | Out-File -FilePath "s3-bucket-config.txt" -Encoding utf8
Write-Host "Configuration saved to: s3-bucket-config.txt" -ForegroundColor Green


