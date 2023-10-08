#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { DLStack, DLStatefulStack } from "../lib/dl-stack";

const app = new cdk.App();
const statefulStack = new DLStatefulStack(app, "DLStatefulStack", {
  stackName: `DLStatefulDev-${process.env.STACK_NAME}`,
});

new DLStack(app, "DLStack", {
  stackName: `DL-${process.env.STACK_NAME}`,
  vpc: statefulStack.vpc,
  fileSystem: statefulStack.fileSystem,
  securityGroup: statefulStack.securityGroup,
});
