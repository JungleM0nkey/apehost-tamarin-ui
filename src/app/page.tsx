"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar/sidebar";
import { MessageList } from "@/components/chat/message-list";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatErrorBoundary } from "@/components/chat/error-boundary";

export default function Home() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-[#0d0d0d] text-[#ffddaa]">
      {/* Sidebar */}
      <Sidebar
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0">
        <ChatErrorBoundary>
          {/* Messages */}
          <MessageList />

          {/* Input */}
          <ChatInput />
        </ChatErrorBoundary>
      </main>
    </div>
  );
}
