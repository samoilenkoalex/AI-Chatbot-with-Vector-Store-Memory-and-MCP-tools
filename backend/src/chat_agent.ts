import {
    StateGraph,
    MessagesAnnotation,
    Annotation,
} from '@langchain/langgraph';
import {
    HumanMessage,
    AIMessage,
    SystemMessage,
} from '@langchain/core/messages';
import {
    getEmbeddings,
    getLLMResponse,
    padEmbedding,
} from './services/llm_service.js';
import {
    ensureQdrantCollection,
    searchQdrant,
    addToQdrant,
} from './services/qdrant_service.js';
import { addToMem0 } from './services/mem0_service.js';
import { VECTOR_DIMENSION, APP_ID } from './config/config.js';

// Define the state schema for our graph
const ChatAgentState = Annotation.Root({
    ...MessagesAnnotation.spec,
    question: Annotation<string>,
    userId: Annotation<string | undefined>,
    chatId: Annotation<string | undefined>,
    chatName: Annotation<string | undefined>,
    embedding: Annotation<number[]>,
    memories: Annotation<any>,
    context: Annotation<string>,
    response: Annotation<string>,
    appId: Annotation<string>,
});

export class ChatAgent {
    private static _instance: ChatAgent | null = null;
    private _initialized: boolean = false;
    private appId: string = APP_ID;
    private graph: any;

    public static getInstance(): ChatAgent {
        if (!ChatAgent._instance) {
            ChatAgent._instance = new ChatAgent();
        }
        return ChatAgent._instance;
    }

    private constructor() {
        if (!this._initialized) {
            this._initialized = true;
            console.log('ChatAgent initialized');
            // Ensure Qdrant collection exists with correct dimensions
            ensureQdrantCollection().catch(console.error);
            this.buildGraph();
        }
    }

    private buildGraph() {
        const workflow = new StateGraph(ChatAgentState)
            .addNode('generate_embedding', this.generateEmbedding.bind(this))
            .addNode('search_memories', this.searchMemories.bind(this))
            .addNode('build_context', this.buildContext.bind(this))
            .addNode('get_llm_response', this.getLLMResponse.bind(this))
            .addNode('add_memory', this.addMemory.bind(this));

        workflow
            .addEdge('__start__', 'generate_embedding')
            .addEdge('generate_embedding', 'search_memories')
            .addEdge('search_memories', 'build_context')
            .addEdge('build_context', 'get_llm_response')
            .addEdge('get_llm_response', 'add_memory')
            .addEdge('add_memory', '__end__');

        this.graph = workflow.compile();
    }

    private async generateEmbedding(state: typeof ChatAgentState.State) {
        console.log('Generating embedding for question:', state.question);
        const embedding = await getEmbeddings(state.question);
        const paddedEmbedding = padEmbedding(embedding, VECTOR_DIMENSION);

        return {
            embedding: paddedEmbedding,
        };
    }

    private async searchMemories(state: typeof ChatAgentState.State) {
        console.log('Searching for memories...');
        const memories = await searchQdrant(
            state.embedding,
            state.userId,
            state.chatId
        );
        console.log(
            'Previous memories:',
            memories.results
                .map((m: any) => m.metadata.mem0_response)
                .join('\n')
        );

        return {
            memories,
        };
    }

    private async buildContext(state: typeof ChatAgentState.State) {
        console.log('Building context from memories...');
        let context = 'Relevant information from previous conversations:\n';

        if (state.memories.results && state.memories.results.length > 0) {
            for (const memory of state.memories.results) {
                context += ` - ${memory.memory}\n`;
            }
        }

        return {
            context,
        };
    }

    private async getLLMResponse(state: typeof ChatAgentState.State) {
        console.log('Getting LLM response...');

        const messages = [
            {
                role: 'system' as const,
                content: `You are a helpful assistant. Use the provided context to personalize your responses and remember past interactions. ${state.context}`,
            },
            {
                role: 'user' as const,
                content: state.question,
            },
        ];

        const response = await getLLMResponse(messages);

        const updatedMessages = [
            new SystemMessage(
                `You are a helpful assistant. Use the provided context to personalize your responses and remember past interactions. ${state.context}`
            ),
            new HumanMessage(state.question),
            new AIMessage(response),
        ];

        return {
            messages: updatedMessages,
            response,
        };
    }

    private async addMemory(state: typeof ChatAgentState.State) {
        console.log('Adding to memory...');

        const embedding = await getEmbeddings(
            state.question + ' ' + state.response
        );
        const paddedEmbedding = padEmbedding(embedding, VECTOR_DIMENSION);

        console.log('Calling mem0 with:', {
            question: state.question,
            response: state.response,
            userId: state.userId,
        });

        const mem0Response = await addToMem0(
            state.question,
            state.response,
            state.userId
        );
        console.log(
            'Raw mem0 response:',
            JSON.stringify(mem0Response, null, 2)
        );

        let mem0Memory = '';
        if (
            mem0Response &&
            Array.isArray(mem0Response) &&
            mem0Response.length > 0
        ) {
            mem0Memory = mem0Response[0]?.data?.memory || '';
        }
        console.log('Extracted mem0Memory:', mem0Memory);

        const metadata = {
            question: state.question,
            response: state.response,
            userId: state.userId,
            appId: state.appId,
            timestamp: new Date().toISOString(),
            mem0_response: mem0Memory,
            ...(state.chatId && { chat_id: state.chatId }),
            ...(state.chatName && { chat_name: state.chatName }),
        };

        console.log(
            'Metadata being sent to Qdrant:',
            JSON.stringify(metadata, null, 2)
        );

        await addToQdrant(paddedEmbedding, metadata);

        return {};
    }

    public async ask(
        question: string,
        userId?: string,
        chatId?: string,
        chatName?: string
    ): Promise<{ messages: string[] }> {
        const initialState = {
            question,
            userId,
            chatId,
            chatName,
            appId: this.appId,
            messages: [],
            embedding: [],
            memories: null,
            context: '',
            response: '',
        };

        // Run the graph
        const result = await this.graph.invoke(initialState);

        return { messages: [result.response] };
    }

    public async searchMemory(
        query: string,
        userId?: string,
        chatId?: string
    ): Promise<any> {
        const embedding = await getEmbeddings(query);
        const paddedEmbedding = padEmbedding(embedding, VECTOR_DIMENSION);
        return await searchQdrant(paddedEmbedding, userId, chatId);
    }

    public async runGraph(initialState: Partial<typeof ChatAgentState.State>) {
        return await this.graph.invoke({
            appId: this.appId,
            messages: [],
            embedding: [],
            memories: null,
            context: '',
            response: '',
            ...initialState,
        });
    }
}
