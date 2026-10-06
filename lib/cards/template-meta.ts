export type TemplateMeta = {
  eyebrow: string;
  h1: string;
  h2: string;
  footerNote: string;
  accentColor: string;
};

export const DEFAULT_TEMPLATE_META: TemplateMeta = {
  eyebrow: "FOR YOU",
  h1: "",
  h2: "",
  footerNote: "",
  accentColor: "#38B2D1",
};

export const TEMPLATE_META: Record<string, TemplateMeta> = {
  "welcome-home": {
    eyebrow: "Welcome to your",
    h1: "Welcome",
    h2: "Home",
    footerNote: "WISHING YOU MANY HAPPY MEMORIES AHEAD.",
    accentColor: "#38B2D1",
  },
  "birthday-classic": {
    eyebrow: "Wishing you a",
    h1: "Happy",
    h2: "Birthday",
    footerNote: "THANK YOU FOR BEING A VALUED CLIENT.",
    accentColor: "#38B2D1",
  },
  "thank-you-warm": {
    eyebrow: "With gratitude",
    h1: "Thank",
    h2: "You",
    footerNote: "YOUR TRUST MEANS EVERYTHING TO US.",
    accentColor: "#34A99C",
  },
  "home-anniversary": {
    eyebrow: "Celebrating your",
    h1: "Home",
    h2: "Anniversary",
    footerNote: "ONE MORE YEAR OF MAKING MEMORIES.",
    accentColor: "#E8A838",
  },
  "holiday-greetings": {
    eyebrow: "Season's greetings",
    h1: "Warm",
    h2: "Wishes",
    footerNote: "MAY THIS SEASON BRING YOU JOY & PEACE.",
    accentColor: "#3B7DD8",
  },
  congratulations: {
    eyebrow: "Celebrating you",
    h1: "Warmest",
    h2: "Congratulations!",
    footerNote: "YOUR HARD WORK HAS PAID OFF.",
    accentColor: "#C49A2A",
  },
};

export function getTemplateMeta(slug: string): TemplateMeta {
  return TEMPLATE_META[slug] ?? DEFAULT_TEMPLATE_META;
}
