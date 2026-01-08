"use client";

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";
import { Send, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useChatStore } from "@/store/chat-store";
import { useStreamingChat, fetchServers } from "@/hooks/useStreamingChat";
import { cn } from "@/lib/utils";

export function ChatInput() {
  const [input, setInput] = useState("");
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    activeConversationId,
    activeServerUrl,
    selectedModel,
    settings,
    isGenerating,
    createConversation,
    addMessage,
    updateLastAssistantMessage,
    setIsGenerating,
    getActiveConversation,
  } = useChatStore();

  const { startStreaming, stopStreaming } = useStreamingChat();

  // Fetch server ID for the active URL
  useEffect(() => {
    async function loadServerId() {
      try {
        const servers = await fetchServers();
        const server = servers.find((s: { url: string }) => s.url === activeServerUrl);
        if (server) {
          setActiveServerId(server.id);
        }
      } catch (error) {
        console.error("Failed to fetch servers:", error);
      }
    }
    loadServerId();
  }, [activeServerUrl]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [input]);

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || isGenerating || !selectedModel || !activeServerId) return;

    const userMessage = input.trim();
    setInput("");

    // Create conversation if needed
    let conversationId = activeConversationId;
    if (!conversationId) {
      conversationId = createConversation();
    }

    // Add user message
    addMessage(conversationId, { role: "user", content: userMessage });

    // Add empty assistant message for streaming
    addMessage(conversationId, { role: "assistant", content: "" });

    // Start generation
    setIsGenerating(true);

    try {
      const conversation = getActiveConversation();

      const messages = [
        { role: "system" as const, content: settings.systemPrompt },
        ...(conversation?.messages.slice(0, -1) || []),
        { role: "user" as const, content: userMessage },
      ];

      await startStreaming({
        serverId: activeServerId,
        model: selectedModel,
        messages,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        topP: settings.topP,
        onChunk: (_chunk, fullContent) => {
          updateLastAssistantMessage(conversationId!, fullContent);
        },
        onComplete: (fullContent) => {
          updateLastAssistantMessage(conversationId!, fullContent);
        },
        onError: (error) => {
          console.error("Generation error:", error);
          updateLastAssistantMessage(
            conversationId!,
            `Error: ${error.message}. Make sure LM Studio is running and a model is loaded.`
          );
        },
      });
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("Generation error:", error);
        updateLastAssistantMessage(
          conversationId,
          `Error: ${error.message}. Make sure LM Studio is running and a model is loaded.`
        );
      }
    } finally {
      setIsGenerating(false);
    }
  }, [
    input,
    isGenerating,
    selectedModel,
    activeServerId,
    activeConversationId,
    createConversation,
    addMessage,
    setIsGenerating,
    getActiveConversation,
    settings,
    startStreaming,
    updateLastAssistantMessage,
  ]);

  const handleStop = useCallback(() => {
    stopStreaming();
    setIsGenerating(false);
  }, [stopStreaming, setIsGenerating]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canSubmit = input.trim() && selectedModel && !isGenerating && activeServerId;

  return (
    <div className="border-t border-[#332211] bg-[#0d0d0d] p-4">
      <div className="max-w-4xl mx-auto">
        <div className="relative flex items-end gap-2">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                selectedModel
                  ? "Send a message..."
                  : "Select a model to start chatting"
              }
              disabled={!selectedModel || isGenerating}
              className={cn(
                "min-h-[52px] max-h-[200px] resize-none pr-12",
                "bg-[#1a1a1a] border-[#664422] focus:border-[#ffaa00] text-[#ffddaa]",
                "placeholder:text-[#99774f]"
              )}
              rows={1}
              aria-label="Message input"
            />
            <div className="absolute right-2 bottom-2">
              {isGenerating ? (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleStop}
                  className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                  aria-label="Stop generating"
                >
                  <Square className="w-4 h-4 fill-current" aria-hidden="true" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className={cn(
                    "h-8 w-8",
                    canSubmit
                      ? "text-[#ffaa00] hover:text-[#ffbb22] hover:bg-[#ffaa00]/10"
                      : "text-[#664422]"
                  )}
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-[#99774f]">
          <span>
            {isGenerating ? (
              <span className="flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Generating...
              </span>
            ) : (
              "Press Enter to send, Shift+Enter for new line"
            )}
          </span>
          <span>{input.length} characters</span>
        </div>
      </div>
    </div>
  );
}
