import dotenv from 'dotenv';

dotenv.config();

function requireEnvVar(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Environment variable ${name} is required but not set`);
    }
    return value;
}

export const PORT = process.env.PORT || 3001;
export const JWT_SECRET =
    process.env.JWT_SECRET || 'your-secret-key-change-in-production';
export const JWT_EXPIRATION = '1h';

// App configuration
export const APP_ID = requireEnvVar('APP_ID');

// Chat feature configuration
export const MEM0_API_KEY = process.env.MEM0_API_KEY;

// Ollama configuration
export const OLLAMA_BASE_URL = requireEnvVar('OLLAMA_BASE_URL');
export const LLM_MODEL = requireEnvVar('LLM_MODEL');
export const EMBEDDING_MODEL = requireEnvVar('EMBEDDING_MODEL');

// Qdrant configuration
export const QDRANT_HOST = requireEnvVar('QDRANT_HOST');
export const QDRANT_PORT = parseInt(requireEnvVar('QDRANT_PORT'), 10);
export const QDRANT_COLLECTION = requireEnvVar('QDRANT_COLLECTION');
export const VECTOR_DIMENSION = 768;

export const TAVILY_API_KEY = process.env.TAVILY_API_KEY || '';
export const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY || '';
