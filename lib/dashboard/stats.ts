import type {
  CardResponse,
  CardTemplateCategory,
  Customer,
  GreetingCard,
  GreetingCardStatus,
} from "@/lib/types/cards";
import { TEMPLATE_CATEGORY_LABELS } from "@/lib/types/cards";

const SENT_STATUSES: GreetingCardStatus[] = [
  "submitted",
  "processing",
  "mailed",
  "delivered",
  "qr_scanned",
  "response_received",
];

const DELIVERED_STATUSES: GreetingCardStatus[] = [
  "delivered",
  "qr_scanned",
  "response_received",
];

const QR_STATUSES: GreetingCardStatus[] = ["qr_scanned", "response_received"];

const REACHABLE_STATUSES: GreetingCardStatus[] = [
  "mailed",
  "delivered",
  "qr_scanned",
  "response_received",
];

const CATEGORY_COLORS = [
  "#38B2D1",
  "#10284D",
  "#43c5e6",
  "#436D75",
  "#059669",
  "#0B1F3D",
  "#2ca0be",
  "#557393",
];

const FUNNEL_COLORS = ["bg-[#38B2D1]", "bg-[#43c5e6]", "bg-[#10284d]"];

export type ActivityStatus =
  | "Delivered"
  | "Scanned QR"
  | "In Transit"
  | "Pending Review";

export type MetricCardData = {
  title: string;
  value: string;
  change: string | null;
  isPositive: boolean;
  subtitle: string;
  sparkline: number[];
  color: string;
};

export type CampaignSlice = {
  name: string;
  count: number;
  percent: number;
  color: string;
};

export type FunnelStage = {
  stage: string;
  count: number;
  percent: number;
  color: string;
};

export type ActivityItem = {
  id: string;
  clientName: string;
  initials: string;
  address: string;
  campaign: string;
  trackingId: string;
  dateSent: string;
  status: ActivityStatus;
  href: string;
};

export type DashboardStats = {
  metrics: MetricCardData[];
  campaigns: CampaignSlice[];
  totalMailers: number;
  funnel: FunnelStage[];
  overallConversionPercent: number;
  activities: ActivityItem[];
  cardsThisMonth: number;
};

function isSent(card: GreetingCard): boolean {
  return Boolean(card.sent_at) || SENT_STATUSES.includes(card.status);
}

