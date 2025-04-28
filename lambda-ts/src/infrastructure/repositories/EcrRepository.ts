import { ECRClient, GetAuthorizationTokenCommand } from '@aws-sdk/client-ecr';
import { IEcrRepository } from '../../domain/repositories/IEcrRepository';

export class EcrRepository implements IEcrRepository {
  private ecrClient: ECRClient;
  
  constructor() {
    this.ecrClient = new ECRClient({});
  }
  
  /**
   * Get ECR repository endpoint URL
   */
  async getRepositoryEndpoint(): Promise<string> {
    const authCommand = new GetAuthorizationTokenCommand({});
    const authResponse = await this.ecrClient.send(authCommand);
    
    if (!authResponse.authorizationData || authResponse.authorizationData.length === 0) {
      throw new Error('Failed to get ECR authorization token');
    }
    
    const url = authResponse.authorizationData[0].proxyEndpoint;
    
    if (!url) {
      throw new Error('ECR proxy endpoint not found');
    }
    
    return url;
  }
} 