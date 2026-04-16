"use client";

import { Player } from '@/components/video/Player';

import { useState, useCallback } from "react";
import { Zap, Link2, Code2, Film, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PipelineResponse {
  script: Record<string, unknown>;
  status: string;
}

type EngineState = "idle" | "loading" | "success" | "error";

// ─── Syntax Highlighter ───────────────────────────────────────────────────────

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

// ─── Sub-Components ───────────────────────────────────────────────────────────

function ScriptSkeleton() {
  return (
    <div className="space-y-2 p-1">
      {[...Array(12)].map((_, i) => (
        <Skeleton
          key={i}
          className="h-4 rounded-sm"
          style={{ width: `${60 + Math.random() * 35}%`, opacity: 1 - i * 0.05 }}
        />
      ))}
    </div>
  );
}

function RenderPlaceholder({ state }: { state: EngineState }) {
  if (state === "idle") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 py-16 text-muted-foreground">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-secondary/60 flex items-center justify-center">
            <Film className="w-8 h-8 text-muted-foreground/60" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-secondary border-2 border-card flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-muted-foreground/40 status-dot" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground/80">Waiting for URL…</p>
          <p className="text-xs text-muted-foreground/50 mt-1">
            Submit a product link to begin rendering
          </p>
        </div>
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-5 py-16">
        <div className="relative w-16 h-16">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
          {/* Spinning arc */}
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary spinner" />
          {/* Inner glow */}
          <div className="absolute inset-2 rounded-full bg-primary/10 flex items-center justify-center">
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">Rendering Reel…</p>
          <p className="text-xs text-muted-foreground mt-1">Processing pipeline • Please wait</p>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-primary/60"
              style={{ animation: `status-pulse 1.4s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 py-16 text-muted-foreground">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-destructive">Pipeline Error</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Check the error details above</p>
        </div>
      </div>
    );
  }

  // state === "success"
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 py-16">
      <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
        <CheckCircle2 className="w-8 h-8 text-emerald-400" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-foreground">Reel Ready</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [url, setUrl] = useState("");
  const [engineState, setEngineState] = useState<EngineState>("idle");
  const [scriptData, setScriptData] = useState<Record<string, unknown> | null>(null);
  const { toast } = useToast();

  const isValidUrl = useCallback((value: string): boolean => {
    try {
      const parsed = new URL(value);
      return ["http:", "https:"].includes(parsed.protocol);
    } catch {
      return false;
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const trimmed = url.trim();
      const currentTimestamp = new Date().toISOString();
      console.log(`[${currentTimestamp}] Checkpoint 1: URL Submitted -> ${trimmed}`);

      if (!trimmed) {
        throw new Error("Please enter a product URL to generate a reel.");
      }

      if (!isValidUrl(trimmed)) {
        throw new Error("Please enter a valid HTTP/HTTPS URL.");
      }

      setEngineState("loading");
      setScriptData(null);

      console.log(`[${new Date().toISOString()}] Checkpoint 2: Server Action Called`);

      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: "Unknown server error" }));
        throw new Error(
          (errorBody as { message?: string }).message ?? `API error: ${response.status}`
        );
      }

      const data = (await response.json()) as PipelineResponse;

      if (!data.script) {
        throw new Error("Invalid response: missing script field");
      }

      console.log(`[${new Date().toISOString()}] Checkpoint 3: Payload Received -> ${JSON.stringify(data.script)}`);

      setScriptData(data.script);
      setEngineState("success");

      console.log(`[${new Date().toISOString()}] Checkpoint 4: State Updated, Player Mounting`);

      toast({
        title: "✓ Pipeline complete",
        description: "Script generated and reel queued for rendering.",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      console.error(`PIPELINE FRACTURE: ${message}`);
      setEngineState("error");
      setScriptData(null);
      toast({
        variant: "destructive",
        title: "Pipeline Failed",
        description: message,
      });
    }
  };

  const isLoading = engineState === "loading";
  const hasScript = engineState === "success" && scriptData !== null;

  return (
    <main className="min-h-screen gradient-mesh">
      {/* Top nav bar */}
      <nav className="border-b border-border/40 backdrop-blur-md bg-background/40 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="font-semibold text-sm tracking-tight text-foreground">
              LINK<span className="text-primary">2</span>AD
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 status-dot" />
            <span className="text-xs text-muted-foreground font-mono">pipeline online</span>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-16 space-y-14">
        {/* ── Hero Section ── */}
        <section className="text-center space-y-6 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/25 bg-primary/8 text-xs font-medium text-primary/80 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary status-dot" />
            AI-Powered Video Ad Platform
          </div>

          <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight">
            Turn any URL into a{" "}
            <span className="gradient-text">viral reel</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Paste a product link. Our AI generates the script, scenes, and renders a
            scroll-stopping video ad — fully automated.
          </p>

          {/* URL Input Form */}
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto mt-8 animate-fade-in-up-delay-1"
            aria-label="Generate Reel Form"
          >
            <div className="relative flex-1">
              <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
              <Input
                id="product-url-input"
                type="url"
                placeholder="https://example.com/product"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isLoading}
                className="pl-10 h-12 text-sm bg-secondary/40 border-border/60 focus:border-primary/50 transition-all placeholder:text-muted-foreground/40 glow-ring"
                aria-label="Product URL"
                autoComplete="url"
              />
            </div>
            <Button
              id="generate-reel-button"
              type="submit"
              disabled={isLoading}
              size="lg"
              className="h-12 px-8 font-semibold bg-primary hover:bg-primary/90 transition-all duration-200 shadow-lg shadow-primary/20 hover:shadow-primary/30 disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Generate Reel
                </>
              )}
            </Button>
          </form>

          {/* Stats row */}
          <div className="flex items-center justify-center gap-8 pt-4 animate-fade-in-up-delay-2">
            {[
              { label: "Avg. render time", value: "~12s" },
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

        {/* ── Two-column engine grid ── */}
        <section
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-up-delay-2"
          aria-label="Pipeline Engines"
        >
          {/* ── Left: Explainability Engine ── */}
          <Card
            id="explainability-engine-card"
            className="card-glow border-border/50 bg-card/60 backdrop-blur-sm"
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <Code2 className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">Explainability Engine</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Raw JSON script output
                    </CardDescription>
                  </div>
                </div>
                {/* State badge */}
                <div
                  className={`px-2 py-1 rounded-full text-xs font-mono border ${
                    engineState === "idle"
                      ? "bg-muted/40 border-border/50 text-muted-foreground/60"
                      : engineState === "loading"
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                      : engineState === "success"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-destructive/10 border-destructive/30 text-destructive"
                  }`}
                >
                  {engineState === "idle"
                    ? "standby"
                    : engineState === "loading"
                    ? "generating…"
                    : engineState === "success"
                    ? "ready"
                    : "failed"}
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <ScrollArea className="h-[420px] rounded-lg border border-border/40 bg-background/60">
                <div className="p-4 font-mono text-xs leading-relaxed">
                  {engineState === "idle" && (
                    <div className="flex flex-col items-center justify-center h-full py-24 gap-3 text-center">
                      <Code2 className="w-10 h-10 text-muted-foreground/20" />
                      <p className="text-muted-foreground/50 text-xs">
                        Script output will appear here
                      </p>
                    </div>
                  )}

                  {engineState === "loading" && <ScriptSkeleton />}

                  {hasScript && (
                    <pre
                      id="script-json-output"
                      className="whitespace-pre-wrap break-words text-xs leading-5"
                      dangerouslySetInnerHTML={{
                        __html: highlightJson(JSON.stringify(scriptData, null, 2)),
                      }}
                    />
                  )}

                  {engineState === "error" && (
                    <div className="flex flex-col items-center justify-center h-full py-24 gap-3 text-center">
                      <AlertCircle className="w-10 h-10 text-destructive/50" />
                      <p className="text-destructive/80 text-xs">
                        Pipeline failed — check logs
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* ── Right: Render Engine ── */}
          <Card
            id="render-engine-card"
            className="card-glow border-border/50 bg-card/60 backdrop-blur-sm"
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                    <Film className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">Render Engine</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      {"<RemotionPlayer />"} preview
                    </CardDescription>
                  </div>
                </div>
                <div
                  className={`px-2 py-1 rounded-full text-xs font-mono border ${
                    engineState === "idle"
                      ? "bg-muted/40 border-border/50 text-muted-foreground/60"
                      : engineState === "loading"
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                      : engineState === "success"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-destructive/10 border-destructive/30 text-destructive"
                  }`}
                >
                  {engineState === "idle"
                    ? "idle"
                    : engineState === "loading"
                    ? "rendering…"
                    : engineState === "success"
                    ? "complete"
                    : "error"}
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div
                id="remotion-player-container"
                className="h-[420px] rounded-lg border border-border/40 bg-background/60 flex items-center justify-center overflow-hidden"
                role="region"
                aria-label="Remotion Player"
                aria-live="polite"
              >
                {/* STRICT VALIDATION CHECKPOINT */}
                {engineState === "success" && scriptData && Array.isArray(scriptData) && scriptData.every(s => typeof s.textOverlay === "string" && typeof s.durationInFrames === "number") ? (
                  <Player scriptData={scriptData as any} />
                ) : (
                  <div className="text-gray-500">Awaiting URL...</div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Footer note */}
        <footer className="text-center text-xs text-muted-foreground/40 pb-6">
          LINK2AD © 2026 · AI pipeline powered by Next.js 14 App Router
        </footer>
      </div>
    </main>
  );
}
