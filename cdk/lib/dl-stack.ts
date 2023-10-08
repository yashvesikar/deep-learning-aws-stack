import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as efs from "aws-cdk-lib/aws-efs";
import type { Construct } from "constructs";

import { createInstance, createStatefulResouces } from "./ec2";

export class DLStatefulStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly fileSystem: efs.FileSystem;
  public readonly securityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const { vpc, fileSystem, securityGroup } = createStatefulResouces({ stack: this });
    this.vpc = vpc;
    this.fileSystem = fileSystem;
    this.securityGroup = securityGroup;
  }
}

interface DLStackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
  fileSystem: efs.IFileSystem;
  securityGroup: ec2.SecurityGroup;
}
export class DLStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: DLStackProps) {
    super(scope, id, props);

    const name = process.env.STACK_NAME;
    if (!name) {
      throw new Error("NAME is not defined");
    }
    const { instance } = createInstance({
      stack: this,
      vpc: props.vpc,
      fileSystem: props.fileSystem,
      securityGroup: props.securityGroup,
    });

    new cdk.CfnOutput(this, "EC2 Instance ID", {
      value: instance.instanceId,
    });

    new cdk.CfnOutput(this, "EC2 Instance Public IP", {
      value: instance.instancePublicIp,
    });

    new cdk.CfnOutput(this, "EC2 Connect command", {
      value: `ssh -i ~/.ssh/dl-dev-ec2-ssh-${name}.pem ubuntu@${instance.instancePublicIp}`,
    });
  }
}
