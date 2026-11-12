import sharp, { type OverlayOptions } from "sharp";
import { PDFDocument } from "pdf-lib";
import type { Font } from "opentype.js";
import type { DesignConfig, DesignField, GreetingCardFieldValues } from "@/lib/types/cards";
import { generateQrPngBuffer } from "@/lib/artwork/qr";
import {
  normalizeBackQrFields,
  POSTCARD_PDF_WIDTH_PT,
  POSTCARD_PDF_HEIGHT_PT,
} from "@/lib/artwork/types";
import {
  isEverliaBrandLogoUrl,
  logoColorsFromFields,
  renderEverliaLogoPng,
} from "@/lib/artwork/everlia-logo";
import { getAppUrl } from "@/lib/app-url";

type OpenTypeParse = (buffer: ArrayBuffer) => Font;

type BundledFontId = "caveat-bold" | "noto-sans-regular" | "noto-sans-bold";

const BUNDLED_FONT_FILES: Record<BundledFontId, string> = {
  "caveat-bold": "Caveat-Bold.ttf",
  "noto-sans-regular": "NotoSans-Regular.ttf",
  "noto-sans-bold": "NotoSans-Bold.ttf",
};

let parseOpenType: OpenTypeParse | null = null;
const fontCache = new Map<BundledFontId, Font>();
const fontFileCache = new Map<BundledFontId, Buffer>();
const glyphPngCache = new Map<string, Buffer>();

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

async function loadFontFileBuffer(filename: string): Promise<Buffer> {
  const fs = await import("fs/promises");
  const path = await import("path");

  const candidates = [
    path.join(process.cwd(), "public", "fonts", filename),
    path.join(process.cwd(), ".next", "server", "public", "fonts", filename),
  ];
  if (typeof __dirname === "string") {
    candidates.push(
      path.join(__dirname, "..", "..", "public", "fonts", filename)
    );
  }

  for (const fontPath of candidates) {
    try {
      return await fs.readFile(fontPath);
    } catch {
    }
  }

  const response = await fetch(`${getAppUrl()}/fonts/${filename}`);
  if (!response.ok) {
    throw new Error(
      `Failed to load ${filename} (local missing, HTTP ${response.status})`
    );
  }
  return Buffer.from(await response.arrayBuffer());
}

async function getBundledFontFile(id: BundledFontId): Promise<Buffer> {
  const cached = fontFileCache.get(id);
  if (cached) return cached;
  const fontBuf = await loadFontFileBuffer(BUNDLED_FONT_FILES[id]);
  fontFileCache.set(id, fontBuf);
  return fontBuf;
}

async function getBundledFont(id: BundledFontId): Promise<Font> {
  const cached = fontCache.get(id);
  if (cached) return cached;

  const fontBuf = await getBundledFontFile(id);
  const ab = fontBuf.buffer.slice(
    fontBuf.byteOffset,
    fontBuf.byteOffset + fontBuf.byteLength
  );

  const parse = await getParseOpenType();
  const font = parse(ab as ArrayBuffer);
  fontCache.set(id, font);
  return font;
}

function usesCursiveFont(field: DesignField): boolean {
  if (field.key === "customer_name") return true;
  const family = field.fontFamily?.toLowerCase() ?? "";
  return family.includes("caveat") || family.includes("cursive");
}

function resolveBundledFontId(field: DesignField): BundledFontId {
  if (usesCursiveFont(field)) return "caveat-bold";
  if (field.fontWeight === "bold") return "noto-sans-bold";
  return "noto-sans-regular";
}

function measureTextWidth(
  font: Font,
  text: string,
  fontSize: number,
  letterSpacing = 0
): number {
  const base = font.getAdvanceWidth(text, fontSize);
  if (!letterSpacing || text.length <= 1) return base;
  return base + letterSpacing * (text.length - 1);
}

function breakWordToWidth(
  font: Font,
  word: string,
  fontSize: number,
  maxWidth: number,
  letterSpacing = 0
): string[] {
  if (measureTextWidth(font, word, fontSize, letterSpacing) <= maxWidth) {
    return [word];
  }

  const chunks: string[] = [];
  let rest = word;
  while (rest.length > 0) {
    let lo = 1;
    let hi = rest.length;
    let best = 1;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      const slice = rest.slice(0, mid);
      if (measureTextWidth(font, slice, fontSize, letterSpacing) <= maxWidth) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    chunks.push(rest.slice(0, best));
    rest = rest.slice(best);
  }
  return chunks;
}

