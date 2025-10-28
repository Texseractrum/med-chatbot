"use client";

import { useState, useRef, useEffect } from "react";
import { ChatMessage, Guideline } from "@/lib/types";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ui/shadcn-io/ai/conversation";
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "@/components/ui/shadcn-io/ai/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
  PromptInputSubmit,
  PromptInputButton,
} from "@/components/ui/shadcn-io/ai/prompt-input";
import { Response } from "@/components/ui/shadcn-io/ai/response";
import { Loader } from "@/components/ui/shadcn-io/ai/loader";
import { PlusIcon } from "lucide-react";

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
  const [sessionId, setSessionId] = useState(() => Date.now());
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
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          const errorText = await response.text();
          if (errorText) {
            errorMessage = errorText;
          }
        }
        console.error("Initial greeting failed:", errorMessage);
        throw new Error(errorMessage);
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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
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
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          const errorText = await response.text();
          if (errorText) {
            errorMessage = errorText;
          }
        }
        console.error("Chat request failed:", errorMessage);
        throw new Error(errorMessage);
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

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <Conversation className="flex-1">
        <ConversationContent
          className={`py-6 px-4 sm:px-6 md:px-8 h-full ${
            !guideline || messages.length === 0
              ? "flex items-center justify-center"
              : ""
          }`}
        >
          {!guideline ? (
            <div className="flex flex-col items-center justify-center text-center max-w-2xl w-full">
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
            <div className="flex flex-col items-center justify-center text-center text-gray-500 max-w-2xl w-full">
              <Loader />
              <p className="text-sm font-medium text-gray-700 mb-1 mt-4">
                Initializing Clinical Assistant
              </p>
              <p className="text-xs text-gray-600">
                Loading {guideline.name}...
              </p>
            </div>
          ) : (
            <div className="max-w-5xl w-full">
              <div className="space-y-4">
                {messages.map((message, idx) => (
                  <Message key={idx} from={message.role}>
                    <MessageAvatar
                      src={message.role === "user" ? "" : ""}
                      name={message.role === "user" ? "You" : "AI"}
                    />
                    <MessageContent>
                      <Response>{message.content}</Response>
                    </MessageContent>
                  </Message>
                ))}
                {streamingMessage && (
                  <Message from="assistant">
                    <MessageAvatar src="" name="AI" />
                    <MessageContent>
                      <Response>{streamingMessage}</Response>
                    </MessageContent>
                  </Message>
                )}
                {isLoading && !streamingMessage && (
                  <Message from="assistant">
                    <MessageAvatar src="" name="AI" />
                    <MessageContent>
                      <Loader />
                    </MessageContent>
                  </Message>
                )}
              </div>
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-gray-200 px-4 sm:px-6 md:px-8 pt-6 pb-8 bg-white shadow-lg">
        <div className="w-full mx-auto">
          {guideline ? (
            <>
              <div className="flex justify-end mb-4">
                <PromptInputButton
                  onClick={handleNewConversation}
                  disabled={isLoading}
                >
                  <PlusIcon className="w-4 h-4" />
                  New Conversation
                </PromptInputButton>
              </div>
              <PromptInput onSubmit={handleSend}>
                <PromptInputTextarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={!guideline || isLoading}
                  placeholder="Describe your patient's situation or ask a question..."
                />
                <PromptInputToolbar>
                  <PromptInputTools>
                    {/* Add any additional tools here */}
                  </PromptInputTools>
                  <PromptInputSubmit
                    disabled={!input.trim() || !guideline || isLoading}
                    status={isLoading ? "streaming" : undefined}
                  />
                </PromptInputToolbar>
              </PromptInput>
            </>
          ) : (
            <div className="flex items-center justify-center py-4 w-full">
              <div
                className="bg-gray-100 rounded-lg overflow-visible"
                style={{ padding: "3rem 6rem" }}
              >
                <p
                  className="text-base text-gray-600 whitespace-nowrap tracking-wide leading-relaxed antialiased"
                  style={{ letterSpacing: "0.05em" }}
                >
                  Select a guideline to start
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
