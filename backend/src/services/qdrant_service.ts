import {
    QDRANT_HOST,
    QDRANT_PORT,
    QDRANT_COLLECTION,
    VECTOR_DIMENSION,
    APP_ID,
} from '../config/config.js';

let isQdrantInitialized = false;

function getQdrantUrl(path: string): string {
    const cleanHost = QDRANT_HOST.replace(/\/$/, '');
    const cleanPath = path.replace(/^\//, '').replace(/;/g, '');
    return `${cleanHost}:${QDRANT_PORT}/${cleanPath}`;
}

export async function ensureQdrantCollection(): Promise<void> {
    if (isQdrantInitialized) {
        return;
    }

    try {
        const checkUrl = getQdrantUrl(`collections/${QDRANT_COLLECTION}`);
        const checkResponse = await fetch(checkUrl);

        if (checkResponse.status === 404) {
            const createResponse = await fetch(checkUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: QDRANT_COLLECTION,
                    vectors: {
                        default: {
                            size: VECTOR_DIMENSION,
                            distance: 'Cosine',
                        },
                    },
                }),
            });

            if (!createResponse.ok) {
                const errorText = await createResponse.text();
                console.error('Create collection response:', errorText);
                throw new Error(`Failed to create collection: ${errorText}`);
            }
            console.log('Created Qdrant collection with correct dimensions');
        } else {
            const collectionInfo = await checkResponse.json();
            console.log('Existing collection configuration:', collectionInfo);

            const vectorConfig = collectionInfo.result?.vectors?.default;
            if (
                !vectorConfig ||
                vectorConfig.size !== VECTOR_DIMENSION ||
                vectorConfig.distance !== 'Cosine'
            ) {
                console.warn(
                    'Collection exists but has different configuration:',
                    vectorConfig
                );
                console.warn('Expected:', {
                    size: VECTOR_DIMENSION,
                    distance: 'Cosine',
                });
                console.warn(
                    'You may need to delete and recreate the collection with the correct configuration.'
                );
            } else {
                console.log('Collection exists with correct configuration');
            }
        }
        isQdrantInitialized = true;
    } catch (error) {
        console.error('Error ensuring Qdrant collection:', error);
        console.warn('Qdrant service will be disabled');
    }
}

export interface SearchMemoryResponse {
    results: Array<{
        memory: string;
        metadata: {
            appId: string;
            mem0_response?: string;
            chat_id?: string;
            chat_name?: string;
        };
    }>;
}

export async function searchQdrant(
    vector: number[],
    userId: string | undefined,
    chatId?: string
): Promise<SearchMemoryResponse> {
    if (!isQdrantInitialized) {
        console.log('Qdrant service is disabled, returning empty results');
        return { results: [] };
    }

    try {
        const searchUrl = getQdrantUrl(
            `collections/${QDRANT_COLLECTION}/points/search`
        );

        const mustConditions = [
            {
                key: 'appId',
                match: { value: APP_ID },
            },
        ];

        if (userId) {
            mustConditions.push({
                key: 'userId',
                match: { value: userId },
            });
        }

        if (chatId) {
            mustConditions.push({
                key: 'chat_id',
                match: { value: chatId },
            });
        }

        const searchBody = {
            vector: {
                name: 'default',
                vector: vector,
            },
            limit: 5,
            with_payload: true,
            filter: {
                must: mustConditions,
            },
        };

        const response = await fetch(searchUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(searchBody),
        });

        if (!response.ok) {
            throw new Error(`Qdrant search failed: ${await response.text()}`);
        }

        const searchResults = await response.json();

        return {
            results: (searchResults.result || [])
                .map((hit: any) => {
                    if (!hit?.payload) {
                        console.warn('Hit missing payload:', hit);
                        return null;
                    }
                    return {
                        memory: `${hit.payload.question}\nResponse: ${hit.payload.response}`,
                        metadata: {
                            appId: hit.payload.appId,
                            mem0_response: hit.payload.mem0_response || '',
                            chat_id: hit.payload.chat_id,
                            chat_name: hit.payload.chat_name,
                        },
                    };
                })
                .filter((result: any) => result !== null),
        };
    } catch (error) {
        console.error('Error searching Qdrant:', error);
        return { results: [] };
    }
}

export interface QdrantPayload {
    question: string;
    response: string;
    userId?: string;
    appId: string;
    timestamp: string;
    mem0_response?: string;
    chat_id?: string;
    chat_name?: string;
}

