/**
 * Agent Orchestrator Service
 * Manages agent execution loops with planning and tool execution
 */

import { nanoid } from "nanoid";
import type {
  AgentDefinition,
  AgentRun,
  AgentStep,
  AgentRunStatus,
  AgentStreamEvent,
  RunAgentRequest,
} from "@/lib/schemas/agents";
import type { Message } from "@/lib/schemas/api";
import type { ToolCall, ToolResult, ParsedToolCall } from "@/lib/schemas/tools";
import { lmstudioService } from "./lmstudio-service";
import { serverManager } from "./server-manager";
import { toolRegistry } from "./tool-registry";
import { executeToolCalls, hasToolCalls } from "./tool-executor";

// ============================================================================
// Types
// ============================================================================

export interface AgentOrchestratorConfig {
  /** Default timeout for agent runs */
  defaultTimeoutMs: number;
  /** Maximum concurrent agent runs */
  maxConcurrentRuns: number;
}

export interface AgentRunContext {
  run: AgentRun;
  agent: AgentDefinition;
  serverId: string;
  model: string;
  abortController: AbortController;
  onEvent?: (event: AgentStreamEvent) => void;
}

// ============================================================================
// Agent Orchestrator
// ============================================================================

class AgentOrchestrator {
  private config: AgentOrchestratorConfig;
  private activeRuns: Map<string, AgentRunContext> = new Map();
  private agents: Map<string, AgentDefinition> = new Map();

  constructor(config?: Partial<AgentOrchestratorConfig>) {
    this.config = {
      defaultTimeoutMs: 120000,
      maxConcurrentRuns: 5,
      ...config,
    };
  }

  // ==========================================================================
  // Agent Management
  // ==========================================================================

  /**
   * Register an agent definition
   */
  registerAgent(agent: AgentDefinition): void {
    this.agents.set(agent.id, agent);
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(agentId: string): boolean {
    return this.agents.delete(agentId);
  }

  /**
   * Get an agent by ID
   */
  getAgent(agentId: string): AgentDefinition | undefined {
    return this.agents.get(agentId);
  }

  /**
   * List all registered agents
   */
  listAgents(): AgentDefinition[] {
    return Array.from(this.agents.values());
  }

  /**
   * List preset agents (system-defined)
   */
  listPresets(): AgentDefinition[] {
    return Array.from(this.agents.values()).filter((a) => a.isPreset);
  }

  /**
   * List custom agents (user-defined)
   */
  listCustomAgents(): AgentDefinition[] {
    return Array.from(this.agents.values()).filter((a) => !a.isPreset);
  }

  // ==========================================================================
  // Agent Execution
  // ==========================================================================

  /**
   * Start a new agent run
   */
  async *runAgent(
    agentId: string,
    request: RunAgentRequest
  ): AsyncGenerator<AgentStreamEvent> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      yield this.createErrorEvent(`Agent not found: ${agentId}`);
      return;
    }

    if (this.activeRuns.size >= this.config.maxConcurrentRuns) {
      yield this.createErrorEvent("Maximum concurrent agent runs reached");
      return;
    }

    // Validate server
    const server = serverManager.getServer(request.serverId);
    if (!server) {
      yield this.createErrorEvent(`Server not found: ${request.serverId}`);
      return;
    }

    // Initialize run
    const runId = nanoid();
    const model = request.model || agent.modelConfig.preferredModel || "";
    
    if (!model) {
      yield this.createErrorEvent("No model specified for agent run");
      return;
    }

    const run: AgentRun = {
      id: runId,
      agentId,
      status: "pending",
      input: request.input,
      steps: [],
      messages: [],
      currentTurn: 0,
      totalToolCalls: 0,
      startedAt: Date.now(),
    };

    const abortController = new AbortController();
    const context: AgentRunContext = {
      run,
      agent,
      serverId: request.serverId,
      model,
      abortController,
    };

    this.activeRuns.set(runId, context);

    try {
      // Set up timeout
      const timeoutMs = agent.behavior.runTimeoutMs || this.config.defaultTimeoutMs;
      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, timeoutMs);

      // Initialize messages with system prompt and context
      const messages: Message[] = [
        { role: "system", content: agent.systemPrompt },
        ...(request.contextMessages || []),
        { role: "user", content: request.input },
      ];
      run.messages = messages;

      // Yield initial status
      yield this.createStatusEvent("executing", run);

      // Run the agent loop
      yield* this.executeAgentLoop(context);

