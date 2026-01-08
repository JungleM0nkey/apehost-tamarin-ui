"use client";

import { useState, useEffect } from "react";
import {
  Bot,
  Search,
  Code,
  BarChart3,
  ChevronDown,
  Check,
  Plus,
  Settings,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

// ============================================================================
// Types
// ============================================================================

interface Agent {
  id: string;
  name: string;
  description?: string;
  category: string;
  icon: string;
  isPreset: boolean;
}

interface AgentSelectorProps {
  /** Currently selected agent ID */
  selectedAgentId?: string | null;
  /** Callback when agent is selected */
  onAgentSelect?: (agentId: string | null) => void;
  /** Whether to show the "No Agent" option */
  allowNoAgent?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Icon Mapping
// ============================================================================

const iconMap: Record<string, React.ElementType> = {
  bot: Bot,
  search: Search,
  code: Code,
  chart: BarChart3,
};

function getIcon(iconName: string): React.ElementType {
  return iconMap[iconName] || Bot;
}

// ============================================================================
// Component
// ============================================================================

export function AgentSelector({
  selectedAgentId,
  onAgentSelect,
  allowNoAgent = true,
  className,
}: AgentSelectorProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [presets, setPresets] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch agents on mount
  useEffect(() => {
    fetchAgents();
  }, []);

  async function fetchAgents() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/agents");
      if (!response.ok) {
        throw new Error("Failed to fetch agents");
      }

      const data = await response.json();
      setAgents(data.agents || []);
      setPresets(data.presets || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agents");
    } finally {
      setIsLoading(false);
    }
  }

  // Find the selected agent
  const selectedAgent =
    selectedAgentId
      ? [...presets, ...agents].find((a) => a.id === selectedAgentId)
      : null;

  const SelectedIcon = selectedAgent ? getIcon(selectedAgent.icon) : Bot;

  return (
    <div className={cn("w-full", className)}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-between gap-2 h-auto py-2 px-3",
              "bg-[#1a1a1a] border-[#332211] hover:bg-[#262626] hover:border-[#664422]",
              "text-[#ffddaa]"
            )}
            aria-label="Select agent"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
          >
            <div className="flex items-center gap-2 min-w-0">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-[#ffaa00]" />
              ) : (
                <SelectedIcon className="h-4 w-4 flex-shrink-0 text-[#ffaa00]" />
              )}
              <span className="truncate text-sm">
                {isLoading
                  ? "Loading..."
                  : selectedAgent
                  ? selectedAgent.name
                  : "No Agent"}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 flex-shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          className="w-[280px] bg-[#1a1a1a] border-[#332211]"
          align="start"
          role="listbox"
          aria-label="Available agents"
        >
          {error && (
            <div className="px-2 py-3 text-sm text-red-400">{error}</div>
          )}

          {!error && (
            <>
              {/* No Agent Option */}
              {allowNoAgent && (
                <>
                  <DropdownMenuItem
                    className={cn(
                      "flex items-center gap-2 cursor-pointer",
                      "text-[#99774f] hover:text-[#ffddaa]",
                      "focus:bg-[#262626] focus:text-[#ffddaa]",
                      !selectedAgentId && "bg-[#262626]"
                    )}
                    onSelect={() => {
                      onAgentSelect?.(null);
                      setIsOpen(false);
                    }}
                    role="option"
                    aria-selected={!selectedAgentId}
                  >
                    <Bot className="h-4 w-4" />
                    <div className="flex-1 min-w-0">
                      <span className="block truncate font-medium">
                        No Agent
                      </span>
                      <span className="block truncate text-xs text-[#665544]">
                        Direct model interaction
                      </span>
                    </div>
                    {!selectedAgentId && (
                      <Check className="h-4 w-4 text-[#ffaa00]" />
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-[#332211]" />
                </>
              )}

              {/* Preset Agents */}
              {presets.length > 0 && (
                <>
                  <DropdownMenuLabel className="text-xs text-[#665544] uppercase tracking-wider">
                    System Agents
                  </DropdownMenuLabel>
                  {presets.map((agent) => {
                    const Icon = getIcon(agent.icon);
                    const isSelected = selectedAgentId === agent.id;
                    return (
                      <DropdownMenuItem
                        key={agent.id}
                        className={cn(
                          "flex items-center gap-2 cursor-pointer",
                          "text-[#99774f] hover:text-[#ffddaa]",
                          "focus:bg-[#262626] focus:text-[#ffddaa]",
                          isSelected && "bg-[#262626]"
                        )}
                        onSelect={() => {
                          onAgentSelect?.(agent.id);
                          setIsOpen(false);
                        }}
                        role="option"
                        aria-selected={isSelected}
                      >
                        <Icon className="h-4 w-4 text-[#ffaa00]" />
                        <div className="flex-1 min-w-0">
                          <span className="block truncate font-medium">
                            {agent.name}
                          </span>
                          {agent.description && (
                            <span className="block truncate text-xs text-[#665544]">
                              {agent.description}
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <Check className="h-4 w-4 text-[#ffaa00]" />
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                </>
              )}

              {/* Custom Agents */}
              {agents.length > 0 && (
                <>
                  <DropdownMenuSeparator className="bg-[#332211]" />
                  <DropdownMenuLabel className="text-xs text-[#665544] uppercase tracking-wider">
                    Custom Agents
                  </DropdownMenuLabel>
                  {agents.map((agent) => {
                    const Icon = getIcon(agent.icon);
                    const isSelected = selectedAgentId === agent.id;
                    return (
                      <DropdownMenuItem
                        key={agent.id}
                        className={cn(
                          "flex items-center gap-2 cursor-pointer",
                          "text-[#99774f] hover:text-[#ffddaa]",
                          "focus:bg-[#262626] focus:text-[#ffddaa]",
                          isSelected && "bg-[#262626]"
                        )}
                        onSelect={() => {
                          onAgentSelect?.(agent.id);
                          setIsOpen(false);
                        }}
                        role="option"
                        aria-selected={isSelected}
                      >
                        <Icon className="h-4 w-4 text-[#cc9944]" />
                        <div className="flex-1 min-w-0">
                          <span className="block truncate font-medium">
                            {agent.name}
                          </span>
                          {agent.description && (
                            <span className="block truncate text-xs text-[#665544]">
                              {agent.description}
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <Check className="h-4 w-4 text-[#ffaa00]" />
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                </>
              )}

              {/* Actions */}
              <DropdownMenuSeparator className="bg-[#332211]" />
              <DropdownMenuItem
                className={cn(
                  "flex items-center gap-2 cursor-pointer",
                  "text-[#99774f] hover:text-[#ffddaa]",
                  "focus:bg-[#262626] focus:text-[#ffddaa]"
                )}
                onSelect={(e) => {
                  e.preventDefault();
                  // Agent creation handled via presets - select a preset to create a new agent
                }}
                disabled
                aria-disabled="true"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>Create Agent</span>
                <span className="ml-auto text-xs text-[#665533]">(Coming soon)</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className={cn(
                  "flex items-center gap-2 cursor-pointer",
                  "text-[#99774f] hover:text-[#ffddaa]",
                  "focus:bg-[#262626] focus:text-[#ffddaa]"
                )}
                onSelect={(e) => {
                  e.preventDefault();
                  // Agent management handled via API - future modal implementation
                }}
                disabled
                aria-disabled="true"
              >
                <Settings className="h-4 w-4" aria-hidden="true" />
                <span>Manage Agents</span>
                <span className="ml-auto text-xs text-[#665533]">(Coming soon)</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}