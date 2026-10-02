import { TEMPLATE_CATEGORY_LABELS } from "@/lib/types/cards";
import type { CardTemplateCategory } from "@/lib/types/cards";

export function occasionLabelFromCategory(
  category: CardTemplateCategory | string | null | undefined
): string {
  if (!category) return "special day";
  const key = category as CardTemplateCategory;
  return TEMPLATE_CATEGORY_LABELS[key] ?? "special day";
}

export function displayName(first?: string | null, last?: string | null) {
  return [first, last].filter(Boolean).join(" ").trim();
}
