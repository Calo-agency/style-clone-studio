import { sql } from "@vercel/postgres";

export async function ensureSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS generations (
      id text PRIMARY KEY,
      created_at timestamptz DEFAULT now(),
      user_prompt text NOT NULL,
      style_prompt text NOT NULL,
      negative_prompt text,
      style_image_url text NOT NULL,
      pose_image_url text,
      results jsonb NOT NULL,
      manual_prompts jsonb NOT NULL
    );
  `;
}

export async function insertGeneration(payload: {
  id: string;
  userPrompt: string;
  stylePrompt: string;
  negativePrompt?: string | null;
  styleImageUrl: string;
  poseImageUrl?: string | null;
  results: Record<string, unknown>;
  manualPrompts: Record<string, unknown>;
}) {
  await ensureSchema();
  await sql`
    INSERT INTO generations (
      id,
      user_prompt,
      style_prompt,
      negative_prompt,
      style_image_url,
      pose_image_url,
      results,
      manual_prompts
    ) VALUES (
      ${payload.id},
      ${payload.userPrompt},
      ${payload.stylePrompt},
      ${payload.negativePrompt ?? null},
      ${payload.styleImageUrl},
      ${payload.poseImageUrl ?? null},
      ${JSON.stringify(payload.results)},
      ${JSON.stringify(payload.manualPrompts)}
    );
  `;
}

export async function listGenerations(limit = 20) {
  await ensureSchema();
  const { rows } = await sql`
    SELECT * FROM generations
    ORDER BY created_at DESC
    LIMIT ${limit};
  `;
  return rows;
}
