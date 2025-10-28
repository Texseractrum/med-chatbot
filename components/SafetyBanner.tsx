"use client";

import { DecisionResult } from "@/lib/types";

interface SafetyBannerProps {
  decision?: DecisionResult | null;
}

export default function SafetyBanner({ decision }: SafetyBannerProps = {}) {
  const isUrgent = decision?.action.level === "urgent";

  return (
    <div className="bg-white border-t border-gray-200">
      {isUrgent && (
        <div className="bg-red-600 text-white px-6 py-3">
          <div className="flex items-center gap-3">
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
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="flex-1">
              <p className="font-semibold">URGENT ACTION REQUIRED</p>
              <p className="text-sm mt-0.5">
                This patient requires immediate clinical intervention. Follow
                your local emergency protocols.
              </p>
            </div>
            <button className="px-4 py-2 bg-white text-red-600 rounded-md font-semibold hover:bg-red-50 transition-colors">
              Emergency Protocol
            </button>
          </div>
        </div>
      )}

      <div className="px-6 py-3 bg-amber-50 border-t border-amber-200">
        <div className="flex items-start gap-3 text-amber-900">
          <svg
            className="w-5 h-5 mt-0.5 shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <div className="text-sm">
            <p className="font-semibold">
              Clinical Decision Support Tool - For Healthcare Professionals
            </p>
            <p className="mt-1">
              This tool provides guideline-based decision support and should not
              replace clinical judgment. Always consider the individual patient
              context, contraindications, and local protocols. This tool is not
              a substitute for professional medical advice, diagnosis, or
              treatment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
