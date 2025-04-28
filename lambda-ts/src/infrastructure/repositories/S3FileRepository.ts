import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { FileEntity, FileMetadata, PresignedUrlResult } from '../../domain/entities/File';
import { IFileRepository } from '../../domain/repositories/IFileRepository';

export class S3FileRepository implements IFileRepository {
    private s3Client: S3Client;
    private photosBucket: string;
    private weightsBucket: string;

    constructor(photosBucket: string, weightsBucket: string) {
        this.s3Client = new S3Client({});
        this.photosBucket = photosBucket;
        this.weightsBucket = weightsBucket;
    }

    /**
     * Select appropriate bucket based on file path
     */
    private selectBucket(path: string): string {
        if (path.startsWith('photos/')) {
            return this.photosBucket;
        } else if (path.startsWith('weights/')) {
            return this.weightsBucket;
        }

        // Default to photos bucket for other paths
        return this.photosBucket;
    }

    async generateUploadUrl(file: FileEntity, expiresIn: number = 3600): Promise<PresignedUrlResult> {
        const bucket = this.selectBucket(file.path);
        const key = `${file.path}${file.filename}`;

        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            ContentType: file.contentType,
            Metadata: file.metadata
        });

        const url = await getSignedUrl(this.s3Client, command, { expiresIn });
        const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

        return {
            url,
            bucket,
            key,
            expiresAt
        };
    }

    async generateDownloadUrl(key: string, filename?: string, expiresIn: number = 3600): Promise<string> {
        // Determine which bucket to use based on the key prefix
        const bucket = this.selectBucket(key);

        const command = new GetObjectCommand({
            Bucket: bucket,
            Key: key,
            ResponseContentDisposition: filename
                ? `attachment; filename="${filename}"`
                : undefined
        });

        return getSignedUrl(this.s3Client, command, { expiresIn });
    }

    async getFileMetadata(key: string): Promise<FileMetadata> {
        const bucket = this.selectBucket(key);

        const command = new HeadObjectCommand({
            Bucket: bucket,
            Key: key
        });

        try {
            const response = await this.s3Client.send(command);

            return {
                key,
                bucket,
                contentType: response.ContentType || 'application/octet-stream',
                size: response.ContentLength || 0,
                lastModified: response.LastModified || new Date(),
                metadata: response.Metadata || {},
                url: await this.generateDownloadUrl(key)
            };
        } catch (error) {
            throw new Error(`Failed to get metadata for file ${key}: ${error}`);
        }
    }

    async listFiles(prefix: string, maxKeys: number = 1000): Promise<FileMetadata[]> {
        const bucket = this.selectBucket(prefix);

        const command = new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: prefix,
            MaxKeys: maxKeys
        });

        try {
            const response = await this.s3Client.send(command);

            if (!response.Contents) {
                return [];
            }

            const results: FileMetadata[] = [];

            for (const item of response.Contents) {
                if (!item.Key) continue;

                results.push({
                    key: item.Key,
                    bucket,
                    size: item.Size || 0,
                    lastModified: item.LastModified || new Date(),
                    contentType: 'application/octet-stream', // We don't get this from ListObjects
                    metadata: {},  // We don't get this from ListObjects
                    url: await this.generateDownloadUrl(item.Key)
                });
            }

            return results;
        } catch (error) {
            throw new Error(`Failed to list files with prefix ${prefix}: ${error}`);
        }
    }

    async deleteFile(key: string): Promise<void> {
        const bucket = this.selectBucket(key);

        const command = new DeleteObjectCommand({
            Bucket: bucket,
            Key: key
        });

        try {
            await this.s3Client.send(command);
        } catch (error) {
            throw new Error(`Failed to delete file ${key}: ${error}`);
        }
    }

    async fileExists(file: FileEntity): Promise<boolean> {
        try {
            const bucket = this.selectBucket(file.path);
            const key = `${file.path}${file.filename}`;

            await this.s3Client.send(new HeadObjectCommand({
                Bucket: bucket,
                Key: key
            }));

            return true;
        } catch (error) {
            return false;
        }
    }

    isValidFilename(filename: string): boolean {
        // Don't allow paths, only filenames
        if (filename.includes('/') || filename.includes('\\')) {
            return false;
        }

        // Don't allow hidden files
        if (filename.startsWith('.')) {
            return false;
        }

        // Basic validation - alphanumeric plus some safe chars
        return /^[a-zA-Z0-9._-]+$/.test(filename);
    }
} 