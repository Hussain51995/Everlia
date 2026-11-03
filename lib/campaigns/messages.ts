
import {
  resolveMessageTemplate,
  validateMessageTemplate,
  type PlaceholderContext,
} from "@/lib/campaigns/placeholders";

export type OccasionMessageDefinition = {
  slug: string;
  greetingTemplate: string;
  messageTemplate: string;
  footerTemplate?: string;
};

export type OccasionMessageOverride = {
  greetingTemplate?: string;
  messageTemplate?: string;
  footerTemplate?: string | null;
};

export function parseMessageOverride(
  raw: string | null | undefined
): OccasionMessageOverride | null {
  if (!raw?.trim()) return null;
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as OccasionMessageOverride;
      if (parsed && typeof parsed === "object") {
        return {
          greetingTemplate:
            typeof parsed.greetingTemplate === "string"
              ? parsed.greetingTemplate
              : undefined,
          messageTemplate:
            typeof parsed.messageTemplate === "string"
              ? parsed.messageTemplate
              : undefined,
          footerTemplate:
            parsed.footerTemplate === null
              ? null
              : typeof parsed.footerTemplate === "string"
                ? parsed.footerTemplate
                : undefined,
        };
      }
    } catch {
    }
  }
  return { greetingTemplate: trimmed };
}

export const DEFAULT_OCCASION_MESSAGES: Record<string, OccasionMessageDefinition> =
  {
    birthday: {
      slug: "birthday",
      greetingTemplate: "Happy Birthday, {{customer.firstName}}!",
      messageTemplate:
        "Wishing you a wonderful day filled with joy. Thank you for trusting us with your home journey.",
      footerTemplate: "THANK YOU FOR BEING A VALUED CLIENT.",
    },
    "home-anniversary": {
      slug: "home-anniversary",
      greetingTemplate:
        "Celebrating {{milestone.years}} years in your home, {{customer.firstName}}!",
      messageTemplate:
        "Celebrating {{milestone.years}} years since your home closing! Here's to many more memories under that roof.",
      footerTemplate: "ONE MORE YEAR OF MAKING MEMORIES.",
    },
    "closing-anniversary": {
      slug: "closing-anniversary",
      greetingTemplate:
        "Happy closing anniversary, {{customer.firstName}}!",
      messageTemplate:
        "Celebrating {{milestone.years}} years since your home closing!",
      footerTemplate: "GRATEFUL TO BE PART OF YOUR STORY.",
    },
    "us-thanksgiving": {
      slug: "us-thanksgiving",
      greetingTemplate: "Happy Thanksgiving, {{customer.firstName}}!",
      messageTemplate:
        "Wishing you and your family a wonderful Thanksgiving!",
      footerTemplate: "WITH GRATITUDE FROM OUR TEAM.",
    },
    "us-christmas": {
      slug: "us-christmas",
      greetingTemplate: "Warm holiday wishes, {{customer.firstName}}!",
      messageTemplate:
        "Wishing you and your loved ones a joyful holiday season and a bright New Year.",
      footerTemplate: "MAY THIS SEASON BRING YOU JOY & PEACE.",
    },
    "us-mothers-day": {
      slug: "us-mothers-day",
      greetingTemplate: "Happy Mother's Day!",
      messageTemplate:
        "Celebrating the care and love you bring to home and family.",
      footerTemplate: "THINKING OF YOU THIS MOTHER'S DAY.",
    },
    "us-fathers-day": {
      slug: "us-fathers-day",
      greetingTemplate: "Happy Father's Day!",
      messageTemplate:
        "Celebrating the people who make a house feel like home.",
      footerTemplate: "THINKING OF YOU THIS FATHER'S DAY.",
    },
    "us-independence-day": {
      slug: "us-independence-day",
      greetingTemplate: "Happy Independence Day!",
      messageTemplate:
        "Wishing you a safe and joyful Fourth of July celebration.",
      footerTemplate: "PROUD TO SERVE OUR COMMUNITY.",
    },
    "us-memorial-day": {
      slug: "us-memorial-day",
      greetingTemplate: "Remembering with gratitude",
      messageTemplate:
        "Wishing you a peaceful Memorial Day weekend with family and friends.",
      footerTemplate: "WITH RESPECT AND APPRECIATION.",
    },
    "us-labor-day": {
      slug: "us-labor-day",
      greetingTemplate: "Happy Labor Day!",
      messageTemplate:
        "Wishing you a restful Labor Day and a wonderful end of summer.",
      footerTemplate: "ENJOY THE LONG WEEKEND.",
    },
    "us-new-years-day": {
      slug: "us-new-years-day",
      greetingTemplate: "Happy New Year, {{customer.firstName}}!",
      messageTemplate:
        "Wishing you a healthy, happy year ahead in the home you love.",
      footerTemplate: "CHEERS TO NEW BEGINNINGS.",
    },
    "us-valentines-day": {
      slug: "us-valentines-day",
      greetingTemplate: "Happy Valentine's Day!",
      messageTemplate:
        "Sending warm wishes to you and your loved ones this Valentine's Day.",
      footerTemplate: "FROM OUR HOME TO YOURS.",
    },
    custom: {
      slug: "custom",
      greetingTemplate: "Thinking of you, {{customer.firstName}}!",
      messageTemplate:
        "Just a note to stay in touch and say thank you for being a valued client.",
      footerTemplate: "WITH APPRECIATION.",
    },
  };

