"use client";

import React, { useState, useRef } from "react";
import { Music, Sparkles, Link2, Play, Square, Check, Volume2 } from "lucide-react";
import { AUDIO_LIBRARY, AudioTrack, DEFAULT_TRACK } from "@/lib/audioLibrary";

type AudioMode = "library" | "ai" | "custom";

interface AudioPickerProps {
  value: string;
  onChange: (url: string) => void;
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

// ─── Library Track Card ───────────────────────────────────────────────────────
function TrackCard({
  track,
  selected,
  onSelect,
}: {
  track: AudioTrack;
  selected: boolean;
  onSelect: (track: AudioTrack) => void;
}) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const style = moodStyle[track.color] || moodStyle.blue;

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) {
      audioRef.current = new Audio(track.url);
      audioRef.current.onended = () => setPlaying(false);
    }
    if (playing) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  // Stop audio when component unmounts or track changes
  React.useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  return (
    <button
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
            <Waveform color={track.color} playing={playing} />
          </div>
        </div>

        {/* Play button */}
        <button
          onClick={togglePlay}
          className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150
            ${playing ? `${style.bg} ${style.border} border` : "bg-secondary/60 border-border/40 border hover:bg-secondary"}`}
          aria-label={playing ? "Stop preview" : "Play preview"}
        >
          {playing
            ? <Square className={`w-3 h-3 ${style.text}`} />
            : <Play className={`w-3 h-3 text-muted-foreground group-hover:text-foreground`} />
          }
        </button>
      </div>
    </button>
  );
}

// ─── Main AudioPicker ─────────────────────────────────────────────────────────
export function AudioPicker({ value, onChange }: AudioPickerProps) {
  const [mode, setMode] = useState<AudioMode>("library");
  const [customUrl, setCustomUrl] = useState("");
  const [customPlaying, setCustomPlaying] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPicked, setAiPicked] = useState(false);
  const customAudioRef = useRef<HTMLAudioElement | null>(null);

  const tabs: { id: AudioMode; label: string; Icon: React.ElementType }[] = [
    { id: "library", label: "Library",      Icon: Music    },
    { id: "ai",      label: "AI Generated", Icon: Sparkles },
    { id: "custom",  label: "Custom URL",   Icon: Link2    },
  ];

  const handleSelectTrack = (track: AudioTrack) => {
    onChange(track.url);
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
    if (!customAudioRef.current) {
      customAudioRef.current = new Audio(customUrl);
      customAudioRef.current.onended = () => setCustomPlaying(false);
    }
    if (customPlaying) {
      customAudioRef.current.pause();
      customAudioRef.current.currentTime = 0;
      setCustomPlaying(false);
    } else {
      customAudioRef.current.src = customUrl;
      customAudioRef.current.play().catch(() => setCustomPlaying(false));
      setCustomPlaying(true);
    }
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

      {/* ── Library Tab ── */}
      {mode === "library" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {AUDIO_LIBRARY.map((track) => (
            <TrackCard
              key={track.id}
              track={track}
              selected={value === track.url}
              onSelect={handleSelectTrack}
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
              onClick={handleCustomPreview}
              disabled={!customUrl}
              className="px-3 py-2.5 rounded-lg bg-secondary border border-border/60 text-xs font-medium text-foreground hover:bg-secondary/80 transition-all disabled:opacity-40 flex items-center gap-1.5"
            >
              {customPlaying ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {customPlaying ? "Stop" : "Preview"}
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
