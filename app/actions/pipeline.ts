"use server";

import * as cheerio from "cheerio";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { VideoScriptSchema, VideoScript } from "@/lib/schema";

// Initialize the Google Generative AI client
// Assumes process.env.GEMINI_API_KEY is set in your environment
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface ScrapedData {
  title: string;
  description: string;
  image: string;
}

export interface PipelineResult {
  success: boolean;
  data?: VideoScript;
  scrapedData?: ScrapedData;
  error?: string;
  isMocked?: boolean;
}

export async function generateAdScript(url: string): Promise<PipelineResult> {
  let html = "";
  let isMocked = false;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"'
      },
      // Timeout is helpful for server actions
      signal: AbortSignal.timeout(10000),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }
    
    html = await response.text();
  } catch (error) {
    console.warn("Target blocked scrape, using fallback");
    console.error("Fetch failed, falling back to mock data:", error);
    isMocked = true;
    html = `
      <html>
        <head>
          <meta property="og:title" content="Mock Product - The Ultimate Test Item" />
          <meta property="og:description" content="This is a mock product generated because the original URL could not be fetched due to CORS or a 403 error. It is a highly effective, premium widget designed to improve your daily workflow." />
          <meta property="og:image" content="https://example.com/mock-product.jpg" />
        </head>
      </html>
    `;
  }

  // Parse HTML using Cheerio
  const $ = cheerio.load(html);
  
  const title = $('meta[property="og:title"]').attr("content") || $("title").text() || "Unknown Product";
  const description = $('meta[property="og:description"]').attr("content") || $('meta[name="description"]').attr("content") || "No description available.";
  const image = $('meta[property="og:image"]').attr("content") || "";

  const scrapedData: ScrapedData = { title, description, image };

  try {
    // Integrate LLM
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              durationInFrames: { type: SchemaType.NUMBER },
              textOverlay: { type: SchemaType.STRING },
              voiceoverText: { type: SchemaType.STRING }
            },
            required: ["durationInFrames", "textOverlay", "voiceoverText"],
          }
        }
      },
    });

    const prompt = `Write a 15-sec high-converting video ad script.
Title: ${title}
Desc: ${description}

Return ONLY the required JSON fields. durationInFrames MUST add to 450.`;

    const result = await model.generateContent(prompt);
    
    const textResponse = result.response.text();
    let parsedJson;
    try {
      parsedJson = JSON.parse(textResponse);
    } catch (parseError) {
      console.error("Failed to parse LLM response as JSON:", parseError, textResponse.substring(0, 100) + "...");
      throw new Error("LLM did not return valid JSON");
    }

    // Force validation via Zod
    let validatedScript;
    try {
      validatedScript = VideoScriptSchema.parse(parsedJson);
    } catch {
      throw new Error("ZOD SCHEMA VALIDATION FAILED");
    }

    return {
      success: true,
      data: validatedScript,
      scrapedData,
      isMocked
    };
  } catch (error) {
    console.error("LLM Generation or Validation failed:", error);
    return {
      success: false,
      scrapedData,
      isMocked,
      error: error instanceof Error ? error.message : "Unknown error occurred during generation",
    };
  }
}
