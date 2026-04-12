"use client";
import { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";

interface DeleteConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  message: string;
  /** If provided, the user must type this exact string to enable the confirm button */
  confirmText?: string;
  /** Additional context to show below the message (list of consequences) */
  consequences?: string[];
}

export function DeleteConfirm({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  consequences,
}: DeleteConfirmProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [typed, setTyped] = useState("");

  // Reset typed input whenever the modal opens or the expected text changes
  useEffect(() => {
    if (open) {
      setTyped("");
      setError("");
    }
  }, [open, confirmText]);

  const requiresTyping = !!confirmText;
  const canConfirm = !requiresTyping || typed === confirmText;

  async function handleConfirm() {
    if (!canConfirm) return;
    setLoading(true);
    setError("");
    try {
      await onConfirm();
      onClose();
    } catch (err: any) {
      setError(err.message || "Algo salió mal.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-xl border border-border shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle size={16} className="text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-medium text-foreground">{title}</h2>
                <p className="text-xs text-muted-foreground mt-1">{message}</p>
              </div>
            </div>

            {/* Consequences list */}
            {consequences && consequences.length > 0 && (
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 mb-4">
                <p className="text-[11px] font-medium text-destructive mb-1.5 uppercase tracking-wide">Esta acción eliminará:</p>
                <ul className="space-y-1">
                  {consequences.map((c, i) => (
                    <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
                      <span className="text-destructive mt-0.5">•</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Typed confirmation */}
            {requiresTyping && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Para confirmar, escribe <span className="font-semibold text-foreground">{confirmText}</span>
                </label>
                <input
                  type="text"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder={confirmText}
                  className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-destructive"
                  autoFocus
                />
              </div>
            )}

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2 mb-4">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-2 text-sm font-medium text-foreground bg-secondary rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading || !canConfirm}
                className="flex-1 py-2 text-sm font-medium text-white bg-destructive rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}