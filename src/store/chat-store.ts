import { create } from "zustand";
import { persist } from "zustand/middleware";

// Extended message type to support tool calls
export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolResult {
  toolCallId: string;
  name: string;
  result?: unknown;
  error?: string;
  executionTimeMs?: number;
}

export interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  toolResults?: ToolResult[]; // For UI display
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  model?: string;
  serverId?: string;
}

export interface GenerationSettings {
  temperature: number;
  maxTokens: number;
  topP: number;
  systemPrompt: string;
  enableTools: boolean;
}

export interface ServerConfig {
  url: string;
  name: string;
  isConnected: boolean;
}

interface ChatState {
  // Conversations
  conversations: Conversation[];
  activeConversationId: string | null;

  // Server & Model
  servers: ServerConfig[];
  activeServerUrl: string;
  availableModels: string[];
  selectedModel: string | null;

  // Generation
  settings: GenerationSettings;
  isGenerating: boolean;
  abortController: AbortController | null;

  // Actions
  createConversation: () => string;
  deleteConversation: (id: string) => void;
  setActiveConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;

  addMessage: (conversationId: string, message: Message) => void;
  updateLastAssistantMessage: (conversationId: string, content: string) => void;
  addToolResults: (conversationId: string, messageIndex: number, results: ToolResult[]) => void;

  setActiveServer: (url: string) => void;
  addServer: (url: string, name: string) => void;
  removeServer: (url: string) => void;
  setServerConnected: (url: string, connected: boolean) => void;

  setAvailableModels: (models: string[]) => void;
  setSelectedModel: (model: string) => void;

  setSettings: (settings: Partial<GenerationSettings>) => void;
  setIsGenerating: (generating: boolean) => void;
  setAbortController: (controller: AbortController | null) => void;

  // Computed
  getActiveConversation: () => Conversation | undefined;
}

const DEFAULT_SETTINGS: GenerationSettings = {
  temperature: 0.7,
  maxTokens: 2048,
  topP: 0.95,
  systemPrompt:
    "You are a helpful AI assistant. Be concise and accurate in your responses.",
  enableTools: true,
};

const DEFAULT_SERVERS: ServerConfig[] = [
  { url: "http://localhost:1234/v1", name: "Local (Main)", isConnected: false },
  { url: "http://melmbox:1234/v1", name: "Melmbox", isConnected: false },
];

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      // Initial state
      conversations: [],
      activeConversationId: null,
      servers: DEFAULT_SERVERS,
      activeServerUrl: DEFAULT_SERVERS[0].url,
      availableModels: [],
      selectedModel: null,
      settings: DEFAULT_SETTINGS,
      isGenerating: false,
      abortController: null,

      // Conversation actions
      createConversation: () => {
        const id = crypto.randomUUID();
        const now = Date.now();
        const conversation: Conversation = {
          id,
          title: "New Chat",
          messages: [],
          createdAt: now,
          updatedAt: now,
          model: get().selectedModel || undefined,
        };

        set((state) => ({
          conversations: [conversation, ...state.conversations],
          activeConversationId: id,
        }));

        return id;
      },

      deleteConversation: (id) => {
        set((state) => {
          const filtered = state.conversations.filter((c) => c.id !== id);
          const newActiveId =
            state.activeConversationId === id
              ? filtered[0]?.id || null
              : state.activeConversationId;
          return {
            conversations: filtered,
            activeConversationId: newActiveId,
          };
        });
      },

      setActiveConversation: (id) => {
        set({ activeConversationId: id });
      },

      renameConversation: (id, title) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, title, updatedAt: Date.now() } : c
          ),
        }));
      },

      addMessage: (conversationId, message) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: [...c.messages, message],
                  updatedAt: Date.now(),
                  // Auto-title from first user message
                  title:
                    c.messages.length === 0 && message.role === "user"
                      ? message.content.slice(0, 50) +
                        (message.content.length > 50 ? "..." : "")
                      : c.title,
                }
              : c
          ),
        }));
      },

      updateLastAssistantMessage: (conversationId, content) => {
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id !== conversationId) return c;
            const messages = [...c.messages];
            const lastIndex = messages.length - 1;
            if (lastIndex >= 0 && messages[lastIndex].role === "assistant") {
              messages[lastIndex] = { ...messages[lastIndex], content };
            }
            return { ...c, messages, updatedAt: Date.now() };
          }),
        }));
      },

      addToolResults: (conversationId, messageIndex, results) => {
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id !== conversationId) return c;
            const messages = [...c.messages];
            if (messageIndex >= 0 && messageIndex < messages.length) {
              messages[messageIndex] = {
                ...messages[messageIndex],
                toolResults: results,
              };
            }
            return { ...c, messages, updatedAt: Date.now() };
          }),
        }));
      },

      // Server actions
      setActiveServer: (url) => {
        set({ activeServerUrl: url, availableModels: [], selectedModel: null });
      },

      addServer: (url, name) => {
        set((state) => ({
          servers: [...state.servers, { url, name, isConnected: false }],
        }));
      },

      removeServer: (url) => {
        set((state) => ({
          servers: state.servers.filter((s) => s.url !== url),
        }));
      },

      setServerConnected: (url, connected) => {
        set((state) => ({
          servers: state.servers.map((s) =>
            s.url === url ? { ...s, isConnected: connected } : s
          ),
        }));
      },

      // Model actions
      setAvailableModels: (models) => {
        set({ availableModels: models });
      },

      setSelectedModel: (model) => {
        set({ selectedModel: model });
      },

      // Settings actions
      setSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      setIsGenerating: (generating) => {
        set({ isGenerating: generating });
      },

      setAbortController: (controller) => {
        set({ abortController: controller });
      },

      // Computed
      getActiveConversation: () => {
        const state = get();
        return state.conversations.find(
          (c) => c.id === state.activeConversationId
        );
      },
    }),
    {
      name: "tamarin-chat-storage",
      partialize: (state) => ({
        conversations: state.conversations,
        activeConversationId: state.activeConversationId,
        // Don't persist servers - always start fresh to check connection status
        activeServerUrl: state.activeServerUrl,
        selectedModel: state.selectedModel,
        settings: state.settings,
      }),
    }
  )
);

// Helper to get active server URL - use API routes instead of direct client
export function getActiveServerUrl(): string {
  const { activeServerUrl } = useChatStore.getState();
  return activeServerUrl;
}
