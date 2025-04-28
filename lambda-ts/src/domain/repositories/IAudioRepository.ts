import { AudioData, AudioProcessingResult } from '../entities/Audio';

/**
 * Repository interface for audio data storage
 */
export interface IAudioRepository {
    /**
     * Save audio data to storage
     * @param audio The audio data to save
     * @returns Result of the save operation
     */
    saveAudio(audio: AudioData): Promise<AudioProcessingResult>;

    /**
     * Get audio data by key
     * @param key The storage key of the audio
     * @returns The audio data or null if not found
     */
    getAudio(key: string): Promise<AudioData | null>;

    /**
     * Generate a storage key for audio data
     * @param connectionId The WebSocket connection ID
     * @param timestamp The timestamp
     * @param format The audio format
     * @returns A uniquely generated storage key
     */
    generateKey(connectionId: string, timestamp: string, format: string): string;
} 