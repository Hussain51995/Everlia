import sharp from "sharp";
import type { Font } from "opentype.js";
import { getAppUrl } from "@/lib/app-url";

export type EverliaLogoColors = {
  icon: string;
  iconStroke?: string;
  wordmark: string;
  tagline: string;
};

const DEFAULT_COLORS: EverliaLogoColors = {
  icon: "#38B2D1",
  iconStroke: "#FFFFFF",
  wordmark: "#0B1F3D",
  tagline: "#557393",
};

export const EVERLIA_LOGO_PUBLIC_PATH = "/brand/everlia-logo.svg";

export function isEverliaBrandLogoUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  return (
    url.includes("/brand/everlia-logo") ||
    url.endsWith("everlia-logo.svg") ||
    url === EVERLIA_LOGO_PUBLIC_PATH
  );
}

type OpenTypeParse = (buffer: ArrayBuffer) => Font;

let parseOpenType: OpenTypeParse | null = null;
let logoFont: Font | null = null;

async function getLogoFont(): Promise<Font> {
  if (logoFont) return logoFont;

  const fs = await import("fs/promises");
  const path = await import("path");
  const filename = "NotoSans-Bold.ttf";
  const candidates: string[] = [];
  if (typeof __dirname === "string") {
    candidates.push(path.join(__dirname, "assets", "fonts", filename));
  }
  candidates.push(
    path.join(process.cwd(), "lib", "artwork", "assets", "fonts", filename),
    path.join(process.cwd(), "public", "fonts", filename)
  );

  let fontBuf: Buffer | null = null;
  for (const fontPath of candidates) {
    try {
      fontBuf = await fs.readFile(fontPath);
      break;
    } catch {
    }
  }
  if (!fontBuf) {
    const response = await fetch(`${getAppUrl()}/fonts/${filename}`);
    if (!response.ok) {
      throw new Error(`Failed to load logo font ${filename}`);
    }
    fontBuf = Buffer.from(await response.arrayBuffer());
  }

  if (!parseOpenType) {
    const mod = (await import("opentype.js")) as {
      parse?: OpenTypeParse;
      default?: { parse?: OpenTypeParse };
    };
    const parseFn = mod.parse ?? mod.default?.parse;
    if (!parseFn) throw new Error("opentype.js parse() is unavailable");
    parseOpenType = parseFn;
  }

  const ab = fontBuf.buffer.slice(
    fontBuf.byteOffset,
    fontBuf.byteOffset + fontBuf.byteLength
  );
  logoFont = parseOpenType(ab as ArrayBuffer);
  return logoFont;
}

function textPaths(
  font: Font,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  fill: string,
  letterSpacing = 0
): string {
  let cursor = x;
  const parts: string[] = [];
  for (const char of text) {
    const d = font.getPath(char, cursor, y, fontSize).toPathData(2);
    if (d) parts.push(`<path d="${d}" fill="${fill}"/>`);
    cursor += font.getAdvanceWidth(char, fontSize) + letterSpacing;
  }
  return parts.join("");
}

export async function renderEverliaLogoPng(
  width: number,
  height: number,
  colors: Partial<EverliaLogoColors> = {}
): Promise<Buffer> {
  const c: EverliaLogoColors = {
    ...DEFAULT_COLORS,
    ...colors,
    iconStroke: colors.iconStroke ?? DEFAULT_COLORS.iconStroke,
  };

  const font = await getLogoFont();
  const wordmark = textPaths(font, "Everlia™", 90, 52, 30, c.wordmark);
  const tagline = textPaths(
    font,
    "CLIENTS FOR LIFE",
    90,
    78,
    13,
    c.tagline,
    2.5
  );

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 110">
  <rect x="4" y="18" width="68" height="68" rx="16" fill="${c.icon}"/>
  <path d="M18 54 L38 36 L58 54 V74 H18 Z" fill="none" stroke="${c.iconStroke}" stroke-width="3.5" stroke-linejoin="round"/>
  <circle cx="38" cy="58" r="7.5" fill="none" stroke="${c.iconStroke}" stroke-width="3"/>
  ${wordmark}
  ${tagline}
</svg>`;

  return sharp(Buffer.from(svg))
    .resize(width, height, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

export function logoColorsFromFields(fields: {
  accent?: string;
  sender?: string;
  muted?: string;
}): EverliaLogoColors {
  const wordmark = fields.sender ?? DEFAULT_COLORS.wordmark;
  const accent = fields.accent ?? DEFAULT_COLORS.icon;
  const muted = fields.muted ?? DEFAULT_COLORS.tagline;
  return {
    icon: accent,
    iconStroke: "#FFFFFF",
    wordmark,
    tagline: muted,
  };
}
