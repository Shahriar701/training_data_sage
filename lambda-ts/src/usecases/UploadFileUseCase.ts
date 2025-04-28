import { FileEntity, PresignedUrlResult } from '../domain/entities/File';
import { IFileRepository } from '../domain/repositories/IFileRepository';

export class UploadFileUseCase {
  constructor(private fileRepository: IFileRepository) {}

  /**
   * Validate and generate a presigned URL for file upload
   * 
   * @param file The file information to validate and generate URL for
   * @param expiresIn Optional expiration time in seconds (default 900 - 15 minutes)
   * @returns A presigned URL result for uploading the file
   * @throws Error if the filename is invalid
   */
  async execute(file: FileEntity, expiresIn = 900): Promise<PresignedUrlResult> {
    // Validate filename
    if (!this.fileRepository.isValidFilename(file.filename)) {
      throw new Error('Invalid filename format');
    }

    // Check if content type is provided
    if (!file.contentType) {
      throw new Error('Content type is required');
    }

    // Validate path - ensure it exists and is properly formatted
    if (!file.path || file.path.includes('..') || file.path.startsWith('/')) {
      throw new Error('Invalid file path');
    }

    // Generate presigned URL for upload
    return this.fileRepository.generateUploadUrl(file, expiresIn);
  }
} 