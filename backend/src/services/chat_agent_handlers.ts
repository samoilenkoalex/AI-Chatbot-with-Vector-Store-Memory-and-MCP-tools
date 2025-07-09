import {
    AIMessage,
    HumanMessage,
    SystemMessage,
} from '@langchain/core/messages';
import { VECTOR_DIMENSION } from '../config/config.js';
import { createMemoryContextPrompt } from '../config/prompts.js';
import {
    getEmbeddings,
    getLLMResponse as fetchLLMResponse,
    padEmbedding,
} from './llm_service.js';
import { addToMem0 } from './mem0_service.js';
import { addToQdrant, searchQdrant } from './qdrant_service.js';

export async function generateEmbedding(state: any) {
    console.log('Generating embedding for question:', state.question);
    const embedding = await getEmbeddings(state.question);
    const paddedEmbedding = padEmbedding(embedding, VECTOR_DIMENSION);

    return {
        embedding: paddedEmbedding,
    };
}

export async function searchMemories(state: any) {
    console.log('Searching for memories...');
    const memories = await searchQdrant(
        state.embedding,
        state.userId,
        state.chatId
    );
    console.log(
        'Previous memories:',
        memories.results.map((m: any) => m.metadata.mem0_response).join('\n')
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
                              args: {
                                  url: urlMatch[0],
                              },
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

export async function buildContext(state: any) {
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
            const content = lastMessage.content.trim();
            if (!content.startsWith('{') && !content.startsWith('[')) {
                console.error('Tavily returned non-JSON content:', content);
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
            return {
                context: '',
                response: '',
                messages: state.messages,
            };
        }
    }

    // Handle ToolMessage from Firecrawl search
    if (
        lastMessage &&
        'name' in lastMessage &&
        lastMessage.name === 'firecrawl_search' &&
        typeof lastMessage.content === 'string'
    ) {
        // Check if the content is an error message
        if (lastMessage.content.includes('Error:')) {
            console.error('Firecrawl error:', lastMessage.content);
            return {
                context: '',
                response:
                    'Sorry, I encountered an error while trying to scrape that website. ' +
                    'Please try again later or provide a different URL.',
                messages: state.messages,
            };
        }

        // Always summarize content from Firecrawl if the question contains "summarize"
        if (state.question.toLowerCase().includes('summarize')) {
            try {
                // Extract the actual content from the scraped response
                let contentToSummarize = lastMessage.content;

                // Clean up the content by removing any URL prefixes
                if (contentToSummarize.includes('Content scraped from')) {
                    contentToSummarize = contentToSummarize.replace(
                        /Content scraped from https?:\/\/[^\s]+:\s*\n+/,
                        ''
                    );
                }

                // Create a more effective prompt for summarization
                const prompt = `Please provide a comprehensive summary of the following content. Focus on the main points, key features, updates, and important information:

${contentToSummarize.substring(0, 10000)}`;

                // Get the summary from the LLM with a stronger system message
                const summary = await fetchLLMResponse([
                    {
                        role: 'system',
                        content:
                            'You are a specialized summarization assistant. Your task is to create clear, accurate, and comprehensive summaries of technical content. Extract the most important information, organize it logically, and present it in a concise format. Focus on key updates, features, changes, and critical information that would be most valuable to the user.',
                    },
                    { role: 'user', content: prompt },
                ]);

                console.log('Generated summary:', summary);

                // Return the summary as the response
                return {
                    context: '',
                    response: summary,
                    messages: [
                        new AIMessage({
                            content: summary,
                            additional_kwargs: {
                                is_raw_tool_response: false,
                            },
                        }),
                    ],
                };
            } catch (e) {
                console.error('Error generating summary:', e);
                return {
                    context: '',
                    response:
                        'Sorry, I encountered an error while trying to summarize that website. ' +
                        'Please try again later or provide a different URL.',
                    messages: state.messages,
                };
            }
        } else {
            // If not summarizing, just return the raw content
            return {
                context: '',
                response: lastMessage.content,
                messages: [
                    new AIMessage({
                        content: lastMessage.content,
                        additional_kwargs: {
                            is_raw_tool_response: true,
                        },
                    }),
                ],
            };
        }
    }

    // Build context from Qdrant memories
    if (
        state.memories &&
        state.memories.results &&
        state.memories.results.length > 0
    ) {
        // Collect all mem0_responses
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
    if (!context && state.memoryClient) {
        try {
            const messageContent =
                typeof lastMessage.content === 'string'
                    ? lastMessage.content
                    : JSON.stringify(lastMessage.content);

            const memories = await state.memoryClient.searchMemories(
                messageContent,
                5
            );
            context = memories
                .map((memory: { pageContent: string }) => memory.pageContent)
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

export async function getLLMResponse(
    state: any
): Promise<{ messages: any[]; response: string }> {
    // If we already have a response from Tavily, skip LLM
    if (state.response) {
        return {
            messages: state.messages,
            response: state.response,
        };
    }

    console.log('Getting LLM response...');

    const systemMessage = createMemoryContextPrompt(state.context);

    const response: string = await fetchLLMResponse([
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

export async function addMemory(state: any, appId: string) {
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
        appId: appId,
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
                ? payload.mem0_response.substring(0, 1000) + '... (truncated)'
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
