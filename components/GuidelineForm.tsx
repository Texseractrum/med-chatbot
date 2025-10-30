"use client";

import { Guideline } from "@/lib/types";

type GuidelineInputValue = string | number | boolean | "";

interface GuidelineFormProps {
  guideline: Guideline;
  values: Record<string, GuidelineInputValue>;
  onChange: (values: Record<string, GuidelineInputValue>) => void;
}

export default function GuidelineForm({
  guideline,
  values,
  onChange,
}: GuidelineFormProps) {
  const handleInputChange = (id: string, value: GuidelineInputValue) => {
    onChange({ ...values, [id]: value });
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-lg border border-blue-200 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <svg
          className="w-4 h-4 text-blue-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
        <h3 className="text-sm font-semibold text-gray-800">
          Patient Information
        </h3>
      </div>
      <div className="space-y-3.5">
        {guideline.inputs.map((input) => (
          <div key={input.id}>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              {input.label}
              {input.unit && (
                <span className="text-gray-500 ml-1">({input.unit})</span>
              )}
            </label>
            {input.type === "number" ? (
              <input
                type="number"
                value={
                  typeof values[input.id] === "number"
                    ? (values[input.id] as number)
                    : ""
                }
                onChange={(e) =>
                  handleInputChange(
                    input.id,
                    e.target.value ? Number(e.target.value) : ""
                  )
                }
                className="w-full px-3 py-2 text-xs border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                placeholder={`Enter ${input.label.toLowerCase()}`}
              />
            ) : input.type === "boolean" ? (
              <div className="flex gap-2">
                <label className="flex items-center gap-2 cursor-pointer px-3 py-2 border-2 border-gray-300 rounded-lg hover:bg-white transition-colors">
                  <input
                    type="radio"
                    name={input.id}
                    checked={values[input.id] === true}
                    onChange={() => handleInputChange(input.id, true)}
                    className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-medium text-gray-700">Yes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer px-3 py-2 border-2 border-gray-300 rounded-lg hover:bg-white transition-colors">
                  <input
                    type="radio"
                    name={input.id}
                    checked={values[input.id] === false}
                    onChange={() => handleInputChange(input.id, false)}
                    className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-medium text-gray-700">No</span>
                </label>
              </div>
            ) : (
              <input
                type="text"
                value={
                  typeof values[input.id] === "string"
                    ? (values[input.id] as string)
                    : ""
                }
                onChange={(e) => handleInputChange(input.id, e.target.value)}
                className="w-full px-3 py-2 text-xs border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                placeholder={`Enter ${input.label.toLowerCase()}`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
