import sharp, { type OverlayOptions } from "sharp";
import { PDFDocument } from "pdf-lib";
import type { DesignConfig, DesignField, GreetingCardFieldValues } from "@/lib/types/cards";
import { generateQrPngBuffer } from "@/lib/artwork/qr";
import { escapeXml, wrapText } from "@/lib/artwork/types";
import { getAppUrl } from "@/lib/app-url";

async function fetchBuffer(url: string): Promise<Buffer> {
  const fs = await import("fs/promises");
  const path = await import("path");

  if (url.startsWith("/") && !url.startsWith("//")) {
    const localPath = path.join(process.cwd(), "public", url.replace(/^\//, ""));
    try {
      return await fs.readFile(localPath);
    } catch {
      const absolute = `${getAppUrl()}${url}`;
      const response = await fetch(absolute);
      if (!response.ok) {
        throw new Error(`Failed to load asset: ${url}`);
      }
      return Buffer.from(await response.arrayBuffer());
    }
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load asset: ${url}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  const filePath = url.startsWith("public/")
    ? path.join(process.cwd(), url)
    : path.join(process.cwd(), "public", url.replace(/^\//, ""));
  return fs.readFile(filePath);
}

function textSvgOverlay(
  width: number,
  height: number,
  field: DesignField,
  value: string
): Buffer {
  const fontSize = field.fontSize ?? 36;
  const color = field.color ?? "#0B1F3D";
  const align = field.align ?? "left";
  const fontWeight = field.fontWeight ?? "normal";
  const maxLines = field.maxLines ?? 3;
  const boxWidth = field.width ?? width - field.x;
  const avgCharWidth = fontSize * 0.55;
  const maxChars = Math.max(8, Math.floor(boxWidth / avgCharWidth));
  const lines = wrapText(value, maxChars, maxLines);

  let anchor = "start";
  let textX = field.x;
  if (align === "center") {
    anchor = "middle";
    textX = field.x + boxWidth / 2;
  } else if (align === "right") {
    anchor = "end";
    textX = field.x + boxWidth;
  }

  const lineHeight = fontSize * 1.25;
  const tspans = lines
    .map((line, index) => {
      const dy = index === 0 ? 0 : lineHeight;
      return `<tspan x="${textX}" dy="${dy}">${escapeXml(line)}</tspan>`;
    })
    .join("");

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <text
    x="${textX}"
    y="${field.y + fontSize}"
    text-anchor="${anchor}"
    font-family="Helvetica, Arial, sans-serif"
    font-size="${fontSize}"
    font-weight="${fontWeight}"
    fill="${color}"
  >${tspans}</text>
</svg>`;

  return Buffer.from(svg);
}

async function composeSide(options: {
  backgroundUrl: string;
  fields: DesignField[];
  values: GreetingCardFieldValues;
  qrToken: string;
  width: number;
  height: number;
}): Promise<Buffer> {
  const { backgroundUrl, fields, values, qrToken, width, height } = options;
  const background = await fetchBuffer(backgroundUrl);

  const composites: OverlayOptions[] = [];

  for (const field of fields) {
    if (field.type === "text") {
      const value = values[field.key]?.trim();
      if (!value) continue;
      composites.push({
        input: textSvgOverlay(width, height, field, value),
        top: 0,
        left: 0,
      });
      continue;
    }

    if (field.type === "image") {
      const imageUrl = values[field.key];
      if (!imageUrl) continue;
      const imgBuf = await fetchBuffer(imageUrl);
      const w = field.width ?? 200;
      const h = field.height ?? 200;
      const resized = await sharp(imgBuf)
        .resize(w, h, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
      composites.push({
        input: resized,
        top: Math.round(field.y),
        left: Math.round(field.x),
      });
      continue;
    }

    if (field.type === "qr") {
      const size = field.size ?? field.width ?? 280;
      const respondUrl = `${getAppUrl()}/respond/${qrToken}`;
      const qrBuf = await generateQrPngBuffer(respondUrl, size);
      composites.push({
        input: qrBuf,
        top: Math.round(field.y),
        left: Math.round(field.x),
      });
    }
  }

  return sharp(background)
    .resize(width, height, { fit: "cover" })
    .composite(composites)
    .png()
    .toBuffer();
}

export async function composePostcardArtwork(options: {
  designConfig: DesignConfig;
  frontBackgroundUrl: string;
  backBackgroundUrl: string;
  fieldValues: GreetingCardFieldValues;
  qrToken: string;
}): Promise<{ frontPng: Buffer; backPng: Buffer }> {
  const { designConfig, frontBackgroundUrl, backBackgroundUrl, fieldValues, qrToken } =
    options;

  const width = designConfig.width;
  const height = designConfig.height;

  const [frontPng, backPng] = await Promise.all([
    composeSide({
      backgroundUrl: frontBackgroundUrl,
      fields: designConfig.front.fields,
      values: fieldValues,
      qrToken,
      width,
      height,
    }),
    composeSide({
      backgroundUrl: backBackgroundUrl,
      fields: designConfig.back.fields,
      values: fieldValues,
      qrToken,
      width,
      height,
    }),
  ]);

  return { frontPng, backPng };
}

export async function postcardPngsToPdf(
  frontPng: Buffer,
  backPng: Buffer,
  widthPt = 432,
  heightPt = 288
): Promise<Buffer> {
  const pdf = await PDFDocument.create();

  for (const png of [frontPng, backPng]) {
    const image = await pdf.embedPng(png);
    const page = pdf.addPage([widthPt, heightPt]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: widthPt,
      height: heightPt,
    });
  }

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}
