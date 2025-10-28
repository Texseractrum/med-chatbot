"use client";

import { DecisionResult } from "@/lib/types";

interface DecisionCardProps {
  decision: DecisionResult | null;
}

export default function DecisionCard({ decision }: DecisionCardProps) {
  if (!decision) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-6">
        <div className="text-center">
          <svg
            className="w-10 h-10 mx-auto mb-2 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          <p className="text-sm text-gray-600 font-medium">Clinical Recommendation</p>
          <p className="text-xs text-gray-500 mt-1">
            Complete patient information to generate a clinical decision
          </p>
        </div>
      </div>
    );
  }

  const levelStyles = {
    info: "bg-blue-50 border-blue-200 text-blue-800",
    advice: "bg-green-50 border-green-200 text-green-800",
    start: "bg-amber-50 border-amber-200 text-amber-800",
    urgent: "bg-red-50 border-red-200 text-red-800",
  };

  const levelIcons = {
    info: "ℹ️",
    advice: "💡",
    start: "⚕️",
    urgent: "⚠️",
  };

  return (
    <div
      className={`border-2 rounded-lg p-5 ${
        levelStyles[decision.action.level]
      }`}
    >
      <div className="flex items-start gap-2.5">
        <span className="text-xl">{levelIcons[decision.action.level]}</span>
        <div className="flex-1">
          <h3 className="text-sm font-semibold mb-2 capitalize">
            {decision.action.level === "urgent"
              ? "URGENT ACTION REQUIRED"
              : `${decision.action.level} Recommendation`}
          </h3>
          <p className="text-xs mb-3 leading-relaxed">{decision.action.text}</p>

          {decision.notes.length > 0 && (
            <div className="mt-3 pt-3 border-t border-current border-opacity-20">
              <p className="text-xs font-medium mb-1.5">Additional Notes:</p>
              <ul className="list-disc list-inside text-xs space-y-0.5">
                {decision.notes.map((note, idx) => (
                  <li key={idx}>{note}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-3 pt-3 border-t border-current border-opacity-20">
            <p className="text-xs font-medium mb-1">Decision Path:</p>
            <p className="text-xs opacity-80 leading-relaxed">{decision.path.join(" → ")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
