#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { TestTrainingStack } from '../lib/test-training-stack';

const app = new cdk.App();
new TestTrainingStack(app, 'TestTrainingStack');