"use client";

import { useState, useRef, useEffect } from "react";
import ScrollToBottom from "react-scroll-to-bottom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChatMessage, Guideline } from "@/lib/types";

interface ChatPanelProps {
  guideline: Guideline | null;
  mode: "strict" | "explain";
  onModeChange: (mode: "strict" | "explain") => void;
}

export default function ChatPanel({ guideline, mode }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [sessionId, setSessionId] = useState(Date.now());
  const abortControllerRef = useRef<AbortController | null>(null);
  const initializedRef = useRef(false);

  // Reset initialized ref when guideline changes
  useEffect(() => {
    initializedRef.current = false;
  }, [guideline]);

  // Send initial greeting request when component mounts
  useEffect(() => {
    if (guideline && !initializedRef.current) {
      initializedRef.current = true;
      sendInitialGreeting();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guideline, sessionId]);

  const sendInitialGreeting = async () => {
    if (!guideline) return;

    setIsLoading(true);
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: "START_CONVERSATION",
            },
          ],
          guideline,
          decision: null,
          mode,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Initial greeting failed:", errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      let accumulatedMessage = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              continue;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                accumulatedMessage += parsed.content;
                setStreamingMessage(accumulatedMessage);
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: accumulatedMessage,
      };

      setMessages([assistantMessage]);
      setStreamingMessage("");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      console.error("Initial greeting error:", error);
      // Fallback greeting on error
      const fallbackGreeting: ChatMessage = {
        role: "assistant",
        content: `Hello! I'm your clinical decision support assistant for **${guideline.name}**. How can I help you today?`,
      };
      setMessages([fallbackGreeting]);
      setStreamingMessage("");
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleNewConversation = () => {
    setMessages([]);
    setInput("");
    setStreamingMessage("");
    setSessionId(Date.now());
    initializedRef.current = false;
  };

  const handleSend = async () => {
    if (!input.trim() || !guideline) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setStreamingMessage("");

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          guideline,
          decision: null,
          mode,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      let accumulatedMessage = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              continue;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                accumulatedMessage += parsed.content;
                setStreamingMessage(accumulatedMessage);
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      // Add final message to messages array
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: accumulatedMessage,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setStreamingMessage("");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        // Request was aborted, don't show error
        return;
      }
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: `Error: ${
          error instanceof Error ? error.message : "Unknown error"
        }. Please try again.`,
      };
      setMessages((prev) => [...prev, errorMessage]);
      setStreamingMessage("");
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <ScrollToBottom
        className="flex-1 px-8 py-8 overflow-y-auto"
        followButtonClassName="hidden"
      >
        {!guideline ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto px-8">
            <svg
              className="w-24 h-24 mb-6 text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-2xl font-bold text-gray-900 mb-3">
              Welcome to Clinical Decision Support
            </p>
            <p className="text-base text-gray-600 mb-8 max-w-lg">
              Upload a clinical guideline PDF to start a new conversation. The
              AI will help you navigate through the guideline step-by-step.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 max-w-lg w-full">
              <p className="text-sm font-semibold text-blue-900 mb-3 text-center">
                How it works:
              </p>
              <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside text-left">
                <li>
                  Upload your clinical guideline PDF using the button above
                </li>
                <li>The AI will analyze the guideline and greet you</li>
                <li>Describe your patient&apos;s situation</li>
                <li>
                  The AI will guide you through the flowchart by asking
                  questions
                </li>
              </ol>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 max-w-2xl mx-auto">
            <div className="flex items-center gap-2 text-gray-600 mb-4">
              <div className="flex gap-1.5">
                <div
                  className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                ></div>
                <div
                  className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                ></div>
                <div
                  className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                ></div>
              </div>
            </div>
            <p className="text-sm font-medium text-gray-700 mb-1">
              Initializing Clinical Assistant
            </p>
            <p className="text-xs text-gray-600">Loading {guideline.name}...</p>
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto">
            {messages.map((message, idx) => (
              <div
                key={idx}
                className={`flex animate-fadeIn ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-3xl rounded-xl px-4 py-3 shadow-sm ${
                    message.role === "user"
                      ? "bg-linear-to-br from-blue-600 to-blue-700 text-white"
                      : "bg-white text-gray-900 border border-gray-200"
                  }`}
                >
                  {message.role === "user" ? (
                    <div className="text-xs leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </div>
                  ) : (
                    <div className="markdown text-xs">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {streamingMessage && (
              <div className="flex justify-start animate-fadeIn">
                <div className="max-w-3xl rounded-xl px-4 py-3 bg-white text-gray-900 border border-gray-200 shadow-sm">
                  <div className="markdown text-xs streaming-cursor">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {streamingMessage}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}
            {isLoading && !streamingMessage && (
              <div className="flex justify-start animate-fadeIn">
                <div className="bg-white rounded-xl px-4 py-3 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <div className="flex gap-1.5">
                      <div
                        className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      ></div>
                    </div>
                    <span className="text-xs font-medium">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollToBottom>

      <div className="border-t border-gray-200 px-8 py-4 bg-white shadow-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2 mb-3">
            <button
              onClick={handleNewConversation}
              disabled={isLoading}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              New Conversation
            </button>
          </div>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={!guideline || isLoading}
                placeholder={
                  guideline
                    ? "Describe your patient's situation or ask a question..."
                    : "Select a guideline to start"
                }
                className="w-full px-5 py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500 transition-all text-sm text-gray-900 placeholder-gray-500 shadow-sm"
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || !guideline || isLoading}
              className="px-6 py-4 bg-linear-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all text-sm font-medium shadow-md hover:shadow-lg flex items-center gap-2 whitespace-nowrap"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-6 w-6"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>Sending</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                  <span>Send</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
