import sharp, { type OverlayOptions } from "sharp";
import { PDFDocument } from "pdf-lib";
import type { Font } from "opentype.js";
import type { DesignConfig, DesignField, GreetingCardFieldValues } from "@/lib/types/cards";
import { generateQrPngBuffer } from "@/lib/artwork/qr";
import {
  escapeXml,
  wrapText,
  normalizeBackQrFields,
  POSTCARD_PDF_WIDTH_PT,
  POSTCARD_PDF_HEIGHT_PT,
} from "@/lib/artwork/types";
import { getAppUrl } from "@/lib/app-url";

type OpenTypeParse = (buffer: ArrayBuffer) => Font;

let parseOpenType: OpenTypeParse | null = null;
let caveatFont: Font | null = null;

async function getParseOpenType(): Promise<OpenTypeParse> {
  if (parseOpenType) return parseOpenType;

  const mod = (await import("opentype.js")) as {
    parse?: OpenTypeParse;
    default?: { parse?: OpenTypeParse };
  };
  const parseFn = mod.parse ?? mod.default?.parse;
  if (!parseFn) {
    throw new Error("opentype.js parse() is unavailable");
  }
  parseOpenType = parseFn;
  return parseFn;
}

async function getCaveatFont(): Promise<Font> {
  if (caveatFont) return caveatFont;

  const fs = await import("fs/promises");
  const path = await import("path");
  const fontPath = path.join(process.cwd(), "public", "fonts", "Caveat-Bold.ttf");
  const fontBuf = await fs.readFile(fontPath);
  const ab = fontBuf.buffer.slice(
    fontBuf.byteOffset,
    fontBuf.byteOffset + fontBuf.byteLength
  );

  
  const parse = await getParseOpenType();
  caveatFont = parse(ab);
  return caveatFont;
}

function usesCursiveFont(field: DesignField): boolean {
  if (field.key === "customer_name") return true;
  const family = field.fontFamily?.toLowerCase() ?? "";
  return family.includes("caveat") || family.includes("cursive");
}

function wrapTextByWidth(
  font: Font,
  text: string,
  fontSize: number,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    const width = font.getAdvanceWidth(next, fontSize);
    if (width > maxWidth && current) {
      lines.push(current);
      current = word;
      if (lines.length >= maxLines) break;
    } else {
      current = next;
    }
  }

  if (lines.length < maxLines && current) lines.push(current);
  return lines.slice(0, maxLines);
}


async function cursiveTextSvgOverlay(
  width: number,
  height: number,
  field: DesignField,
  value: string
): Promise<Buffer> {
  const font = await getCaveatFont();
  const fontSize = field.fontSize ?? 36;
  const color = field.color ?? "#0B1F3D";
  const align = field.align ?? "left";
  const maxLines = field.maxLines ?? 3;
  const lineHeightMultiplier = field.lineHeight ?? 1.25;
  const boxWidth = field.width ?? width - field.x;
  const lineHeight = fontSize * lineHeightMultiplier;

  const displayValue =
    field.textTransform === "uppercase" ? value.toUpperCase() : value;
  const lines = wrapTextByWidth(font, displayValue, fontSize, boxWidth, maxLines);

  const paths = lines
    .map((line, index) => {
      const lineWidth = font.getAdvanceWidth(line, fontSize);
      let x = field.x;
      if (align === "center") x = field.x + (boxWidth - lineWidth) / 2;
      else if (align === "right") x = field.x + boxWidth - lineWidth;

      const y = field.y + fontSize + index * lineHeight;
      const path = font.getPath(line, x, y, fontSize);
      return `<path d="${path.toPathData(2)}" fill="${color}"/>`;
    })
    .join("\n  ");

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  ${paths}
</svg>`;

  return Buffer.from(svg);
}

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

async function textSvgOverlay(
  width: number,
  height: number,
  field: DesignField,
  value: string
): Promise<Buffer> {
  if (usesCursiveFont(field)) {
    return cursiveTextSvgOverlay(width, height, field, value);
  }

  const fontSize = field.fontSize ?? 36;
  const color = field.color ?? "#0B1F3D";
  const align = field.align ?? "left";
  const fontWeight = field.fontWeight ?? "normal";
  const maxLines = field.maxLines ?? 3;
  const lineHeightMultiplier = field.lineHeight ?? 1.25;
  const boxWidth = field.width ?? width - field.x;
  const avgCharWidth = fontSize * 0.55;
  const maxChars = Math.max(8, Math.floor(boxWidth / avgCharWidth));

  const displayValue =
    field.textTransform === "uppercase" ? value.toUpperCase() : value;

  const lines = wrapText(displayValue, maxChars, maxLines);

  let anchor = "start";
  let textX = field.x;
  if (align === "center") {
    anchor = "middle";
    textX = field.x + boxWidth / 2;
  } else if (align === "right") {
    anchor = "end";
    textX = field.x + boxWidth;
  }

  const lineHeight = fontSize * lineHeightMultiplier;
  const letterSpacingAttr =
    field.letterSpacing != null ? ` letter-spacing="${field.letterSpacing}"` : "";
  const fontFamilyAttr = field.fontFamily ?? "Helvetica, Arial, sans-serif";
  const fontStyleAttr = field.fontStyle ? ` font-style="${field.fontStyle}"` : "";

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
    font-family="${fontFamilyAttr}"${fontStyleAttr}
    font-size="${fontSize}"
    font-weight="${fontWeight}"
    fill="${color}"${letterSpacingAttr}
  >${tspans}</text>
</svg>`;

  return Buffer.from(svg);
}

async function circularClip(imgBuf: Buffer, size: number): Promise<Buffer> {
  const r = Math.floor(size / 2);
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${r}" cy="${r}" r="${r}" fill="white"/>
    </svg>`
  );

  const resized = await sharp(imgBuf)
    .resize(size, size, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();

  return sharp(resized)
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
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
        input: await textSvgOverlay(width, height, field, value),
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

      let finalBuf: Buffer;
      if (field.shape === "circle") {
        const diameter = Math.min(w, h);
        finalBuf = await circularClip(imgBuf, diameter);
        const offsetX = Math.round(field.x + (w - diameter) / 2);
        const offsetY = Math.round(field.y + (h - diameter) / 2);
        composites.push({
          input: finalBuf,
          top: offsetY,
          left: offsetX,
        });
      } else {
        finalBuf = await sharp(imgBuf)
          .resize(w, h, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer();
        composites.push({
          input: finalBuf,
          top: Math.round(field.y),
          left: Math.round(field.x),
        });
      }
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
      fields: normalizeBackQrFields(designConfig.back.fields),
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
  widthPt = POSTCARD_PDF_WIDTH_PT,
  heightPt = POSTCARD_PDF_HEIGHT_PT
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
