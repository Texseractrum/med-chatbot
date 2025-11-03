"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useState, useRef } from "react";
import ChatPanel from "@/components/ChatPanel";
import GuidelineForm from "@/components/GuidelineForm";
import GuidelineSelector from "@/components/GuidelineSelector";
import AddPatientModal from "@/components/AddPatientModal";
import PatientInfoPanel, {
  type PatientRecord,
} from "@/components/PatientInfoPanel";
import { Guideline } from "@/lib/types";
import PatientInfoPanel, {
  PatientRecord,
} from "@/components/PatientInfoPanel";
import AddPatientModal from "@/components/AddPatientModal";

const MIN_PATIENT_PANEL_WIDTH = 360;
const MAX_PATIENT_PANEL_WIDTH = 640;
const INITIAL_PATIENT_PANEL_WIDTH = 500;
const MIN_PDF_VIEWER_WIDTH = 280;
const MAX_PDF_VIEWER_WIDTH = 600;
const INITIAL_PDF_VIEWER_WIDTH = 380;

type GuidelineInputValue = string | number | boolean | "";

export default function Home() {
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  const [activeGuidelineId, setActiveGuidelineId] = useState<string | null>(
    null
  );
  const [mode, setMode] = useState<"strict" | "explain">("explain");
  const [isGuidelineSelectorOpen, setIsGuidelineSelectorOpen] =
    useState(true);
  const [sessionKey, setSessionKey] = useState(0);
  const [guidelineInputs, setGuidelineInputs] = useState<
    Record<string, Record<string, GuidelineInputValue>>
  >({});
  const [showPatientPanel, setShowPatientPanel] = useState(true);
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [patientPanelWidth, setPatientPanelWidth] = useState(
    INITIAL_PATIENT_PANEL_WIDTH
  );
  const [isResizingPatientPanel, setIsResizingPatientPanel] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [pdfViewerWidth, setPdfViewerWidth] = useState(INITIAL_PDF_VIEWER_WIDTH);
  const [isResizingPdfViewer, setIsResizingPdfViewer] = useState(false);
  const [guidelinePdfMap, setGuidelinePdfMap] = useState<
    Record<string, string>
  >({});
  const layoutRef = useRef<HTMLDivElement>(null);
  const pdfLayoutRef = useRef<HTMLDivElement>(null);
  const pdfMapRef = useRef<Record<string, string>>({});

  const [showGuidelineSelector, setShowGuidelineSelector] = useState(true); // Show by default
  const [sessionKey, setSessionKey] = useState(0); // Used to reset chat when guideline changes
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPatientPanel, setShowPatientPanel] = useState(true);
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [patientRecords, setPatientRecords] = useState<PatientRecord[]>([
    {
      id: "PT-204",
      name: "Alex Morgan",
      age: 45,
      primaryConcern: "Type 2 Diabetes",
      status: "Needs Attention",
      lastUpdated: "15 May 2024",
      clinician: "Dr. Priya Desai",
      notes: "A1C trending upward; medication review scheduled for tomorrow.",
    },
    {
      id: "PT-317",
      name: "Jordan Lee",
      age: 62,
      primaryConcern: "Hypertensive Emergency",
      status: "Critical",
      lastUpdated: "15 May 2024",
      clinician: "Dr. Olivia Ramirez",
      notes:
        "Receiving IV labetalol. Repeat vitals in 10 minutes and confirm renal panel.",
    },
    {
      id: "PT-411",
      name: "Samantha Chen",
      age: 33,
      primaryConcern: "Postpartum Hemorrhage",
      status: "Active",
      lastUpdated: "14 May 2024",
      clinician: "Dr. Miguel Alvarez",
      notes:
        "Responding to uterotonics. Monitor hemoglobin and consult hematology if <7.",
    },
    {
      id: "PT-522",
      name: "Christopher Young",
      age: 70,
      primaryConcern: "Acute Heart Failure Exacerbation",
      status: "Stable",
      lastUpdated: "13 May 2024",
      clinician: "Dr. Amina El-Sayed",
      notes: "Diuresis effective. Plan transition to oral regimen tomorrow.",
    },
  ]);

  const activeGuideline = useMemo(() => {
    if (!activeGuidelineId) {
      return null;
    }
    return (
      guidelines.find(
        (guideline) => guideline.guideline_id === activeGuidelineId
      ) || null
    );
  }, [activeGuidelineId, guidelines]);

  const activeGuidelineValues = useMemo(() => {
    if (!activeGuideline) {
      return {} as Record<string, GuidelineInputValue>;
    }

    const storedValues =
      guidelineInputs[activeGuideline.guideline_id] ||
      ({} as Record<string, GuidelineInputValue>);

    const next: Record<string, GuidelineInputValue> = {};
    for (const input of activeGuideline.inputs) {
      if (storedValues[input.id] !== undefined) {
        next[input.id] = storedValues[input.id];
      } else if (input.type === "boolean") {
        next[input.id] = false;
      } else {
        next[input.id] = "";
      }
    }
    return next;
  }, [activeGuideline, guidelineInputs]);

  const handleGuidelineInputChange = (
    values: Record<string, GuidelineInputValue>
  ) => {
    if (!activeGuideline) {
      return;
    }

    setGuidelineInputs((previous) => ({
      ...previous,
      [activeGuideline.guideline_id]: values,
    }));
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");

    const updateMatch = () => {
      setIsLargeScreen(mediaQuery.matches);
    };

    updateMatch();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updateMatch);
      return () => mediaQuery.removeEventListener("change", updateMatch);
    }

    mediaQuery.addListener(updateMatch);
    return () => mediaQuery.removeListener(updateMatch);
  }, []);

  useEffect(() => {
    if (!isResizingPatientPanel) {
      return;
    }

    const originalCursor = document.body.style.cursor;
    const originalUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handlePointerMove = (event: PointerEvent) => {
      event.preventDefault();
      if (!layoutRef.current) {
        return;
      }

      const rect = layoutRef.current.getBoundingClientRect();
      const proposedWidth = rect.right - event.clientX;
      const clampedWidth = Math.min(
        Math.max(proposedWidth, MIN_PATIENT_PANEL_WIDTH),
        MAX_PATIENT_PANEL_WIDTH
      );
      setPatientPanelWidth(clampedWidth);
    };

    const handlePointerUp = () => {
      setIsResizingPatientPanel(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      document.body.style.cursor = originalCursor;
      document.body.style.userSelect = originalUserSelect;
    };
  }, [isResizingPatientPanel]);
  const formatLastUpdated = () => {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
      .format(new Date())
      .replace(/\s/g, " ")
      .replace(",", "");
  };

  const handlePatientSave = (record: Omit<PatientRecord, "lastUpdated">) => {
    const lastUpdated = formatLastUpdated();

    setPatientRecords((prev) => {
      const filtered = prev.filter((existing) => existing.id !== record.id);
      return [
        {
          ...record,
          lastUpdated,
        },
        ...filtered,
      ];
    });
  };

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

  useEffect(() => {
    if (!isResizingPdfViewer) {
      return;
    }

    const originalCursor = document.body.style.cursor;
    const originalUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handlePointerMove = (event: PointerEvent) => {
      event.preventDefault();
      if (!pdfLayoutRef.current) {
        return;
      }

      const rect = pdfLayoutRef.current.getBoundingClientRect();
      const proposedWidth = rect.right - event.clientX;
      const maxWidth = Math.min(MAX_PDF_VIEWER_WIDTH, rect.width * 0.8);
      const clampedWidth = Math.min(
        Math.max(proposedWidth, MIN_PDF_VIEWER_WIDTH),
        maxWidth
    // If the deleted guideline was active, switch to the first remaining guideline
    if (activeGuideline?.guideline_id === guidelineId) {
      const remainingGuidelines = guidelines.filter(
        (g) => g.guideline_id !== guidelineId
      );
      setPdfViewerWidth(clampedWidth);
    };

    const handlePointerUp = () => {
      setIsResizingPdfViewer(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      document.body.style.cursor = originalCursor;
      document.body.style.userSelect = originalUserSelect;
    };
  }, [isResizingPdfViewer]);

  useEffect(() => {
    pdfMapRef.current = guidelinePdfMap;
  }, [guidelinePdfMap]);

  useEffect(() => {
    return () => {
      for (const url of Object.values(pdfMapRef.current)) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);
    try {
      const response = await fetch("/api/parse-pdf", {
        method: "POST",
        body: formData,
      });

  const formatLastUpdated = () => {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
      .format(new Date())
      .replace(/\s/g, " ")
      .replace(",", "");
  };

  const handlePatientSave = (
    record: Omit<PatientRecord, "lastUpdated">
  ) => {
    const lastUpdated = formatLastUpdated();
    setPatientRecords((previous) => {
      const filtered = previous.filter((existing) => existing.id !== record.id);
      return [
        {
          ...record,
          lastUpdated,
        },
        ...filtered,
      ];
    });
  };
      if (data.error) {
        setUploadError(data.error);
        setIsUploadingPdf(false);
        return;
      }

  const handleGuidelineSelect = (guideline: Guideline) => {
    setActiveGuidelineId(guideline.guideline_id);
    setIsGuidelineSelectorOpen(false);
    setSessionKey((value) => value + 1);
    setShowPdfViewer((current) =>
      current || Boolean(guidelinePdfMap[guideline.guideline_id])
    );
  };

  const handleGuidelineUpload = (
    guideline: Guideline,
    options?: { pdfUrl?: string }
  ) => {
    setGuidelines((previous) => {
      const existingIndex = previous.findIndex(
        (item) => item.guideline_id === guideline.guideline_id
      );
      if (existingIndex === -1) {
        return [...previous, guideline];
      }
      const next = [...previous];
      next[existingIndex] = guideline;
      return next;
    });

    if (options?.pdfUrl) {
      setGuidelinePdfMap((previous) => {
        const next = { ...previous };
        const existing = next[guideline.guideline_id];
        if (existing && existing !== options.pdfUrl) {
          URL.revokeObjectURL(existing);
        }
        next[guideline.guideline_id] = options.pdfUrl;
        return next;
      });
      setShowPdfViewer(true);
    }

    setActiveGuidelineId(guideline.guideline_id);
    setIsGuidelineSelectorOpen(false);
    setSessionKey((value) => value + 1);
  };

  const handlePatientPanelResizeStart = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (!isLargeScreen) {
      return;
    }
    event.preventDefault();
    setIsResizingPatientPanel(true);
  };

  const handlePdfPanelResizeStart = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (!isLargeScreen) {
      return;
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
      setIsUploadingPdf(false);
    }
    event.preventDefault();
    setIsResizingPdfViewer(true);
  };

  const togglePatientPanel = () => {
    if (isResizingPatientPanel) {
      setIsResizingPatientPanel(false);
    }
    setShowPatientPanel((previous) => !previous);
  };

  const togglePdfViewer = () => {
    if (isResizingPdfViewer) {
      setIsResizingPdfViewer(false);
    }
    setShowPdfViewer((previous) => !previous);
  };

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-4 shadow-sm sm:px-6 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-gray-900">
              Clinical Decision Support
            </h1>
            <p className="mt-0.5 truncate text-sm text-gray-600">
              {activeGuideline?.name || "Select a guideline to begin"}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <button
              onClick={() =>
                setIsGuidelineSelectorOpen((previous) => !previous)
              }
              className="flex items-center justify-center gap-2 rounded-lg border-2 border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-100 hover:shadow"
              aria-expanded={isGuidelineSelectorOpen}
            >
              <span>📚</span>
              <span className="truncate">
                {isGuidelineSelectorOpen ? "Hide Guidelines" : "Show Guidelines"}
              </span>
            </button>
            <div
              className="hidden h-6 w-px bg-gray-300 sm:block"
              aria-hidden="true"
            />
            <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex sm:flex-nowrap">
              <button
                onClick={() => setMode("strict")}
                className={`rounded-lg px-5 py-2.5 text-sm font-medium shadow-sm transition hover:shadow ${
                  mode === "strict"
                    ? "bg-blue-600 text-white"
                    : "border-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                📋 Strict
              </button>
              <button
                onClick={() => setMode("explain")}
                className={`rounded-lg px-5 py-2.5 text-sm font-medium shadow-sm transition hover:shadow ${
                  mode === "explain"
                    ? "bg-blue-600 text-white"
                    : "border-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                💡 Explain
              </button>
            </div>
            <button
              onClick={togglePdfViewer}
              className="flex items-center justify-center gap-2 rounded-lg border-2 border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100 hover:shadow"
              aria-pressed={showPdfViewer}
            >
              <span>📄</span>
              <span className="truncate">
                {showPdfViewer ? "Hide Flowchart" : "Show Flowchart"}
              </span>
            </button>
            <button
              onClick={togglePatientPanel}
              className="flex items-center justify-center gap-2 rounded-lg border-2 border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100 hover:shadow"
              onClick={() => setShowPatientPanel((prev) => !prev)}
              className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold rounded-lg bg-white text-gray-700 hover:bg-gray-100 border-2 border-gray-300 transition-all shadow-sm hover:shadow flex items-center justify-center gap-2"
              aria-pressed={showPatientPanel}
            >
              <span>🩺</span>
              <span className="truncate">
                {showPatientPanel ? "Hide Patient Window" : "Show Patient Window"}
              </span>
            </button>
            <button
              onClick={() => setIsAddPatientOpen(true)}
              className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 hover:shadow"
            >
              <span>➕</span>
              <span>Add Patient</span>
            </button>
          </div>
        </div>
      </header>

      {isGuidelineSelectorOpen && (
        <section className="border-b border-gray-200 bg-white px-4 py-6 shadow-sm sm:px-6 md:px-8">
          <div className="mx-auto max-w-7xl">
            <GuidelineSelector
              guidelines={guidelines}
              activeGuideline={activeGuideline}
              onSelect={handleGuidelineSelect}
              onUpload={handleGuidelineUpload}
            />
          </div>
        </section>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <div ref={layoutRef} className="flex h-full flex-col lg:flex-row">
            <div
              ref={pdfLayoutRef}
              className="flex flex-1 flex-col lg:flex-row"
            >
              <div className="flex-1 overflow-y-auto border-b border-gray-200 bg-gray-50 px-4 py-6 sm:px-6 md:px-8 lg:border-b-0">
                {activeGuideline ? (
                  <div className="grid h-full gap-6 lg:grid-cols-[minmax(0,360px),1fr]">
                    <GuidelineForm
                      guideline={activeGuideline}
                      values={activeGuidelineValues}
                      onChange={handleGuidelineInputChange}
                    />
                    <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                      <ChatPanel
                        key={sessionKey}
                        guideline={activeGuideline}
                        mode={mode}
                        onModeChange={setMode}
                      />
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
                        Analyzing guideline structure and decision logic...
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white/70 p-6 text-center">
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        Upload or select a guideline to start a session.
                      </p>
                      <p className="mt-2 text-sm text-gray-500">
                        The assistant will tailor recommendations once a guideline is active.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {showPdfViewer && (
                <>
                  <div
                    role="separator"
                    aria-orientation="vertical"
                    aria-label="Resize flowchart viewer"
                    onPointerDown={handlePdfPanelResizeStart}
                    className={`hidden w-1 shrink-0 lg:block ${
                      isResizingPdfViewer
                        ? "bg-blue-400"
                        : "cursor-col-resize bg-gray-200 hover:bg-gray-300"
                    }`}
                  />
                  <div
                    className="h-80 w-full shrink-0 border-t border-gray-200 bg-white lg:h-full lg:border-l lg:border-t-0"
                    style={
                      isLargeScreen
                        ? {
                            width: pdfViewerWidth,
                            flexBasis: pdfViewerWidth,
                          }
                        : undefined
                    }
                  >
                    {activeGuideline &&
                    guidelinePdfMap[activeGuideline.guideline_id] ? (
                      <iframe
                        src={guidelinePdfMap[activeGuideline.guideline_id]}
                        className="h-full w-full border-0"
                        title={`${activeGuideline.name} flowchart`}
                        style={{ pointerEvents: isResizingPdfViewer ? "none" : "auto" }}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-gray-500">
                        {activeGuideline
                          ? "Upload a PDF flowchart to preview it here."
                          : "Select a guideline to view its flowchart."}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {showPatientPanel && (
              <>
                <div
                  role="separator"
                  aria-orientation="vertical"
                  aria-label="Resize patient window"
                  onPointerDown={handlePatientPanelResizeStart}
                  className={`hidden w-1 shrink-0 lg:block ${
                    isResizingPatientPanel
                      ? "bg-blue-400"
                      : "cursor-col-resize bg-gray-200 hover:bg-gray-300"
                  }`}
                />
                <PatientInfoPanel
                  records={patientRecords}
                  onAddPatient={() => setIsAddPatientOpen(true)}
                  className="h-96 w-full shrink-0 border-t border-gray-200 bg-white lg:h-full lg:border-l lg:border-t-0"
                  style={
                    isLargeScreen
                      ? {
                          width: patientPanelWidth,
                          flexBasis: patientPanelWidth,
                        }
                      : undefined
                  }
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col lg:flex-row relative">
          <div className="flex-1 overflow-hidden border-b lg:border-b-0 border-gray-200">
            <ChatPanel
              key={sessionKey}
              guideline={activeGuideline}
              mode={mode}
              onModeChange={setMode}
            />
          </div>
          {/* Patient Records Panel */}
          {showPatientPanel && (
            <PatientInfoPanel
              records={patientRecords}
              onAddPatient={() => setIsAddPatientOpen(true)}
              className="bg-white border-t lg:border-t-0 lg:border-l border-gray-200 h-80 lg:h-full w-full lg:w-[420px] shrink-0"
            />
          )}
        </div>
      </div>
      {isAddPatientOpen && (
        <AddPatientModal
          onClose={() => setIsAddPatientOpen(false)}
          onSave={(patient) => {
            setShowPatientPanel(true);
            handlePatientSave(patient);
          }}
        />
      )}
    </div>
  );
      </div>
    );
}
