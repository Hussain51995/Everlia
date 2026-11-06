import sharp from "sharp";

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

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 110">
  <rect x="4" y="18" width="68" height="68" rx="16" fill="${c.icon}"/>
  <path d="M18 54 L38 36 L58 54 V74 H18 Z" fill="none" stroke="${c.iconStroke}" stroke-width="3.5" stroke-linejoin="round"/>
  <circle cx="38" cy="58" r="7.5" fill="none" stroke="${c.iconStroke}" stroke-width="3"/>
  <text x="90" y="52" font-family="Helvetica, Arial, sans-serif" font-size="30" font-weight="700" fill="${c.wordmark}">Everlia™</text>
  <text x="90" y="78" font-family="Helvetica, Arial, sans-serif" font-size="13" font-weight="600" letter-spacing="2.5" fill="${c.tagline}">CLIENTS FOR LIFE</text>
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
