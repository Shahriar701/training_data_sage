import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { AudioData, AudioProcessingResult } from '../../domain/entities/Audio';
import { IAudioRepository } from '../../domain/repositories/IAudioRepository';

export class S3AudioRepository implements IAudioRepository {
    private s3Client: S3Client;
    private bucketName: string;

    constructor(bucketName: string) {
        this.s3Client = new S3Client({});
        this.bucketName = bucketName;
    }

    async saveAudio(audio: AudioData): Promise<AudioProcessingResult> {
        try {
            // Generate the key for the audio file
            const key = this.generateKey(audio.connectionId, audio.timestamp, audio.format);

            // Save to S3
            await this.s3Client.send(new PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: audio.content
            }));

            return {
                status: 'success',
                file: key
            };
        } catch (error) {
            console.error('Error saving audio to S3:', error);
            return {
                status: 'error',
                message: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    async getAudio(key: string): Promise<AudioData | null> {
        // Implementation for retrieving audio would go here
        // Not needed for current functionality
        return null;
    }

    generateKey(connectionId: string, timestamp: string, format: string): string {
        // Sanitize connection ID to prevent path traversal
        const safeConnectionId = connectionId.replace(/[\/\\.]/g, '_');
        return `audio/${safeConnectionId}/${timestamp}.${format}`;
    }
} 