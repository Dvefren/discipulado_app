"use client";

import { useRef, useState } from "react";

interface ExtractedData {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  birthdate: string;
  churchAnswers?: Record<string, string>;
}

interface CameraCaptureProps {
  onExtracted: (data: ExtractedData) => void;
}

export default function CameraCapture({ onExtracted }: CameraCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setError("Image too large. Max 10MB.");
      return;
    }

    setError(null);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    const base64 = await fileToBase64(file);

    try {
      const res = await fetch("/api/ocr/student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64,
          mimeType: file.type,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Failed to process image");
        setLoading(false);
        return;
      }

      onExtracted(json.data);
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const reset = () => {
    setPreview(null);
    setError(null);
    setLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="mb-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleInputChange}
        className="hidden"
      />

      {!preview && !loading && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-3 
                     border-2 border-dashed border-gray-200 rounded-xl 
                     text-sm text-gray-500 hover:border-gray-300 hover:text-gray-700 
                     hover:bg-gray-50/50 transition-all cursor-pointer group"
        >
          <svg
            className="w-5 h-5 text-gray-400 group-hover:text-gray-500 transition-colors"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z"
            />
          </svg>
          <span>Scan registration form</span>
        </button>
      )}

      {loading && (
        <div className="w-full flex flex-col items-center gap-3 px-4 py-6 border border-gray-200 rounded-xl bg-gray-50/50">
          {preview && (
            <img
              src={preview}
              alt="Captured form"
              className="w-20 h-20 object-cover rounded-lg opacity-60"
            />
          )}
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 animate-spin text-gray-400"
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
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span className="text-sm text-gray-500">Reading form data...</span>
          </div>
        </div>
      )}

      {preview && !loading && (
        <div className="flex items-center gap-3 px-3 py-2 border border-green-200 bg-green-50/50 rounded-xl">
          <img
            src={preview}
            alt="Captured form"
            className="w-10 h-10 object-cover rounded-lg"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-green-800">
              Form data extracted
            </p>
            <p className="text-xs text-green-600">
              Review the fields below and correct if needed.
            </p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-2 py-1"
          >
            Clear
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between px-3 py-2 mt-2 border border-red-200 bg-red-50/50 rounded-xl">
          <p className="text-xs text-red-600">{error}</p>
          <button
            type="button"
            onClick={reset}
            className="text-xs text-red-400 hover:text-red-600 transition-colors px-2 py-1"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}