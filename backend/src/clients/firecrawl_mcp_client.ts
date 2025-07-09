import { spawn } from 'child_process';
import { createInterface } from 'readline';
import { FIRECRAWL_API_KEY } from '../config/config.js';

export interface FirecrawlResponse {
    content: string | any[];
    isError?: boolean;
}

export class FirecrawlMCPClient {
    private url: string;

    constructor(url: string) {
        this.url = url;
    }

    async search(): Promise<string> {
        console.log('Starting Firecrawl MCP server...');

        return new Promise((resolve, reject) => {
            const mcpServer = spawn('npx', ['--yes', 'firecrawl-mcp'], {
                env: {
                    ...process.env,
                    FIRECRAWL_API_KEY: FIRECRAWL_API_KEY,
                },
                stdio: ['pipe', 'pipe', 'pipe'],
            });

            const rl = createInterface({
                input: mcpServer.stdout,
                terminal: false,
            });

            let serverReady = false;
            let requestSent = false;
            let result = '';

            rl.on('line', (line) => {
                if (!line.trim()) return;

                try {
                    const message = JSON.parse(line);

                    if (message.jsonrpc === '2.0') {
                        if (message.result && !message.result.isError) {
                            if (message.result.content) {
                                if (
                                    typeof message.result.content === 'string'
                                ) {
                                    result = this.cleanContent(
                                        message.result.content
                                    );
                                } else if (
                                    Array.isArray(message.result.content)
                                ) {
                                    result = message.result.content
                                        .map((item: any) => {
                                            if (typeof item === 'string') {
                                                return this.cleanContent(item);
                                            } else if (
                                                item.type === 'text' &&
                                                item.text
                                            ) {
                                                return this.cleanContent(
                                                    item.text
                                                );
                                            }
                                            return JSON.stringify(item);
                                        })
                                        .join('\n');
                                }
                                cleanup();
                                resolve(result);
                            }
                        } else if (
                            message.error ||
                            (message.result && message.result.isError)
                        ) {
                            cleanup();
                            reject(message.error || message.result);
                        }
                    } else if (
                        message.type === 'ready' ||
                        line.includes('Server ready')
                    ) {
                        serverReady = true;
                        if (!requestSent) {
                            this.sendRequest(mcpServer);
                            requestSent = true;
                        }
                    }
                } catch (e) {
                    if (
                        line.includes('ready') ||
                        line.includes('listening') ||
                        line.includes('started')
                    ) {
                        if (!serverReady && !requestSent) {
                            serverReady = true;
                            setTimeout(() => {
                                if (!requestSent) {
                                    this.sendRequest(mcpServer);
                                    requestSent = true;
                                }
                            }, 1000);
                        }
                    }
                }
            });

            mcpServer.stderr.on('data', (data) => {
                const stderr = data.toString();
                if (stderr.includes('ready') && !serverReady && !requestSent) {
                    serverReady = true;
                    setTimeout(() => {
                        if (!requestSent) {
                            this.sendRequest(mcpServer);
                            requestSent = true;
                        }
                    }, 1000);
                }
            });

            mcpServer.on('error', (error) => {
                cleanup();
                reject(error);
            });

            const cleanup = () => {
                if (!mcpServer.killed) {
                    mcpServer.stdin.end();
                    mcpServer.kill('SIGTERM');
                    setTimeout(() => {
                        if (!mcpServer.killed) {
                            mcpServer.kill('SIGKILL');
                        }
                    }, 5000);
                }
                rl.close();
            };

            setTimeout(() => {
                if (!requestSent) {
                    this.sendRequest(mcpServer);
                    requestSent = true;
                }
            }, 5000);

            setTimeout(() => {
                cleanup();
                reject(new Error('Operation timed out'));
            }, 30000);
        });
    }

    private cleanContent(content: string): string {
        // Parse JSON if it's wrapped in JSON
        try {
            const parsed = JSON.parse(content);
            if (parsed.type === 'text' && parsed.text) {
                content = parsed.text;
            }
        } catch (e) {
            // If it's not JSON, use the content as-is
        }

        // Clean up escaped characters and formatting
        return content
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\')
            .replace(/\\u[\da-fA-F]{4}/g, (match) => {
                return String.fromCharCode(
                    parseInt(match.replace('\\u', ''), 16)
                );
            })
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .trim();
    }

    private sendRequest(server: any) {
        const request = {
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/call',
            params: {
                name: 'firecrawl_scrape',
                arguments: {
                    url: this.url,
                    formats: ['markdown'],
                    onlyMainContent: true,
                },
            },
        };

        server.stdin.write(JSON.stringify(request) + '\n');
    }
}
