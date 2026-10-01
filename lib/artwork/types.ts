import type { DesignConfig, DesignField } from "@/lib/types/cards";

export const POSTCARD_WIDTH = 1800;
export const POSTCARD_HEIGHT = 1200;
export const POSTCARD_DPI = 300;

export function defaultDesignConfig(
  frontFields: DesignField[],
  backFields: DesignField[]
): DesignConfig {
  return {
    width: POSTCARD_WIDTH,
    height: POSTCARD_HEIGHT,
    dpi: POSTCARD_DPI,
    orientation: "landscape",
    front: { fields: frontFields },
    back: { fields: backFields },
  };
}

export function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function wrapText(text: string, maxCharsPerLine: number, maxLines: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
      if (lines.length >= maxLines) break;
    } else {
      current = next;
    }
  }

  if (lines.length < maxLines && current) {
    lines.push(current);
  }

  if (lines.length > maxLines) {
    return lines.slice(0, maxLines);
  }

  return lines;
}
