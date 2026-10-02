import { createAdminClient } from "@/lib/supabase/admin";
import { getAppUrl } from "@/lib/app-url";

function publicObjectUrl(bucket: string, path: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!base) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured");
  }
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

export async function uploadCardArtwork(options: {
  organizationId: string;
  cardId: string;
  frontPng: Buffer;
  backPng: Buffer;
  pdf?: Buffer;
}): Promise<{ frontUrl: string; backUrl: string; pdfUrl?: string }> {
  const admin = createAdminClient();
  const prefix = `${options.organizationId}/${options.cardId}`;
  const frontPath = `${prefix}/front.png`;
  const backPath = `${prefix}/back.png`;

  const uploads: PromiseLike<unknown>[] = [
    admin.storage.from("card-artwork").upload(frontPath, options.frontPng, {
      contentType: "image/png",
      upsert: true,
    }),
    admin.storage.from("card-artwork").upload(backPath, options.backPng, {
      contentType: "image/png",
      upsert: true,
    }),
  ];

  let pdfPath: string | undefined;
  if (options.pdf) {
    pdfPath = `${prefix}/card.pdf`;
    uploads.push(
      admin.storage.from("card-artwork").upload(pdfPath, options.pdf, {
        contentType: "application/pdf",
        upsert: true,
      })
    );
  }

  const results = await Promise.all(uploads);
  for (const result of results) {
    const error = (result as { error?: { message?: string } | null })?.error;
    if (error) {
      throw new Error(error.message || "Failed to upload card artwork");
    }
  }

  return {
    frontUrl: publicObjectUrl("card-artwork", frontPath),
    backUrl: publicObjectUrl("card-artwork", backPath),
    pdfUrl: pdfPath ? publicObjectUrl("card-artwork", pdfPath) : undefined,
  };
}

export function resolvePublicAssetUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  if (url.startsWith("/")) {
    return `${getAppUrl()}${url}`;
  }
  return `${getAppUrl()}/${url}`;
}