export async function addToQdrant(
    vector: number[],
    payload: QdrantPayload
): Promise<void> {
    if (!isQdrantInitialized) {
        console.log('Qdrant service is disabled, skipping point addition');
        return;
    }

    const pointId = Math.floor(Date.now() / 1000);
    const qdrantUrl = getQdrantUrl(`collections/${QDRANT_COLLECTION}/points`);

    console.log(
        'Original payload received by Qdrant:',
        JSON.stringify(payload, null, 2)
    );

    // Clean up the payload by removing undefined values, but preserve mem0_response even if empty
    const cleanPayload = Object.fromEntries(
        Object.entries(payload).filter(
            ([key, value]) =>
                value !== undefined && (key === 'mem0_response' || value !== '')
        )
    );

    console.log(
        'Cleaned payload for Qdrant:',
        JSON.stringify(cleanPayload, null, 2)
    );

    const vectorData = {
        points: [
            {
                id: pointId,
                vectors: {
                    default: vector,
                },
                payload: cleanPayload,
            },
        ],
    };

    try {
        const response = await fetch(qdrantUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(vectorData),
        });

        if (!response.ok) {
            throw new Error(
                `Failed to add point to Qdrant: ${await response.text()}`
            );
        }
    } catch (error) {
        console.error('Error adding to Qdrant:', error);
    }
}

export interface UserItemsResponse {
    results: Array<{
        question: string;
        response: string;
        mem0_response?: string;
        chat_id?: string;
        chat_name?: string;
    }>;
}

export async function getAllUserItems(
    userId: string
): Promise<UserItemsResponse> {
    try {
        const scrollUrl = getQdrantUrl(
            `collections/${QDRANT_COLLECTION}/points/scroll`
        );

        const scrollBody = {
            limit: 100,
            with_payload: true,
            with_vector: false,
            filter: {
                must: [
                    {
                        key: 'userId',
                        match: { value: userId },
                    },
                    {
                        key: 'appId',
                        match: { value: APP_ID },
                    },
                ],
            },
        };

        const response = await fetch(scrollUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(scrollBody),
        });

        if (!response.ok) {
            throw new Error(`Qdrant scroll failed: ${await response.text()}`);
        }

        const scrollResults = await response.json();

        return {
            results: (scrollResults.result?.points || [])
                .map((point: any) => {
                    if (!point?.payload) {
                        console.warn('Point missing payload:', point);
                        return null;
                    }
                    return {
                        question: point.payload.question,
                        response: point.payload.response,
                        mem0_response: point.payload.mem0_response || '',
                        chat_id: point.payload.chat_id,
                        chat_name: point.payload.chat_name,
                    };
                })
                .filter((result: any) => result !== null),
        };
    } catch (error) {
        console.error('Error fetching user items from Qdrant:', error);
        return { results: [] };
    }
}

export interface ChatItemsResponse {
    results: Array<{
        question: string;
        response: string;
        mem0_response?: string;
        chat_id?: string;
        chat_name: string;
    }>;
}

export async function getItemsWithChatName(): Promise<ChatItemsResponse> {
    try {
        const scrollUrl = getQdrantUrl(
            `collections/${QDRANT_COLLECTION}/points/scroll`
        );

        const scrollBody = {
            limit: 100,
            with_payload: true,
            with_vector: false,
            filter: {
                must: [
                    {
                        key: 'appId',
                        match: { value: APP_ID },
                    },
                    {
                        key: 'chat_name',
                        match: { text: '' },
                        is_null: false,
                    },
                ],
            },
        };

        const response = await fetch(scrollUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(scrollBody),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Qdrant response:', errorText);
            throw new Error(`Qdrant scroll failed: ${errorText}`);
        }

        const scrollResults = await response.json();

        return {
            results: (scrollResults.result?.points || [])
                .map((point: any) => {
                    if (!point?.payload?.chat_name) {
                        return null;
                    }
                    return {
                        question: point.payload.question,
                        response: point.payload.response,
                        mem0_response: point.payload.mem0_response || '',
                        chat_id: point.payload.chat_id,
                        chat_name: point.payload.chat_name,
                    };
                })
                .filter((result: any) => result !== null),
        };
    } catch (error) {
        console.error('Error fetching chat items from Qdrant:', error);
        return { results: [] };
    }
}
