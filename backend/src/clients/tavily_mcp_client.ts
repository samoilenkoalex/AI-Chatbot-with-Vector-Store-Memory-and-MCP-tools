import { spawn, ChildProcess } from 'child_process';

interface JsonRpcRequest {
    jsonrpc: '2.0';
    id: number;
    method: string;
    params: Record<string, any>;
}

interface SearchResult {
    title: string;
    content: string;
}

export class TavilyMCPClient {
    private server!: ChildProcess;
    private timeout!: NodeJS.Timeout;
    private searchSent = false;
    private errorOccurred = false;

    constructor(
        private query: string,
        private userId?: string,
        private chatId?: string
    ) {}

    async search(): Promise<any> {
        return new Promise((resolve, reject) => {
            this.startServer();
            this.setupEventHandlers(resolve, reject);
            this.sendInitialRequest();
            this.setTimeout(reject);
        });
    }

    private startServer(): void {
        console.log('Starting Tavily MCP server...');
        console.log('Search query:', this.query);

        this.server = spawn(
            'npx',
            ['--yes', '--no-debugger', 'tavily-mcp@0.1.3'],
            {
                env: {
                    ...process.env,
                    NODE_OPTIONS: '--no-deprecation',
                    DEBUG: 'tavily*',
                },
                stdio: ['pipe', 'pipe', 'pipe'],
            }
        );
    }

    private setupEventHandlers(resolve: Function, reject: Function): void {
        this.server.stdout?.on('data', (data: Buffer) =>
            this.handleStdout(data, resolve, reject)
        );
        this.server.stderr?.on('data', (data: Buffer) =>
            this.handleStderr(data)
        );
        this.server.on('error', (error: Error) =>
            this.handleError(error, reject)
        );
        this.server.on('close', (code: number | null) =>
            this.handleClose(code)
        );
    }

    private handleStdout(
        data: Buffer,
        resolve: Function,
        reject: Function
    ): void {
        const output = data.toString().trim();
        if (!output) return;

        console.log('Tavily stdout:', output);

        try {
            const message = JSON.parse(output);
            if (message.jsonrpc !== '2.0') return;

            if (message.id === 0 && message.result?.tools && !this.searchSent) {
                this.sendSearchRequest();
            } else if (message.id === 1) {
                this.handleSearchResult(message, resolve, reject);
            }
        } catch (e) {
            console.log('Failed to parse Tavily output:', output, e);
        }
    }

    private handleStderr(data: Buffer): void {
        const stderr = data.toString();
        if (!stderr.includes('Debugger')) {
            console.error('Tavily stderr:', stderr);
        }
    }

    private handleError(error: Error, reject: Function): void {
        if (this.errorOccurred) return;
        this.errorOccurred = true;
        console.error('Tavily server error:', error);
        this.cleanup(true);
        reject(error);
    }

    private handleClose(code: number | null): void {
        console.log('Tavily server closed with code:', code);
        this.cleanup(false);
    }

    private sendInitialRequest(): void {
        const listToolsRequest: JsonRpcRequest = {
            jsonrpc: '2.0',
            id: 0,
            method: 'tools/list',
            params: {},
        };

        console.log('Requesting tools list:', JSON.stringify(listToolsRequest));
        this.server.stdin?.write(JSON.stringify(listToolsRequest) + '\n');
    }

    private detectSearchTopic(query: string): 'general' | 'news' {
        const newsKeywords = [
            'news',
            'latest',
            'recent',
            'updates',
            'announcement',
            'release',
            'flutter',
            'tech',
            'programming',
            'development',
            'software',
            'ai',
            'machine learning',
        ];
        const lowercaseQuery = query.toLowerCase();

        return newsKeywords.some((keyword) => lowercaseQuery.includes(keyword))
            ? 'news'
            : 'general';
    }

    private optimizeQuery(query: string): string {
        // Remove conversational words that might confuse the search
        const cleanQuery = query
            .replace(/^what are the latest news about /i, '')
            .replace(/^latest news about /i, '')
            .replace(/^news about /i, '')
            .replace(/^what is /i, '')
            .replace(/^tell me about /i, '')
            .trim();

        // Add relevant keywords for better search results
        if (cleanQuery.toLowerCase().includes('flutter')) {
            return `${cleanQuery} news updates 2025`;
        }

        return cleanQuery;
    }

    private sendSearchRequest(): void {
        this.searchSent = true;
        const optimizedQuery = this.optimizeQuery(this.query);
        const searchTopic = this.detectSearchTopic(this.query);

        const searchRequest: JsonRpcRequest = {
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/call',
            params: {
                name: 'tavily-search',
                arguments: {
                    query: optimizedQuery,
                    search_depth: 'basic',
                    include_answer: true,
                    include_raw_content: false,
                    include_images: false,
                    max_results: 3,
                    time_range: searchTopic === 'news' ? 'week' : 'month',
                },
            },
        };

        console.log(
            'Sending search request:',
            JSON.stringify(searchRequest, null, 2)
        );
        this.server.stdin?.write(JSON.stringify(searchRequest) + '\n');
    }

    private async handleSearchResult(
        message: any,
        resolve: Function,
        reject: Function
    ): Promise<void> {
        if (message.error || (message.result && message.result.isError)) {
            const error = message.error || message.result;
            console.error('Search failed:', error);
            this.cleanup(true);
            reject(new Error(JSON.stringify(error)));
            return;
        }

        if (!message.result || message.result.isError) return;

        const searchResult = message.result;

        if (searchResult.content && searchResult.content.length > 0) {
            const processedResults = this.processSearchResults(
                searchResult.content
            );
            const formattedResponse = processedResults
                .map((r: SearchResult) => `${r.title}\n${r.content}`)
                .join('\n\n');

            this.cleanup(true);
            resolve({ content: formattedResponse });
        } else {
            this.cleanup(true);
            resolve(searchResult);
        }
    }

    private processSearchResults(content: any[]): SearchResult[] {
        return content
            .map((item: any) => {
                if (item.type === 'text' && item.text) {
                    const results = item.text
                        .split('\n\nTitle:')
                        .filter(Boolean);
                    return results.map((result: string) => {
                        const [title, ...contentParts] =
                            result.split('\nContent:');
                        return {
                            title: title.trim(),
                            content: contentParts.join('\nContent:').trim(),
                        };
                    });
                }
                return [];
            })
            .flat();
    }

    private setTimeout(reject: Function): void {
        this.timeout = setTimeout(() => {
            if (!this.errorOccurred) {
                this.errorOccurred = true;
                console.error('Operation timed out');
                this.cleanup(true);
                reject(new Error('Operation timed out'));
            }
        }, 15000);
    }

    private cleanup(force: boolean = false): void {
        if (this.errorOccurred && !force) return;

        clearTimeout(this.timeout);

        try {
            if (!this.server.killed) {
                this.server.stdin?.end();
                this.server.kill('SIGTERM');

                setTimeout(() => {
                    if (!this.server.killed) {
                        console.log('Force killing Tavily server...');
                        this.server.kill('SIGKILL');
                    }
                }, 1000);
            }
        } catch (e) {
            console.error('Error during cleanup:', e);
        }
    }
}
