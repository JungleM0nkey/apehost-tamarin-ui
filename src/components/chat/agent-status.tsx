"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bot,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Wrench,
  Brain,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentRun, AgentStep, AgentRunStatus } from "@/lib/schemas/agents";

// ============================================================================
// Types
// ============================================================================

interface AgentStatusProps {
  /** Agent run data */
  run?: AgentRun | null;
  /** Whether the agent is currently running */
  isRunning?: boolean;
  /** Callback to cancel the run */
  onCancel?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Status Configuration
// ============================================================================

const statusConfig: Record<
  AgentRunStatus,
  {
    label: string;
    icon: React.ElementType;
    color: string;
    animate?: boolean;
  }
> = {
  pending: {
    label: "Pending",
    icon: Clock,
    color: "text-[#99774f]",
  },
  planning: {
    label: "Planning",
    icon: Brain,
    color: "text-[#ffaa00]",
    animate: true,
  },
  executing: {
    label: "Executing",
    icon: Loader2,
    color: "text-[#ffaa00]",
    animate: true,
  },
  waiting_confirmation: {
    label: "Waiting for Confirmation",
    icon: AlertCircle,
    color: "text-yellow-500",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle,
    color: "text-green-500",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    color: "text-red-500",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    color: "text-[#99774f]",
  },
};

const stepTypeConfig: Record<
  AgentStep["type"],
  {
    icon: React.ElementType;
    color: string;
  }
> = {
  thinking: { icon: Brain, color: "text-[#ffaa00]" },
  tool_call: { icon: Wrench, color: "text-blue-400" },
  tool_result: { icon: CheckCircle, color: "text-green-400" },
  response: { icon: MessageSquare, color: "text-[#ffddaa]" },
  error: { icon: XCircle, color: "text-red-400" },
};

// ============================================================================
// Component
// ============================================================================

export function AgentStatus({
  run,
  isRunning = false,
  onCancel,
  className,
}: AgentStatusProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Auto-expand when running
  useEffect(() => {
    if (isRunning) {
      setIsExpanded(true);
    }
  }, [isRunning]);

  if (!run && !isRunning) {
    return null;
  }

  const status = run?.status || "executing";
  const config = statusConfig[status];
  const StatusIcon = config.icon;

  const durationMs = run
    ? (run.endedAt || Date.now()) - run.startedAt
    : undefined;

  return (
    <div
      className={cn(
        "rounded-lg border bg-[#1a1a1a] border-[#332211]",
        className
      )}
      role="region"
      aria-label="Agent execution status"
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center justify-between p-3",
          "text-left hover:bg-[#262626] rounded-t-lg transition-colors",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ffaa00]"
        )}
        aria-expanded={isExpanded}
        aria-controls="agent-status-content"
      >
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-[#ffaa00]" />
          <span className="font-medium text-[#ffddaa]">Agent Status</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusIcon
            className={cn(
              "h-4 w-4",
              config.color,
              config.animate && "animate-spin"
            )}
          />
          <span className={cn("text-sm", config.color)}>{config.label}</span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-[#99774f]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[#99774f]" />
          )}
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div
          id="agent-status-content"
          className="border-t border-[#332211] p-3 space-y-3"
        >
          {/* Stats */}
          {run && (
            <div className="flex flex-wrap gap-4 text-sm text-[#99774f]">
              <div className="flex items-center gap-1">
                <span>Turn:</span>
                <span className="text-[#ffddaa]">
                  {run.currentTurn}/{10}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span>Tools:</span>
                <span className="text-[#ffddaa]">{run.totalToolCalls}</span>
              </div>
              {durationMs && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span className="text-[#ffddaa]">
                    {(durationMs / 1000).toFixed(1)}s
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Steps */}
          {run && run.steps.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-[#665544] uppercase tracking-wider">
                Execution Steps
              </div>
              <div
                className="max-h-48 overflow-y-auto space-y-1 pr-2"
                role="log"
                aria-label="Agent execution steps"
              >
                {run.steps.map((step, index) => {
                  const stepConfig = stepTypeConfig[step.type];
                  const StepIcon = stepConfig.icon;
                  return (
                    <div
                      key={index}
                      className="flex items-start gap-2 text-sm py-1"
                    >
                      <StepIcon
                        className={cn("h-4 w-4 mt-0.5 flex-shrink-0", stepConfig.color)}
                        aria-hidden="true"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-[#99774f]">
                          {step.toolName && (
                            <span className="text-[#ffaa00]">
                              {step.toolName}:{" "}
                            </span>
                          )}
                          <span className="text-[#ffddaa]">
                            {step.content.length > 100
                              ? step.content.slice(0, 100) + "..."
                              : step.content}
                          </span>
                        </span>
                        {step.durationMs && (
                          <span className="text-[#665544] text-xs ml-2">
                            ({step.durationMs}ms)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Error */}
          {run?.error && (
            <div
              className="p-2 rounded bg-red-900/20 border border-red-800/30"
              role="alert"
            >
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <XCircle className="h-4 w-4" />
                <span className="font-medium">Error</span>
              </div>
              <p className="mt-1 text-sm text-red-300">{run.error}</p>
            </div>
          )}

          {/* Cancel Button */}
          {isRunning && onCancel && (
            <button
              onClick={onCancel}
              className={cn(
                "w-full py-2 px-3 rounded text-sm",
                "bg-[#262626] border border-[#332211]",
                "text-[#cc9944] hover:text-[#ffaa00]",
                "hover:bg-[#332211] hover:border-[#664422]",
                "transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ffaa00]"
              )}
            >
              Cancel Execution
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Hook for Agent Streaming
// ============================================================================

interface UseAgentStreamResult {
  run: AgentRun | null;
  isRunning: boolean;
  error: string | null;
  startRun: (agentId: string, input: string, serverId: string, model?: string) => void;
  cancelRun: () => void;
}

export function useAgentStream(): UseAgentStreamResult {
  const [run, setRun] = useState<AgentRun | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const startRun = useCallback(
    async (agentId: string, input: string, serverId: string, model?: string) => {
      setIsRunning(true);
      setError(null);
      setRun(null);

      const controller = new AbortController();
      setAbortController(controller);

      try {
        const response = await fetch(`/api/agents/${agentId}/run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input,
            serverId,
            model,
            stream: true,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || "Failed to start agent run");
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const event = JSON.parse(data);
              
              if (event.type === "done" && event.data?.run) {
                setRun(event.data.run);
              } else if (event.type === "error" && event.data?.error) {
                setError(event.data.error);
              } else if (event.type === "step" && event.data?.step) {
                setRun((prev) =>
                  prev
                    ? { ...prev, steps: [...prev.steps, event.data.step] }
                    : null
                );
              } else if (event.type === "status" && event.data?.status) {
                setRun((prev) =>
                  prev ? { ...prev, status: event.data.status } : null
                );
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          setError("Run cancelled");
        } else {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        setIsRunning(false);
        setAbortController(null);
      }
    },
    []
  );

  const cancelRun = useCallback(() => {
    if (abortController) {
      abortController.abort();
    }
  }, [abortController]);

  return {
    run,
    isRunning,
    error,
    startRun,
    cancelRun,
  };
}