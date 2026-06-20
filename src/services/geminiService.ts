import { GoogleGenAI, Type } from "@google/genai";
import { SEOInsight } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateVideoSEO = async (videoTitle: string): Promise<SEOInsight> => {
  if (!process.env.API_KEY) {
    // Fallback mock data if no API key
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          optimizedTitle: "Ultimate Guide: " + videoTitle + " (2025 Tutorial)",
          tags: ["#viral", "#guide", "#tutorial", "#tech", "#2025"],
          description: "In this video, we dive deep into " + videoTitle + ". Learn the best strategies and tips to master this topic quickly. Don't forget to like and subscribe for more content!"
        });
      }, 1500);
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate SEO metadata for a YouTube video with the title: "${videoTitle}". Provide a catchy optimized title, 5 relevant hashtags, and a short engaging description.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            optimizedTitle: { type: Type.STRING },
            tags: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            description: { type: Type.STRING }
          },
          required: ["optimizedTitle", "tags", "description"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as SEOInsight;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Unable to generate SEO insights.");
  }
};