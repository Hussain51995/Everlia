import type { DesignConfig, DesignField } from "@/lib/types/cards";

export type TemplateMeta = {
  accentColor: string;
  headingColor: string;
  dearColor: string;
  bodyColor: string;
  lightTextColor?: string;
  footerNote?: string;
};

export const DEFAULT_TEMPLATE_META: TemplateMeta = {
  accentColor: "#8A5635",
  headingColor: "#302820",
  dearColor: "#302820",
  bodyColor: "#665447",
  lightTextColor: "#FFF9F0",
};

export const TEMPLATE_META: Record<string, TemplateMeta> = {
  "design-1": {
    accentColor: "#8A5635",
    headingColor: "#302820",
    dearColor: "#302820",
    bodyColor: "#665447",
    lightTextColor: "#FFF9F0",
  },
  "design-2": {
    accentColor: "#176B96",
    headingColor: "#102D45",
    dearColor: "#102D45",
    bodyColor: "#42647A",
    lightTextColor: "#F5FBFF",
  },
  "design-3": {
    accentColor: "#963E42",
    headingColor: "#FFF4E9",
    dearColor: "#FFF4E9",
    bodyColor: "#FFF4E9",
    lightTextColor: "#FFF4E9",
  },
  "design-4": {
    accentColor: "#007F73",
    headingColor: "#F2FFF9",
    dearColor: "#F2FFF9",
    bodyColor: "#F2FFF9",
    lightTextColor: "#F2FFF9",
  },
};

function fieldColor(fields: DesignField[], key: string): string | undefined {
  return fields.find((f) => f.key === key && f.type === "text")?.color;
}

export function metaFromDesignConfig(
  designConfig: DesignConfig | null | undefined,
  side: "front" | "back",
  slugFallback?: string
): TemplateMeta {
  const fallback =
    (slugFallback ? TEMPLATE_META[slugFallback] : undefined) ??
    DEFAULT_TEMPLATE_META;
  const fields = designConfig?.[side]?.fields ?? [];
  if (!fields.length) return fallback;

  if (side === "front") {
    return {
      accentColor:
        fieldColor(fields, "website") ??
        fieldColor(fields, "footer_note") ??
        fallback.accentColor,
      headingColor:
        fieldColor(fields, "occasion_heading") ?? fallback.headingColor,
      dearColor: fieldColor(fields, "customer_name") ?? fallback.dearColor,
      bodyColor: fieldColor(fields, "personal_message") ?? fallback.bodyColor,
      lightTextColor: fallback.lightTextColor,
    };
  }

  return {
    accentColor: fieldColor(fields, "website") ?? fallback.accentColor,
    headingColor: fieldColor(fields, "sender_name") ?? fallback.headingColor,
    dearColor: fieldColor(fields, "sender_name") ?? fallback.dearColor,
    bodyColor:
      fieldColor(fields, "sender_title") ??
      fieldColor(fields, "phone") ??
      fallback.bodyColor,
    lightTextColor: fallback.lightTextColor,
  };
}

export function getTemplateMeta(slug: string): TemplateMeta {
  return TEMPLATE_META[slug] ?? DEFAULT_TEMPLATE_META;
}