function cardDate(card: GreetingCard): Date | null {
  const raw = card.sent_at ?? card.updated_at ?? card.created_at;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function customerDate(customer: Customer): Date | null {
  const raw = customer.created_at;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function responseDate(response: CardResponse): Date | null {
  const raw = response.created_at;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function monthOverMonthChange(
  current: number,
  previous: number
): { change: string | null; isPositive: boolean } {
  if (previous === 0) {
    if (current === 0) return { change: null, isPositive: true };
    return { change: null, isPositive: true };
  }
  const pct = ((current - previous) / previous) * 100;
  const rounded = Math.round(pct * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return {
    change: `${sign}${rounded}%`,
    isPositive: rounded >= 0,
  };
}

function countInRange(
  dates: (Date | null)[],
  start: Date,
  end: Date
): number {
  return dates.filter((d) => d && d >= start && d < end).length;
}

function buildSparkline(
  dates: (Date | null)[],
  buckets = 10
): number[] {
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const values: number[] = [];

  for (let i = buckets - 1; i >= 0; i--) {
    const end = new Date(now.getTime() - i * dayMs);
    const count = dates.filter((d) => d && d <= end).length;
    values.push(count);
  }

  if (values.every((v) => v === 0)) {
    return Array.from({ length: buckets }, () => 0);
  }

  return values;
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startYesterday = new Date(startToday);
  startYesterday.setDate(startYesterday.getDate() - 1);

  const time = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (date >= startToday) return `Today at ${time}`;
  if (date >= startYesterday) return `Yesterday at ${time}`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function mapActivityStatus(status: GreetingCardStatus): ActivityStatus {
  switch (status) {
    case "qr_scanned":
    case "response_received":
      return "Scanned QR";
    case "delivered":
      return "Delivered";
    case "submitted":
    case "processing":
    case "mailed":
      return "In Transit";
    default:
      return "Pending Review";
  }
}

function initials(first: string, last: string): string {
  const a = first.trim().charAt(0);
  const b = last.trim().charAt(0);
  return `${a}${b}`.toUpperCase() || "?";
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}

export function buildDashboardStats(
  customers: Customer[],
  cards: GreetingCard[],
  responses: CardResponse[],
  now = new Date()
): DashboardStats {
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = addMonths(thisMonthStart, -1);
  const nextMonthStart = addMonths(thisMonthStart, 1);

  const customerDates = customers.map(customerDate);
  const sentCards = cards.filter(isSent);
  const sentDates = sentCards.map(cardDate);

  const customersThisMonth = countInRange(
    customerDates,
    thisMonthStart,
    nextMonthStart
  );
  const customersLastMonth = countInRange(
    customerDates,
    lastMonthStart,
    thisMonthStart
  );
  const clientsMom = monthOverMonthChange(
    customersThisMonth,
    customersLastMonth
  );

  const sentThisMonth = countInRange(sentDates, thisMonthStart, nextMonthStart);
  const sentLastMonth = countInRange(sentDates, lastMonthStart, thisMonthStart);
  const sentMom = monthOverMonthChange(sentThisMonth, sentLastMonth);

  const reachable = cards.filter((c) => REACHABLE_STATUSES.includes(c.status));
  const qrConverted = cards.filter((c) => QR_STATUSES.includes(c.status));
  const qrRate =
    reachable.length === 0
      ? 0
      : (qrConverted.length / reachable.length) * 100;

  const reachableThisMonth = cards.filter((c) => {
    if (!REACHABLE_STATUSES.includes(c.status)) return false;
    const d = cardDate(c);
    return d && d >= thisMonthStart && d < nextMonthStart;
  });
  const qrThisMonth = reachableThisMonth.filter((c) =>
    QR_STATUSES.includes(c.status)
  );
  const reachableLastMonth = cards.filter((c) => {
    if (!REACHABLE_STATUSES.includes(c.status)) return false;
    const d = cardDate(c);
    return d && d >= lastMonthStart && d < thisMonthStart;
  });
  const qrLastMonth = reachableLastMonth.filter((c) =>
    QR_STATUSES.includes(c.status)
  );
  const rateThis =
    reachableThisMonth.length === 0
      ? 0
      : (qrThisMonth.length / reachableThisMonth.length) * 100;
  const rateLast =
    reachableLastMonth.length === 0
      ? 0
      : (qrLastMonth.length / reachableLastMonth.length) * 100;
  const qrMom =
    reachableLastMonth.length === 0
      ? { change: null as string | null, isPositive: true }
      : monthOverMonthChange(rateThis, rateLast);

  const responseDates = responses.map(responseDate);
  const responsesThisMonth = countInRange(
    responseDates,
    thisMonthStart,
    nextMonthStart
  );
  const responsesLastMonth = countInRange(
    responseDates,
    lastMonthStart,
    thisMonthStart
  );
  const responsesMom = monthOverMonthChange(
    responsesThisMonth,
    responsesLastMonth
  );

  const metrics: MetricCardData[] = [
    {
      title: "Total Active Clients",
      value: customers.length.toLocaleString(),
      change: clientsMom.change,
      isPositive: clientsMom.isPositive,
      subtitle: "in your organization",
      sparkline: buildSparkline(customerDates),
      color: "#38B2D1",
    },
    {
      title: "Direct Mail Sent",
      value: sentCards.length.toLocaleString(),
      change: sentMom.change,
      isPositive: sentMom.isPositive,
      subtitle: "postcards & cards",
      sparkline: buildSparkline(sentDates),
      color: "#43c5e6",
    },
    {
      title: "QR Conversion Rate",
      value: `${Math.round(qrRate * 10) / 10}%`,
      change: qrMom.change,
      isPositive: qrMom.isPositive,
      subtitle: "scanned & responded",
      sparkline: buildSparkline(qrConverted.map(cardDate)),
      color: "#10284d",
    },
    {
      title: "Responses",
      value: responses.length.toLocaleString(),
      change: responsesMom.change,
      isPositive: responsesMom.isPositive,
      subtitle: "client replies",
      sparkline: buildSparkline(responseDates),
      color: "#059669",
    },
  ];

  const categoryCounts = new Map<CardTemplateCategory | "unknown", number>();
  for (const card of cards) {
    const cat = card.template?.category ?? "unknown";
    categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
  }

  const totalMailers = cards.length;
  const campaigns: CampaignSlice[] = Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([key, count], i) => ({
      name:
        key === "unknown"
          ? "Uncategorized"
          : TEMPLATE_CATEGORY_LABELS[key as CardTemplateCategory],
      count,
      percent:
        totalMailers === 0
          ? 0
          : Math.round((count / totalMailers) * 1000) / 10,
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }));

  const deliveredCount = cards.filter((c) =>
    DELIVERED_STATUSES.includes(c.status)
  ).length;
  const qrCount = qrConverted.length;
  const totalCards = cards.length;

  const funnelCounts = [
    { stage: "Mail Sent", count: sentCards.length },
    { stage: "Delivered", count: deliveredCount },
    { stage: "QR Scanned", count: qrCount },
  ];

  const funnel: FunnelStage[] = funnelCounts.map((item, i) => ({
    stage: item.stage,
    count: item.count,
    percent:
      totalCards === 0
        ? 0
        : Math.min(100, Math.round((item.count / totalCards) * 1000) / 10),
    color: FUNNEL_COLORS[i] ?? "bg-[#38B2D1]",
  }));

  const overallConversionPercent =
    totalCards === 0
      ? 0
      : Math.min(100, Math.round((qrCount / totalCards) * 1000) / 10);

  const activities: ActivityItem[] = [...cards]
    .sort((a, b) => {
      const da = cardDate(a)?.getTime() ?? 0;
      const db = cardDate(b)?.getTime() ?? 0;
      return db - da;
    })
    .slice(0, 10)
    .map((card) => {
      const customer = card.customer;
      const first = customer?.first_name ?? "";
      const last = customer?.last_name ?? "";
      const name =
        [first, last].filter(Boolean).join(" ").trim() || "Unknown client";
      const addressParts = [
        customer?.address_line1,
        [customer?.city, customer?.province_or_state]
          .filter(Boolean)
          .join(", "),
      ].filter(Boolean);
      const date = cardDate(card);

      return {
        id: card.id,
        clientName: name,
        initials: initials(first, last),
        address: addressParts.join(" · ") || "No address",
        campaign:
          card.template?.name ??
          (card.template?.category
            ? TEMPLATE_CATEGORY_LABELS[card.template.category]
            : "Greeting card"),
        trackingId: `HL-${card.id.slice(0, 8).toUpperCase()}`,
        dateSent: date ? formatRelativeDate(date) : "—",
        status: mapActivityStatus(card.status),
        href: `/dashboard/cards/${card.id}`,
      };
    });

  const cardsThisMonth = cards.filter((c) => {
    const d = cardDate(c) ?? (c.created_at ? new Date(c.created_at) : null);
    return d && d >= thisMonthStart && d < nextMonthStart;
  }).length;

  return {
    metrics,
    campaigns,
    totalMailers,
    funnel,
    overallConversionPercent,
    activities,
    cardsThisMonth,
  };
}

export function emptyDashboardStats(): DashboardStats {
  return buildDashboardStats([], [], []);
}

export { formatCompact };
