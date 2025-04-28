/**
 * Configuration for a training job
 */
export interface TrainingConfig {
  /**
   * Algorithm specification
   */
  algorithmSpecification: {
    /**
     * ECR image URI for the training algorithm
     */
    trainingImage: string;
    
    /**
     * Input mode for the training job (File, Pipe, FastFile)
     */
    trainingInputMode: string;
  };
  
  /**
   * IAM role ARN for SageMaker to assume
   */
  roleArn: string;
  
  /**
   * Input data configuration
   */
  inputDataConfig: Array<{
    /**
     * Channel name
     */
    channelName: string;
    
    /**
     * Data source configuration
     */
    dataSource: {
      /**
       * S3 data source configuration
       */
      s3DataSource: {
        /**
         * S3 URI for the input data
         */
        s3Uri: string;
        
        /**
         * S3 data type (S3Prefix, ManifestFile, AugmentedManifestFile)
         */
        s3DataType: string;
        
        /**
         * S3 data distribution type (FullyReplicated, ShardedByS3Key)
         */
        s3DataDistributionType: string;
      };
    };
  }>;
  
  /**
   * Output data configuration
   */
  outputDataConfig: {
    /**
     * S3 output path for the training results
     */
    s3OutputPath: string;
  };
  
  /**
   * Resource configuration
   */
  resourceConfig: {
    /**
     * Number of instances to use
     */
    instanceCount: number;
    
    /**
     * Instance type to use
     */
    instanceType: string;
    
    /**
     * Volume size in GB
     */
    volumeSizeInGb: number;
  };
  
  /**
   * Stopping condition
   */
  stoppingCondition: {
    /**
     * Maximum runtime in seconds
     */
    maxRuntimeInSeconds: number;
  };
}

/**
 * Training job information
 */
export interface TrainingJob {
  /**
   * Training job name
   */
  TrainingJobName: string;
  
  /**
   * Training job ARN
   */
  TrainingJobArn: string;
} 