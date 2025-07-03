import {
    StateGraph,
    MessagesAnnotation,
    Annotation,
    END,
    // START,
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
// import { DynamicStructuredTool } from '@langchain/core/tools';
import { VECTOR_DIMENSION, APP_ID } from './config/config.js';
import { ToolNode } from '@langchain/langgraph/prebuilt';
// import { z } from 'zod';
// import { spawn, ChildProcess } from 'child_process';
// import { createInterface, Interface } from 'readline';
import { tavilySearchTool } from './tools/tavily_search_tool.js';

// interface JsonRpcRequest {
//     jsonrpc: '2.0';
//     id: number;
//     method: string;
//     params: Record<string, any>;
// }

// interface SearchResult {
//     title: string;
//     content: string;
// }

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
        this.toolNode = new ToolNode([tavilySearchTool]);
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
            .addConditionalEdges(
                'get_llm_response',
                this.shouldContinue.bind(this),
                ['tools', END]
            )
            .addEdge('add_memory', '__end__');

        this.graph = workflow.compile();
    }

    private shouldContinue(state: typeof ChatAgentState.State) {
        const { messages } = state;
        const lastMessage = messages[messages.length - 1];
        // Only continue to tools if we haven't used them yet and this is our first response
        if (messages.length === 1 && lastMessage instanceof AIMessage) {
            return 'tools';
        }
        return END;
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

        // Only trigger tool for news queries
        const isNewsQuery =
            state.question.toLowerCase().includes('news') ||
            state.question.toLowerCase().includes('latest') ||
            state.question.toLowerCase().includes('recent');

        return {
            memories,
            searchResults: null,
            messages: [
                new AIMessage({
                    content: isNewsQuery
                        ? "I'll search for recent information about that."
                        : 'Let me check what I know about that.',
                    tool_calls: isNewsQuery
                        ? [
                              {
                                  name: 'tavily_search',
                                  args: { query: state.question },
                                  id: 'search_call_' + Date.now(),
                                  type: 'tool_call',
                              },
                          ]
                        : undefined,
                }),
            ],
        };
    }

    private async buildContext(state: typeof ChatAgentState.State) {
        console.log('Building context from memories and web search...');
        let context = '';

        // Get the last message that might contain tool results
        const lastMessage = state.messages[state.messages.length - 1];

        console.log('Last message:', lastMessage);
        console.log('state.messages:', state.messages);

        // Handle ToolMessage from Tavily search
        if (
            lastMessage &&
            'name' in lastMessage &&
            lastMessage.name === 'tavily_search' &&
            typeof lastMessage.content === 'string'
        ) {
            try {
                const parsedContent = JSON.parse(lastMessage.content);
                console.log(
                    'Parsed search results from ToolMessage:',
                    parsedContent
                );

                // Return the raw Tavily results and set it as the response
                return {
                    context: '',
                    response: parsedContent.content,
                    messages: [
                        new AIMessage({
                            content: parsedContent.content,
                            additional_kwargs: {
                                is_raw_tool_response: true,
                            },
                        }),
                    ],
                };
            } catch (e) {
                console.error('Error parsing Tavily result:', e);
            }
        }

        // If not a Tavily result, proceed with normal memory search
        try {
            const messageContent =
                typeof lastMessage.content === 'string'
                    ? lastMessage.content
                    : JSON.stringify(lastMessage.content);

            const memories = await this.memoryClient.searchMemories(
                messageContent,
                5
            );
            context = memories.map((memory) => memory.pageContent).join('\n');
        } catch (error) {
            console.error('Error searching memories:', error);
        }

        return {
            context,
            messages: [],
        };
    }

    private async getLLMResponse(state: typeof ChatAgentState.State) {
        // If we already have a response from Tavily, skip LLM
        if (state.response) {
            return {
                messages: state.messages,
                response: state.response,
            };
        }

        console.log('Getting LLM response...');

        const messages = [
            {
                role: 'system' as const,
                content: `You are a helpful assistant. Use the provided context to personalize your responses and remember past interactions. You have access to a tool called 'tavily_search' that can search the web for real-time information. Use it when needed.\n\n${state.context}`,
            },
            {
                role: 'user' as const,
                content: state.question,
            },
        ];

        const response = await getLLMResponse(messages);

        const updatedMessages = [
            new SystemMessage(
                `You are a helpful assistant. Use the provided context to personalize your responses and remember past interactions. You have access to a tool called 'tavily_search' that can search the web for real-time information. Use it when needed.\n\n${state.context}`
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

        // Skip if no response (shouldn't happen)
        if (!state.response) {
            console.log('No response to store in memory');
            return {};
        }

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

        let mem0Memory = '';
        mem0Memory = mem0Response[0]?.data?.memory || '';

        await addToQdrant(paddedEmbedding, {
            question: state.question,
            response: state.response,
            userId: state.userId,
            appId: state.appId,
            timestamp: new Date().toISOString(),
            mem0_response: mem0Memory,
            ...(state.chatId && { chat_id: state.chatId }),
            ...(state.chatName && { chat_name: state.chatName }),
        });

        return {};
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
