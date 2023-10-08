import * as path from "path";
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as efs from "aws-cdk-lib/aws-efs";

import type { Construct } from "constructs";

interface ICreateStatefuleResourcesProps {
  stack: Construct;
}

interface ICreateStatefulResourcesReturn {
  vpc: ec2.Vpc;
  fileSystem: efs.FileSystem;
  securityGroup: ec2.SecurityGroup;
}

interface ICreateInstanceProps {
  stack: Construct;
  vpc: ec2.IVpc;
  fileSystem: efs.IFileSystem;
  securityGroup: ec2.SecurityGroup;
}

interface ICreateInstanceReturn {
  instance: ec2.Instance;
}

export const createStatefulResouces = (props: ICreateStatefuleResourcesProps): ICreateStatefulResourcesReturn => {
  const { stack } = props;

  // create a new vpc
  const vpc = new ec2.Vpc(stack, `VpcFromCDK-${process.env.STACK_NAME}`, {
    natGateways: 0,
    maxAzs: 1,
    subnetConfiguration: [
      {
        name: "Public",
        subnetType: ec2.SubnetType.PUBLIC,
      },
    ],
  });

  const securityGroup = new ec2.SecurityGroup(stack, "SecurityGroup", {
    vpc: vpc,
    description: "SecurityGroup for DL EC2 CDK",
    securityGroupName: "CDK SecurityGroup",
    allowAllOutbound: true,
  });

  const fileSystem = new efs.FileSystem(stack, `EfsFileSystem-${process.env.STACK_NAME}`, {
    vpc,
    lifecyclePolicy: efs.LifecyclePolicy.AFTER_14_DAYS, // files are not transitioned to infrequent access (IA) storage by default
    performanceMode: efs.PerformanceMode.GENERAL_PURPOSE, // default
    outOfInfrequentAccessPolicy: efs.OutOfInfrequentAccessPolicy.AFTER_1_ACCESS, // files are not transitioned back from (infrequent access) IA to primary storage by default
  });

  return { vpc, fileSystem, securityGroup };
};

export const createInstance = (props: ICreateInstanceProps): ICreateInstanceReturn => {
  const { stack, vpc, fileSystem, securityGroup } = props;

  const machineImage = ec2.MachineImage.fromSsmParameter(
    "/aws/service/canonical/ubuntu/server/focal/stable/current/amd64/hvm/ebs-gp2/ami-id",
    {
      os: ec2.OperatingSystemType.LINUX,
    }
  );

  const instanceType = stack.node.tryGetContext("instanceType") || "g4dn.xlarge";
  const instance = new ec2.Instance(stack, `DLInstance-${process.env.STACK_NAME}`, {
    instanceType: new ec2.InstanceType(instanceType),
    machineImage: machineImage,
    vpc: vpc,
    vpcSubnets: {
      subnetType: ec2.SubnetType.PUBLIC,
    },
    securityGroup: securityGroup,
    keyName: `dl-dev-ec2-ssh-${process.env.STACK_NAME}.pem`,
    blockDevices: [
      {
        deviceName: "/dev/sda1",
        // free tier is 30GB
        volume: ec2.BlockDeviceVolume.ebs(30, {
          deleteOnTermination: true,
          volumeType: ec2.EbsDeviceVolumeType.GP2,
        }),
      },
    ],
  });

  instance.connections.allowFromAnyIpv4(ec2.Port.tcp(22)); // allow ssh
  fileSystem.connections.allowDefaultPortFrom(instance); // allow efs

  // setup subdomain
  const commands = [
    "apt update -y",
    "apt install -y unzip",
    'curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"',
    "unzip awscliv2.zip",
    "./aws/install",
    "aws --version",
  ];
  instance.userData.addCommands(...commands);

  let fileSystemId = fileSystem.fileSystemId;
  let efs_mount_point_1 = "/home/ubuntu/efs";
  let region = cdk.Stack.of(stack).region;

  const startupAsset = new cdk.aws_s3_assets.Asset(stack, "ConfigurationScript", {
    path: path.resolve(__dirname, "./startup.sh"),
  });
  const remoteConfigurationScriptPath = instance.userData.addS3DownloadCommand({
    bucket: startupAsset.bucket,
    bucketKey: startupAsset.s3ObjectKey,
  });
  instance.userData.addExecuteFileCommand({
    filePath: remoteConfigurationScriptPath,
    arguments: `-f "${fileSystemId}" -m "${efs_mount_point_1}" -r "${region}"`,
  });
  startupAsset.grantRead(instance.role);

  const installationAsset = new cdk.aws_s3_assets.Asset(stack, "InstallationScript", {
    path: path.resolve(__dirname, "./initial.sh"),
  });
  instance.userData.addS3DownloadCommand({
    bucket: installationAsset.bucket,
    bucketKey: installationAsset.s3ObjectKey,
    localFile: "/home/ubuntu/initialInstallationScript.sh",
  });

  return { instance };
};
