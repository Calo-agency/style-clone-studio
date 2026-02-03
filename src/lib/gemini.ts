import { GoogleGenAI } from "@google/genai";

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? "" });

export async function generateStylePrompt(options: {
  userPrompt: string;
  styleImage: { data: string; mimeType: string };
  poseImage?: { data: string; mimeType: string } | null;
  requestText: string;
}) {
  const parts: Array<{ inlineData?: { data: string; mimeType: string }; text?: string }> = [
    { text: options.requestText },
    { inlineData: options.styleImage },
  ];

  if (options.poseImage) {
    parts.push({ inlineData: options.poseImage });
  }

  const response = await gemini.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts }],
  });

  return response.text ?? "";
}

export async function generateGeminiImage(prompt: string) {
  const response = await gemini.models.generateImages({
    model: "imagen-4.0-generate-001",
    prompt,
    config: {
      numberOfImages: 1,
      outputMimeType: "image/png",
    },
  });

  const image = response.generatedImages?.[0];
  const bytes = image?.image?.imageBytes;
  return bytes ? Buffer.from(bytes, "base64") : null;
}
