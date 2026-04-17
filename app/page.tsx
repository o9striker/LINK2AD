"use client";

import { useState, useCallback } from "react";
import { Zap, Link2, Code2, Film, AlertCircle, CheckCircle2, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Player } from '@/components/video/Player';
import { AudioPicker } from '@/components/ui/AudioPicker';
import { DEFAULT_TRACK } from '@/lib/audioLibrary';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PipelineResponse {
  script: Record<string, unknown>;
  status: string;
}

type EngineState = "idle" | "loading" | "success" | "error";

// ─── Utils & Adapters ─────────────────────────────────────────────────────────

function highlightJson(json: string): string {
  return json
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = "json-number";
        if (/^"/.test(match)) {
          cls = /:$/.test(match) ? "json-key" : "json-string";
        } else if (/true|false/.test(match)) {
          cls = "json-boolean";
        } else if (/null/.test(match)) {
          cls = "json-null";
        }
        return `<span class="${cls}">${match}</span>`;
      }
    );
}

const adaptScriptForRemotion = (data: any) => {
  return (data.scenes || []).map((scene: any) => ({
    durationInFrames: (scene.duration_seconds || 3) * 30,
    textOverlay: scene.visuals?.overlay_text || "",
    voiceoverText: scene.audio?.voiceover || "",
    audioUrl: scene.audio?.audioUrl || "",
    sceneImage: scene.visuals?.imageUrl || ""
  }));
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function StatusBadge({ state }: { state: EngineState }) {
  const styles = {
    idle: "bg-muted/40 border-border/50 text-muted-foreground/60",
    loading: "bg-amber-500/10 border-amber-500/30 text-amber-400",
    success: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
    error: "bg-destructive/10 border-destructive/30 text-destructive",
  };
  const labels = {
    idle: "standby",
    loading: "generating…",
    success: "ready",
    error: "failed",
  };
  return (
    <div className={`px-2 py-1 rounded-full text-[10px] font-mono border uppercase tracking-wider ${styles[state]}`}>
      {labels[state]}
    </div>
  );
}

function ScriptSkeleton() {
  return (
    <div className="space-y-3 p-1">
      {[...Array(10)].map((_, i) => (
        <Skeleton
          key={i}
          className="h-3 rounded-sm bg-primary/5"
          style={{ width: `${40 + Math.random() * 50}%`, opacity: 1 - i * 0.08 }}
        />
      ))}
    </div>
  );
}

function RenderPlaceholder({ state }: { state: EngineState }) {
  if (state === "idle") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
        <div className="w-16 h-16 rounded-2xl bg-secondary/60 flex items-center justify-center">
          <Film className="w-8 h-8 text-muted-foreground/60" />
        </div>
        <p className="text-xs font-medium opacity-50 uppercase tracking-widest">Feed Standby</p>
      </div>
    );
  }
  if (state === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-5">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary spinner" />
          <div className="absolute inset-2 rounded-full bg-primary/10 flex items-center justify-center">
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          </div>
        </div>
        <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Rendering Frame Buffer...</p>
      </div>
    );
  }
  if (state === "error") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-destructive">
        <AlertCircle className="w-10 h-10" />
        <p className="text-xs font-bold uppercase">Pipeline Fracture</p>
      </div>
    );
  }
  return null;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [url, setUrl] = useState("");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [audioUrl, setAudioUrl] = useState(DEFAULT_TRACK.url);
  const [audioStartOffset, setAudioStartOffset] = useState(0);
  const [engineState, setEngineState] = useState<EngineState>("idle");
  const [scriptData, setScriptData] = useState<Record<string, unknown> | null>(null);
  
  // Custom Overlay State
  const [overlayText, setOverlayText] = useState("");
  const [overlaySize, setOverlaySize] = useState(60);
  const [overlayColor, setOverlayColor] = useState("#ffffff");
  const [overlayFont, setOverlayFont] = useState("Inter, sans-serif");

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const trimmed = url.trim();
      if (!trimmed) throw new Error("URL is required.");

      setEngineState("loading");
      setScriptData(null);

      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed, aspectRatio, audioUrl, audioStartOffset }),
      });

      if (!response.ok) throw new Error("Engine fault: Pipeline failed.");

      const data = (await response.json()) as PipelineResponse;
      setScriptData(data.script);
      setEngineState("success");

      toast({ title: "Pipeline Online", description: "Script and preview synchronized." });
    } catch (err: unknown) {
      setEngineState("error");
      toast({ variant: "destructive", title: "Internal Pipeline Error", description: err instanceof Error ? err.message : "Fault detected." });
    }
  };

  const handleExport = async () => {
    try {
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: { displaySurface: "browser" },
        audio: true
      });
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      const chunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = "reel-export.webm";
        a.click();
        URL.revokeObjectURL(downloadUrl);
        stream.getTracks().forEach((track: any) => track.stop());
        toast({ title: "✓ Export Complete", description: "Reel rendered and saved to local disk." });
        setIsExporting(false);
        setExportProgress(0);
      };
      
      setIsExporting(true);
      mediaRecorder.start();
      
      let progress = 0;
      const interval = setInterval(() => {
        progress += 2.5;
        if (progress >= 100) progress = 100;
        setExportProgress(progress);
      }, 100);
      
      setTimeout(() => {
        clearInterval(interval);
        if (mediaRecorder.state !== "inactive") mediaRecorder.stop();
      }, 4000);
      
    } catch (err) {
      setIsExporting(false);
      toast({ variant: "destructive", title: "Export Failed", description: "System capture was aborted." });
    }
  };

  const isLoading = engineState === "loading";

  return (
    <main className="min-h-screen gradient-mesh">
      <nav className="border-b border-border/40 backdrop-blur-md bg-background/40 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="font-semibold text-sm tracking-tight text-foreground uppercase tracking-widest">
              LINK<span className="text-primary">2</span>AD <span className="text-[10px] text-muted-foreground ml-2 font-mono opacity-40">v2.4</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 status-dot" />
            <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">core:stable</span>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-16 space-y-12">
        <section className="text-center space-y-6 animate-fade-in-up">
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none">
            Automate <span className="gradient-text">Creative</span>
          </h1>
          <p className="text-base text-muted-foreground max-w-lg mx-auto leading-relaxed opacity-60">
            High-speed AI pipeline for turning product URLs into professional reels.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-4xl mx-auto mt-8 animate-fade-in-up-delay-1">
            {/* Row 1: URL, Ratio, Sync */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                <Input
                  type="url"
                  placeholder="Paste URL..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isLoading}
                  className="pl-11 h-14 bg-secondary/30 border-border/40 glow-ring"
                />
              </div>
              <div className="relative w-full sm:w-40">
                <select
                  className="w-full h-14 bg-secondary/30 border-border/40 border text-sm px-4 rounded-md text-foreground focus:outline-none appearance-none"
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  disabled={isLoading}
                >
                  <option value="9:16">9:16 Story</option>
                  <option value="1:1">1:1 Square</option>
                  <option value="16:9">16:10 Wide</option>
                </select>
              </div>
              <Button disabled={isLoading} size="lg" className="h-14 px-10 font-bold bg-primary hover:bg-primary/90">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sync Pipeline"}
              </Button>
            </div>
            
            <AudioPicker 
              value={audioUrl} 
              onChange={setAudioUrl} 
              offset={audioStartOffset}
              onOffsetChange={setAudioStartOffset}
            />

            {/* Row 3: Custom Text Overlay Tools */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 rounded-2xl bg-muted/20 border border-border/40 backdrop-blur-sm">
              <div className="md:col-span-1 flex flex-col items-start gap-1 justify-center">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Custom Overlay</span>
                <p className="text-[10px] text-muted-foreground">Add your brand text</p>
              </div>
              
              <div className="md:col-span-1">
                <Input 
                  placeholder="Overlay Text..." 
                  value={overlayText}
                  onChange={(e) => setOverlayText(e.target.value)}
                  className="h-10 bg-background/50 text-xs"
                />
              </div>

              <div className="flex gap-2 items-center">
                 <Input 
                  type="number"
                  placeholder="Size"
                  value={overlaySize}
                  onChange={(e) => setOverlaySize(parseInt(e.target.value))}
                  className="h-10 w-20 bg-background/50 text-xs"
                />
                <input 
                  type="color" 
                  value={overlayColor}
                  onChange={(e) => setOverlayColor(e.target.value)}
                  className="w-10 h-10 rounded-md bg-transparent border-none cursor-pointer"
                />
              </div>

              <select
                className="h-10 bg-background/50 border border-border/40 text-xs px-3 rounded-md text-foreground focus:outline-none"
                value={overlayFont}
                onChange={(e) => setOverlayFont(e.target.value)}
              >
                <option value="Inter, sans-serif">Inter (Modern)</option>
                <option value="'Playfair Display', serif">Playfair (Elegant)</option>
                <option value="'JetBrains Mono', monospace">JetBrains (Tech)</option>
                <option value="Arial, sans-serif">Arial (Standard)</option>
              </select>
            </div>
          </form>

          {/* Stats row */}
          <div className="flex items-center justify-center gap-8 pt-4 animate-fade-in-up-delay-2">
            {[
              { label: "Pipeline Latency", value: "< 3s" },
              { label: "Script accuracy", value: "98.4%" },
              { label: "Supported formats", value: "9:16, 1:1, 16:9" },
            ].map((stat) => (
               <div key={stat.label} className="text-center">
                 <p className="text-sm font-semibold text-foreground">{stat.value}</p>
                 <p className="text-xs text-muted-foreground/60">{stat.label}</p>
               </div>
             ))}
          </div>
        </section>

        <section className="animate-fade-in-up-delay-2">
          <Card className="border-border/40 bg-card/40 backdrop-blur-xl overflow-hidden card-glow">
            <CardHeader className="border-b border-border/40 bg-muted/20 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Code2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">Pipeline Studio</CardTitle>
                    <CardDescription className="text-xs">Processing Node: Core-Lambda</CardDescription>
                  </div>
                </div>
                <StatusBadge state={engineState} />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-1 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-border/40">
                {/* Panel 1: Data */}
                <div className="lg:col-span-2 flex flex-col h-[520px]">
                  <div className="px-4 py-2 bg-muted/10 border-b border-border/10">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Script Telemetry</span>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="p-6 font-mono text-[11px] leading-relaxed">
                      {engineState === "loading" ? <ScriptSkeleton /> : scriptData ? (
                        <pre dangerouslySetInnerHTML={{ __html: highlightJson(JSON.stringify(scriptData, null, 2)) }} />
                      ) : (
                        <div className="h-full flex items-center justify-center opacity-20"><Code2 className="w-12 h-12" /></div>
                      )}
                    </div>
                  </ScrollArea>
                </div>

                {/* Panel 2: Preview */}
                <div className="lg:col-span-3 flex flex-col h-[520px] bg-muted/5">
                  <div className="px-4 py-2 bg-muted/10 border-b border-border/10 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Output Buffer</span>
                    {engineState === "success" && (
                      <Button variant="ghost" size="sm" onClick={handleExport} disabled={isExporting} className="h-6 text-[10px] uppercase font-bold text-primary">
                        {isExporting ? `Exporting ${Math.round(exportProgress)}%` : <><Download className="w-3 h-3 mr-1" /> Export WebM</>}
                      </Button>
                    )}
                  </div>
                  <div className="flex-1 flex items-center justify-center p-8 bg-black/20">
                    <div className="w-full h-full rounded-2xl border border-border/60 bg-background/80 flex items-center justify-center overflow-hidden relative shadow-2xl">
                    {engineState === "success" && scriptData ? (
                      <Player 
                        scriptData={adaptScriptForRemotion(scriptData)} 
                        imageUrl={(scriptData as any).imageUrl || ""} 
                        aspectRatio={aspectRatio} 
                        backgroundAudioUrl={audioUrl} 
                        audioStartOffset={audioStartOffset}
                        customOverlay={{
                          text: overlayText,
                          size: overlaySize,
                          color: overlayColor,
                          font: overlayFont
                        }}
                      />
                    ) : (
                      <RenderPlaceholder state={engineState} />
                    )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <footer className="text-center text-[10px] text-muted-foreground/30 font-mono tracking-widest uppercase pb-12">
          Pipeline Online • System Integrity Nominal • 2026
        </footer>
      </div>
    </main>
  );
}
