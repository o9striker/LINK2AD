import { NextResponse } from "next/server";

// This is a mock API route to simulate the explainability engine pipeline.
export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json(
        { message: "URL is required" },
        { status: 400 }
      );
    }

    // Simulate pipeline processing delay
    await new Promise((resolve) => setTimeout(resolve, 2500));

    // Mock script output based on the URL (just returning a generic one for now)
    const mockScript = {
      id: "pipeline-run-" + Math.random().toString(36).substring(7),
      source_url: url,
      scenes: [
        {
          scene_number: 1,
          duration_seconds: 3,
          visuals: {
            description: "A sleek hero shot of the product, fading up from black.",
            overlay_text: "Discover the Future.",
          },
          audio: {
            voiceover: "Tired of the same old results?",
            music: "Upbeat electronic track, low volume",
          },
        },
        {
          scene_number: 2,
          duration_seconds: 5,
          visuals: {
            description: "Dynamic scrolling through the product's main features or website.",
            overlay_text: "Automate your workflow in seconds.",
          },
          audio: {
            voiceover: "With our new platform, you can automate everything in just a few clicks.",
            music: "Upbeat electronic track, increasing volume",
          },
        },
        {
          scene_number: 3,
          duration_seconds: 4,
          visuals: {
            description: "Call to action screen with button and logo.",
            overlay_text: "Try it Free today.",
          },
          audio: {
            voiceover: "Click the link to get started for free.",
            music: "Upbeat electronic track, fading out",
          },
        },
      ],
      metadata: {
        generated_at: new Date().toISOString(),
        model_version: "v2.1-turbo",
        estimated_render_time: "12s",
      },
      status: "ready for render",
    };

    return NextResponse.json({
      status: "success",
      script: mockScript,
    });
  } catch (error) {
    console.error("Pipeline Error:", error);
    return NextResponse.json(
      { message: "Internal server error during pipeline execution" },
      { status: 500 }
    );
  }
}
