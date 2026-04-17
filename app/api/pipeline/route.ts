import { NextResponse } from "next/server";
import { generateAdScript } from "@/app/actions/pipeline";
import { processMediaPipeline } from "@/lib/audio/tts";

export async function POST(req: Request) {
  try {
    const { url, audioUrl } = await req.json();

    if (!url) {
      return NextResponse.json(
        { message: "URL is required" },
        { status: 400 }
      );
    }

    // 1. Core Engine: Scrape & Generate Video Script directly via Gemini
    const result = await generateAdScript(url);

    if (!result.success || !result.data) {
      return NextResponse.json(
        { message: result.error || "Failed to generate script" },
        { status: 500 }
      );
    }

    // 2. Audio Engine: Generate TTS and synchronize frame durations
    const synchronizedPayload = await processMediaPipeline(result.data, 30);

    // 3. Adapter Mapping: Construct backend payload for the frontend UI structure
    const scenes = synchronizedPayload.map((scene, i) => ({
      scene_number: i + 1,
      duration_seconds: scene.durationInFrames / 30,
      visuals: {
        description: "",
        overlay_text: scene.textOverlay,
        imageUrl: scene.sceneImage,
      },
      audio: {
        voiceover: scene.voiceoverText,
        // Prefer the user-chosen audioUrl; fall back to TTS mock
        audioUrl: audioUrl || scene.audioUrl,
      },
    }));

    return NextResponse.json({
      status: "success",
      script: {
        scenes,
        imageUrl: result.scrapedData?.images?.[0] || "",
      },
    });
  } catch (error) {
    console.error("Pipeline Error:", error);
    return NextResponse.json(
      { message: "Internal server error during pipeline execution" },
      { status: 500 }
    );
  }
}
