import { spawn } from 'child_process';
import path from 'path';
import { AccessToken } from 'livekit-server-sdk';

import {
    LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET,
    LIVEKIT_URL,
    APP_ID,
    VECTOR_DIMENSION,
} from '../config/config.js';
import { getEmbeddings, padEmbedding } from './llm_service.js';
import {
    addToQdrant,
    ensureQdrantCollection,
    getChatItems,
} from './qdrant_service.js';
import { addToMem0 } from './mem0_service.js';

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

    public async getMemoryContext(chatId: string, userId: string) {
        try {
            const allUserItems = await getChatItems(userId, chatId);

            if (
                allUserItems &&
                allUserItems.results &&
                allUserItems.results.length > 0
            ) {
                const chatItems = chatId
                    ? allUserItems.results.filter(
                          (item) => item.chat_id === chatId
                      )
                    : allUserItems.results;

                if (chatItems.length > 0) {
                    const mem0Responses = chatItems
                        .map((item: any) => item.mem0_response)
                        .filter(
                            (response: string | undefined) =>
                                response && response.length > 0
                        )
                        .join('\n');

                    return mem0Responses;
                }
            }
        } catch (error) {
            console.error('Error fetching memory context:', error);
        }
        return '';
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
            if (this.serverProcess) {
                resolve({
                    workerId: this.workerId!,
                    livekitUrl: this.livekitUrl!,
                });
                return;
            }

            const creds = {
                PATH: process.env.PATH,
                LIVEKIT_API_KEY: LIVEKIT_API_KEY,
                LIVEKIT_API_SECRET: LIVEKIT_API_SECRET,
                LIVEKIT_URL: LIVEKIT_URL,
                PIPELINE_USER_ID: userId,
                PIPELINE_CHAT_ID: chatId,
                ...(chatName ? { PIPELINE_CHAT_NAME: chatName } : {}),
            };

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

            // Generate embedding for the full conversation
            const embedding = await getEmbeddings(
                data.question + ' ' + data.response
            );
            const paddedEmbedding = padEmbedding(embedding, VECTOR_DIMENSION);

            // For mem0, we'll use a truncated version if needed
            console.log('Calling mem0 with voice message:', {
                question: data.question,
                response:
                    data.response.length > 1500
                        ? data.response.substring(0, 1500) +
                          '... (truncated for log)'
                        : data.response,
                userId: data.user_id,
                chatId: data.chat_id,
            });

            // Only truncate if absolutely necessary for mem0
            const mem0Response = await addToMem0(
                data.question,
                data.response,
                data.user_id,
                data.chat_id
            );

            // Extract memory from mem0 response
            let extractedMemory = '';
            if (
                mem0Response &&
                Array.isArray(mem0Response) &&
                mem0Response.length > 0
            ) {
                extractedMemory = mem0Response
                    .map((m: any) => m.data && m.data.memory)
                    .filter((content: string) => content && content.length > 0)
                    .join('\n');
            }

            console.log(
                'Extracted mem0 memory from voice:',
                extractedMemory || 'No memory extracted'
            );

            // Get chat name from environment variable only if explicitly passed
            const chatName = data.chat_name || null;

            // Store in Qdrant with full response
            const payload = {
                question: data.question,
                response: data.response,
                userId: data.user_id,
                appId: APP_ID,
                timestamp: new Date().toISOString(),
                mem0_response: data.mem0_response || extractedMemory,
                chat_id: data.chat_id,
                chat_name: chatName,
            };

            console.log('Original voice payload for Qdrant:', payload);

            // Clean and truncate fields for Qdrant if needed
            const cleanedPayload = {
                ...payload,
                // NEVER truncate the response - keep the full message
                response: payload.response,
                mem0_response:
                    payload.mem0_response && payload.mem0_response.length > 1000
                        ? payload.mem0_response.substring(0, 1000) +
                          '... (truncated)'
                        : payload.mem0_response,
            };

            console.log('Cleaned voice payload for Qdrant:', cleanedPayload);

            await addToQdrant(paddedEmbedding, cleanedPayload);
            console.log('Voice chat message stored successfully');

            return {
                id: Date.now().toString(),
                question: data.question,
                response: data.response,
                chat_id: data.chat_id,
                chat_name: data.chat_name,
                user_id: data.user_id,
                timestamp: new Date().toISOString(),
                mem0_response: data.mem0_response || extractedMemory,
            };
        } catch (error) {
            console.error('Error storing voice chat message:', error);
            throw error;
        }
    }
}

export const livekitService = LiveKitService.getInstance();
