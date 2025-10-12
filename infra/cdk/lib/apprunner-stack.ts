import {
  Duration,
  Stack,
  StackProps,
  aws_apprunner as apprunner,
  aws_ec2 as ec2,
  aws_iam as iam,
  aws_rds as rds,
  aws_s3 as s3,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class AppRunnerStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'AuroraVpc', {
      maxAzs: 2,
      natGateways: 0,
    });

    const cluster = new rds.ServerlessCluster(this, 'Aurora', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_2,
      }),
      vpc,
      defaultDatabaseName: 'pestpro',
      scaling: { autoPause: Duration.minutes(10) },
    });
    cluster.connections.allowDefaultPortFromAnyIpv4('App Runner access');

    const assetBucket = new s3.Bucket(this, 'AssetBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    const instanceRole = new iam.Role(this, 'AppRunnerInstanceRole', {
      assumedBy: new iam.ServicePrincipal('tasks.apprunner.amazonaws.com'),
    });
    assetBucket.grantReadWrite(instanceRole);
    cluster.secret?.grantRead(instanceRole);

    const autoScaling = new apprunner.CfnAutoScalingConfiguration(this, 'AutoScaling', {
      autoScalingConfigurationName: 'pestpro-default',
      maxConcurrency: 100,
      maxSize: 10,
      minSize: 1,
    });

    const authenticationConfiguration = process.env.APP_RUNNER_CONNECTION_ARN
      ? { connectionArn: process.env.APP_RUNNER_CONNECTION_ARN }
      : undefined;

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
        authenticationConfiguration,
        autoDeploymentsEnabled: true,
      },
      instanceConfiguration: {
        cpu: '1024',
        memory: '2048',
        instanceRoleArn: instanceRole.roleArn,
      },
      healthCheckConfiguration: {
        protocol: 'HTTP',
        path: '/healthz',
        healthyThreshold: 1,
        interval: 10,
        timeout: 5,
      },
      autoScalingConfigurationArn: autoScaling.attrAutoScalingConfigurationArn,
      serviceConfiguration: {
        runtimeConfiguration: {
          environment: [
            { name: 'AWS_REGION', value: Stack.of(this).region },
            { name: 'ASSET_BUCKET', value: assetBucket.bucketName },
            { name: 'DB_SECRET_ARN', value: cluster.secret?.secretArn ?? '' },
          ],
        },
      },
    });
  }
}
