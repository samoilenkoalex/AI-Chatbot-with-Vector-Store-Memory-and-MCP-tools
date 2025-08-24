# AI Chatbot with Vector Store, Memory and MCP tools


A sophisticated AI-powered study companion chatbot that leverages advanced AI capabilities with vector store memory retention and Model Context Protocol (MCP) integration. This project combines modern technologies for both backend and frontend to deliver a seamless learning experience with both text and voice chat capabilities.

## Text Chat 

https://github.com/user-attachments/assets/647acc87-2a20-4245-8959-ef824399eede


## Tavily MCP  

https://github.com/user-attachments/assets/16d6501f-eca0-44b2-ab77-d87791a9651b


## Firecrawl MCP

https://github.com/user-attachments/assets/aa3be5c2-c964-414c-aff0-5e1b75a7d232


## Voice Mode

https://github.com/user-attachments/assets/8c47e61d-8eee-48d5-afe0-2fe3cb03f169

## 🚀 Features

-   **Chat Interface**: Interactive text-based conversation with AI study assistant
-   **Voice Chat Support**: Real-time voice communication using LiveKit
-   **Memory Retention**: Long-term memory system for personalized learning interactions
-   **Vector Store Integration**: Efficient similarity search and context retrieval
-   **MCP Integration**: Model Context Protocol for enhanced AI capabilities
-   **Flutter Web Support**: Web browser support
-   **User Authentication**: Secure login and session management
-   **Web Search Integration**: Real-time web search capabilities via Tavily
-   **Document Processing**: File handling and document analysis
-   **LLM model**: cas/llama-3.2-1b-instruct:latest
-   **Embedding model**: nomic-embed-text:latest

## 🛠 Technology Stack

### Backend

-   **Node.js**: Runtime environment
-   **TypeScript**: Primary programming language
-   **LangGraph**: AI conversation flow orchestration
-   **LangChain**: AI framework for language models
-   **OpenAI**: Large language model integration
-   **LiveKit**: Real-time voice/video communication
-   **Mem0**: Advanced memory system for conversation context
-   **SQLite**: Database with Sequelize ORM
-   **Tavily**: Web search and research capabilities
-   **MCP (Model Context Protocol)**: Enhanced AI agent capabilities
-   **Firecrawl**: Web scraping and content extraction
-   **JWT**: Authentication and authorization

### Frontend

-   **Flutter**: Cross-platform UI framework
-   **Dart**: Programming language for Flutter
-   **BLoC Pattern**: State management architecture
-   **LiveKit Client**: Real-time communication client
-   **WebRTC**: Voice and video communication
-   **HTTP**: API communication
-   **Go Router**: Navigation management

## 📋 Prerequisites

-   Node.js (v18 or higher)
-   Flutter SDK (latest stable version)
-   Git

## 🔧 Installation

### Backend Setup

1. Navigate to the backend directory:

    ```bash
    cd backend
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Set up environment variables:

    ```bash
    cp .env.example .env
    # Edit .env with your configuration including:
    # - OpenAI API key
    # - LiveKit credentials
    # - Tavily API key
    # - JWT secret
    ```

4. Build the project:

    ```bash
    npm run build
    ```

5. Start the development server:
    ```bash
    npm run dev
    ```

### Frontend Setup

1. Navigate to the frontend directory:

    ```bash
    cd frontend
    ```

2. Get Flutter dependencies:

    ```bash
    flutter pub get
    ```

3. Run the application:
    ```bash
    flutter run
    ```

## 🏗 Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── app.ts                    # Express application setup
│   │   ├── chat_agent.ts            # AI chat agent implementation
│   │   ├── clients/                 # MCP clients (Firecrawl, Tavily)
│   │   ├── config/                  # Configuration files
│   │   ├── controllers/             # Route controllers
│   │   ├── middleware/              # Authentication middleware
│   │   ├── models/                  # Data models
│   │   ├── routes/                  # API routes
│   │   ├── services/                # Business logic services
│   │   └── tools/                   # AI tools and utilities
│   ├── package.json                 # Node.js dependencies
│   └── database.sqlite              # SQLite database
├── frontend/
│   └── lib/
│       ├── features/                # Feature-based architecture
│       │   ├── auth/               # Authentication feature
│       │   ├── chat/               # Text chat feature
│       │   └── livekit/            # Voice chat feature
│       ├── common/                 # Shared utilities and widgets
│       ├── core/                   # Core configurations
│       ├── layout/                 # App layout components
│       └── main.dart               # Application entry point
```

## 📱 Features Overview

### Authentication System

-   Secure user registration and login
-   JWT-based session management
-   Protected routes and middleware

### Chat System

-   Real-time text messaging
-   AI-powered responses with context awareness
-   Message history and persistence
-   Custom chat UI with Material Design

### Voice Chat

-   Real-time voice communication
-   LiveKit integration for high-quality audio
-   Voice-to-text and text-to-voice capabilities
-   Cross-platform voice support

### Memory & Context

-   Vector store for efficient information retrieval
-   Long-term conversation memory
-   Personalized learning experiences
-   Context-aware responses

### AI Capabilities

-   OpenAI integration for advanced language processing
-   Web search integration via Tavily
-   Document processing and analysis
-   MCP protocol for enhanced AI features

## 🔌 API Endpoints

### Authentication

-   `POST /api/auth/login` - User login
-   `POST /api/auth/register` - User registration

### Chat

-   `POST /api/chat/message` - Send chat message
-   `GET /api/chat/history` - Get chat history

### LiveKit

-   `POST /api/livekit/token` - Generate LiveKit access token
-   `POST /api/livekit/start` - Start LiveKit session
-   `POST /api/livekit/stop` - Stop LiveKit session
-   `POST /api/livekit//record_message` - Record transcript message


## 👥 Authors

Created by Oleksandr Samoilenko, 2025

