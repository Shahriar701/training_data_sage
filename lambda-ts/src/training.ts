import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import {
    SageMakerClient,
    CreateTrainingJobCommand,
    CreateTrainingJobCommandInput,
    TrainingInputMode,
    S3DataType,
    DataDistributionType,
    TrainingInstanceType
} from '@aws-sdk/client-sagemaker';
import { createResponse, createErrorResponse } from './types';

// Initialize SageMaker client
const sagemakerClient = new SageMakerClient({});

// Define the training configuration interface
interface TrainingConfig {
    algorithmSpecification: {
        trainingImage: string;
        trainingInputMode: string;
    };
    roleArn: string;
    inputDataConfig: Array<{
        channelName: string;
        dataSource: {
            s3DataSource: {
                s3Uri: string;
                s3DataType: string;
                s3DataDistributionType: string;
            };
        };
    }>;
    outputDataConfig: {
        s3OutputPath: string;
    };
    resourceConfig: {
        instanceCount: number;
        instanceType: string;
        volumeSizeInGb: number;
    };
    stoppingCondition: {
        maxRuntimeInSeconds: number;
    };
}

/**
 * Validate that the config contains all the required keys
 */
function validateConfig(config: any): [boolean, string] {
    const requiredKeys = [
        'algorithmSpecification', 'roleArn', 'inputDataConfig',
        'outputDataConfig', 'resourceConfig', 'stoppingCondition'
    ];

    // Check for required top-level keys
    for (const key of requiredKeys) {
        if (!(key in config)) {
            return [false, `Missing required key: ${key}`];
        }
    }

    // Validate sub-keys
    const { algorithmSpecification, inputDataConfig, resourceConfig, stoppingCondition } = config;

    if (!('trainingImage' in algorithmSpecification) || !('trainingInputMode' in algorithmSpecification)) {
        return [false, 'Missing required keys in algorithmSpecification'];
    }

    if (!Array.isArray(inputDataConfig) || inputDataConfig.length < 1) {
        return [false, 'inputDataConfig must be a non-empty array'];
    }

    if (!('instanceCount' in resourceConfig) ||
        !('instanceType' in resourceConfig) ||
        !('volumeSizeInGb' in resourceConfig)) {
        return [false, 'Missing required keys in resourceConfig'];
    }

    if (!('maxRuntimeInSeconds' in stoppingCondition)) {
        return [false, 'Missing maxRuntimeInSeconds in stoppingCondition'];
    }

    return [true, ''];
}

/**
 * Helper function to convert string training input mode to enum
 */
function getTrainingInputMode(mode: string): TrainingInputMode {
    if (mode.toUpperCase() === 'FILE') {
        return TrainingInputMode.FILE;
    } else if (mode.toUpperCase() === 'PIPE') {
        return TrainingInputMode.PIPE;
    } else if (mode.toUpperCase() === 'FASTFILE') {
        return TrainingInputMode.FASTFILE;
    } else {
        // Default to File mode if unrecognized
        console.warn(`Unrecognized training input mode: ${mode}, defaulting to FILE`);
        return TrainingInputMode.FILE;
    }
}

/**
 * Helper function to convert string S3 data type to enum
 */
function getS3DataType(type: string): S3DataType {
    if (type.toUpperCase() === 'S3PREFIX') {
        return S3DataType.S3_PREFIX;
    } else if (type.toUpperCase() === 'MANIFESTFILE') {
        return S3DataType.MANIFEST_FILE;
    } else if (type.toUpperCase() === 'AUGMENTEDMANIFESTFILE') {
        return S3DataType.AUGMENTED_MANIFEST_FILE;
    } else {
        // Default to S3Prefix if unrecognized
        console.warn(`Unrecognized S3 data type: ${type}, defaulting to S3Prefix`);
        return S3DataType.S3_PREFIX;
    }
}

/**
 * Helper function to convert string S3 data distribution type to enum
 */
