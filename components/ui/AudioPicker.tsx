"use client";

import React, { useState, useRef } from "react";
import { Music, Sparkles, Link2, Play, Square, Check, Volume2 } from "lucide-react";
import { AUDIO_LIBRARY, AudioTrack, DEFAULT_TRACK } from "@/lib/audioLibrary";

type AudioMode = "library" | "ai" | "custom";

interface AudioPickerProps {
  value: string;
  onChange: (url: string) => void;
  offset?: number;
  onOffsetChange?: (offset: number) => void;
  videoDuration?: number; // Added to highlight the active window
}

// ─── Mood Accent Colors ───────────────────────────────────────────────────────
const moodStyle: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  orange:  { bg: "bg-orange-500/10",  border: "border-orange-500/30",  text: "text-orange-400",  dot: "bg-orange-400"  },
  blue:    { bg: "bg-blue-500/10",    border: "border-blue-500/30",    text: "text-blue-400",    dot: "bg-blue-400"    },
  purple:  { bg: "bg-purple-500/10",  border: "border-purple-500/30",  text: "text-purple-400",  dot: "bg-purple-400"  },
  cyan:    { bg: "bg-cyan-500/10",    border: "border-cyan-500/30",    text: "text-cyan-400",    dot: "bg-cyan-400"    },
  yellow:  { bg: "bg-yellow-500/10",  border: "border-yellow-500/30",  text: "text-yellow-400",  dot: "bg-yellow-400"  },
  red:     { bg: "bg-red-500/10",     border: "border-red-500/30",     text: "text-red-400",     dot: "bg-red-400"     },
  emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400", dot: "bg-emerald-400" },
  teal:    { bg: "bg-teal-500/10",    border: "border-teal-500/30",    text: "text-teal-400",    dot: "bg-teal-400"    },
};

// ─── Mini Waveform SVG ────────────────────────────────────────────────────────
function Waveform({ color, playing }: { color: string; playing: boolean }) {
  const style = moodStyle[color] || moodStyle.blue;
  const bars = [3, 6, 10, 7, 12, 5, 9, 4, 8, 6];
  return (
    <div className="flex items-end gap-[2px] h-4">
      {bars.map((h, i) => (
        <div
          key={i}
          className={`w-[3px] rounded-full transition-all ${style.dot} ${playing ? "opacity-100" : "opacity-40"}`}
          style={{
            height: `${h}px`,
            animation: playing ? `waveBar 0.8s ease-in-out ${i * 0.08}s infinite alternate` : "none",
          }}
        />
      ))}
    </div>
  );
}

