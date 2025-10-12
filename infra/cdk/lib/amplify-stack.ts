import { Stack, StackProps, aws_amplify as amplify, aws_iam as iam, aws_s3 as s3 } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class AmplifyStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const artifactBucket = new s3.Bucket(this, 'AmplifyArtifacts', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    const serviceRole = new iam.Role(this, 'AmplifyRole', {
      assumedBy: new iam.ServicePrincipal('amplify.amazonaws.com') as unknown as iam.IPrincipal,
    });
    artifactBucket.grantReadWrite(serviceRole);

    new amplify.CfnApp(this, 'AmplifyApp', {
      name: 'pestpro-amplify',
      repository: 'https://github.com/example/apex-pest-quoting',
      iamServiceRole: serviceRole.roleArn,
      buildSpec: `version: 1.0\nfrontend:\n  phases:\n    preBuild:\n      commands:\n        - pnpm install --frozen-lockfile\n    build:\n      commands:\n        - pnpm build\n  artifacts:\n    baseDirectory: .next\n    files:\n      - '**/*'\n  cache:\n    paths:\n      - node_modules/**/*`,
    });
  }
}
