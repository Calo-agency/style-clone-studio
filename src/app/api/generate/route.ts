import { NextResponse } from "next/server";
import OpenAI from "openai";
import Replicate from "replicate";
import { z } from "zod";
import { uploadToBlob } from "@/lib/blob";
import { buildStylePromptRequest } from "@/lib/prompts";
import { generateGeminiImage, generateStylePrompt } from "@/lib/gemini";
import { insertGeneration } from "@/lib/db";

export const runtime = "nodejs";

const promptSchema = z.object({
  style_summary: z.string(),
  final_prompt: z.string(),
  negative_prompt: z.string().optional().default(""),
});

function toBase64(file: File) {
  return file.arrayBuffer().then((buffer) => Buffer.from(buffer));
}

function parseGeminiJson(text: string) {
  const trimmed = text.trim();
  try {
    return promptSchema.parse(JSON.parse(trimmed));
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end !== -1) {
      try {
        const sliced = trimmed.slice(start, end + 1);
        return promptSchema.parse(JSON.parse(sliced));
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const styleFile = formData.get("style") as File | null;
    const poseFile = formData.get("pose") as File | null;
    const userPrompt = String(formData.get("prompt") ?? "").trim();

    if (!styleFile || !userPrompt) {
      return NextResponse.json(
        { error: "Envie uma referencia de estilo e um prompt." },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY || !process.env.GEMINI_API_KEY || !process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: "Configure OPENAI_API_KEY, GEMINI_API_KEY e REPLICATE_API_TOKEN." },
        { status: 500 }
      );
    }

    const styleBuffer = await toBase64(styleFile);
    const poseBuffer = poseFile ? await toBase64(poseFile) : null;

    const styleImageUrl = await uploadToBlob({
      path: `inputs/${crypto.randomUUID()}-${styleFile.name}`,
      buffer: styleBuffer,
      contentType: styleFile.type || "image/png",
    });

    const poseImageUrl = poseBuffer
      ? await uploadToBlob({
          path: `inputs/${crypto.randomUUID()}-${poseFile?.name ?? "pose.png"}`,
          buffer: poseBuffer,
          contentType: poseFile?.type || "image/png",
        })
      : null;

    const geminiRequest = buildStylePromptRequest(userPrompt);
    const geminiText = await generateStylePrompt({
      userPrompt,
      requestText: geminiRequest,
      styleImage: {
        data: styleBuffer.toString("base64"),
        mimeType: styleFile.type || "image/png",
      },
      poseImage: poseBuffer
        ? { data: poseBuffer.toString("base64"), mimeType: poseFile?.type || "image/png" }
        : null,
    });

    const parsed = parseGeminiJson(geminiText) ?? {
      style_summary: "High-detail illustration style with cinematic lighting.",
      final_prompt: `${userPrompt}. Render in a refined illustrative style with rich textures, cinematic lighting, and clean composition.`,
      negative_prompt: "low quality, blurry, distorted, watermark",
    };

    const finalPrompt = parsed.final_prompt.trim();
    const negativePrompt = parsed.negative_prompt?.trim() || "";

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

    const styleImageFile = new File([styleBuffer], styleFile.name || "style.png", {
      type: styleFile.type || "image/png",
    });

    const poseImageFile = poseBuffer
      ? new File([poseBuffer], poseFile?.name || "pose.png", { type: poseFile?.type || "image/png" })
      : null;

    const openaiPromise = openai.images.edit({
      model: "gpt-image-1",
      image: poseImageFile ? [styleImageFile, poseImageFile] : [styleImageFile],
      prompt: finalPrompt,
      size: "1024x1024",
      response_format: "b64_json",
    });

    const geminiImagePromise = generateGeminiImage(finalPrompt);

    const fluxPromise = replicate.run("black-forest-labs/flux-2-dev", {
      input: {
        prompt: finalPrompt,
        guidance: 3.5,
        num_outputs: 1,
      },
    });

    const sdxlPromise = replicate.run("stability-ai/sdxl", {
      input: {
        prompt: finalPrompt,
        negative_prompt: negativePrompt,
        num_outputs: 1,
      },
    });

    const [openaiResult, geminiImage, fluxResult, sdxlResult] = await Promise.all([
      openaiPromise,
      geminiImagePromise,
      fluxPromise,
      sdxlPromise,
    ]);

    const openaiB64 = openaiResult.data[0]?.b64_json;
    const openaiBuffer = openaiB64 ? Buffer.from(openaiB64, "base64") : null;
    const geminiBuffer = geminiImage ?? null;

    const fluxUrl = Array.isArray(fluxResult) ? fluxResult[0] : fluxResult;
    const sdxlUrl = Array.isArray(sdxlResult) ? sdxlResult[0] : sdxlResult;

    const openaiUrl = openaiBuffer
      ? await uploadToBlob({
          path: `outputs/openai-${crypto.randomUUID()}.png`,
          buffer: openaiBuffer,
          contentType: "image/png",
        })
      : null;

    const geminiUrl = geminiBuffer
      ? await uploadToBlob({
          path: `outputs/gemini-${crypto.randomUUID()}.png`,
          buffer: geminiBuffer,
          contentType: "image/png",
        })
      : null;

    const fluxBlobUrl = typeof fluxUrl === "string"
      ? await fetch(fluxUrl)
          .then((res) => res.arrayBuffer())
          .then((buffer) =>
            uploadToBlob({
              path: `outputs/flux-${crypto.randomUUID()}.png`,
              buffer: Buffer.from(buffer),
              contentType: "image/png",
            })
          )
      : null;

    const sdxlBlobUrl = typeof sdxlUrl === "string"
      ? await fetch(sdxlUrl)
          .then((res) => res.arrayBuffer())
          .then((buffer) =>
            uploadToBlob({
              path: `outputs/sdxl-${crypto.randomUUID()}.png`,
              buffer: Buffer.from(buffer),
              contentType: "image/png",
            })
          )
      : null;

    const id = crypto.randomUUID();

    const results = {
      openai: openaiUrl,
      gemini: geminiUrl,
      flux: fluxBlobUrl,
      sdxl: sdxlBlobUrl,
    };

    const manualPrompts = {
      sora: finalPrompt,
      imagefx: finalPrompt,
    };

    await insertGeneration({
      id,
      userPrompt,
      stylePrompt: parsed.style_summary,
      negativePrompt,
      styleImageUrl,
      poseImageUrl,
      results,
      manualPrompts,
    });

    return NextResponse.json({
      id,
      userPrompt,
      stylePrompt: parsed.style_summary,
      finalPrompt,
      negativePrompt,
      styleImageUrl,
      poseImageUrl,
      results,
      manualPrompts,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Falha ao gerar imagens. Tente novamente." },
      { status: 500 }
    );
  }
}