// ─── Instagram-style Waveform Selector ──────────────────────────────────────
function WaveformSelector({
  duration,
  offset,
  onChange,
  isPlaying,
  audioRef,
  videoDuration = 15,
  trackUrl
}: {
  duration: number;
  offset: number;
  onChange: (offset: number) => void;
  isPlaying: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  videoDuration?: number;
  trackUrl: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInternalDragging, setIsInternalDragging] = useState(false);
  const startX = useRef(0);
  const startScrollLeft = useRef(0);
  
  // Generate pseudo-random waveform bars based on track URL
  const pixelsPerSecond = 60; // Better scroll speed
  const barsPerSecond = 8; // Dense, smooth waveform
  const totalBars = Math.floor(duration * barsPerSecond);
  
  const bars = React.useMemo(() => {
    const result: number[] = [];
    let seed = 0;
    const stableUrl = trackUrl || "default";
    for (let i = 0; i < stableUrl.length; i++) seed += stableUrl.charCodeAt(i);
    
    for (let i = 0; i < totalBars; i++) {
      // Use multiple sine waves for a more "audio-like" waveform
      const h = 8 + 
                Math.abs(Math.sin((i + seed) * 0.2) * 15) + 
                Math.abs(Math.sin((i + seed) * 0.5) * 10) +
                Math.abs(Math.cos((i + seed) * 0.1) * 5);
      result.push(h);
    }
    return result;
  }, [trackUrl, duration, totalBars]);

  const totalWidth = duration * pixelsPerSecond;
  
  // Handle native scroll (wheel/trackpad)
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isInternalDragging) return; // Ignore native scroll events during mouse drag
    const scrollLeft = e.currentTarget.scrollLeft;
    const newOffset = Math.max(0, Math.min(duration, scrollLeft / pixelsPerSecond));
    onChange(newOffset);
    
    // Sync audio if playing (throttled/limited)
    if (audioRef.current && isPlaying) {
      if (Math.abs(audioRef.current.currentTime - newOffset) > 0.3) {
        audioRef.current.currentTime = newOffset;
      }
    }
  };

  // ─── Drag-to-Scroll Logic (Mouse) ────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    setIsInternalDragging(true);
    startX.current = e.pageX - containerRef.current.offsetLeft;
    startScrollLeft.current = containerRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isInternalDragging || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5; // Scroll speed multiplier
    const newScrollLeft = startScrollLeft.current - walk;
    containerRef.current.scrollLeft = newScrollLeft;
    
    // We don't call onChange here to avoid too many React updates, 
    // instead we let the onScroll (if fired) or handleMouseUp handle it.
    // Actually, to get real-time feedback, we should update offset.
    const newOffset = Math.max(0, Math.min(duration, newScrollLeft / pixelsPerSecond));
    onChange(newOffset);
  };

  const stopDragging = () => {
    setIsInternalDragging(false);
  };

  // Support for touch devices as well
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!containerRef.current) return;
    setIsInternalDragging(true);
    startX.current = e.touches[0].pageX - containerRef.current.offsetLeft;
    startScrollLeft.current = containerRef.current.scrollLeft;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isInternalDragging || !containerRef.current) return;
    const x = e.touches[0].pageX - containerRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    const newScrollLeft = startScrollLeft.current - walk;
    containerRef.current.scrollLeft = newScrollLeft;
    const newOffset = Math.max(0, Math.min(duration, newScrollLeft / pixelsPerSecond));
    onChange(newOffset);
  };

  // Sync scroll position when offset changes externally (only when not dragging)
  React.useEffect(() => {
    if (containerRef.current && !isInternalDragging) {
      const targetScroll = offset * pixelsPerSecond;
      if (Math.abs(containerRef.current.scrollLeft - targetScroll) > 2) {
        containerRef.current.scrollLeft = targetScroll;
      }
    }
  }, [offset, isInternalDragging]);

  return (
    <div className="relative w-full h-24 bg-black/40 rounded-xl border border-white/10 overflow-hidden cursor-ew-resize select-none">
      {/* Background Grid/Lines */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
        <div className="w-[1px] h-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)] z-20" />
      </div>

      {/* Scrollable Waveform Container */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDragging}
        onMouseLeave={stopDragging}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={stopDragging}
        className="absolute inset-0 overflow-x-auto no-scrollbar flex items-center px-[50%] active:cursor-grabbing transform-gpu"
        style={{ scrollSnapType: isInternalDragging ? "none" : "x proximity" }}
      >
        <div 
          className="flex items-end h-16 relative"
          style={{ 
            width: `${totalWidth}px`,
            minWidth: `${totalWidth}px`
          }}
        >
          {bars.map((h, i) => {
            const timeAtBar = i / barsPerSecond;
            const isActive = timeAtBar >= offset && timeAtBar <= offset + videoDuration;
            
            return (
              <div
                key={i}
                className={`rounded-full transition-all duration-300
                  ${isActive ? "bg-primary" : "bg-white/10"}
                `}
                style={{ 
                  height: `${h}px`,
                  opacity: isActive ? 1 : 0.4,
                  marginRight: "3px", // 3px width + 4.5px margin = 7.5px per bar
                  width: "4.5px",
                  minWidth: "4.5px"
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Timestamp Indicators */}
      <div className="absolute top-2 left-[50%] -translate-x-1/2 px-2 py-1 rounded bg-black/60 border border-white/10 backdrop-blur-sm z-30 pointer-events-none">
        <span className="text-[10px] font-mono font-bold text-primary">
          {Math.floor(offset / 60)}:{(Math.floor(offset) % 60).toString().padStart(2, '0')}
        </span>
      </div>
      
      {/* Instructions */}
      <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none">
          <span className="text-[8px] uppercase tracking-widest text-white/30 font-bold">Drag to Select Start</span>
      </div>
    </div>
  );
}

// ─── Library Track Card ───────────────────────────────────────────────────────
function TrackCard({
  track,
  selected,
  onSelect,
  offset = 0,
  isPlaying,
  onTogglePlay,
}: {
  track: AudioTrack;
  selected: boolean;
  onSelect: (track: AudioTrack) => void;
  offset?: number;
  isPlaying: boolean;
  onTogglePlay: (e: React.MouseEvent) => void;
}) {
  const style = moodStyle[track.color] || moodStyle.blue;

  return (
    <div
      onClick={() => onSelect(track)}
      className={`group relative w-full text-left rounded-xl border p-3 transition-all duration-200 cursor-pointer
        ${selected
          ? `${style.bg} ${style.border} ring-1 ring-inset ring-current`
          : "bg-secondary/20 border-border/40 hover:border-border/80 hover:bg-secondary/40"
        }`}
    >
      {/* Selected check */}
      {selected && (
        <div className={`absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center ${style.bg} ${style.border} border`}>
          <Check className={`w-2.5 h-2.5 ${style.text}`} />
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Mood badge */}
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${style.bg} ${style.text} border ${style.border} mb-1.5`}>
            <div className={`w-1 h-1 rounded-full ${style.dot}`} />
            {track.mood}
          </span>
          <p className="text-xs font-semibold text-foreground truncate">{track.label}</p>
          <div className="mt-1.5">
            <Waveform color={track.color} playing={isPlaying} />
          </div>
        </div>

        {/* Play button */}
        <button
          onClick={(e) => {
            e.stopPropagation(); // Critical to avoid triggering the card's onSelect
            onTogglePlay(e);
          }}
          className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150
            ${isPlaying ? `${style.bg} ${style.border} border` : "bg-secondary/60 border-border/40 border hover:bg-secondary"}`}
          aria-label={isPlaying ? "Stop preview" : "Play preview"}
        >
          {isPlaying
            ? <Square className={`w-3 h-3 ${style.text}`} />
            : <Play className={`w-3 h-3 text-muted-foreground group-hover:text-foreground`} />
          }
        </button>
      </div>
    </div>
  );
}

// ─── Main AudioPicker ─────────────────────────────────────────────────────────
export function AudioPicker({ value, onChange, offset = 0, onOffsetChange }: AudioPickerProps) {
  const [mode, setMode] = useState<AudioMode>("library");
  const [customUrl, setCustomUrl] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPicked, setAiPicked] = useState(false);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [trackDuration, setTrackDuration] = useState(120);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setHasMounted(true);
  }, []);

  // ─── Shared Audio Instance ────────────────────────────────────────────────
  React.useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      // Remove crossOrigin = "anonymous" - it's too restrictive for many MP3 links
    }
    const audio = audioRef.current;
    
    const onEnded = () => setPlayingUrl(null);
    audio.addEventListener("ended", onEnded);
    
    return () => {
      audio.removeEventListener("ended", onEnded);
      audio.pause();
    };
  }, []);

  const tabs: { id: AudioMode; label: string; Icon: React.ElementType }[] = [
    { id: "library", label: "Library",      Icon: Music    },
    { id: "ai",      label: "AI Generated", Icon: Sparkles },
    { id: "custom",  label: "Custom URL",   Icon: Link2    },
  ];

  const handleSelectTrack = (track: AudioTrack) => {
    onChange(track.url);
  };

  // ─── Track Duration Fetching ───────────────────────────────────────────────
  const fetchMetadata = React.useCallback((url: string) => {
    if (!url) return;
    setIsLoadingMetadata(true);
    const tempAudio = new Audio(url);
    tempAudio.preload = "metadata";

    const handleLoadedMetadata = () => {
      setError(null);
      setIsLoadingMetadata(false);
      if (tempAudio.duration && !isNaN(tempAudio.duration)) {
        setTrackDuration(Math.floor(tempAudio.duration));
      }
    };

    const handleError = () => {
      setIsLoadingMetadata(false);
      setError("Unable to load audio or find its duration. The link might be broken or restricted.");
    };

    tempAudio.addEventListener("loadedmetadata", handleLoadedMetadata);
    tempAudio.addEventListener("error", handleError);
    tempAudio.load();
    
    return () => {
      tempAudio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      tempAudio.removeEventListener("error", handleError);
    };
  }, []);

  // Sync duration when the selected track URL changes
  React.useEffect(() => {
    if (value) {
      fetchMetadata(value);
    }
  }, [value, fetchMetadata]);
  const toggleAudio = (url: string, startOffset: number = 0) => {
    if (!audioRef.current) return;

    if (playingUrl === url) {
      audioRef.current.pause();
      setPlayingUrl(null);
    } else {
      // 1. Pause current if playing
      audioRef.current.pause();
      
      // 2. Clear old src to avoid loading two audios at once
      audioRef.current.src = url;
      audioRef.current.load(); // Explicitly start loading

      // 3. Set up a one-time handler for when the audio is ready
      const onCanPlay = () => {
        if (audioRef.current) {
          audioRef.current.currentTime = startOffset;
          audioRef.current.play()
            .then(() => setPlayingUrl(url))
            .catch(err => {
              console.error("Audio play failed:", err);
              setPlayingUrl(null);
            });
        }
        cleanup();
      };

      const onError = (e: any) => {
        console.error("Audio source error:", e);
        setPlayingUrl(null);
        cleanup();
      };

      const cleanup = () => {
        audioRef.current?.removeEventListener("canplay", onCanPlay);
        audioRef.current?.removeEventListener("error", onError);
      };

      audioRef.current.addEventListener("canplay", onCanPlay);
      audioRef.current.addEventListener("error", onError);
    }
  };

  const handleAiGenerate = async () => {
    setAiLoading(true);
    setAiPicked(false);
    // Simulate AI generation delay — pick a random library track
    await new Promise((r) => setTimeout(r, 1800));
    const pick = AUDIO_LIBRARY[Math.floor(Math.random() * AUDIO_LIBRARY.length)];
    onChange(pick.url);
    setAiLoading(false);
    setAiPicked(true);
  };

  const handleCustomPreview = () => {
    if (!customUrl) return;
    toggleAudio(customUrl, offset);
  };

  const handleCustomApply = () => {
    if (customUrl.trim()) onChange(customUrl.trim());
  };

  const selectedTrack = AUDIO_LIBRARY.find((t) => t.url === value);

  return (
    <div className="w-full max-w-2xl mx-auto mt-6 animate-fade-in-up-delay-1">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Background Audio</span>
        </div>
        {value && (
          <span className="text-xs text-muted-foreground/60 font-mono truncate max-w-[200px]">
            {selectedTrack ? `♪ ${selectedTrack.label}` : "Custom track selected"}
          </span>
        )}
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 p-1 rounded-xl bg-secondary/30 border border-border/40 mb-4">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-200
              ${mode === id
                ? "bg-background text-foreground shadow-sm border border-border/60"
                : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Library Tab */}
      {mode === "library" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {AUDIO_LIBRARY.map((track) => (
            <TrackCard
              key={track.id}
              track={track}
              selected={value === track.url}
              onSelect={() => onChange(track.url)}
              offset={offset}
              isPlaying={playingUrl === track.url}
              onTogglePlay={(e) => {
                e.stopPropagation();
                toggleAudio(track.url, offset);
              }}
            />
          ))}
        </div>
      )}

      {/* ── AI Generated Tab ── */}
      {mode === "ai" && (
        <div className="rounded-xl border border-border/40 bg-secondary/20 p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
            <Sparkles className="w-7 h-7 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">AI Audio Generation</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              Let the AI pick the perfect mood-matched background track for your reel.
            </p>
          </div>
          <button
            onClick={handleAiGenerate}
            disabled={aiLoading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all disabled:opacity-60"
          >
            {aiLoading ? (
              <>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Generate Track
              </>
            )}
          </button>
          {aiPicked && value && (
            <div className="flex items-center justify-center gap-2 text-xs text-emerald-400">
              <Check className="w-3.5 h-3.5" />
              Track selected: <span className="font-semibold">{selectedTrack?.label ?? "Custom"}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Custom URL Tab ── */}
      {mode === "custom" && (
        <div className="rounded-xl border border-border/40 bg-secondary/20 p-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Paste a direct link to any <span className="text-foreground font-medium">.mp3</span> or{" "}
            <span className="text-foreground font-medium">.wav</span> file.
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50 pointer-events-none" />
              <input
                type="url"
                placeholder="https://example.com/track.mp3"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg text-xs bg-background/60 border border-border/60 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground/40 transition-all"
              />
            </div>
            <button
              onClick={() => {
                fetchMetadata(customUrl);
                handleCustomPreview();
              }}
              disabled={!customUrl || isLoadingMetadata}
              className="px-3 py-2.5 rounded-lg bg-secondary border border-border/60 text-xs font-medium text-foreground hover:bg-secondary/80 transition-all disabled:opacity-40 flex items-center gap-1.5"
            >
              {isLoadingMetadata ? (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
              ) : playingUrl === customUrl ? (
                <Square className="w-3 h-3" />
              ) : (
                <Play className="w-3 h-3" />
              )}
              {playingUrl === customUrl ? "Stop" : "Preview"}
            </button>
          </div>
          <button
            onClick={handleCustomApply}
            disabled={!customUrl.trim()}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <Check className="w-3.5 h-3.5" />
            Use This Track
          </button>
          {value === customUrl.trim() && customUrl && (
            <p className="text-xs text-emerald-400 text-center flex items-center justify-center gap-1">
              <Check className="w-3 h-3" /> Applied
            </p>
          )}
        </div>
      )}

      {/* ── Audio Offset Selector (Instagram Style) ── */}
      {(value || (mode === "custom" && customUrl)) && onOffsetChange && (
        <div className="mt-6 space-y-4 animate-fade-in-up">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/80">Music Selector</span>
            </div>
            <div className="flex items-center gap-1.5 bg-secondary/30 px-2 py-1 rounded-md border border-border/40">
              <Volume2 className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-mono text-muted-foreground">
                {Math.floor(trackDuration / 60)}:{(trackDuration % 60).toString().padStart(2, '0')} Total
              </span>
            </div>
          </div>
          
          {hasMounted ? (
            <WaveformSelector 
              duration={trackDuration}
              offset={offset}
              onChange={onOffsetChange}
              isPlaying={playingUrl === (mode === "custom" ? (customUrl || value) : value)}
              audioRef={audioRef}
              trackUrl={mode === "custom" ? (customUrl || value) : value}
              videoDuration={15} // Defaulting to 15s for highlight
            />
          ) : (
            <div className="w-full h-24 bg-black/40 rounded-xl border border-white/10 animate-pulse flex items-center justify-center">
               <Volume2 className="w-5 h-5 text-white/10" />
            </div>
          )}

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg animate-shake">
              <p className="text-[10px] text-destructive font-medium text-center">
                {error}
              </p>
            </div>
          )}
          
          <div className="flex justify-between text-[10px] text-muted-foreground/40 font-bold px-1 transition-opacity duration-300">
            <span>0:00</span>
            <div className="flex items-center gap-4">
               <span className="text-primary/60 italic">Drag waveform to find your segment</span>
            </div>
            <span>{Math.floor(trackDuration / 60)}:{(trackDuration % 60).toString().padStart(2, '0')}</span>
          </div>
        </div>
      )}

      {/* Inline keyframes for waveform animation */}
      <style jsx>{`
        @keyframes waveBar {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1.2); }
        }
      `}</style>
    </div>
  );
}
