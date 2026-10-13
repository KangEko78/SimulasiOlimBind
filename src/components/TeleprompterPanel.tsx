import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Poem, PoemLine } from '../types/poem';
import {
  Type,
  Gauge,
  HelpCircle,
  Sparkles,
  Info,
  Layers,
  Play,
  Pause,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  Touchpad,
} from 'lucide-react';

interface TeleprompterPanelProps {
  poem: Poem;
  fontSize: number; // in pixels (e.g. 28, 36, 46, 56, 68)
  scrollSpeed: number; // 1 - 10
  isPracticing: boolean;
  isPaused: boolean;
  progressPercent: number;
  activeLineId: string | null;
  showProsodyMarks: boolean;
  showEmphasis: boolean;
  showExpressionGuide: boolean;
  showLegend: boolean;
  onFontSizeChange: (size: number) => void;
  onScrollSpeedChange: (speed: number) => void;
  onToggleProsodyMarks: () => void;
  onToggleEmphasis: () => void;
  onToggleExpressionGuide: () => void;
  onToggleLegend: () => void;
  onLineClick: (lineId: string) => void;
  onProgressUpdate: (percent: number, activeId: string | null) => void;
  onTogglePlayPause?: () => void;
  onRestartPractice?: () => void;
}

const FONT_SIZE_OPTIONS = [
  { size: 28, label: 'S (28px)' },
  { size: 36, label: 'M (36px)' },
  { size: 46, label: 'L (46px)' },
  { size: 56, label: 'XL (56px)' },
  { size: 68, label: '2XL (68px)' },
];

