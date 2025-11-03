"use client";

import clsx from "clsx";

export interface PatientRecord {
  id: string;
  name: string;
  age: number;
  primaryConcern: string;
  status: string;
  lastUpdated: string;
  clinician: string;
  notes?: string;
}

interface PatientInfoPanelProps {
  records: PatientRecord[];
  className?: string;
}

const statusStyles: Record<string, string> = {
  Stable:
    "bg-green-50 text-green-700 border border-green-200",
  "Needs Attention":
    "bg-yellow-50 text-yellow-700 border border-yellow-200",
  Active:
    "bg-blue-50 text-blue-700 border border-blue-200",
  Critical:
    "bg-red-50 text-red-700 border border-red-200",
};

export default function PatientInfoPanel({
  records,
  className,
}: PatientInfoPanelProps) {
  return (
    <aside className={clsx("flex flex-col", className)}>
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              Patient Records
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Connected to electronic health record (optional integration).
            </p>
          </div>
          <button
            type="button"
            className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
          >
            Connect
          </button>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="flex-1 flex items-center justify-center px-6 text-center text-sm text-gray-500">
          No patient records connected yet. Connect your EHR to surface patient
          summaries alongside the chat.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="overflow-hidden border border-gray-200 rounded-lg bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Patient
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Age
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Primary Concern
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Status
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Last Updated
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-blue-50/70 transition-colors">
                    <td className="px-3 py-3 align-top">
                      <p className="text-xs font-semibold text-gray-900">
                        {record.name}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {record.id} • {record.clinician}
                      </p>
                      {record.notes && (
                        <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">
                          {record.notes}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-700 align-top">
                      {record.age}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-700 align-top">
                      {record.primaryConcern}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <span
                        className={clsx(
                          "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
                          statusStyles[record.status] ??
                            "bg-gray-100 text-gray-700 border border-gray-200"
                        )}
                      >
                        {record.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-700 align-top">
                      {record.lastUpdated}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </aside>
  );
}
