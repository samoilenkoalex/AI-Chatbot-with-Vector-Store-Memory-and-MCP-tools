import { spawn } from 'child_process';
import path from 'path';
import { AccessToken } from 'livekit-server-sdk';

import {
    LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET,
    LIVEKIT_URL,
    APP_ID,
} from '../config/config.js';
import { ensureQdrantCollection } from './qdrant_service.js';
import { memoryService } from './memory_service.js';

export class LiveKitService {
    private static instance: LiveKitService;
    private serverProcess: any = null;
    private workerId: string | null = null;
    private livekitUrl: string | null = null;

    private constructor() {}

    public static getInstance(): LiveKitService {
        if (!LiveKitService.instance) {
            LiveKitService.instance = new LiveKitService();
        }
        return LiveKitService.instance;
    }

    public async getLivekitConnectionCreds(workerId: string) {
        const roomName = workerId;

        const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
            identity: 'quickstart-username',
            ttl: '10m',
        });

        const videoGrant = {
            room: roomName,
            roomJoin: true,
            canPublish: true,
            canSubscribe: true,
            canPublishData: false,
        };

        at.addGrant(videoGrant);

        const token = await at.toJwt();
        console.log('Generated token >>>>', token);
        console.log('LiveKit token generated for room:', roomName);
        console.log('Token:', token);

        return {
            token: token,
            roomName: roomName,
        };
    }

    public async startServer(
        userId: string,
        chatId: string,
        chatName?: string
    ): Promise<{ workerId: string; livekitUrl: string }> {
        return new Promise((resolve, reject) => {
            // Stop existing server to ensure fresh environment variables
            if (this.serverProcess) {
                console.log(
                    'Stopping existing server to use new userId and chatId'
                );
                this.stopServer();
            }

            console.log(
                'Starting LiveKit server with userId:',
                userId,
                'chatId:',
                chatId
            );

            const creds = {
                ...process.env,
                LIVEKIT_API_KEY: LIVEKIT_API_KEY,
                LIVEKIT_API_SECRET: LIVEKIT_API_SECRET,
                LIVEKIT_URL: LIVEKIT_URL,
                PIPELINE_USER_ID: userId,
                PIPELINE_CHAT_ID: chatId,
                ...(chatName ? { PIPELINE_CHAT_NAME: chatName } : {}),
            };

            console.log('Environment variables being set:', {
                PIPELINE_USER_ID: creds.PIPELINE_USER_ID,
                PIPELINE_CHAT_ID: creds.PIPELINE_CHAT_ID,
                PIPELINE_CHAT_NAME: creds.PIPELINE_CHAT_NAME,
            });

            const scriptPath = path.join(
                process.cwd(),
                'src',
                'pipeline_voice_agent.ts'
            );

            // Set the userData values that will be available to the pipeline
            const pipelineProcess = spawn(
                'npx',
                ['tsx', scriptPath, 'dev', '--api-key', creds.LIVEKIT_API_KEY],
                {
                    stdio: ['pipe', 'pipe', 'pipe'],
                    env: creds,
                    shell: true,
                }
            );

            // Set the userData values directly on the process
            (pipelineProcess as any).userData = {
                userId: userId,
                chatId: chatId,
            };

            this.serverProcess = pipelineProcess;

            let output = '';
            this.serverProcess.stdout.on('data', (data: Buffer) => {
                output += data.toString();
                console.log(`LiveKit Server Output: ${data}`);

                // Look for the worker ID in the output
                const match = output.match(/id: "([^"]+)"/);

                if (match && match[1]) {
                    this.workerId = match[1];
                    this.livekitUrl = creds.LIVEKIT_URL!;
                    resolve({
                        workerId: match[1],
                        livekitUrl: creds.LIVEKIT_URL!,
                    });
                }
            });

            this.serverProcess.stderr.on('data', (data: Buffer) => {
                console.error(`LiveKit Server Error: ${data}`);
            });

            this.serverProcess.on('error', (error: Error) => {
                reject(error);
            });

            // Set a timeout in case we don't get the worker ID
            setTimeout(() => {
                if (!this.workerId) {
                    this.stopServer();
                    reject(
                        new Error('Timeout waiting for LiveKit server to start')
                    );
                }
            }, 10000);
        });
    }

    public stopServer(): void {
        if (this.serverProcess) {
            this.serverProcess.kill();
            this.serverProcess = null;
            this.workerId = null;
            this.livekitUrl = null;
        }
    }

    public async recordMessage(data: {
        question: string;
        response: string;
        chat_id: string;
        chat_name?: string;
        user_id: string;
        mem0_response: string;
    }) {
        try {
            console.log('Storing voice chat message to Qdrant...');
            console.log('FULL QUESTION:', data.question);
            console.log('FULL RESPONSE:', data.response);
            console.log('RESPONSE LENGTH:', data.response.length);

            // Ensure Qdrant collection is initialized
            await ensureQdrantCollection();

            // Store memory using the consolidated service (preserving full response for voice)
            await memoryService.storeMemory(
                data.question,
                data.response,
                data.user_id,
                data.chat_id,
                data.chat_name,
                { preserveFullResponse: true }
            );

            console.log('Voice chat message stored successfully');

            return {
                id: Date.now().toString(),
                question: data.question,
                response: data.response,
                chat_id: data.chat_id,
                chat_name: data.chat_name,
                user_id: data.user_id,
                timestamp: new Date().toISOString(),
                mem0_response: data.mem0_response || '',
            };
        } catch (error) {
            console.error('Error storing voice chat message:', error);
            throw error;
        }
    }
}

export const livekitService = LiveKitService.getInstance();
