"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./message-bubble";
import { useChatStore } from "@/store/chat-store";
import { MessageSquare } from "lucide-react";

export function MessageList() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const conversation = useChatStore((state) => state.getActiveConversation());
  const isGenerating = useChatStore((state) => state.isGenerating);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation?.messages]);

  if (!conversation || conversation.messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#1a1a1a] border border-[#664422] flex items-center justify-center mx-auto ape-glow">
            <MessageSquare className="w-8 h-8 text-[#ffaa00]" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-[#ffaa00]">
              Start a conversation
            </h3>
            <p className="text-sm text-[#99774f] mt-1">
              Send a message to begin chatting with your local LLM
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea ref={scrollRef} className="flex-1">
      <div className="max-w-4xl mx-auto">
        {conversation.messages.map((message, index) => (
          <MessageBubble
            key={index}
            message={message}
            isStreaming={
              isGenerating &&
              index === conversation.messages.length - 1 &&
              message.role === "assistant"
            }
          />
        ))}
      </div>
    </ScrollArea>
  );
}
