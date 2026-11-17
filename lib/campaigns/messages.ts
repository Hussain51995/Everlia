
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
  return { messageTemplate: trimmed };
}


export const DEFAULT_OCCASION_MESSAGES: Record<string, OccasionMessageDefinition> =
  {
    birthday: {
      slug: "birthday",
      greetingTemplate: "Happy Birthday!",
      messageTemplate:
        "May your special day be filled with laughter, love, and beautiful moments. We're grateful to have been a small part of your journey, and we wish you a year filled with happiness and new beginnings.",
      footerTemplate: "WISHING YOU A YEAR AS WONDERFUL AS YOU ARE.",
    },

    "home-anniversary": {
      slug: "home-anniversary",
      greetingTemplate: "Happy Home Anniversary!",
      messageTemplate:
        "It's been {{milestone.years}} wonderful years since you turned a house into your home! May every corner continue to hold beautiful memories, every room echo with laughter, and every year bring even more reasons to love the place you call home.",
      footerTemplate: "HERE'S TO THE MEMORIES MADE AND MANY MORE TO COME.",
    },

    "closing-anniversary": {
      slug: "closing-anniversary",
      greetingTemplate: "Happy Closing Anniversary!",
      messageTemplate:
        "Can you believe it's been {{milestone.years}} years since we celebrated this special milestone together? Helping you take that step was an honor, and we hope your home continues to bring you comfort, happiness, and countless beautiful memories.",
      footerTemplate: "GRATEFUL TO HAVE BEEN PART OF YOUR JOURNEY.",
    },

    "us-thanksgiving": {
      slug: "us-thanksgiving",
      greetingTemplate: "A Very Happy Thanksgiving!",
      messageTemplate:
        "This season reminds us how much the people in our lives truly matter. We're thankful for the trust you've placed in us and the opportunity to be part of your story. May your home be filled with warmth, your table with joy, and your heart with gratitude.",
      footerTemplate: "WITH HEARTFELT GRATITUDE, FROM OUR FAMILY TO YOURS.",
    },

    "us-christmas": {
      slug: "us-christmas",
      greetingTemplate: "Wishing You a Magical Christmas!",
      messageTemplate:
        "May your home glow with the warmth of the holidays, your days be filled with laughter, and your hearts be surrounded by love. Thank you for being part of our journey. Wishing you and your family a Christmas filled with moments worth remembering.",
      footerTemplate: "MAY YOUR HOME ALWAYS BE FILLED WITH LOVE AND JOY.",
    },

    "us-mothers-day": {
      slug: "us-mothers-day",
      greetingTemplate: "Happy Mother's Day!",
      messageTemplate:
        "A home is made special by the love, care, and countless little things that happen within it. Today, we celebrate the wonderful mothers who make every house feel like home. May your day be filled with the appreciation and love you deserve.",
      footerTemplate: "CELEBRATING THE LOVE THAT MAKES A HOUSE A HOME.",
    },

    "us-fathers-day": {
      slug: "us-fathers-day",
      greetingTemplate: "Happy Father's Day!",
      messageTemplate:
        "Behind every strong home is someone who gives their time, love, and strength to make life better for those they care about. Today, we celebrate all that you do and the lasting memories you help create. Wishing you a wonderful Father's Day!",
      footerTemplate: "HONORING THE HEART THAT BUILDS A HOME.",
    },

    "us-independence-day": {
      slug: "us-independence-day",
      greetingTemplate: "Happy Fourth of July!",
      messageTemplate:
        "Today, we celebrate the freedom to dream, the courage to build, and the communities we proudly call home. Wishing you and your loved ones a joyful celebration filled with laughter, meaningful moments, and lasting memories.",
      footerTemplate: "CELEBRATING FREEDOM, COMMUNITY, AND HOME.",
    },

    "us-memorial-day": {
      slug: "us-memorial-day",
      greetingTemplate: "Honoring and Remembering",
      messageTemplate:
        "This Memorial Day, we pause to honor the brave men and women who made the ultimate sacrifice for our freedom. May we always remember their courage and cherish the peace and opportunities they made possible.",
      footerTemplate: "WITH DEEPEST RESPECT AND GRATITUDE.",
    },

    "us-labor-day": {
      slug: "us-labor-day",
      greetingTemplate: "Wishing You a Happy Labor Day!",
      messageTemplate:
        "Every dream, every achievement, and every beautiful home begins with dedication and hard work. Today, we celebrate your efforts and the people who make our communities stronger. We hope you enjoy a well-deserved day of rest with those you love.",
      footerTemplate: "HERE'S TO YOUR HARD WORK AND ALL YOU MAKE POSSIBLE.",
    },

    "us-new-years-day": {
      slug: "us-new-years-day",
      greetingTemplate: "Here's to a Beautiful New Year!",
      messageTemplate:
        "A new year brings fresh opportunities, new dreams, and countless moments waiting to become memories. We're truly grateful to have you as part of our community. May the year ahead bring happiness, good health, and warmth to the home you love.",
      footerTemplate: "NEW YEAR, NEW MEMORIES, ENDLESS POSSIBILITIES.",
    },

    "us-valentines-day": {
      slug: "us-valentines-day",
      greetingTemplate: "Sending You Love This Valentine's Day!",
      messageTemplate:
        "Home is where love lives, laughter echoes, and the most meaningful memories are made. This Valentine's Day, we're sending warm wishes to you and everyone who makes your house feel like home. May your day be filled with love in all its beautiful forms.",
      footerTemplate: "CELEBRATING LOVE, ONE HOME AT A TIME.",
    },

    "referral-january": {
      slug: "referral-january",
      greetingTemplate: "Thinking of You This New Year!",
      messageTemplate:
        "As we kick off another year, we're grateful for the trust you've placed in us. If you know someone who's thinking about buying or selling a home, we'd be honored if you'd share our name. Your referrals mean the world to us.",
      footerTemplate: "THANK YOU FOR TRUSTING US WITH YOUR HOME JOURNEY.",
    },

    "referral-april": {
      slug: "referral-april",
      greetingTemplate: "A Note of Appreciation!",
      messageTemplate:
        "Spring is a wonderful time for fresh starts and new beginnings. If friends or family are considering a move, we'd love an introduction. Nothing means more to our business than a referral from someone we already care about.",
      footerTemplate: "GRATEFUL FOR YOUR TRUST AND KIND WORDS.",
    },

    "referral-july": {
      slug: "referral-july",
      greetingTemplate: "Hoping Your Summer Is Going Well!",
      messageTemplate:
        "Midyear is a great moment to check in and say thank you. If anyone in your circle is exploring a new home or ready to sell, we'd be grateful for a referral. We're always here to help the people you care about.",
      footerTemplate: "YOUR REFERRALS HELP US SERVE MORE FAMILIES.",
    },

    "referral-october": {
      slug: "referral-october",
      greetingTemplate: "Grateful for You This Season!",
      messageTemplate:
        "As the year winds down, we're reflecting on the relationships that matter most. If you know someone who could use help with a home decision, we'd appreciate a referral. Thank you for being part of our community.",
      footerTemplate: "THANK YOU FOR BEING PART OF OUR STORY.",
    },

    custom: {
      slug: "custom",
      greetingTemplate: "Just a Little Note of Appreciation",
      messageTemplate:
        "Some relationships are too meaningful to be limited to a single transaction. We simply wanted to reach out, let you know we're thinking of you, and say how much we appreciate having you as part of our journey. Whenever you need us, we're just a message away.",
      footerTemplate: "MORE THAN CLIENTS, ALWAYS PART OF OUR COMMUNITY.",
    },
  };


export const FALLBACK_OCCASION_MESSAGE: OccasionMessageDefinition = {
  slug: "custom",
  greetingTemplate: "Thinking of You!",
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
  override?: OccasionMessageOverride | null,
  /** Org library definition applied before campaign custom override. */
  orgDefinition?: OccasionMessageDefinition | null
): OccasionMessageDefinition {
  const codeBase = getOccasionMessageDefinition(slug);
  const base: OccasionMessageDefinition = orgDefinition
    ? {
        slug: codeBase.slug,
        greetingTemplate:
          orgDefinition.greetingTemplate || codeBase.greetingTemplate,
        messageTemplate:
          orgDefinition.messageTemplate || codeBase.messageTemplate,
        footerTemplate:
          orgDefinition.footerTemplate !== undefined
            ? orgDefinition.footerTemplate
            : codeBase.footerTemplate,
      }
    : codeBase;

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
  orgDefinition?: OccasionMessageDefinition | null;
  context: PlaceholderContext;
}): ResolvedOccasionCopy {
  const definition = mergeOccasionMessageDefinition(
    options.occasionSlug,
    options.override,
    options.orgDefinition
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
