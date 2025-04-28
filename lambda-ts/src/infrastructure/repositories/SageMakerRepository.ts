import {
  SageMakerClient,
  CreateTrainingJobCommand,
  DescribeTrainingJobCommand,
  StopTrainingJobCommand,
  CreateTrainingJobCommandInput
} from '@aws-sdk/client-sagemaker';
import { TrainingConfig, TrainingJob } from '../../domain/entities/Training';
import { ISageMakerRepository } from '../../domain/repositories/ISageMakerRepository';

export class SageMakerRepository implements ISageMakerRepository {
  private sagemakerClient: SageMakerClient;
  
  constructor() {
    this.sagemakerClient = new SageMakerClient({});
  }
  
  /**
   * Create a SageMaker training job
   */
  async createTrainingJob(config: TrainingConfig): Promise<TrainingJob> {
    // Create a unique name with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const trainingJobName = `demo-training-job-${timestamp}`;
    
    // Build the training job parameters with explicit casting to satisfy TypeScript
    const trainingParams: CreateTrainingJobCommandInput = {
      TrainingJobName: trainingJobName,
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
    
    // Create the training job
    const command = new CreateTrainingJobCommand(trainingParams);
    const response = await this.sagemakerClient.send(command);
    
    return {
      TrainingJobName: trainingJobName,
      TrainingJobArn: response.TrainingJobArn || ''
    };
  }
  
  /**
   * Get information about a training job
   */
  async getTrainingJob(trainingJobName: string): Promise<TrainingJob> {
    const command = new DescribeTrainingJobCommand({
      TrainingJobName: trainingJobName
    });
    
    const response = await this.sagemakerClient.send(command);
    
    return {
      TrainingJobName: response.TrainingJobName || trainingJobName,
      TrainingJobArn: response.TrainingJobArn || ''
    };
  }
  
  /**
   * Stop a training job
   */
  async stopTrainingJob(trainingJobName: string): Promise<boolean> {
    try {
      const command = new StopTrainingJobCommand({
        TrainingJobName: trainingJobName
      });
      
      await this.sagemakerClient.send(command);
      return true;
    } catch (error) {
      console.error('Error stopping training job:', error);
      return false;
    }
  }
} 