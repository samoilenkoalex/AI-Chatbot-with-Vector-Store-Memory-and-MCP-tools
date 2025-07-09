import {
    StateGraph,
    MessagesAnnotation,
    Annotation,
    // END,
    // START,
} from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { ensureQdrantCollection } from './services/qdrant_service.js';
import { APP_ID } from './config/config.js';
import { tavilySearchTool } from './tools/tavily_search_tool.js';
import { firecrawlSearchTool } from './tools/firecrawl_search_tool.js';
import {
    generateEmbedding,
    searchMemories,
    buildContext,
    getLLMResponse,
    addMemory,
} from './services/chat_agent_handlers.js';

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
    searchResults: Annotation<string>,
});

export class ChatAgent {
    private static _instance: ChatAgent | null = null;
    private _initialized: boolean = false;
    private appId: string = APP_ID;
    private graph: any;
    private toolNode: ToolNode;
    private memoryClient: {
        searchMemories: (
            query: string,
            limit: number
        ) => Promise<Array<{ pageContent: string }>>;
    } = {
        searchMemories: async () => [],
    };

    public static getInstance(): ChatAgent {
        if (!ChatAgent._instance) {
            ChatAgent._instance = new ChatAgent();
        }
        return ChatAgent._instance;
    }

    private constructor() {
        this.toolNode = new ToolNode([tavilySearchTool, firecrawlSearchTool]);
        if (!this._initialized) {
            this._initialized = true;
            console.log('ChatAgent initialized');
            this.initializeServices();
            this.buildGraph();
        }
    }

    private async initializeServices() {
        try {
            await ensureQdrantCollection();
        } catch (error) {
            console.error('Error initializing services:', error);
        }
    }

    private buildGraph() {
        const workflow = new StateGraph(ChatAgentState)
            .addNode('generate_embedding', this.generateEmbedding.bind(this))
            .addNode('search_memories', this.searchMemories.bind(this))
            .addNode('tools', this.toolNode)
            .addNode('build_context', this.buildContext.bind(this))
            .addNode('get_llm_response', this.getLLMResponse.bind(this))
            .addNode('add_memory', this.addMemory.bind(this));

        workflow
            .addEdge('__start__', 'generate_embedding')
            .addEdge('generate_embedding', 'search_memories')
            .addEdge('search_memories', 'tools')
            .addEdge('tools', 'build_context')
            .addEdge('build_context', 'get_llm_response')
            .addEdge('get_llm_response', 'add_memory')
            .addEdge('add_memory', '__end__');

        this.graph = workflow.compile();
    }

    private async generateEmbedding(state: typeof ChatAgentState.State) {
        return generateEmbedding(state);
    }

    private async searchMemories(state: typeof ChatAgentState.State) {
        return searchMemories(state);
    }

    private async buildContext(state: typeof ChatAgentState.State) {
        // Add memoryClient to state for the handler function
        const stateWithMemoryClient = {
            ...state,
            memoryClient: this.memoryClient,
        };
        return buildContext(stateWithMemoryClient);
    }

    private async getLLMResponse(state: typeof ChatAgentState.State) {
        return getLLMResponse(state);
    }

    private async addMemory(state: typeof ChatAgentState.State) {
        return addMemory(state, this.appId);
    }

    public getAppId(): string {
        return this.appId;
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
