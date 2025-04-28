import { PresignedUrlResult } from '../domain/entities/File';
import { IFileRepository } from '../domain/repositories/IFileRepository';

export class DownloadFileUseCase {
    constructor(private fileRepository: IFileRepository) { }

    /**
     * Generate a presigned URL for downloading a file
     * 
     * @param key The key of the file to download
     * @param filename Optional filename to use for the downloaded file
     * @param expiresIn Optional expiration time in seconds (default 3600 - 1 hour)
     * @returns The download URL
     * @throws Error if the file does not exist
     */
    async execute(key: string, filename?: string, expiresIn: number = 3600): Promise<string> {
        try {
            // Get file metadata to check if it exists
            await this.fileRepository.getFileMetadata(key);

            // Generate presigned URL for download
            return await this.fileRepository.generateDownloadUrl(key, filename, expiresIn);
        } catch (error) {
            throw new Error(`Failed to generate download URL for ${key}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
} 