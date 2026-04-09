"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useParams, notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, ArrowLeft, Maximize2, X } from "lucide-react";
import presentationsData from "../../../../../public/presentations.json";

interface Presentation {
  slug: string;
  title: string;
  description: string;
  slideCount: number;
  imageExt: string;
}

export default function PresentationViewer() {
  const params = useParams();
  const slug = params.slug as string;
  const presentations = presentationsData as Presentation[];
  const presentation = presentations.find((p) => p.slug === slug);

  const [currentSlide, setCurrentSlide] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const prevSlide = useCallback(() => {
    setCurrentSlide((s) => (s > 1 ? s - 1 : s));
  }, []);

  const nextSlide = useCallback(() => {
    if (!presentation) return;
    setCurrentSlide((s) => (s < presentation.slideCount ? s + 1 : s));
  }, [presentation]);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") prevSlide();
      else if (e.key === "ArrowRight") nextSlide();
      else if (e.key === "Escape" && isFullscreen) setIsFullscreen(false);
      else if (e.key === "f" || e.key === "F") setIsFullscreen((v) => !v);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [prevSlide, nextSlide, isFullscreen]);

  // Lock body scroll in fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isFullscreen]);

  if (!presentation) {
    return notFound();
  }

  // Touch / swipe handlers
  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.targetTouches[0].clientX;
  }

  function handleTouchMove(e: React.TouchEvent) {
    touchEndX.current = e.targetTouches[0].clientX;
  }

  function handleTouchEnd() {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 50) nextSlide();
    if (distance < -50) prevSlide();
    touchStartX.current = null;
    touchEndX.current = null;
  }

  const slideUrl = `/presentations/${presentation.slug}/slide-${currentSlide}.${presentation.imageExt}`;

  // ─── Fullscreen mode ─────────────────────────────────
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col h-dvh overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 text-white shrink-0">
          <span className="text-sm font-medium truncate pr-3">{presentation.title}</span>
          <button
            onClick={() => setIsFullscreen(false)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0"
            title="Salir (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Slide area — min-h-0 is the critical fix */}
        <div
          className="flex-1 min-h-0 flex items-center justify-center px-4"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <img
            src={slideUrl}
            alt={`Slide ${currentSlide}`}
            className="max-w-full max-h-full object-contain select-none"
            draggable={false}
          />
        </div>

        {/* Bottom control bar — arrows live here so they never cover the slide */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 shrink-0">
          <button
            onClick={prevSlide}
            disabled={currentSlide === 1}
            className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Slide anterior"
          >
            <ChevronLeft size={22} />
          </button>

          <span className="text-xs text-white/70 tabular-nums">
            {currentSlide} / {presentation.slideCount}
          </span>

          <button
            onClick={nextSlide}
            disabled={currentSlide === presentation.slideCount}
            className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Slide siguiente"
          >
            <ChevronRight size={22} />
          </button>
        </div>
      </div>
    );
  }

  // ─── Normal mode ─────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <Link
          href="/dashboard/presentations"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Volver</span>
        </Link>
        <button
          onClick={() => setIsFullscreen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-border text-muted-foreground hover:text-foreground transition-colors"
        >
          <Maximize2 size={12} />
          Pantalla completa
        </button>
      </div>

      <div className="mb-4">
        <h1 className="text-lg font-medium text-foreground">{presentation.title}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{presentation.description}</p>
      </div>

      {/* Slide viewer */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div
          className="relative aspect-video bg-muted flex items-center justify-center"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <img
            src={slideUrl}
            alt={`Slide ${currentSlide}`}
            className="max-w-full max-h-full object-contain select-none"
            draggable={false}
          />

          <button
            onClick={prevSlide}
            disabled={currentSlide === 1}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/90 backdrop-blur-sm border border-border text-foreground hover:bg-background disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm"
            aria-label="Slide anterior"
          >
            <ChevronLeft size={18} />
          </button>

          <button
            onClick={nextSlide}
            disabled={currentSlide === presentation.slideCount}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/90 backdrop-blur-sm border border-border text-foreground hover:bg-background disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm"
            aria-label="Slide siguiente"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Footer with counter and progress */}
        <div className="px-4 py-3 border-t border-border">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-foreground tabular-nums">
              {currentSlide} / {presentation.slideCount}
            </span>
            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-foreground/60 rounded-full transition-all"
                style={{ width: `${(currentSlide / presentation.slideCount) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Hint */}
      <p className="text-[10px] text-muted-foreground text-center mt-3">
        Usa las flechas ← → del teclado o desliza en pantalla táctil
      </p>
    </div>
  );
}
