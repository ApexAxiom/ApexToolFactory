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
      vpc: vpc as unknown as ec2.IVpc,
      defaultDatabaseName: 'pestpro',
      scaling: { autoPause: Duration.minutes(10) },
    });

    const appRunnerSg = new ec2.SecurityGroup(this, 'AppRunnerSG', { vpc: vpc as unknown as ec2.IVpc });
    cluster.connections.allowDefaultPortFrom(appRunnerSg, 'App Runner access');

    const vpcConnector = new apprunner.CfnVpcConnector(this, 'AppRunnerVpcConnector', {
      vpcConnectorName: `${Stack.of(this).stackName}-vpc-connector`,
      subnets: vpc.privateSubnets.map((subnet) => subnet.subnetId),
      securityGroups: [appRunnerSg.securityGroupId],
    });

    const assetBucket = new s3.Bucket(this, 'AssetBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    const instanceRole = new iam.Role(this, 'AppRunnerInstanceRole', {
      assumedBy: new iam.ServicePrincipal('tasks.apprunner.amazonaws.com') as unknown as iam.IPrincipal,
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
      ? ({ connectionArn: process.env.APP_RUNNER_CONNECTION_ARN } as unknown as apprunner.CfnService.AuthenticationConfigurationProperty)
      : (undefined as unknown as apprunner.CfnService.AuthenticationConfigurationProperty);

    new apprunner.CfnService(this, 'AppRunnerService', {
      serviceName: 'pestpro-apprunner',
      sourceConfiguration: ({
        codeRepository: {
          repositoryUrl: 'https://github.com/example/apex-pest-quoting',
          sourceCodeVersion: { type: 'BRANCH', value: 'main' },
          codeConfiguration: {
            configurationSource: 'REPOSITORY',
          },
        },
        authenticationConfiguration,
        autoDeploymentsEnabled: true,
      } as unknown) as apprunner.CfnService.SourceConfigurationProperty,
      instanceConfiguration: {
        cpu: '1024',
        memory: '2048',
        instanceRoleArn: instanceRole.roleArn,
      },
      networkConfiguration: {
        egressConfiguration: {
          egressType: 'VPC',
          vpcConnectorArn: vpcConnector.attrVpcConnectorArn,
        },
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
          runtimeEnvironmentSecrets: [
            { name: 'DATABASE_URL', value: cluster.secret!.secretArn },
          ],
          runtimeEnvironmentVariables: [
            { name: 'AWS_REGION', value: Stack.of(this).region },
            { name: 'ASSET_BUCKET', value: assetBucket.bucketName },
          ],
        },
      },
    });
  }
}