      clearTimeout(timeoutId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      run.status = "failed";
      run.error = errorMessage;
      run.endedAt = Date.now();
      yield this.createErrorEvent(errorMessage);
    } finally {
      this.activeRuns.delete(runId);
    }

    // Final done event
    yield this.createDoneEvent(run);
  }

  /**
   * Execute the agent loop
   */
  private async *executeAgentLoop(
    context: AgentRunContext
  ): AsyncGenerator<AgentStreamEvent> {
    const { run, agent, serverId, model, abortController } = context;

    while (run.currentTurn < agent.behavior.maxTurns) {
      if (abortController.signal.aborted) {
        run.status = "cancelled";
        yield this.createStatusEvent("cancelled", run);
        return;
      }

      run.currentTurn++;

      // Get available tools for this agent
      const tools = agent.tools.length > 0
        ? toolRegistry.getDefinitions().filter((t) =>
            agent.tools.includes(t.function.name)
          )
        : toolRegistry.getEnabledDefinitions();

      // Call the model
      yield this.createStepEvent(run, {
        index: run.steps.length,
        type: "thinking",
        content: `Turn ${run.currentTurn}: Processing...`,
        timestamp: Date.now(),
      });

      let assistantMessage: Message | null = null;
      let accumulatedContent = "";

      try {
        // Stream the model response
        const response = await lmstudioService.chatCompletion(serverId, {
          model,
          messages: run.messages,
          temperature: agent.modelConfig.temperature,
          max_tokens: agent.modelConfig.maxTokens,
          top_p: agent.modelConfig.topP,
          tools: tools.length > 0 ? tools : undefined,
          stream: true,
        });

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
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;

              if (delta?.content) {
                accumulatedContent += delta.content;
                yield this.createContentEvent(delta.content);
              }

              // Check for tool calls
              if (delta?.tool_calls) {
                // Tool calls are accumulated in the final message
                assistantMessage = {
                  role: "assistant",
                  content: accumulatedContent,
                  tool_calls: delta.tool_calls,
                } as Message;
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }

        // Finalize assistant message
        if (!assistantMessage) {
          assistantMessage = {
            role: "assistant",
            content: accumulatedContent,
          };
        }

        run.messages.push(assistantMessage);

        // Handle tool calls if present
        if (hasToolCalls(assistantMessage as unknown as Record<string, unknown>)) {
          const toolCalls = (assistantMessage as unknown as { tool_calls: ToolCall[] }).tool_calls;
          run.totalToolCalls += toolCalls.length;

          // Check limits
          if (toolCalls.length > agent.behavior.maxToolCallsPerTurn) {
            const limitedCalls = toolCalls.slice(0, agent.behavior.maxToolCallsPerTurn);
            yield this.createStepEvent(run, {
              index: run.steps.length,
              type: "thinking",
              content: `Limiting tool calls from ${toolCalls.length} to ${agent.behavior.maxToolCallsPerTurn}`,
              timestamp: Date.now(),
            });
            (assistantMessage as unknown as { tool_calls: ToolCall[] }).tool_calls = limitedCalls;
          }

          // Check for confirmation if required
          if (agent.behavior.requireConfirmation) {
            run.status = "waiting_confirmation";
            yield this.createStatusEvent("waiting_confirmation", run);
            // In a real implementation, we would wait for user confirmation here
            // For now, we auto-continue
          }

          // Execute tools
          yield* this.executeTools(context, toolCalls);

          // Continue the loop if autoContinue is enabled
          if (!agent.behavior.autoContinue) {
            break;
          }
        } else {
          // No tool calls - agent has finished
          run.status = "completed";
          run.output = accumulatedContent;
          run.endedAt = Date.now();
          yield this.createStepEvent(run, {
            index: run.steps.length,
            type: "response",
            content: accumulatedContent,
            timestamp: Date.now(),
          });
          return;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        yield this.createStepEvent(run, {
          index: run.steps.length,
          type: "error",
          content: errorMessage,
          error: errorMessage,
          timestamp: Date.now(),
        });

        if (agent.behavior.stopOnError) {
          run.status = "failed";
          run.error = errorMessage;
          run.endedAt = Date.now();
          return;
        }
      }
    }

    // Max turns reached
    if (run.status !== "completed" && run.status !== "failed") {
      run.status = "completed";
      run.output = run.messages[run.messages.length - 1]?.content || "";
      run.endedAt = Date.now();
    }
  }

  /**
   * Execute tool calls and add results to messages
   */
  private async *executeTools(
    context: AgentRunContext,
    toolCalls: ToolCall[]
  ): AsyncGenerator<AgentStreamEvent> {
    const { run, agent } = context;

    for (const toolCall of toolCalls) {
      const startTime = Date.now();

      yield this.createStepEvent(run, {
        index: run.steps.length,
        type: "tool_call",
        content: `Calling tool: ${toolCall.function.name}`,
        toolName: toolCall.function.name,
        toolArgs: JSON.parse(toolCall.function.arguments || "{}"),
        timestamp: startTime,
      });

      yield this.createToolCallEvent(toolCall);

      try {
        // Parse and execute the tool call
        const parsedCall: ParsedToolCall = {
          id: toolCall.id,
          name: toolCall.function.name,
          arguments: JSON.parse(toolCall.function.arguments || "{}"),
        };

        const results = await executeToolCalls([parsedCall]);
        const result = results[0];
        const endTime = Date.now();

        // Add tool result message
        const toolMessage: Message = {
          role: "tool",
          content: result.error || JSON.stringify(result.result),
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
        };
        run.messages.push(toolMessage);

        yield this.createStepEvent(run, {
          index: run.steps.length,
          type: "tool_result",
          content: result.error || JSON.stringify(result.result),
          toolName: toolCall.function.name,
          toolResult: result.result,
          error: result.error,
          timestamp: endTime,
          durationMs: endTime - startTime,
        });

        yield this.createToolResultEvent(result);

        if (result.error && agent.behavior.stopOnError) {
          run.status = "failed";
          run.error = result.error;
          return;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Tool execution failed";
        
        // Add error as tool result
        const toolMessage: Message = {
          role: "tool",
          content: `Error: ${errorMessage}`,
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
        };
        run.messages.push(toolMessage);

        yield this.createStepEvent(run, {
          index: run.steps.length,
          type: "error",
          content: errorMessage,
          toolName: toolCall.function.name,
          error: errorMessage,
          timestamp: Date.now(),
        });

        if (agent.behavior.stopOnError) {
          run.status = "failed";
          run.error = errorMessage;
          return;
        }
      }
    }
  }

  // ==========================================================================
  // Run Management
  // ==========================================================================

  /**
   * Cancel an active run
   */
  cancelRun(runId: string): boolean {
    const context = this.activeRuns.get(runId);
    if (!context) return false;

    context.abortController.abort();
    context.run.status = "cancelled";
    context.run.endedAt = Date.now();
    return true;
  }

  /**
   * Get active run status
   */
  getRunStatus(runId: string): AgentRun | undefined {
    return this.activeRuns.get(runId)?.run;
  }

  /**
   * List active runs
   */
  listActiveRuns(): AgentRun[] {
    return Array.from(this.activeRuns.values()).map((c) => c.run);
  }

  // ==========================================================================
  // Event Helpers
  // ==========================================================================

  private createStatusEvent(
    status: AgentRunStatus,
    run: AgentRun
  ): AgentStreamEvent {
    run.status = status;
    return {
      type: "status",
      data: { status },
      timestamp: Date.now(),
    };
  }

  private createStepEvent(run: AgentRun, step: AgentStep): AgentStreamEvent {
    run.steps.push(step);
    return {
      type: "step",
      data: { step },
      timestamp: Date.now(),
    };
  }

  private createContentEvent(content: string): AgentStreamEvent {
    return {
      type: "content",
      data: { content },
      timestamp: Date.now(),
    };
  }

  private createToolCallEvent(toolCall: ToolCall): AgentStreamEvent {
    return {
      type: "tool_call",
      data: {
        step: {
          index: 0,
          type: "tool_call",
          content: `Calling ${toolCall.function.name}`,
          toolName: toolCall.function.name,
          toolArgs: JSON.parse(toolCall.function.arguments || "{}"),
          timestamp: Date.now(),
        },
      },
      timestamp: Date.now(),
    };
  }

  private createToolResultEvent(result: ToolResult): AgentStreamEvent {
    return {
      type: "tool_result",
      data: {
        step: {
          index: 0,
          type: "tool_result",
          content: result.error || JSON.stringify(result.result),
          toolName: result.name,
          toolResult: result.result,
          error: result.error,
          timestamp: Date.now(),
          durationMs: result.executionTimeMs,
        },
      },
      timestamp: Date.now(),
    };
  }

  private createErrorEvent(error: string): AgentStreamEvent {
    return {
      type: "error",
      data: { error },
      timestamp: Date.now(),
    };
  }

  private createDoneEvent(run: AgentRun): AgentStreamEvent {
    return {
      type: "done",
      data: { run },
      timestamp: Date.now(),
    };
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const agentOrchestrator = new AgentOrchestrator();