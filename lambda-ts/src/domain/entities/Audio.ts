/**
 * Represents audio data received from clients
 */
export interface AudioData {
    /**
     * Base64 encoded audio content
     */
    content: Buffer;

    /**
     * File format/extension of the audio
     */
    format: string;

    /**
     * Source connection ID for the audio data
     */
    connectionId: string;

    /**
     * Timestamp when the audio was received
     */
    timestamp: string;
}

/**
 * Result of audio processing operations
 */
export interface AudioProcessingResult {
    /**
     * Status of the operation
     */
    status: 'success' | 'error';

    /**
     * File path of the stored audio (if status is 'success')
     */
    file?: string;

    /**
     * Error message (if status is 'error')
     */
    message?: string;
} 