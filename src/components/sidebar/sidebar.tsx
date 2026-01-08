"use client";

import { useState } from "react";
import Image from "next/image";
import { ConversationList } from "./conversation-list";
import { ModelSelector } from "./model-selector";
import { SettingsPanel } from "./settings-panel";
import { AgentSelector } from "./agent-selector";
import { MCPToolsPanel, useMCPTools } from "@/components/chat/mcp-tools-panel";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "chats" | "tools" | "settings";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<Tab>("chats");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const { tools, executions, isLoading, fetchTools, toggleTool } = useMCPTools();

  if (isCollapsed) {
    return (
      <div className="w-12 bg-[#0d0d0d] border-r border-[#332211] flex flex-col items-center py-3 gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="text-[#99774f] hover:text-[#ffaa00]"
          aria-label="Expand sidebar"
        >
          <PanelLeft className="w-5 h-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-72 bg-[#0d0d0d] border-r border-[#332211] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[#332211]">
        <Image
          src="/logo.png"
          alt="ApeHost"
          width={140}
          height={40}
          className="object-contain"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="text-[#99774f] hover:text-[#ffaa00]"
          aria-label="Collapse sidebar"
        >
          <PanelLeftClose className="w-5 h-5" />
        </Button>
      </div>

      {/* Tabs */}
      <nav className="flex border-b border-[#332211]" role="tablist" aria-label="Sidebar navigation">
        <button
          role="tab"
          aria-selected={activeTab === "chats"}
          aria-controls="tab-panel-chats"
          onClick={() => setActiveTab("chats")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors",
            activeTab === "chats"
              ? "text-[#ffaa00] border-b-2 border-[#ffaa00]"
              : "text-[#99774f] hover:text-[#cc9944]"
          )}
        >
          <MessageSquare className="w-4 h-4" aria-hidden="true" />
          Chats
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "tools"}
          aria-controls="tab-panel-tools"
          onClick={() => setActiveTab("tools")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors",
            activeTab === "tools"
              ? "text-[#ffaa00] border-b-2 border-[#ffaa00]"
              : "text-[#99774f] hover:text-[#cc9944]"
          )}
        >
          <Wrench className="w-4 h-4" aria-hidden="true" />
          Tools
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "settings"}
          aria-controls="tab-panel-settings"
          onClick={() => setActiveTab("settings")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors",
            activeTab === "settings"
              ? "text-[#ffaa00] border-b-2 border-[#ffaa00]"
              : "text-[#99774f] hover:text-[#cc9944]"
          )}
        >
          <Settings className="w-4 h-4" aria-hidden="true" />
          Settings
        </button>
      </nav>

      {/* Model & Agent Selectors (always visible for chats tab) */}
      {activeTab === "chats" && (
        <div className="p-3 space-y-2 border-b border-[#332211]">
          <ModelSelector />
          <AgentSelector
            selectedAgentId={selectedAgentId}
            onAgentSelect={setSelectedAgentId}
          />
        </div>
      )}

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "chats" && (
          <div id="tab-panel-chats" role="tabpanel" aria-labelledby="tab-chats">
            <ConversationList />
          </div>
        )}
        {activeTab === "tools" && (
          <div id="tab-panel-tools" role="tabpanel" aria-labelledby="tab-tools" className="p-3 overflow-y-auto h-full">
            <MCPToolsPanel
              tools={tools}
              executions={executions}
              onToolToggle={toggleTool}
              onRefresh={fetchTools}
              isLoading={isLoading}
            />
          </div>
        )}
        {activeTab === "settings" && (
          <div id="tab-panel-settings" role="tabpanel" aria-labelledby="tab-settings" className="p-3 overflow-y-auto h-full">
            <SettingsPanel />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-[#332211]">
        <p className="text-xs text-[#664422] text-center">
          ApeHost • LM Studio Client
        </p>
      </div>
    </div>
  );
}