export const TeleprompterPanel: React.FC<TeleprompterPanelProps> = ({
  poem,
  fontSize,
  scrollSpeed,
  isPracticing,
  isPaused,
  progressPercent,
  activeLineId,
  showProsodyMarks,
  showEmphasis,
  showExpressionGuide,
  showLegend,
  onFontSizeChange,
  onScrollSpeedChange,
  onToggleProsodyMarks,
  onToggleEmphasis,
  onToggleExpressionGuide,
  onToggleLegend,
  onLineClick,
  onProgressUpdate,
  onTogglePlayPause,
  onRestartPractice,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);

  // Floating-point scroll position accumulator (prevents integer truncation freezes on Android/Chromium)
  const scrollPosRef = useRef<number>(0);

  // User touch/pointer interaction flags for Hisense IFP multi-touch screen
  const isUserInteractingRef = useRef<boolean>(false);
  const interactionTimeoutRef = useRef<number | null>(null);
  const [isTouching, setIsTouching] = useState<boolean>(false);

  // Throttling refs to prevent layout thrashing (getBoundingClientRect) & 60fps React re-render storms
  const lastLineCheckTimeRef = useRef<number>(0);
  const lastReportedActiveIdRef = useRef<string | null>(null);
  const lastReportedProgressRef = useRef<number>(-1);

  // Active stanza for quick-jump indicator
  const [activeStanzaNumber, setActiveStanzaNumber] = useState<number>(1);

  // Reset scroll to top when practice starts from beginning or restarts
  useEffect(() => {
    if (!isPracticing) {
      scrollPosRef.current = 0;
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
      lastReportedActiveIdRef.current = null;
      lastReportedProgressRef.current = -1;
    } else {
      // Practice started: sync accumulator with current container scrollTop
      if (containerRef.current) {
        scrollPosRef.current = containerRef.current.scrollTop;
      }
      lastTimestampRef.current = performance.now();
    }
  }, [isPracticing]);

  // Main high-performance auto-scroll loop
  useEffect(() => {
    if (!isPracticing || isPaused) {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      lastTimestampRef.current = null;
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    // Smooth speed scale tailored for 4K IFP (speed 1: ~24px/s, speed 10: ~170px/s)
    // Speed formula: base + linear + exponential curve for natural pacing
    const pxPerSecond = 14 + scrollSpeed * 10 + Math.pow(scrollSpeed, 1.35) * 3.5;

    const scrollLoop = (timestamp: number) => {
      if (!lastTimestampRef.current) {
        lastTimestampRef.current = timestamp;
      }
      // Clamp deltaTime to max 100ms to prevent massive jumps when tab is temporarily blurred
      const deltaTime = Math.min((timestamp - lastTimestampRef.current) / 1000, 0.1);
      lastTimestampRef.current = timestamp;

      // Only auto-advance scroll if user is NOT actively touching/dragging the IFP screen
      if (!isUserInteractingRef.current) {
        const maxScroll = container.scrollHeight - container.clientHeight;
        if (maxScroll > 0) {
          // Accumulate fractional pixels in float ref
          scrollPosRef.current = Math.min(maxScroll, scrollPosRef.current + pxPerSecond * deltaTime);
          // Commit to DOM
          container.scrollTop = scrollPosRef.current;
        }
      }

      // Throttled line detection & progress update (every ~150ms instead of every 16ms frame)
      // This eliminates forced synchronous layout thrashing (getBoundingClientRect) on Android ARM chipsets
      const now = timestamp;
      if (now - lastLineCheckTimeRef.current >= 150) {
        lastLineCheckTimeRef.current = now;

        const maxScroll = container.scrollHeight - container.clientHeight;
        const progress = maxScroll > 0 ? Math.min(100, Math.round((container.scrollTop / maxScroll) * 100)) : 0;

        // Focus horizon: ~35% from the top of the teleprompter container
        const containerRect = container.getBoundingClientRect();
        const readingLineY = containerRect.top + containerRect.height * 0.35;
        const lineElements = container.querySelectorAll<HTMLElement>('[data-line-id]');

        let closestLineId: string | null = null;
        let closestDist = Infinity;
        let detectedStanzaNumber = 1;

        for (let i = 0; i < lineElements.length; i++) {
          const el = lineElements[i];
          const rect = el.getBoundingClientRect();
          const lineCenter = rect.top + rect.height / 2;
          const dist = Math.abs(lineCenter - readingLineY);
          if (dist < closestDist) {
            closestDist = dist;
            closestLineId = el.getAttribute('data-line-id');
            const stanzaAttr = el.getAttribute('data-stanza');
            if (stanzaAttr) {
              detectedStanzaNumber = parseInt(stanzaAttr, 10) || 1;
            }
          }
        }

        setActiveStanzaNumber(detectedStanzaNumber);

        // Only emit update if values actually changed to prevent React re-render cascades
        if (
          closestLineId !== lastReportedActiveIdRef.current ||
          Math.abs(progress - lastReportedProgressRef.current) >= 1
        ) {
          lastReportedActiveIdRef.current = closestLineId;
          lastReportedProgressRef.current = progress;
          onProgressUpdate(progress, closestLineId);
        }
      }

      animFrameIdRef.current = requestAnimationFrame(scrollLoop);
    };

    animFrameIdRef.current = requestAnimationFrame(scrollLoop);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [isPracticing, isPaused, scrollSpeed, onProgressUpdate]);

  // Touch & Pointer Gesture Handlers for Hisense IFP 20-point touch screen
  const handlePointerDown = () => {
    isUserInteractingRef.current = true;
    setIsTouching(true);
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
      interactionTimeoutRef.current = null;
    }
  };

  const handlePointerUp = () => {
    setIsTouching(false);
    const container = containerRef.current;
    if (container) {
      scrollPosRef.current = container.scrollTop;
    }
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
    }
    // Give user a 1-second comfortable breathing window after lifting finger before resuming auto-scroll
    interactionTimeoutRef.current = window.setTimeout(() => {
      isUserInteractingRef.current = false;
      lastTimestampRef.current = performance.now();
    }, 1000);
  };

  const handleContainerScroll = () => {
    // If the user scrolled manually (touch drag or mouse wheel), keep accumulator in sync
    if (isUserInteractingRef.current && containerRef.current) {
      scrollPosRef.current = containerRef.current.scrollTop;
    }
  };

  // Smooth scroll to a specific line (e.g. when student taps on a line)
  const scrollToLine = (lineId: string) => {
    onLineClick(lineId);
    const container = containerRef.current;
    if (!container) return;
    const targetEl = container.querySelector<HTMLElement>(`[data-line-id="${lineId}"]`);
    if (targetEl) {
      const containerRect = container.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();
      const relativeTop = targetRect.top - containerRect.top + container.scrollTop;
      const targetScroll = Math.max(0, relativeTop - container.clientHeight * 0.35);
      scrollPosRef.current = targetScroll;
      container.scrollTo({
        top: targetScroll,
        behavior: 'smooth',
      });
    }
  };

  // Smooth scroll to a specific stanza (Bait 1, Bait 2, etc.)
  const scrollToStanza = (stanzaNumber: number) => {
    const container = containerRef.current;
    if (!container) return;
    const stanzaEl = container.querySelector<HTMLElement>(`[data-stanza-number="${stanzaNumber}"]`);
    if (stanzaEl) {
      const containerRect = container.getBoundingClientRect();
      const stanzaRect = stanzaEl.getBoundingClientRect();
      const relativeTop = stanzaRect.top - containerRect.top + container.scrollTop;
      const targetScroll = Math.max(0, relativeTop - 40);
      scrollPosRef.current = targetScroll;
      container.scrollTo({
        top: targetScroll,
        behavior: 'smooth',
      });
    }
  };

  // Scroll to the very beginning of the poem
  const scrollToTop = () => {
    const container = containerRef.current;
    if (!container) return;
    scrollPosRef.current = 0;
    container.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  // Step scroll up / down by 200px (Tactile IFP button)
  const stepScroll = (delta: number) => {
    const container = containerRef.current;
    if (!container) return;
    const maxScroll = container.scrollHeight - container.clientHeight;
    const next = Math.max(0, Math.min(maxScroll, container.scrollTop + delta));
    scrollPosRef.current = next;
    container.scrollTo({
      top: next,
      behavior: 'smooth',
    });
  };

  // Helper to render words with prosody tokens & emphasis
  const renderLineWords = (line: PoemLine, isActive: boolean) => {
    return (
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2 leading-relaxed">
        {line.words.map((w, wIdx) => {
          return (
            <span key={wIdx} className="inline-flex items-baseline">
              {/* Word text with emphasis styling */}
              <span
                className={`transition-colors select-text ${
                  showEmphasis && w.isEmphasized
                    ? 'font-bold text-amber-300 drop-shadow-[0_2px_12px_rgba(245,158,11,0.4)]'
                    : isActive
                    ? 'text-white font-medium drop-shadow-sm'
                    : 'text-slate-200'
                }`}
              >
                {w.text}
              </span>

              {/* Pause Notation Token */}
              {showProsodyMarks && w.pauseAfter && (
                <span
                  title={
                    w.pauseAfter === 'short'
                      ? 'Jeda Pendek (/)'
                      : w.pauseAfter === 'medium'
                      ? 'Jeda Sedang (//)'
                      : 'Jeda Panjang (///)'
                  }
                  className={`ml-1.5 select-none font-mono font-black ${
                    w.pauseAfter === 'short'
                      ? 'text-sky-300 bg-sky-950/80 px-1.5 py-0.5 rounded text-[0.62em] border border-sky-600/40 shadow-sm'
                      : w.pauseAfter === 'medium'
                      ? 'text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded text-[0.62em] border border-amber-600/40 shadow-sm'
                      : 'text-rose-300 bg-rose-950/90 px-2.5 py-0.5 rounded text-[0.62em] border border-rose-600/50 shadow-sm'
                  }`}
                >
                  {w.pauseAfter === 'short' && '/'}
                  {w.pauseAfter === 'medium' && '//'}
                  {w.pauseAfter === 'long' && '///'}
                </span>
              )}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative select-none">
      {/* 1. TOP HEADER & TELEPROMPTER CONTROLS BAR */}
      <div className="px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-900/95 border-b border-slate-800 backdrop-blur z-20 shrink-0 flex flex-wrap items-center justify-between gap-2">
        {/* Left: Poem Metadata */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />
          <div className="truncate">
            <h2 className="text-xs sm:text-sm font-bold text-white tracking-wide uppercase font-display flex items-center gap-2 truncate">
              <span className="truncate">{poem.title}</span>
              <span className="text-xs font-normal text-amber-400/90 font-serif italic hidden md:inline">
                karya {poem.poet} {poem.year ? `(${poem.year})` : ''}
              </span>
            </h2>
          </div>
        </div>

        {/* Right: Quick Teleprompter Settings Controls */}
        <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
          {/* Font Size Selector (Optimized for 4K IFP 75" / 65") */}
          <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700">
            <span className="px-2 text-xs text-slate-400 flex items-center gap-1 font-medium">
              <Type className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xl:inline">Teks:</span>
            </span>
            {FONT_SIZE_OPTIONS.map((opt) => (
              <button
                key={opt.size}
                type="button"
                onClick={() => onFontSizeChange(opt.size)}
                className={`px-2 py-1 text-xs font-bold rounded-lg transition-all active:scale-95 ${
                  fontSize === opt.size
                    ? 'bg-amber-500 text-slate-950 shadow-md ring-1 ring-amber-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
                title={opt.label}
              >
                {opt.size === 28 ? 'S' : opt.size === 36 ? 'M' : opt.size === 46 ? 'L' : opt.size === 56 ? 'XL' : '2XL'}
              </button>
            ))}
          </div>

          {/* Speed Selector (1x to 10x with tactile tactile touch targets) */}
          <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700">
            <span className="px-2 text-xs text-slate-400 flex items-center gap-1 font-medium">
              <Gauge className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden xl:inline">Kecepatan:</span>
            </span>
            <button
              type="button"
              onClick={() => onScrollSpeedChange(Math.max(1, scrollSpeed - 1))}
              disabled={scrollSpeed <= 1}
              className="w-7 h-7 flex items-center justify-center text-sm font-bold text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg disabled:opacity-30 active:scale-95 transition-all"
              title="Perlambat guliran"
            >
              -
            </button>
            <span className="px-2 text-xs font-mono font-bold text-amber-300 min-w-8 text-center">
              {scrollSpeed}x
            </span>
            <button
              type="button"
              onClick={() => onScrollSpeedChange(Math.min(10, scrollSpeed + 1))}
              disabled={scrollSpeed >= 10}
              className="w-7 h-7 flex items-center justify-center text-sm font-bold text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg disabled:opacity-30 active:scale-95 transition-all"
              title="Percepat guliran"
            >
              +
            </button>
          </div>

          {/* Prosody Notation Toggle */}
          <button
            type="button"
            onClick={onToggleProsodyMarks}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-colors border active:scale-95 ${
              showProsodyMarks
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-sm'
                : 'bg-slate-800 text-slate-400 border-transparent hover:text-white'
            }`}
            title="Tampilkan tanda jeda /, //, ///"
          >
            <span className="font-mono font-bold">/ // ///</span>
            <span className="hidden lg:inline">Jeda</span>
          </button>

          {/* Emphasis Toggle */}
          <button
            type="button"
            onClick={onToggleEmphasis}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-colors border active:scale-95 ${
              showEmphasis
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                : 'bg-slate-800 text-slate-400 border-transparent hover:text-white'
            }`}
            title="Tampilkan penekanan kata (intonasi)"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Tekanan</span>
          </button>

          {/* Expression Guide Toggle */}
          <button
            type="button"
            onClick={onToggleExpressionGuide}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-colors border active:scale-95 ${
              showExpressionGuide
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                : 'bg-slate-800 text-slate-400 border-transparent hover:text-white'
            }`}
            title="Tampilkan panduan mimik dan penghayatan vokal"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Ekspresi</span>
          </button>

          {/* Legend Toggle */}
          <button
            type="button"
            onClick={onToggleLegend}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-xl flex items-center gap-1 transition-colors border active:scale-95 ${
              showLegend
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm'
                : 'bg-slate-800 text-slate-400 border-transparent hover:text-white'
            }`}
            title="Panduan arti tanda jeda pembacaan puisi"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden 2xl:inline">Petunjuk</span>
          </button>
        </div>
      </div>

      {/* 2. IFP QUICK STANZA TABS BAR (Lompat Cepat Antar Bait di Layar Sentuh) */}
      <div className="w-full bg-slate-950/90 border-b border-slate-800 px-3 sm:px-4 py-1.5 flex items-center justify-between gap-2 overflow-x-auto text-xs z-10 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
            <Touchpad className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Pilih Bait:</span>
          </span>
          {poem.stanzas.map((stanza) => {
            const isCurrentStanza = activeStanzaNumber === stanza.stanzaNumber;
            return (
              <button
                key={stanza.stanzaNumber}
                type="button"
                onClick={() => scrollToStanza(stanza.stanzaNumber)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all active:scale-95 border ${
                  isCurrentStanza
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-bold'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700/60 hover:bg-slate-700 hover:text-white'
                }`}
              >
                Bait {stanza.stanzaNumber}
              </button>
            );
          })}
        </div>

        {/* IFP Live Status Badge */}
        <div className="flex items-center gap-2 shrink-0">
          {isTouching ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[10px] sm:text-xs font-medium animate-pulse">
              👆 Sentuh Layar Aktif
            </span>
          ) : isPracticing && !isPaused ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] sm:text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-0.5" />
              Gulir Otomatis ({scrollSpeed}x)
            </span>
          ) : isPracticing && isPaused ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] sm:text-xs font-medium">
              ⏸️ Dijeda
            </span>
          ) : (
            <span className="text-[10px] sm:text-xs text-slate-400">
              Siap Dimulai
            </span>
          )}

          {/* Progress Percent */}
          <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
            <div className="w-16 sm:w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-150"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="font-mono text-xs font-bold text-amber-400">{progressPercent}%</span>
          </div>
        </div>
      </div>

      {/* 3. NOTATION LEGEND DRAWER (Collapsible) */}
      {showLegend && (
        <div className="bg-slate-950/95 border-b border-slate-800 px-4 py-2.5 z-10 text-xs text-slate-300 transition-all shrink-0">
          <div className="flex items-center gap-2 font-semibold text-amber-300 mb-2 font-display">
            <Info className="w-4 h-4" />
            <span>Panduan Tanda Pembacaan Puisi Kurikulum Bahasa Indonesia SMP</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px] leading-relaxed">
            <div className="flex items-start gap-2 p-2 bg-slate-900 rounded-lg border border-sky-900/50">
              <span className="px-1.5 py-0.5 bg-sky-950 text-sky-300 border border-sky-600/40 font-mono font-bold rounded">
                /
              </span>
              <div>
                <strong className="text-sky-300">Jeda Pendek:</strong> Berhenti sejenak (± 0.5 detik). Pemenggalan frasa kata.
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 bg-slate-900 rounded-lg border border-amber-900/50">
              <span className="px-1.5 py-0.5 bg-amber-950 text-amber-300 border border-amber-600/40 font-mono font-bold rounded">
                //
              </span>
              <div>
                <strong className="text-amber-300">Jeda Sedang:</strong> Berhenti (± 1 detik). Pergantian larik atau klausa.
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 bg-slate-900 rounded-lg border border-rose-900/50">
              <span className="px-1.5 py-0.5 bg-rose-950 text-rose-300 border border-rose-600/40 font-mono font-bold rounded">
                ///
              </span>
              <div>
                <strong className="text-rose-300">Jeda Panjang:</strong> Berhenti penuh (± 2 detik). Akhir bait / perenungan.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. READING FOCUS HORIZON GUIDE (Fixed center indicator) */}
      <div className="absolute top-[35%] left-0 right-0 pointer-events-none z-10 hidden md:block">
        <div className="w-full border-t border-dashed border-amber-500/30 relative">
          <span className="absolute right-4 -top-2.5 bg-slate-900/90 border border-amber-500/30 text-amber-400 font-mono text-[9px] px-2 py-0.5 rounded tracking-wider uppercase shadow-sm">
            Garis Fokus Membaca Teleprompter
          </span>
        </div>
      </div>

      {/* 5. MAIN TELEPROMPTER TEXT CANVAS (Subpixel scroll accumulator, zero smooth-scroll freeze) */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchEnd={handlePointerUp}
        onScroll={handleContainerScroll}
        className="flex-1 min-h-0 overflow-y-auto teleprompter-scroll px-6 md:px-12 py-8 md:py-12 relative touch-pan-y"
        style={{
          scrollBehavior: 'auto', // CRITICAL: 'auto' prevents continuous rAF scroll canceling/stuttering in Chromium!
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div className="max-w-3xl mx-auto space-y-10 md:space-y-14 pb-36">
          {/* Poem Title Header Banner inside Prompter */}
          <div className="text-center pb-8 border-b border-slate-800/80">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white font-editorial tracking-tight mb-3">
              {poem.title}
            </h1>
            <p className="text-lg md:text-2xl text-amber-400 font-medium font-serif italic mb-4">
              Karya: {poem.poet}
            </p>
            <div className="inline-block max-w-xl text-xs md:text-sm text-slate-300 bg-slate-950/80 border border-slate-800 p-3.5 rounded-2xl leading-relaxed">
              <strong className="text-amber-400">Penghayatan Tema:</strong> {poem.synopsis}
            </div>
          </div>

          {/* Stanzas & Lines */}
          {poem.stanzas.map((stanza) => (
            <div
              key={stanza.stanzaNumber}
              data-stanza-number={stanza.stanzaNumber}
              className="space-y-6 relative group/stanza scroll-mt-6"
            >
              {/* Stanza Context Guide Callout */}
              {showExpressionGuide && (
                <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-emerald-500/40 text-emerald-300 text-xs flex flex-wrap items-center justify-between gap-2 shadow-md">
                  <div className="flex items-center gap-2">
                    <span className="font-bold uppercase tracking-wider text-[11px] bg-emerald-500/25 px-2.5 py-1 rounded-lg border border-emerald-500/50">
                      Bait {stanza.stanzaNumber}
                    </span>
                    <span className="font-semibold text-emerald-200 text-xs sm:text-sm">
                      {stanza.moodTheme}
                    </span>
                  </div>
                  <div className="text-slate-300 text-xs italic font-serif">
                    {stanza.voiceGuide}
                  </div>
                </div>
              )}

              {/* Lines in this stanza */}
              <div className="space-y-6">
                {stanza.lines.map((line) => {
                  const isActive = activeLineId === line.id;
                  return (
                    <div
                      key={line.id}
                      data-line-id={line.id}
                      data-stanza={stanza.stanzaNumber}
                      onClick={() => scrollToLine(line.id)}
                      className={`cursor-pointer rounded-2xl p-4 sm:p-5 transition-all duration-200 border active:scale-[0.99] ${
                        isActive
                          ? 'bg-amber-500/15 border-amber-500/60 shadow-[0_0_30px_rgba(245,158,11,0.2)] ring-1 ring-amber-400/50'
                          : 'border-transparent hover:bg-slate-800/60 hover:border-slate-700/60'
                      }`}
                    >
                      <div className="flex items-start gap-3 sm:gap-4">
                        {/* Active line indicator dot */}
                        <div className="pt-2 select-none shrink-0">
                          <span
                            className={`inline-block rounded-full transition-all ${
                              isActive
                                ? 'w-3.5 h-3.5 bg-amber-400 scale-125 shadow-[0_0_12px_rgba(245,158,11,0.9)] ring-2 ring-amber-300'
                                : 'w-2.5 h-2.5 bg-slate-700'
                            }`}
                          />
                        </div>

                        <div className="flex-1 space-y-2.5 min-w-0">
                          {/* Line words formatted with prosody & emphasis */}
                          <div
                            style={{
                              fontSize: `${fontSize}px`,
                              lineHeight: 1.5,
                            }}
                            className="font-editorial font-medium tracking-normal text-white"
                          >
                            {renderLineWords(line, isActive)}
                          </div>

                          {/* Line expression note */}
                          {showExpressionGuide && line.expressionNote && (
                            <div className="text-xs sm:text-sm text-amber-300/90 italic flex items-center gap-2 pt-1">
                              <span className="text-[10px] sm:text-xs uppercase font-bold not-italic px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700/80 shrink-0">
                                Mimik & Gestur:
                              </span>
                              <span>{line.expressionNote}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* End of Poem Marker */}
          <div className="text-center py-14 border-t border-slate-800">
            <div className="inline-block px-8 py-4 bg-slate-950 border border-amber-500/40 rounded-3xl text-amber-300 shadow-xl">
              <span className="font-serif italic text-xl md:text-2xl block mb-1">
                — Selesai Pembacaan Puisi —
              </span>
              <span className="text-xs sm:text-sm text-slate-400">
                Tarik napas teratur, tatap audiens sejenak, lalu tekan tombol "Selesai & Analisis" di bawah.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 6. FLOATING TACTILE IFP TOUCH CONTROLS (Pojok Kanan Bawah untuk Pengendalian Cepat Layar Sentuh) */}
      <div className="absolute bottom-4 right-4 z-20 flex flex-col items-end gap-2 pointer-events-auto">
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-900/95 border border-slate-700 rounded-2xl shadow-2xl backdrop-blur-md">
          {/* Rewind to top */}
          <button
            type="button"
            onClick={scrollToTop}
            className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 hover:text-white rounded-xl transition-all shadow-sm"
            title="Gulir ke awal puisi"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
          </button>

          {/* Step scroll up */}
          <button
            type="button"
            onClick={() => stepScroll(-240)}
            className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 hover:text-white rounded-xl transition-all shadow-sm"
            title="Gulir ke atas 1 bait"
          >
            <ChevronUp className="w-5 h-5" />
          </button>

          {/* Step scroll down */}
          <button
            type="button"
            onClick={() => stepScroll(240)}
            className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 hover:text-white rounded-xl transition-all shadow-sm"
            title="Gulir ke bawah 1 bait"
          >
            <ChevronDown className="w-5 h-5" />
          </button>

          {/* Play / Pause toggle if callback provided */}
          {onTogglePlayPause && isPracticing && (
            <button
              type="button"
              onClick={onTogglePlayPause}
              className={`h-10 px-3.5 flex items-center gap-1.5 font-bold text-xs rounded-xl transition-all active:scale-95 shadow-md ${
                isPaused
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-display'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300'
              }`}
              title={isPaused ? 'Lanjutkan Gulir' : 'Jeda Gulir'}
            >
              {isPaused ? (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Lanjut</span>
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Jeda</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
