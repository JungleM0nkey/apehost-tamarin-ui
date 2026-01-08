<div align="center">

<img src="./public/logo.png" alt="Tamarin logo" height="100" />


[![Next.js](https://img.shields.io/badge/Next.js-16.1-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

A modern chat UI for local LLMs via [LM Studio](https://lmstudio.ai/), with agentic capabilities, tool execution, and streaming responses.

[Features](#features) • [Getting Started](#getting-started) • [Configuration](#configuration) • [Architecture](#architecture) • [Development](#development)

</div>

## Overview

Tamarin is a feature-rich chat interface designed to work with local language models through LM Studio. Built with Next.js and featuring a distinctive dark/amber color scheme, it goes beyond simple chat to offer AI agent capabilities with tool execution, multi-server support, and real-time streaming.

> [!TIP]
> Tamarin works entirely offline with your local LM Studio instance — no cloud API keys required.

## Features

- **Streaming Responses** — Real-time token streaming for instant feedback
- **AI Agents** — Pre-built agent presets (Researcher, Coder, Analyst, General Assistant) with customizable behaviors
- **Tool Execution** — Built-in tools including web search, calculator, and datetime utilities
- **Multi-Server Support** — Connect to multiple LM Studio instances simultaneously
- **Persistent Conversations** — Conversations saved locally with full history
- **Markdown & Code Highlighting** — Full markdown support with syntax highlighting and one-click code copying
- **Generation Settings** — Fine-tune temperature, max tokens, top-p, and system prompts
- **Dark Theme** — Optimized dark UI with amber accents for comfortable extended use

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20 or later
- [LM Studio](https://lmstudio.ai/) running with a model loaded

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/JungleM0nkey/apehost-tamarin-ui.git
   cd apehost-tamarin-ui
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### LM Studio Setup

1. Open LM Studio and load a model
2. Navigate to the **Local Server** tab
3. Click **Start Server** (default port: 1234)
4. Tamarin will automatically detect available models

## Configuration

### Environment Variables

Copy `.env.local.example` to `.env.local` and customize as needed:

```bash
# LM Studio Servers Configuration
# Format: "name1|url1,name2|url2"
LMSTUDIO_SERVERS="Local|http://localhost:1234/v1"

# Rate Limiting (requests per minute per IP)
RATE_LIMIT_RPM=60
```

### Generation Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Temperature | 0.7 | Controls randomness (0-2) |
| Max Tokens | 2048 | Maximum response length |
| Top-P | 0.95 | Nucleus sampling threshold |
| System Prompt | Customizable | Model instructions |

### Agent Presets

Tamarin includes several pre-configured AI agents:

| Agent | Description | Tools |
|-------|-------------|-------|
| **Research Assistant** | Specialized in research and analysis | Web Search, DateTime |
| **Coding Assistant** | Software development and debugging | Calculator, DateTime |
| **Data Analyst** | Data analysis and calculations | Calculator, DateTime |
| **General Assistant** | Versatile helper for various tasks | All tools |

## Architecture

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── agents/        # Agent management & execution
│   │   ├── chat/          # Chat completion endpoint
│   │   ├── servers/       # Server management
│   │   └── tools/         # Tool registry endpoint
│   └── page.tsx           # Main chat interface
├── components/
│   ├── chat/              # Chat UI (messages, input, tools)
│   ├── sidebar/           # Navigation & settings
│   └── ui/                # Reusable UI components (shadcn)
├── hooks/                 # React hooks
├── lib/
│   ├── agents/            # Agent presets
│   ├── schemas/           # Zod validation schemas
│   ├── services/          # Core services
│   │   ├── agent-orchestrator.ts  # Agent execution loop
│   │   ├── lmstudio-service.ts    # LM Studio client
│   │   ├── server-manager.ts      # Multi-server management
│   │   └── tool-registry.ts       # Tool registration
│   └── tools/             # Built-in tools
└── store/                 # Zustand state management
```

### Key Components

- **Agent Orchestrator** — Manages agent execution loops with planning and tool execution
- **LM Studio Service** — Server-side API client with retry logic and streaming support
- **Tool Registry** — Pluggable system for registering and executing tools
- **Server Manager** — Handles multiple LM Studio server configurations

## Development

### Available Scripts

```bash
npm run dev      # Start development server with Turbopack
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Tech Stack

| Technology | Purpose |
|------------|---------|
| [Next.js 16](https://nextjs.org/) | React framework with App Router |
| [React 19](https://react.dev/) | UI library |
| [TypeScript 5](https://www.typescriptlang.org/) | Type safety |
| [Tailwind CSS 4](https://tailwindcss.com/) | Styling |
| [Zustand](https://zustand.docs.pmnd.rs/) | State management |
| [Zod](https://zod.dev/) | Schema validation |
| [shadcn/ui](https://ui.shadcn.com/) | UI components |

### Adding Custom Tools

Register new tools in `src/lib/tools/`:

```typescript
import { defineTool } from "@/lib/services/tool-registry";

defineTool(
  "my_tool",
  "Description of what the tool does",
  {
    input: { type: "string", description: "Input parameter", required: true },
  },
  async (args) => {
    // Tool implementation
    return { result: "Tool output" };
  }
);
```

## Resources

- [LM Studio Documentation](https://lmstudio.ai/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference) (LM Studio uses compatible API format)

---

<div align="center">
Built with the ApeHost dark/amber theme
</div>
