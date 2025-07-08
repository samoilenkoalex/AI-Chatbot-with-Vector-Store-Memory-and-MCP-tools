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
import { VECTOR_DIMENSION, APP_ID } from './config/config.js';
import { createMemoryContextPrompt } from './config/prompts.js';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { tavilySearchTool } from './tools/tavily_search_tool.js';
import { firecrawlSearchTool } from './tools/firecrawl_search_tool.js';

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

        const urlMatch = state.question.match(/https?:\/\/[^\s]+/);
        const isNewsQuery =
            state.question.toLowerCase().includes('news') ||
            state.question.toLowerCase().includes('latest') ||
            state.question.toLowerCase().includes('recent');

        return {
            memories,
            searchResults: null,
            messages: [
                new AIMessage({
                    content: urlMatch
                        ? "I'll scrape the content from that URL."
                        : isNewsQuery
                        ? "I'll search for recent information about that."
                        : 'Let me check what I know about that.',
                    tool_calls: urlMatch
                        ? [
                              {
                                  name: 'firecrawl_search',
                                  args: { url: urlMatch[0] },
                                  id: 'firecrawl_call_' + Date.now(),
                                  type: 'tool_call',
                              },
                          ]
                        : isNewsQuery
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
                // Check if content looks like JSON before parsing
                const content = lastMessage.content.trim();
                if (!content.startsWith('{') && !content.startsWith('[')) {
                    console.error('Tavily returned non-JSON content:', content);
                    // Handle error gracefully - skip this message
                    return {
                        context: '',
                        response: '',
                        messages: state.messages,
                    };
                }

                const parsedContent = JSON.parse(content);
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
                console.error(
                    'Raw content that failed to parse:',
                    lastMessage.content
                );
                // Handle error gracefully - skip this message
                return {
                    context: '',
                    response: '',
                    messages: state.messages,
                };
            }
        }

        // Build context from Qdrant memories
        if (
            state.memories &&
            state.memories.results &&
            state.memories.results.length > 0
        ) {
            // First, collect all mem0_responses
            const mem0Responses = state.memories.results
                .map(
                    (m: { metadata: { mem0_response: string } }) =>
                        m.metadata.mem0_response
                )
                .filter((response: string) => response && response.length > 0);

            // Then collect conversation history
            const conversationHistory = state.memories.results
                .map((memory: { memory: string }) => memory.memory)
                .filter((memory: string) => memory && memory.length > 0);

            // Build the context string
            const contextParts = [];

            if (mem0Responses.length > 0) {
                contextParts.push('User Context:\n' + mem0Responses.join('\n'));
            }

            if (conversationHistory.length > 0) {
                contextParts.push(
                    'Conversation History:\n' + conversationHistory.join('\n\n')
                );
            }

            context = contextParts.join('\n\n');
            console.log('Built context:', context);
        }

        // If we have no Qdrant memories, try searching through memory client
        if (!context) {
            try {
                const messageContent =
                    typeof lastMessage.content === 'string'
                        ? lastMessage.content
                        : JSON.stringify(lastMessage.content);

                const memories = await this.memoryClient.searchMemories(
                    messageContent,
                    5
                );
                context = memories
                    .map((memory) => memory.pageContent)
                    .join('\n');
            } catch (error) {
                console.error('Error searching memories:', error);
            }
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

        const systemMessage = createMemoryContextPrompt(state.context);

        const response = await getLLMResponse([
            { role: 'system' as const, content: systemMessage },
            { role: 'user' as const, content: state.question },
        ]);

        return {
            messages: [
                new SystemMessage(systemMessage),
                new HumanMessage(state.question),
                new AIMessage(response),
            ],
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

        // Generate embedding for the full conversation
        const embedding = await getEmbeddings(
            state.question + ' ' + state.response
        );
        const paddedEmbedding = padEmbedding(embedding, VECTOR_DIMENSION);

        // For mem0, we'll use a truncated version if needed
        console.log('Calling mem0 with:', {
            question: state.question,
            response:
                state.response.length > 1500
                    ? 'truncated response...'
                    : state.response,
            userId: state.userId,
        });

        const mem0Response = await addToMem0(
            state.question,
            state.response,
            state.userId,
            state.chatId
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
            'Extracted mem0 memory:',
            extractedMemory || 'No memory extracted'
        );

        // Store in Qdrant with full response
        const payload = {
            question: state.question,
            response: state.response,
            userId: state.userId,
            appId: this.appId,
            timestamp: new Date().toISOString(),
            mem0_response: extractedMemory,
            chat_id: state.chatId,
            chat_name: state.chatName,
        };

        console.log('Original payload received by Qdrant:', payload);

        // Clean and truncate fields for Qdrant if needed
        const cleanedPayload = {
            ...payload,
            response:
                payload.response.length > 8000
                    ? payload.response.substring(0, 8000) + '... (truncated)'
                    : payload.response,
            mem0_response:
                payload.mem0_response.length > 1000
                    ? payload.mem0_response.substring(0, 1000) +
                      '... (truncated)'
                    : payload.mem0_response,
        };

        console.log('Cleaned payload for Qdrant:', cleanedPayload);

        try {
            await addToQdrant(paddedEmbedding, cleanedPayload);
            return {};
        } catch (error) {
            console.error('Error adding to Qdrant:', error);
            return {};
        }
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
