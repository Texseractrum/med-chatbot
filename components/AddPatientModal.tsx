"use client";

import { useState } from "react";
import {
  PATIENT_STATUS_OPTIONS,
  type PatientStatus,
  type PatientRecord,
} from "./PatientInfoPanel";

interface AddPatientModalProps {
  onClose: () => void;
  onSave: (patient: Omit<PatientRecord, "lastUpdated">) => void;
}

const defaultStatus: PatientStatus = "Needs Attention";

interface FormState {
  id: string;
  name: string;
  age: string;
  primaryConcern: string;
  status: PatientStatus;
  clinician: string;
  notes: string;
}

const createInitialFormState = (): FormState => ({
  id: `PT-${Math.floor(100 + Math.random() * 900)}`,
  name: "",
  age: "",
  primaryConcern: "",
  status: defaultStatus,
  clinician: "",
  notes: "",
});

export default function AddPatientModal({
  onClose,
  onSave,
}: AddPatientModalProps) {
  const [formState, setFormState] = useState<FormState>(createInitialFormState);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setFormState((prev) => {
      if (name === "age") {
        return { ...prev, age: value.replace(/[^0-9]/g, "") };
      }

      if (name === "status") {
        return { ...prev, status: value as PatientStatus };
      }

      return { ...prev, [name]: value };
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formState.name || !formState.primaryConcern || !formState.clinician) {
      return;
    }

    const age = Number(formState.age);
    if (!Number.isFinite(age) || age <= 0) {
      return;
    }

    onSave({
      id: formState.id || `PT-${Date.now()}`,
      name: formState.name,
      age,
      primaryConcern: formState.primaryConcern,
      status: formState.status,
      clinician: formState.clinician,
      notes: formState.notes.trim() ? formState.notes.trim() : undefined,
    });

    setFormState(createInitialFormState());
    onClose();
  };

  const handleCancel = () => {
    setFormState(createInitialFormState());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Add Patient Record</h3>
            <p className="text-sm text-gray-500">
              Enter details for the patient you want to surface alongside the chat.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-md p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            aria-label="Close add patient form"
          >
            <svg
              className="h-5 w-5"
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

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                Patient ID
              </span>
              <input
                name="id"
                value={formState.id}
                onChange={handleChange}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="PT-204"
                required
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                Age
              </span>
              <input
                name="age"
                value={formState.age}
                onChange={handleChange}
                inputMode="numeric"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="45"
                required
              />
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">
              Patient Name
            </span>
            <input
              name="name"
              value={formState.name}
              onChange={handleChange}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Alex Morgan"
              required
            />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                Primary Concern
              </span>
              <input
                name="primaryConcern"
                value={formState.primaryConcern}
                onChange={handleChange}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Type 2 Diabetes"
                required
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                Status
              </span>
              <select
                name="status"
                value={formState.status}
                onChange={handleChange}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {PATIENT_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">
              Assigned Clinician
            </span>
            <input
              name="clinician"
              value={formState.clinician}
              onChange={handleChange}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Dr. Priya Desai"
              required
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">
              Notes
            </span>
            <textarea
              name="notes"
              value={formState.notes}
              onChange={handleChange}
              rows={3}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Key considerations, follow-up plans..."
            />
          </label>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
            >
              Save Patient
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
