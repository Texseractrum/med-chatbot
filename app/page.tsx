"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import ChatPanel from "@/components/ChatPanel";
import GuidelineForm from "@/components/GuidelineForm";
import GuidelineSelector from "@/components/GuidelineSelector";
import AddPatientModal from "@/components/AddPatientModal";
import PatientInfoPanel, {
  type PatientRecord,
} from "@/components/PatientInfoPanel";
import { Guideline } from "@/lib/types";

type GuidelineInputValue = string | number | boolean | "";

const MIN_PATIENT_PANEL_WIDTH = 360;
const MAX_PATIENT_PANEL_WIDTH = 640;
const INITIAL_PATIENT_PANEL_WIDTH = 500;

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
  const layoutRef = useRef<HTMLDivElement>(null);

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
      guidelineInputs[activeGuideline.guideline_id] || ({} as Record<string, GuidelineInputValue>);

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

  const handleGuidelineSelect = (guideline: Guideline) => {
    setActiveGuidelineId(guideline.guideline_id);
    setIsGuidelineSelectorOpen(false);
    setSessionKey((value) => value + 1);
  };

  const handleGuidelineUpload = (guideline: Guideline) => {
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

  const togglePatientPanel = () => {
    if (isResizingPatientPanel) {
      setIsResizingPatientPanel(false);
    }
    setShowPatientPanel((previous) => !previous);
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
              onClick={togglePatientPanel}
              className="flex items-center justify-center gap-2 rounded-lg border-2 border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100 hover:shadow"
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
          <div
            ref={layoutRef}
            className="flex h-full flex-col lg:flex-row"
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
                  </div>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white/70 p-6 text-center">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      Upload or select a guideline to start a session.
                    </p>
                    <p className="mt-2 text-sm text-gray-500">
                      The assistant will tailor recommendations once a guideline
                      is active.
                    </p>
                  </div>
                </div>
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
}
