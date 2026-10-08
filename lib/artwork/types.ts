import type { DesignConfig, DesignField } from "@/lib/types/cards";

export const POSTCARD_WIDTH = 1800;
export const POSTCARD_HEIGHT = 1200;
export const POSTCARD_DPI = 300;

export const POSTCARD_TRIM_INCHES = { width: 6, height: 4 } as const;

export const POSTCARD_PDF_WIDTH_PT = 6.25 * 72; 
export const POSTCARD_PDF_HEIGHT_PT = 4.25 * 72; 

export const BACK_QR_LAYOUT = {
  size: 200,
  qrX: 80,
  qrY: 850,
  brandX: 320, 
  brandY: 850,
} as const;


export function normalizeBackQrFields(fields: DesignField[]): DesignField[] {
  const { size, qrX, qrY, brandX, brandY } = BACK_QR_LAYOUT;
  return fields.map((field) => {
    if (field.key === "qr_code" && field.type === "qr") {
      return { ...field, x: qrX, y: qrY, size, width: size, height: size };
    }
    if (field.key === "company_logo" && field.type === "image") {
      return { ...field, x: brandX, y: brandY, width: size, height: size };
    }
    return field;
  });
}

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
