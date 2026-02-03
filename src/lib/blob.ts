import { put } from "@vercel/blob";

export async function uploadToBlob(options: {
  path: string;
  buffer: Buffer;
  contentType: string;
}) {
  const { url } = await put(options.path, options.buffer, {
    access: "public",
    contentType: options.contentType,
  });
  return url;
}