function getDataDistributionType(type: string): DataDistributionType {
    if (type.toUpperCase() === 'FULLYREPLICATED') {
        return DataDistributionType.FULLYREPLICATED;
    } else if (type.toUpperCase() === 'SHARDEDBYS3KEY') {
        return DataDistributionType.SHARDEDBYS3KEY;
    } else {
        // Default to FullyReplicated if unrecognized
        console.warn(`Unrecognized data distribution type: ${type}, defaulting to FullyReplicated`);
        return DataDistributionType.FULLYREPLICATED;
    }
}

/**
 * Helper function to convert string instance type to enum
 */
function getTrainingInstanceType(type: string): string {
    // List of valid instance types
    const validTypes = [
        'ml.m5.large', 'ml.m5.xlarge', 'ml.m5.2xlarge', 'ml.m5.4xlarge',
        'ml.m5.12xlarge', 'ml.m5.24xlarge', 'ml.c5.large', 'ml.c5.xlarge',
        'ml.c5.2xlarge', 'ml.c5.4xlarge', 'ml.c5.9xlarge', 'ml.c5.18xlarge',
        'ml.p3.2xlarge', 'ml.p3.8xlarge', 'ml.p3.16xlarge'
    ];

    if (validTypes.includes(type)) {
        return type;
    } else {
        // Default to medium instance if not found
        console.warn(`Unrecognized instance type: ${type}, defaulting to ml.m5.large`);
        return 'ml.m5.large';
    }
}

/**
 * Handler for creating SageMaker training jobs
 */
export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
    console.log('Event:', JSON.stringify(event, null, 2));

    try {
        // Ensure TRAINING_CONFIG environment variable exists
        if (!process.env.TRAINING_CONFIG) {
            return createErrorResponse(500, 'Missing TRAINING_CONFIG environment variable');
        }

        // Parse and validate the configuration
        let config: TrainingConfig;
        try {
            config = JSON.parse(process.env.TRAINING_CONFIG);
        } catch (e) {
            return createErrorResponse(500, 'Invalid JSON in TRAINING_CONFIG');
        }

        // Validate the configuration
        const [isValid, errorMessage] = validateConfig(config);
        if (!isValid) {
            return createErrorResponse(500, `Invalid configuration: ${errorMessage}`);
        }

        // Get current timestamp for job name
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

        // Build the training job parameters with explicit casting to satisfy TypeScript
        const trainingParams: CreateTrainingJobCommandInput = {
            TrainingJobName: `demo-training-job-${timestamp}`,
            AlgorithmSpecification: {
                TrainingImage: config.algorithmSpecification.trainingImage,
                TrainingInputMode: config.algorithmSpecification.trainingInputMode as any
            },
            RoleArn: config.roleArn,
            InputDataConfig: [{
                ChannelName: config.inputDataConfig[0].channelName,
                DataSource: {
                    S3DataSource: {
                        S3Uri: config.inputDataConfig[0].dataSource.s3DataSource.s3Uri,
                        S3DataType: config.inputDataConfig[0].dataSource.s3DataSource.s3DataType as any,
                        S3DataDistributionType: config.inputDataConfig[0].dataSource.s3DataSource.s3DataDistributionType as any
                    }
                }
            }],
            OutputDataConfig: {
                S3OutputPath: config.outputDataConfig.s3OutputPath
            },
            ResourceConfig: {
                InstanceCount: config.resourceConfig.instanceCount,
                InstanceType: config.resourceConfig.instanceType as any,
                VolumeSizeInGB: config.resourceConfig.volumeSizeInGb
            },
            StoppingCondition: {
                MaxRuntimeInSeconds: config.stoppingCondition.maxRuntimeInSeconds
            }
        };

        console.log('Starting training job with params:', JSON.stringify(trainingParams, null, 2));

        // Create the training job
        const command = new CreateTrainingJobCommand(trainingParams);
        const response = await sagemakerClient.send(command);

        return createResponse(200, {
            TrainingJobArn: response.TrainingJobArn,
            TrainingJobName: trainingParams.TrainingJobName
        });
    } catch (error) {
        console.error('Error:', error);
        return createErrorResponse(500, error instanceof Error ? error.message : 'Unknown error occurred');
    }
}; 