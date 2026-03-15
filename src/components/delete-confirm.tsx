"use client";

import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";

interface DeleteConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  message: string;
}

export function DeleteConfirm({
  open,
  onClose,
  onConfirm,
  title,
  message,
}: DeleteConfirmProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleConfirm() {
    setLoading(true);
    setError("");
    try {
      await onConfirm();
      onClose();
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-xl border border-gray-200 shadow-lg w-full max-w-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <AlertTriangle size={16} className="text-red-600" />
              </div>
              <div>
                <h2 className="text-sm font-medium text-gray-900">{title}</h2>
                <p className="text-xs text-gray-500 mt-1">{message}</p>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {loading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}