export const FALLBACK_OCCASION_MESSAGE: OccasionMessageDefinition = {
  slug: "custom",
  greetingTemplate: "Thinking of you, {{customer.firstName}}!",
  messageTemplate:
    "Just a note to stay in touch and say thank you for being a valued client.",
  footerTemplate: "WITH APPRECIATION.",
};

export function getOccasionMessageDefinition(
  slug: string | null | undefined
): OccasionMessageDefinition {
  if (!slug) return FALLBACK_OCCASION_MESSAGE;
  return DEFAULT_OCCASION_MESSAGES[slug] ?? FALLBACK_OCCASION_MESSAGE;
}

export function mergeOccasionMessageDefinition(
  slug: string | null | undefined,
  override?: OccasionMessageOverride | null
): OccasionMessageDefinition {
  const base = getOccasionMessageDefinition(slug);
  if (!override) return base;
  return {
    slug: base.slug,
    greetingTemplate: override.greetingTemplate ?? base.greetingTemplate,
    messageTemplate: override.messageTemplate ?? base.messageTemplate,
    footerTemplate:
      override.footerTemplate === null
        ? undefined
        : (override.footerTemplate ?? base.footerTemplate),
  };
}

export type ResolvedOccasionCopy = {
  greeting: string;
  message: string;
  footer: string;
  definition: OccasionMessageDefinition;
};

export function resolveOccasionCopy(options: {
  occasionSlug?: string | null;
  override?: OccasionMessageOverride | null;
  context: PlaceholderContext;
}): ResolvedOccasionCopy {
  const definition = mergeOccasionMessageDefinition(
    options.occasionSlug,
    options.override
  );

  for (const template of [
    definition.greetingTemplate,
    definition.messageTemplate,
    definition.footerTemplate ?? "",
  ]) {
    if (!template) continue;
    const validation = validateMessageTemplate(template);
    if (!validation.ok) {
      throw new Error(
        `Unknown message placeholders: ${validation.unknowns.join(", ")}`
      );
    }
  }

  return {
    greeting: resolveMessageTemplate(definition.greetingTemplate, options.context, {
      maxLength: 80,
    }),
    message: resolveMessageTemplate(definition.messageTemplate, options.context, {
      maxLength: 280,
    }),
    footer: definition.footerTemplate
      ? resolveMessageTemplate(definition.footerTemplate, options.context, {
          maxLength: 90,
        })
      : "",
    definition,
  };
}
