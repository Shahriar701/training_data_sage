import { TrainingConfig, TrainingJob } from "../entities/Training";

/**
 * Repository interface for SageMaker operations
 */
export interface ISageMakerRepository {
  /**
   * Create a training job
   * @param trainingConfig The training configuration
   * @returns The created training job information
   */
  createTrainingJob(trainingConfig: TrainingConfig): Promise<TrainingJob>;
  
  /**
   * Get information about a training job
   * @param trainingJobName The name of the training job
   * @returns The training job information
   */
  getTrainingJob(trainingJobName: string): Promise<TrainingJob>;
  
  /**
   * Stop a training job
   * @param trainingJobName The name of the training job
   * @returns True if the job was stopped, false otherwise
   */
  stopTrainingJob(trainingJobName: string): Promise<boolean>;
} 