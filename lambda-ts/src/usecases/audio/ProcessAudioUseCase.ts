import { AudioData, AudioProcessingResult } from '../../domain/entities/Audio';
import { IAudioRepository } from '../../domain/repositories/IAudioRepository';
import { IWebSocketService } from '../../domain/services/IWebSocketService';

export class ProcessAudioUseCase {
    private audioRepository: IAudioRepository;
    private webSocketService: IWebSocketService;

    constructor(audioRepository: IAudioRepository, webSocketService: IWebSocketService) {
        this.audioRepository = audioRepository;
        this.webSocketService = webSocketService;
    }

    /**
     * Process an audio request
     * @param connectionId The WebSocket connection ID
     * @param audioBase64 The base64-encoded audio data
     */
    async execute(connectionId: string, audioBase64: string): Promise<AudioProcessingResult> {
        try {
            // Validate the audio data
            if (!audioBase64) {
                return { status: 'error', message: 'Missing audio data' };
            }

            // Decode base64 audio data
            let audioData: Buffer;
            try {
                audioData = Buffer.from(audioBase64, 'base64');
            } catch (error) {
                return { status: 'error', message: 'Invalid audio data encoding' };
            }

            // Simple validation - check if we got actual data
            if (audioData.length === 0) {
                return { status: 'error', message: 'Empty audio data' };
            }

            // Create timestamp for the filename
            const timestamp = new Date().toISOString()
                .replace(/[-:]/g, '')
                .replace('T', '_')
                .replace(/\..+/, '');

            // Create the audio entity
            const audio: AudioData = {
                content: audioData,
                format: 'wav',  // Assuming WAV format for now
                connectionId,
                timestamp
            };

            // Save the audio
            const result = await this.audioRepository.saveAudio(audio);

            // Send response through WebSocket
            await this.webSocketService.sendResponse(connectionId, {
                status: result.status,
                ...(result.status === 'success' ? { file: result.file } : { message: result.message })
            });

            return result;
        } catch (error) {
            console.error('Error processing audio:', error);

            const errorResult: AudioProcessingResult = {
                status: 'error',
                message: error instanceof Error ? error.message : 'Unknown error processing audio'
            };

            // Try to send error response
            try {
                await this.webSocketService.sendResponse(connectionId, {
                    status: 'error',
                    message: errorResult.message
                });
            } catch (wsError) {
                console.error('Failed to send error response:', wsError);
            }

            return errorResult;
        }
    }
} 