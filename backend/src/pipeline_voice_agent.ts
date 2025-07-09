
import type { JobProcess } from '@livekit/agents';
import {
    AutoSubscribe,
    type JobContext,
    WorkerOptions,
    cli,
    defineAgent,
    llm,
    pipeline,
    stt,
} from '@livekit/agents';
import * as deepgram from '@livekit/agents-plugin-deepgram';
import * as livekit from '@livekit/agents-plugin-livekit';
import * as openai from '@livekit/agents-plugin-openai';
import * as silero from '@livekit/agents-plugin-silero';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import { ensureQdrantCollection } from './services/qdrant_service.js';

import { createMemoryContextPrompt } from './config/prompts.js';
import { LiveKitService } from './services/livekit_service.js';

// Initialize Qdrant collection right away
(async () => {
    try {
        console.log('Initializing Qdrant collection for voice chat...');
        await ensureQdrantCollection();
        console.log(
            'Qdrant collection initialized successfully for voice chat'
        );
    } catch (error) {
        console.error(
            'Failed to initialize Qdrant collection for voice chat:',
            error
        );
    }
})();

export default defineAgent({
    prewarm: async (proc: JobProcess) => {
        proc.userData.vad = await silero.VAD.load();
    },
    entry: async (ctx: JobContext) => {
        const userId = process.env.PIPELINE_USER_ID;
        const chatId = process.env.PIPELINE_CHAT_ID;
        let memoryContext = '';
        if (chatId && userId) {
            const livekitService = LiveKitService.getInstance();
            memoryContext = await livekitService.getMemoryContext(
                chatId,
                userId
            );
        }

        const vad = ctx.proc.userData.vad! as silero.VAD;
        const initialContext = new llm.ChatContext().append({
            role: llm.ChatRole.SYSTEM,

            text:
                createMemoryContextPrompt(memoryContext) +
                'make response not longer than 50 words',
        });

        await ctx.connect(undefined, AutoSubscribe.AUDIO_ONLY);
        const participant = await ctx.waitForParticipant();

        const agent = new pipeline.VoicePipelineAgent(
            vad,
            new deepgram.STT(),
            new openai.LLM(),
            new openai.TTS(),
            {
                chatCtx: initialContext,
                turnDetector: new livekit.turnDetector.EOUModel(),
            }
        );

        agent.start(ctx.room, participant);

        await agent.say('Hey, how can I help you today', true);
    },
});

cli.runApp(new WorkerOptions({ agent: fileURLToPath(import.meta.url) }));
