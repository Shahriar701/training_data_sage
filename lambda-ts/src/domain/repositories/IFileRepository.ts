import { FileEntity, FileMetadata, PresignedUrlResult } from '../entities/File';

/**
 * Repository interface for file storage operations
 */
export interface IFileRepository {
    /**
     * Generates a presigned URL for uploading a file
     * @param file File entity containing information about the file to upload
     * @param expiresIn Time in seconds until the URL expires
     * @returns Promise with the presigned URL result
     */
    generateUploadUrl(file: FileEntity, expiresIn?: number): Promise<PresignedUrlResult>;

    /**
     * Generates a presigned URL for downloading a file
     * @param key The key of the file to download
     * @param filename Optional filename for the downloaded file
     * @param expiresIn Time in seconds until the URL expires
     * @returns Promise with the presigned URL
     */
    generateDownloadUrl(key: string, filename?: string, expiresIn?: number): Promise<string>;

    /**
     * Gets metadata for a file
     * @param key The key of the file
     * @returns Promise with the file metadata
     */
    getFileMetadata(key: string): Promise<FileMetadata>;

    /**
     * Lists files with a given prefix
     * @param prefix The prefix to filter files by
     * @param maxKeys Maximum number of keys to return
     * @returns Promise with an array of file metadata
     */
    listFiles(prefix: string, maxKeys?: number): Promise<FileMetadata[]>;

    /**
     * Deletes a file
     * @param key The key of the file to delete
     * @returns Promise that resolves when deletion is complete
     */
    deleteFile(key: string): Promise<void>;

    /**
     * Check if a file exists
     * @param file The file entity with metadata
     * @returns True if the file exists, false otherwise
     */
    fileExists(file: FileEntity): Promise<boolean>;

    /**
     * Validate the file name
     * @param filename The filename to validate
     * @returns True if the filename is valid, false otherwise
     */
    isValidFilename(filename: string): boolean;
} 