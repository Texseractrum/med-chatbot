"use client";

import { useState } from "react";
import { Guideline } from "@/lib/types";

interface GuidelineSelectorProps {
  guidelines: Guideline[];
  activeGuideline: Guideline | null;
  onSelect: (guideline: Guideline) => void;
  onUpload: (guideline: Guideline) => void;
}

export default function GuidelineSelector({
  guidelines,
  activeGuideline,
  onSelect,
  onUpload,
}: GuidelineSelectorProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState("");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split(".").pop()?.toLowerCase();

    // Handle JSON files
    if (fileExtension === "json") {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const guideline = JSON.parse(event.target?.result as string);
          // Basic validation
          if (
            !guideline.guideline_id ||
            !guideline.name ||
            !guideline.inputs ||
            !guideline.nodes
          ) {
            alert("Invalid guideline format. Please check the JSON structure.");
            return;
          }
          onUpload(guideline);
        } catch (error) {
          alert(
            "Error parsing guideline file. Please ensure it is valid JSON."
          );
        }
      };
      reader.readAsText(file);
    }
    // Handle PDF files
    else if (fileExtension === "pdf") {
      setIsProcessing(true);
      setProcessingMessage("Extracting text from PDF...");

      try {
        const formData = new FormData();
        formData.append("file", file);

        setProcessingMessage("Converting guideline to structured format...");
        const response = await fetch("/api/parse-pdf", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        setProcessingMessage("Guideline processed successfully!");
        onUpload(data.guideline);

        // Reset input
        e.target.value = "";
      } catch (error) {
        alert(
          `Error processing PDF: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      } finally {
        setIsProcessing(false);
        setProcessingMessage("");
      }
    } else {
      alert("Please upload a JSON or PDF file.");
      e.target.value = "";
    }
  };

  return (
    <div className="border-b border-gray-200 bg-white px-6 py-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">
            Clinical Guidelines
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Select an existing guideline or upload a new one (JSON or PDF)
          </p>
        </div>
        <label
          className={`cursor-pointer px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
            isProcessing
              ? "bg-gray-400 text-white cursor-wait"
              : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md"
          }`}
        >
          {isProcessing ? (
            <>
              <svg
                className="animate-spin h-4 w-4"
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
              Processing...
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
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
              Upload Guideline
            </>
          )}
          <input
            type="file"
            accept=".json,.pdf"
            onChange={handleFileUpload}
            className="hidden"
            disabled={isProcessing}
          />
        </label>
      </div>

      {processingMessage && (
        <div className="mb-3 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">{processingMessage}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {guidelines.map((guideline) => (
          <button
            key={guideline.guideline_id}
            onClick={() => onSelect(guideline)}
            disabled={isProcessing}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-normal text-left max-w-xs ${
              activeGuideline?.guideline_id === guideline.guideline_id
                ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-400 ring-offset-1"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow disabled:opacity-50"
            }`}
          >
            <span className="line-clamp-2">{guideline.name}</span>
          </button>
        ))}
      </div>
      {activeGuideline && (
        <div className="mt-3 text-xs text-gray-600 flex items-center gap-2">
          <span className="font-medium">{activeGuideline.version}</span>
          <span className="text-gray-400">•</span>
          <a
            href={activeGuideline.citation_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline flex items-center gap-1"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {activeGuideline.citation}
          </a>
        </div>
      )}
    </div>
  );
}