function ellipsizeToWidth(
  font: Font,
  text: string,
  fontSize: number,
  maxWidth: number,
  letterSpacing = 0
): string {
  const ellipsis = "…";
  if (measureTextWidth(font, text, fontSize, letterSpacing) <= maxWidth) {
    return text;
  }
  let lo = 0;
  let hi = text.length;
  let best = 0;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const candidate = `${text.slice(0, mid).trimEnd()}${ellipsis}`;
    if (measureTextWidth(font, candidate, fontSize, letterSpacing) <= maxWidth) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (best <= 0) return ellipsis;
  return `${text.slice(0, best).trimEnd()}${ellipsis}`;
}

function wrapTextByWidth(
  font: Font,
  text: string,
  fontSize: number,
  maxWidth: number,
  maxLines: number,
  letterSpacing = 0
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const tokens = words.flatMap((word) =>
    breakWordToWidth(font, word, fontSize, maxWidth, letterSpacing)
  );
  const lines: string[] = [];
  let current = "";
  let tokenIndex = 0;

  while (tokenIndex < tokens.length) {
    const token = tokens[tokenIndex]!;
    const next = current ? `${current} ${token}` : token;
    const width = measureTextWidth(font, next, fontSize, letterSpacing);

    if (width > maxWidth && current) {
      lines.push(current);
      current = "";
      if (lines.length >= maxLines) break;
      continue;
    }

    current = next;
    tokenIndex += 1;
  }

  if (lines.length < maxLines && current) {
    lines.push(current);
    current = "";
    tokenIndex = tokens.length;
  }

  const truncated =
    tokenIndex < tokens.length || Boolean(current) || lines.length > maxLines;
  const clipped = lines.slice(0, maxLines);

  if (truncated && clipped.length > 0) {
    const last = clipped.length - 1;
    clipped[last] = ellipsizeToWidth(
      font,
      clipped[last]!,
      fontSize,
      maxWidth,
      letterSpacing
    );
  }

  return clipped;
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

type PreparedTextLayout = {
  font: Font;
  fontId: BundledFontId;
  fontSize: number;
  color: string;
  letterSpacing: number;
  lines: Array<{ text: string; x: number; baselineY: number }>;
  needsShadow: boolean;
};

function prepareTextLayout(
  width: number,
  field: DesignField,
  value: string,
  font: Font,
  fontId: BundledFontId
): PreparedTextLayout {
  const fontSize = field.fontSize ?? 36;
  const color = field.color ?? "#0B1F3D";
  const align = field.align ?? "left";
  const maxLines = field.maxLines ?? 3;
  const lineHeightMultiplier = field.lineHeight ?? 1.25;
  const boxWidth = field.width ?? width - field.x;
  const lineHeight = fontSize * lineHeightMultiplier;
  const letterSpacing = field.letterSpacing ?? 0;

  const displayValue =
    field.textTransform === "uppercase" ? value.toUpperCase() : value;
  const wrapped = wrapTextByWidth(
    font,
    displayValue,
    fontSize,
    boxWidth,
    maxLines,
    letterSpacing
  );

  const lines = wrapped.map((text, index) => {
    const lineWidth = measureTextWidth(font, text, fontSize, letterSpacing);
    let x = field.x;
    if (align === "center") x = field.x + (boxWidth - lineWidth) / 2;
    else if (align === "right") x = field.x + boxWidth - lineWidth;
    return {
      text,
      x,
      baselineY: field.y + fontSize + index * lineHeight,
    };
  });

  return {
    font,
    fontId,
    fontSize,
    color,
    letterSpacing,
    lines,
    needsShadow: isLightFillColor(color),
  };
}

async function renderTextWithGlyphPaths(
  width: number,
  height: number,
  layout: PreparedTextLayout
): Promise<Buffer> {
  const pathNodes: string[] = [];

  for (const line of layout.lines) {
    let cursor = line.x;
    for (const char of line.text) {
      const d = layout.font
        .getPath(char, cursor, line.baselineY, layout.fontSize)
        .toPathData(3);
      if (d) {
        if (layout.needsShadow) {
          pathNodes.push(
            `<path d="${d}" fill="rgba(10,8,12,0.55)" transform="translate(0 2)"/>`
          );
        }
        pathNodes.push(`<path d="${d}" fill="${layout.color}"/>`);
      }
      cursor +=
        layout.font.getAdvanceWidth(char, layout.fontSize) +
        layout.letterSpacing;
    }
  }

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  ${pathNodes.join("\n  ")}
</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function rasterizeGlyphPng(
  font: Font,
  fontId: BundledFontId,
  char: string,
  fontSize: number,
  color: string
): Promise<{ png: Buffer; x1: number; y1: number; advance: number } | null> {
  const advance = font.getAdvanceWidth(char, fontSize);
  if (char === " ") {
    return { png: Buffer.alloc(0), x1: 0, y1: 0, advance };
  }

  const path = font.getPath(char, 0, 0, fontSize);
  const bb = path.getBoundingBox();
  const pad = 3;
  const gw = Math.max(1, Math.ceil(bb.x2 - bb.x1) + pad * 2);
  const gh = Math.max(1, Math.ceil(bb.y2 - bb.y1) + pad * 2);
  if (!Number.isFinite(gw) || !Number.isFinite(gh) || gw > 2000 || gh > 2000) {
    return null;
  }

  const cacheKey = `${fontId}|${fontSize}|${color}|${char}`;
  let png = glyphPngCache.get(cacheKey);
  if (!png) {
    const ox = -bb.x1 + pad;
    const oy = -bb.y1 + pad;
    const d = font.getPath(char, ox, oy, fontSize).toPathData(3);
    if (!d) {
      return { png: Buffer.alloc(0), x1: 0, y1: 0, advance };
    }
    const gsvg = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${gw}" height="${gh}"><path d="${d}" fill="${color}"/></svg>`
    );
    png = await sharp(gsvg).png().toBuffer();
    glyphPngCache.set(cacheKey, png);
  }

  return { png, x1: bb.x1 - pad, y1: bb.y1 - pad, advance };
}

async function renderTextWithGlyphPngs(
  width: number,
  height: number,
  layout: PreparedTextLayout
): Promise<Buffer> {
  const composites: OverlayOptions[] = [];

  for (const line of layout.lines) {
    let cursor = line.x;
    for (const char of line.text) {
      if (layout.needsShadow && char !== " ") {
        const shadow = await rasterizeGlyphPng(
          layout.font,
          layout.fontId,
          char,
          layout.fontSize,
          "rgba(10,8,12,0.55)"
        );
        if (shadow?.png.length) {
          composites.push({
            input: shadow.png,
            left: Math.round(cursor + shadow.x1),
            top: Math.round(line.baselineY + shadow.y1 + 2),
          });
        }
      }

      const glyph = await rasterizeGlyphPng(
        layout.font,
        layout.fontId,
        char,
        layout.fontSize,
        layout.color
      );
      if (!glyph) {
        cursor += layout.font.getAdvanceWidth(char, layout.fontSize);
        continue;
      }
      if (glyph.png.length) {
        composites.push({
          input: glyph.png,
          left: Math.round(cursor + glyph.x1),
          top: Math.round(line.baselineY + glyph.y1),
        });
      }
      cursor += glyph.advance + layout.letterSpacing;
    }
  }

  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toBuffer();
}

async function textSvgOverlay(
  width: number,
  height: number,
  field: DesignField,
  value: string
): Promise<Buffer> {
  const fontId = resolveBundledFontId(field);
  const font = await getBundledFont(fontId);
  const layout = prepareTextLayout(width, field, value, font, fontId);
  if (layout.lines.length === 0) {
    return sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .png()
      .toBuffer();
  }

  if (fontId === "caveat-bold") {
    return renderTextWithGlyphPaths(width, height, layout);
  }
  return renderTextWithGlyphPngs(width, height, layout);
}

function isLightFillColor(color: string): boolean {
  const hex = color.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return false;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.72;
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
      const w = field.width ?? 200;
      const h = field.height ?? 200;

      if (field.key === "company_logo") {
        const logoUrl = imageUrl?.trim() ?? "";
        const useBrand = !logoUrl || isEverliaBrandLogoUrl(logoUrl);
        let finalBuf: Buffer;
        if (useBrand) {
          const accent =
            field.color ??
            fields.find((f) => f.key === "website")?.color;
          const sender = fields.find((f) => f.key === "sender_name")?.color;
          const muted = fields.find((f) => f.key === "sender_title")?.color;
          finalBuf = await renderEverliaLogoPng(
            w,
            h,
            logoColorsFromFields({ accent, sender, muted })
          );
        } else {
          const imgBuf = await fetchBuffer(logoUrl);
          finalBuf = await sharp(imgBuf)
            .resize(w, h, {
              fit: "contain",
              background: { r: 0, g: 0, b: 0, alpha: 0 },
            })
            .png()
            .toBuffer();
        }
        composites.push({
          input: finalBuf,
          top: Math.round(field.y),
          left: Math.round(field.x),
        });
        continue;
      }

      if (!imageUrl) continue;
      const imgBuf = await fetchBuffer(imageUrl);

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
