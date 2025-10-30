"use client";

import { useState, useRef, useEffect } from "react";
import ChatPanel from "@/components/ChatPanel";
import { Guideline } from "@/lib/types";

export default function Home() {
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  const [activeGuideline, setActiveGuideline] = useState<Guideline | null>(
    null
  );
  const [mode, setMode] = useState<"strict" | "explain">("explain");
  const [showGuidelineSelector, setShowGuidelineSelector] = useState(true); // Show by default
  const [sessionKey, setSessionKey] = useState(0); // Used to reset chat when guideline changes
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [guidelinePdfMap, setGuidelinePdfMap] = useState<
    Record<string, string>
  >({});
  const pdfMapRef = useRef<Record<string, string>>({});
  const [showPdfViewer, setShowPdfViewer] = useState(true);
  const [pdfViewerWidth, setPdfViewerWidth] = useState(400); // Width in pixels
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    pdfMapRef.current = guidelinePdfMap;
  }, [guidelinePdfMap]);

  useEffect(() => {
    return () => {
      Object.values(pdfMapRef.current).forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  // Handle dragging for resizing PDF viewer
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = containerRect.right - e.clientX;

      // Constrain width between 250px and 80% of container width
      const minWidth = 250;
      const maxWidth = containerRect.width * 0.8;

      setPdfViewerWidth(Math.max(minWidth, Math.min(newWidth, maxWidth)));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging]);

  const handleGuidelineSelect = (guideline: Guideline) => {
    setActiveGuideline(guideline);
    setShowGuidelineSelector(false);
    setSessionKey((prev) => prev + 1); // Force chat to reset
  };

  const handleGuidelineDelete = (guidelineId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting the guideline when clicking delete

    if (guidelines.length === 1) {
      alert(
        "You cannot delete the last guideline. At least one guideline must be available."
      );
      return;
    }

    if (!confirm("Are you sure you want to delete this guideline?")) {
      return;
    }

    setGuidelines((prev) => prev.filter((g) => g.guideline_id !== guidelineId));

    setGuidelinePdfMap((prev) => {
      const { [guidelineId]: removedUrl, ...rest } = prev;
      if (removedUrl) {
        URL.revokeObjectURL(removedUrl);
      }
      return rest;
    });

    // If the deleted guideline was active, switch to the first remaining guideline
    if (activeGuideline?.guideline_id === guidelineId) {
      const remainingGuidelines = guidelines.filter(
        (g) => g.guideline_id !== guidelineId
      );
      if (remainingGuidelines.length > 0) {
        setActiveGuideline(remainingGuidelines[0]);
        setSessionKey((prev) => prev + 1);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPdf(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", file);

    const pdfUrl = URL.createObjectURL(file);

    try {
      const response = await fetch("/api/parse-pdf", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.error) {
        setUploadError(data.error);
        URL.revokeObjectURL(pdfUrl);
        setIsUploadingPdf(false);
        return;
      }

      const newGuideline: Guideline = data.guideline;

      // Check if guideline already exists
      const exists = guidelines.some(
        (g) => g.guideline_id === newGuideline.guideline_id
      );

      if (!exists) {
        setGuidelines((prev) => [...prev, newGuideline]);
      }

      setGuidelinePdfMap((prev) => {
        const existingUrl = prev[newGuideline.guideline_id];
        if (existingUrl) {
          URL.revokeObjectURL(existingUrl);
        }
        return {
          ...prev,
          [newGuideline.guideline_id]: pdfUrl,
        };
      });

      setActiveGuideline(newGuideline);
      setShowGuidelineSelector(false);
      setSessionKey((prev) => prev + 1); // Force chat to reset
      setIsUploadingPdf(false);
    } catch (error) {
      setUploadError(
        `Failed to upload guideline: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      URL.revokeObjectURL(pdfUrl);
      setIsUploadingPdf(false);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 md:px-8 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4 min-w-0 flex-1">
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-900">
                Clinical Decision Support
              </h1>
              <p className="text-sm text-gray-600 mt-0.5 truncate">
                {activeGuideline?.name || "Select a guideline"}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <button
              onClick={() => setShowGuidelineSelector(!showGuidelineSelector)}
              className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium rounded-lg bg-white text-gray-700 hover:bg-gray-100 border-2 border-gray-300 transition-all shadow-sm hover:shadow max-w-full sm:max-w-xs truncate"
              title={
                activeGuideline
                  ? activeGuideline.guideline_id
                  : "Select Guideline"
              }
            >
              <span className="flex items-center justify-center gap-2">
                <span>📚</span>
                <span className="truncate">
                  {activeGuideline
                    ? activeGuideline.guideline_id
                    : "Select Guideline"}
                </span>
              </span>
            </button>
            <div
              className="hidden sm:block h-6 w-px bg-gray-300"
              aria-hidden="true"
            ></div>
            <div className="grid grid-cols-2 sm:flex sm:flex-nowrap gap-2 w-full sm:w-auto">
              <button
                onClick={() => setMode("strict")}
                className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all shadow-sm hover:shadow ${
                  mode === "strict"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100 border-2 border-gray-300"
                }`}
              >
                📋 Strict
              </button>
              <button
                onClick={() => setMode("explain")}
                className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all shadow-sm hover:shadow ${
                  mode === "explain"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100 border-2 border-gray-300"
                }`}
              >
                💡 Explain
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Guideline Selector Dropdown */}
      {showGuidelineSelector && (
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 md:px-8 py-6 shadow-md">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">
                Select or Upload a Guideline
              </h3>
              <button
                onClick={() => setShowGuidelineSelector(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {guidelines.map((guideline) => (
                <div
                  key={guideline.guideline_id}
                  className={`relative group rounded-lg border-2 transition-all ${
                    activeGuideline?.guideline_id === guideline.guideline_id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <button
                    onClick={() => handleGuidelineSelect(guideline)}
                    className="w-full text-left p-3"
                  >
                    <p className="text-xs font-semibold text-gray-900 pr-8">
                      {guideline.name}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {guideline.guideline_id} • {guideline.version}
                    </p>
                  </button>
                  {guidelines.length > 1 && (
                    <button
                      onClick={(e) =>
                        handleGuidelineDelete(guideline.guideline_id, e)
                      }
                      className="absolute top-2 right-2 p-1 rounded-md bg-red-100 text-red-600 opacity-0 group-hover:opacity-100 hover:bg-red-200 transition-opacity"
                      title="Delete guideline"
                    >
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
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPdf}
                className={`text-left p-4 rounded-lg border-2 border-dashed transition-all relative overflow-hidden ${
                  isUploadingPdf
                    ? "border-blue-400 bg-blue-100 cursor-not-allowed"
                    : activeGuideline
                    ? "border-gray-300 hover:border-blue-400 hover:bg-blue-50"
                    : "border-blue-400 bg-blue-50 hover:border-blue-500 hover:bg-blue-100 animate-pulse"
                }`}
              >
                {isUploadingPdf ? (
                  <>
                    <div className="absolute inset-0 bg-blue-200 opacity-50 animate-pulse"></div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-2">
                        <svg
                          className="animate-spin h-5 w-5 text-blue-600"
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
                        <p className="text-xs font-semibold text-blue-900">
                          Processing PDF...
                        </p>
                      </div>
                      <p className="text-xs text-blue-700">
                        Analyzing guideline structure and flowchart...
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-5 h-5 text-blue-600"
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
                      <p className="text-xs font-semibold text-gray-900">
                        {activeGuideline
                          ? "Upload New Guideline"
                          : "Upload Guideline PDF"}
                      </p>
                    </div>
                    <p className="text-xs text-gray-600 mt-1.5">
                      {activeGuideline
                        ? "Start a new session with a different guideline"
                        : "Click to select a PDF file from your computer"}
                    </p>
                  </>
                )}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            {uploadError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-800">
                  <span className="font-semibold">Upload failed:</span>{" "}
                  {uploadError}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Chat Interface */}
      <div className="flex-1 overflow-hidden">
        <div
          ref={containerRef}
          className="h-full flex flex-col lg:flex-row relative"
        >
          <div className="flex-1 overflow-hidden border-b lg:border-b-0 border-gray-200">
            <ChatPanel
              key={sessionKey}
              guideline={activeGuideline}
              mode={mode}
              onModeChange={setMode}
            />
          </div>

          {/* PDF Viewer Toggle Button - Always visible */}
          <button
            onClick={() => setShowPdfViewer(!showPdfViewer)}
            className="absolute top-4 right-4 z-20 p-2 bg-white border border-gray-300 rounded-lg shadow-md hover:bg-gray-100 transition-colors"
            title={showPdfViewer ? "Hide PDF viewer" : "Show PDF viewer"}
          >
            <svg
              className={`w-4 h-4 text-gray-700 transition-transform duration-300 ${
                showPdfViewer ? "" : "rotate-180"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>

          {/* Draggable Divider - only show when PDF viewer is visible */}
          {showPdfViewer && (
            <div
              onMouseDown={() => setIsDragging(true)}
              className="hidden lg:block w-1 bg-gray-300 hover:bg-blue-500 cursor-ew-resize transition-colors relative group"
              title="Drag to resize"
            >
              <div className="absolute inset-y-0 -left-1 -right-1" />
            </div>
          )}

          {/* PDF Viewer Panel */}
          {showPdfViewer && (
            <div
              className="relative bg-white border-t lg:border-t-0 lg:border-l border-gray-200 h-80 lg:h-full shrink-0"
              style={{ width: `${pdfViewerWidth}px` }}
            >
              {/* PDF Content */}
              {activeGuideline &&
              guidelinePdfMap[activeGuideline.guideline_id] ? (
                <iframe
                  src={guidelinePdfMap[activeGuideline.guideline_id]}
                  className="w-full h-full border-0"
                  title={`${activeGuideline.name} flowchart`}
                  style={{ pointerEvents: isDragging ? "none" : "auto" }}
                />
              ) : (
                <div className="h-full flex items-center justify-center px-6 text-center text-sm text-gray-500">
                  {activeGuideline
                    ? "Upload a PDF flowchart to preview it here."
                    : "Select a guideline to view its flowchart."}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
