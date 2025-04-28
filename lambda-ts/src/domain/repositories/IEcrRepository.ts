/**
 * Repository interface for ECR operations
 */
export interface IEcrRepository {
    /**
     * Get the ECR repository authentication information
     * @returns The ECR repository endpoint URL
     */
    getRepositoryEndpoint(): Promise<string>;
} 