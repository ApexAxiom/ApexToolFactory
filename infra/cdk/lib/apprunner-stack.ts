import { Duration, Stack, StackProps, aws_apprunner as apprunner, aws_iam as iam, aws_s3 as s3, aws_secretsmanager as secrets } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class AppRunnerStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const assetBucket = new s3.Bucket(this, 'AssetBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    const secret = new secrets.Secret(this, 'DatabaseSecret');

    const role = new iam.Role(this, 'AppRunnerRole', {
      assumedBy: new iam.ServicePrincipal('build.apprunner.amazonaws.com'),
    });

    assetBucket.grantReadWrite(role);
    secret.grantRead(role);

    new apprunner.CfnService(this, 'AppRunnerService', {
      serviceName: 'pestpro-apprunner',
      sourceConfiguration: {
        codeRepository: {
          repositoryUrl: 'https://github.com/example/apex-pest-quoting',
          sourceCodeVersion: { type: 'BRANCH', value: 'main' },
          codeConfiguration: {
            configurationSource: 'REPOSITORY',
          },
        },
      },
      instanceConfiguration: {
        cpu: '1024',
        memory: '2048',
      },
      healthCheckConfiguration: {
        protocol: 'HTTP',
        path: '/healthz',
        healthyThreshold: 1,
        interval: 10,
        timeout: 5,
      },
      autoScalingConfigurationArn: new apprunner.CfnAutoScalingConfiguration(this, 'AutoScaling', {
        autoScalingConfigurationName: 'pestpro-default',
        maxConcurrency: 100,
        maxSize: 10,
        minSize: 1,
      }).attrAutoScalingConfigurationArn,
    });
  }
}
