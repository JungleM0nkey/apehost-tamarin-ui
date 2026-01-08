"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Wrench, CheckCircle, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ToolResultData {
  toolCallId: string;
  name: string;
  arguments?: Record<string, unknown>;
  result?: unknown;
  error?: string;
  executionTimeMs?: number;
  status?: "pending" | "running" | "success" | "error";
}

interface ToolResultProps {
  data: ToolResultData;
  className?: string;
}

/**
 * Component to display tool execution results in chat
 */
export function ToolResult({ data, className }: ToolResultProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const status = data.status || (data.error ? "error" : data.result !== undefined ? "success" : "pending");
  
  const statusIcon = {
    pending: <Clock className="w-4 h-4 text-[#99774f] animate-pulse" aria-hidden="true" />,
    running: <Clock className="w-4 h-4 text-[#ffaa00] animate-spin" aria-hidden="true" />,
    success: <CheckCircle className="w-4 h-4 text-green-500" aria-hidden="true" />,
    error: <XCircle className="w-4 h-4 text-red-500" aria-hidden="true" />,
  };

  const statusLabel = {
    pending: "Pending",
    running: "Running",
    success: "Completed",
    error: "Failed",
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-[#332211] bg-[#1a1a1a]/50 overflow-hidden",
        className
      )}
    >
      {/* Header - always visible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 p-3 text-left hover:bg-[#262626]/50 transition-colors"
        aria-expanded={isExpanded}
        aria-controls={`tool-result-${data.toolCallId}`}
      >
        <span className="text-[#99774f]" aria-hidden="true">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </span>
        
        <Wrench className="w-4 h-4 text-[#cc9944]" aria-hidden="true" />
        
        <span className="flex-1 font-medium text-[#ffddaa]">
          {formatToolName(data.name)}
        </span>
        
        <span className="flex items-center gap-1.5 text-sm">
          {statusIcon[status]}
          <span className="sr-only">{statusLabel[status]}</span>
        </span>
        
        {data.executionTimeMs !== undefined && (
          <span className="text-xs text-[#99774f]">
            {data.executionTimeMs}ms
          </span>
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div
          id={`tool-result-${data.toolCallId}`}
          className="border-t border-[#332211] p-3 space-y-3"
        >
          {/* Arguments */}
          {data.arguments && Object.keys(data.arguments).length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-[#99774f] uppercase tracking-wider mb-1">
                Arguments
              </h4>
              <pre className="text-xs text-[#ffddaa] bg-[#0d0d0d] rounded p-2 overflow-x-auto">
                {JSON.stringify(data.arguments, null, 2)}
              </pre>
            </div>
          )}

          {/* Result or Error */}
          {data.error ? (
            <div>
              <h4 className="text-xs font-medium text-red-400 uppercase tracking-wider mb-1">
                Error
              </h4>
              <p className="text-sm text-red-300 bg-red-900/20 rounded p-2">
                {data.error}
              </p>
            </div>
          ) : data.result !== undefined ? (
            <div>
              <h4 className="text-xs font-medium text-green-400 uppercase tracking-wider mb-1">
                Result
              </h4>
              <pre className="text-xs text-[#ffddaa] bg-[#0d0d0d] rounded p-2 overflow-x-auto max-h-48">
                {formatResult(data.result)}
              </pre>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

/**
 * Format tool name for display
 */
function formatToolName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Format result for display
 */
function formatResult(result: unknown): string {
  if (typeof result === "string") {
    return result;
  }
  try {
    return JSON.stringify(result, null, 2);
  } catch {
    return String(result);
  }
}

/**
 * List of tool results
 */
interface ToolResultListProps {
  results: ToolResultData[];
  className?: string;
}

export function ToolResultList({ results, className }: ToolResultListProps) {
  if (results.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)} role="list" aria-label="Tool execution results">
      {results.map((result) => (
        <div key={result.toolCallId} role="listitem">
          <ToolResult data={result} />
        </div>
      ))}
    </div>
  );
}