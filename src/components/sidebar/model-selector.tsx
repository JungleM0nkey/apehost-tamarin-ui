"use client";

import { useEffect, useState, useCallback } from "react";
import { useChatStore } from "@/store/chat-store";
import { fetchServers, fetchServerModels } from "@/hooks/useStreamingChat";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Server,
  ChevronDown,
  Check,
  Loader2,
  RefreshCw,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function ModelSelector() {
  const [isLoading, setIsLoading] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [apiServers, setApiServers] = useState<Array<{
    id: string;
    name: string;
    url: string;
    isConnected: boolean;
  }>>([]);

  const {
    servers,
    activeServerUrl,
    availableModels,
    selectedModel,
    setActiveServer,
    setAvailableModels,
    setSelectedModel,
    setServerConnected,
  } = useChatStore();

  // Find active server - prefer API servers, fall back to store
  const allServers = apiServers.length > 0 ? apiServers : servers;
  const activeServer = allServers.find((s) => s.url === activeServerUrl) || allServers[0];
  const activeServerId = apiServers.find((s) => s.url === activeServerUrl)?.id;

  // Fetch servers from API
  const loadServers = useCallback(async () => {
    try {
      const serverList = await fetchServers();
      setApiServers(serverList);

      // If no active server set, use the first one
      if (serverList.length > 0 && !activeServerUrl) {
        setActiveServer(serverList[0].url);
      }
    } catch (error) {
      console.error("Failed to fetch servers:", error);
      // Fall back to store servers
    }
  }, [activeServerUrl, setActiveServer]);

  // Fetch models for the active server via API
  const fetchModels = useCallback(async () => {
    if (!activeServerId) {
      // Fall back to direct fetch if no API server ID
      return;
    }

    setIsLoading(true);
    try {
      const models = await fetchServerModels(activeServerId);
      const modelIds = models.map((m: { id: string }) => m.id);
      setAvailableModels(modelIds);
      setServerConnected(activeServerUrl, true);

      // Update API servers state
      setApiServers((prev) =>
        prev.map((s) =>
          s.id === activeServerId ? { ...s, isConnected: true } : s
        )
      );

      // Auto-select first model if none selected
      if (modelIds.length > 0 && !selectedModel) {
        setSelectedModel(modelIds[0]);
      }
    } catch (error) {
      console.error("Failed to fetch models:", error);
      setAvailableModels([]);
      setServerConnected(activeServerUrl, false);

      // Update API servers state
      setApiServers((prev) =>
        prev.map((s) =>
          s.id === activeServerId ? { ...s, isConnected: false } : s
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [activeServerId, activeServerUrl, selectedModel, setAvailableModels, setSelectedModel, setServerConnected]);

  // Mark as mounted after hydration
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Load servers on mount
  useEffect(() => {
    if (hasMounted) {
      loadServers();
    }
  }, [hasMounted, loadServers]);

  // Fetch models when server changes (only after hydration)
  useEffect(() => {
    if (hasMounted && activeServerId) {
      fetchModels();
    }
  }, [activeServerId, hasMounted, fetchModels]);

  return (
    <div className="space-y-3">
      {/* Server Selector */}
      <div>
        <label 
          id="server-label"
          className="text-xs font-medium text-[#99774f] uppercase tracking-wider"
        >
          Server
        </label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between mt-1 bg-[#1a1a1a] border-[#664422] hover:bg-[#262626] hover:border-[#ffaa00] text-[#ffddaa]"
              aria-labelledby="server-label"
              aria-haspopup="listbox"
            >
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-[#cc9944]" />
                <span className="truncate">{activeServer?.name || "Select Server"}</span>
              </div>
              <div className="flex items-center gap-1">
                <Circle
                  className={cn(
                    "w-2 h-2 fill-current",
                    activeServer?.isConnected ? "text-green-500" : "text-red-500"
                  )}
                />
                <ChevronDown className="w-4 h-4 text-[#99774f]" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 bg-[#1a1a1a] border-[#664422]">
            <DropdownMenuLabel className="text-[#ffaa00]">Available Servers</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[#332211]" />
            {allServers.map((server) => (
              <DropdownMenuItem
                key={server.url}
                onClick={() => setActiveServer(server.url)}
                className="text-[#ffddaa] focus:bg-[#262626] focus:text-[#ffaa00]"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Circle
                      className={cn(
                        "w-2 h-2 fill-current",
                        server.isConnected ? "text-green-500" : "text-[#99774f]"
                      )}
                    />
                    <span>{server.name}</span>
                  </div>
                  {server.url === activeServerUrl && (
                    <Check className="w-4 h-4 text-[#ffaa00]" />
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Model Selector */}
      <div>
        <div className="flex items-center justify-between">
          <label 
            id="model-label"
            className="text-xs font-medium text-[#99774f] uppercase tracking-wider"
          >
            Model
          </label>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-[#99774f] hover:text-[#ffaa00]"
            onClick={fetchModels}
            disabled={isLoading}
            aria-label="Refresh models"
          >
            <RefreshCw
              className={cn("w-3 h-3", isLoading && "animate-spin")}
            />
          </Button>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between mt-1 bg-[#1a1a1a] border-[#664422] hover:bg-[#262626] hover:border-[#ffaa00] text-[#ffddaa]"
              disabled={isLoading || availableModels.length === 0}
              aria-labelledby="model-label"
              aria-haspopup="listbox"
            >
              <span className="truncate">
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#ffaa00]" />
                    Loading...
                  </span>
                ) : selectedModel ? (
                  selectedModel
                ) : availableModels.length === 0 ? (
                  "No models available"
                ) : (
                  "Select Model"
                )}
              </span>
              <ChevronDown className="w-4 h-4 text-[#99774f]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72 max-h-64 overflow-y-auto bg-[#1a1a1a] border-[#664422]">
            <DropdownMenuLabel className="text-[#ffaa00]">Loaded Models</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[#332211]" />
            {availableModels.map((model) => (
              <DropdownMenuItem
                key={model}
                onClick={() => setSelectedModel(model)}
                className="text-[#ffddaa] focus:bg-[#262626] focus:text-[#ffaa00]"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="truncate">{model}</span>
                  {model === selectedModel && <Check className="w-4 h-4 ml-2 text-[#ffaa00]" />}
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
