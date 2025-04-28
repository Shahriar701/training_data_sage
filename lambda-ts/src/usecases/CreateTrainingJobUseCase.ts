import { TrainingJob, TrainingConfig } from '../domain/entities/Training';
import { ISageMakerRepository } from '../domain/repositories/ISageMakerRepository';
import { IEcrRepository } from '../domain/repositories/IEcrRepository';

export class CreateTrainingJobUseCase {
  constructor(
    private sageMakerRepository: ISageMakerRepository,
    private ecrRepository: IEcrRepository
  ) {}

  /**
   * Create a SageMaker training job
   * 
   * @param trainingParams Additional training parameters
   * @returns The created training job information
   */
  async execute(trainingParams: {
    roleArn: string;
    trainingInputPath: string;
    outputPath: string;
    instanceType?: string;
    instanceCount?: number;
    maxRuntimeInSeconds?: number;
  }): Promise<TrainingJob> {
    try {
      // Get ECR repository endpoint for model image
      const repoEndpoint = await this.ecrRepository.getRepositoryEndpoint();
      
      // Create training configuration
      const config: TrainingConfig = {
        algorithmSpecification: {
          trainingImage: `${repoEndpoint}/test-models:latest`,
          trainingInputMode: 'File'
        },
        roleArn: trainingParams.roleArn,
        inputDataConfig: [{
          channelName: 'training',
          dataSource: {
            s3DataSource: {
              s3Uri: trainingParams.trainingInputPath,
              s3DataType: 'S3Prefix',
              s3DataDistributionType: 'FullyReplicated'
            }
          }
        }],
        outputDataConfig: {
          s3OutputPath: trainingParams.outputPath
        },
        resourceConfig: {
          instanceCount: trainingParams.instanceCount || 1,
          instanceType: trainingParams.instanceType || 'ml.m5.large',
          volumeSizeInGb: 50
        },
        stoppingCondition: {
          maxRuntimeInSeconds: trainingParams.maxRuntimeInSeconds || 86400 // 24 hours
        }
      };
      
      // Create the training job
      return await this.sageMakerRepository.createTrainingJob(config);
    } catch (error) {
      throw new Error(`Failed to create training job: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
} 