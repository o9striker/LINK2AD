import { z } from "zod";

export const VideoScriptSchema = z.array(
  z.object({
    durationInFrames: z.number().int().positive().describe("Duration in frames (assuming 30fps)"),
    textOverlay: z.string().describe("Text to display on screen"),
    voiceoverText: z.string().describe("Voiceover text to be synthesized"),
  })
);

export type VideoScript = z.infer<typeof VideoScriptSchema>;
