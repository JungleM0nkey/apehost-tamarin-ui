"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional fallback UI to display when an error occurs */
  fallback?: ReactNode;
  /** Callback when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component for catching and displaying React component errors.
 * Prevents the entire app from crashing when a child component throws an error.
 * 
 * @example
 * ```tsx
 * <ChatErrorBoundary onError={(e) => logError(e)}>
 *   <ChatArea />
 * </ChatErrorBoundary>
 * ```
 */
export class ChatErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console for debugging
    console.error("Chat Error Boundary caught an error:", error, errorInfo);
    
    // Call optional error callback
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Render custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div 
          className="flex flex-col items-center justify-center min-h-[200px] p-6 bg-[#1a1a1a] border border-[#664422] rounded-lg m-4"
          role="alert"
          aria-live="assertive"
        >
          <AlertTriangle 
            className="w-12 h-12 text-[#cc7744] mb-4" 
            aria-hidden="true" 
          />
          <h2 className="text-lg font-semibold text-[#ffaa00] mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-[#99774f] text-center mb-4 max-w-md">
            An error occurred while rendering the chat. Please try refreshing or starting a new conversation.
          </p>
          {this.state.error && (
            <details className="mb-4 w-full max-w-md">
              <summary className="text-xs text-[#664422] cursor-pointer hover:text-[#99774f]">
                Error details
              </summary>
              <pre className="mt-2 p-2 bg-[#0d0d0d] text-xs text-[#cc7744] rounded overflow-x-auto">
                {this.state.error.message}
              </pre>
            </details>
          )}
          <Button
            onClick={this.handleReset}
            variant="outline"
            className="border-[#664422] text-[#ffaa00] hover:bg-[#262626] hover:border-[#ffaa00]"
          >
            <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
