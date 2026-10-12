import { createHmac, timingSafeEqual } from "crypto";
import type { MailProviderService } from "@/lib/mail/interface";
import type {
  MailAddress,
  MailStatusResult,
  SendCardInput,
  SendCardResult,
  WebhookResult,
} from "@/lib/mail/types";
import { mapProviderStatus } from "@/lib/mail/status-map";

const POSTGRID_BASE = "https://api.postgrid.com/print-mail/v1";

function safeEqualHex(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "utf8");
    const bufB = Buffer.from(b, "utf8");
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

function parseSignatureHeader(header: string | null): {
  timestamp: string;
  signature: string;
} | null {
  if (!header) return null;
  const parts: Record<string, string> = {};
  for (const segment of header.split(",")) {
    const idx = segment.indexOf("=");
    if (idx <= 0) continue;
    const key = segment.slice(0, idx).trim();
    const value = segment.slice(idx + 1).trim();
    parts[key] = value;
  }
  if (!parts.t || !parts.v1) return null;
  return { timestamp: parts.t, signature: parts.v1 };
}

function verifyJsonSignature(rawBody: string, headers: Headers, secret: string) {
  const header =
    headers.get("postgrid-signature") ||
    headers.get("PostGrid-Signature") ||
    headers.get("x-postgrid-signature");
  const parsed = parseSignatureHeader(header);
  if (!parsed) {
    throw new Error("Missing or invalid PostGrid-Signature header");
  }

  const signedPayload = `${parsed.timestamp}.${rawBody}`;
  const expected = createHmac("sha256", secret)
    .update(signedPayload, "utf8")
    .digest("hex");

  if (!safeEqualHex(expected, parsed.signature)) {
    throw new Error("Invalid PostGrid webhook signature");
  }
}

function looksLikeJwt(rawBody: string): boolean {
  const trimmed = rawBody.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return false;
  const parts = trimmed.split(".");
  return parts.length === 3 && parts.every((p) => p.length > 0);
}

function decodePostGridJwt(token: string, secret: string): unknown {
  const trimmed = token.trim();
  const [headerB64, payloadB64, signatureB64] = trimmed.split(".");
  if (!headerB64 || !payloadB64 || !signatureB64) {
    throw new Error("Invalid PostGrid JWT webhook payload");
  }

  const expected = createHmac("sha256", secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest("base64url");

  if (!safeEqualHex(expected, signatureB64)) {
    throw new Error("Invalid PostGrid JWT webhook signature");
  }

  try {
    const json = Buffer.from(payloadB64, "base64url").toString("utf8");
    return JSON.parse(json) as unknown;
  } catch {
    throw new Error("Failed to decode PostGrid JWT webhook payload");
  }
}

type PostGridWebhookPayload = {
  type?: string;
  data?: { id?: string; status?: string };
  id?: string;
  status?: string;
};

function extractMailUpdate(body: unknown): {
  providerMailId: string;
  providerStatus: string;
} | null {
  const payload = body as PostGridWebhookPayload | null;
  if (!payload || typeof payload !== "object") return null;

  const data = payload.data ?? payload;
  const providerMailId = data.id;
  const providerStatus = data.status;

  if (!providerMailId || !providerStatus) return null;
  return { providerMailId, providerStatus };
}

function getApiKey() {
  const key = process.env.POSTGRID_API_KEY;
  if (!key) {
    throw new Error("POSTGRID_API_KEY is not configured");
  }
  return key;
}

function toPostGridContact(address: MailAddress) {
  return {
    firstName: address.firstName,
    lastName: address.lastName,
    companyName: address.companyName,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2,
    city: address.city,
    provinceOrState: address.provinceOrState,
    postalOrZip: address.postalOrZip,
    countryCode: address.countryCode,
  };
}

async function postgridFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(`${POSTGRID_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": getApiKey(),
      ...(init?.headers ?? {}),
    },
  });

  const json = (await response.json().catch(() => ({}))) as {
    error?: { message?: string };
    message?: string;
  } & T;

  if (!response.ok) {
    const message =
      json.error?.message ||
      json.message ||
      `PostGrid request failed (${response.status})`;
    throw new Error(message);
  }

  return json as T;
}

type PostGridPostcard = {
  id: string;
  status?: string;
  object?: string;
};

export class PostGridProvider implements MailProviderService {
  readonly slug = "postgrid";

  async sendCard(input: SendCardInput): Promise<SendCardResult> {
    const body = {
      to: toPostGridContact(input.to),
      from: toPostGridContact(input.from),
      pdf: input.pdfUrl,
      size: input.size ?? "6x4",
      description: input.description,
      metadata: input.metadata,
    };

    const result = await postgridFetch<PostGridPostcard>("/postcards", {
      method: "POST",
      body: JSON.stringify(body),
    });

    const providerStatus = result.status ?? "ready";

    return {
      providerMailId: result.id,
      providerStatus,
      raw: result,
    };
  }

  async getMailStatus(providerMailId: string): Promise<MailStatusResult> {
    const result = await postgridFetch<PostGridPostcard>(
      `/postcards/${encodeURIComponent(providerMailId)}`
    );
    const providerStatus = result.status ?? "ready";

    return {
      providerMailId: result.id,
      providerStatus,
      internalStatus: mapProviderStatus(this.slug, providerStatus),
      raw: result,
    };
  }

  async cancelMail(providerMailId: string): Promise<void> {
    await postgridFetch(`/postcards/${encodeURIComponent(providerMailId)}/cancellation`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  }

  async handleWebhook(
    headers: Headers,
    rawBody: string
  ): Promise<WebhookResult> {
    const secret = process.env.POSTGRID_WEBHOOK_SECRET?.trim();
    let body: unknown;

    if (looksLikeJwt(rawBody)) {
      if (!secret) {
        throw new Error(
          "POSTGRID_WEBHOOK_SECRET is required for JWT webhook payloads"
        );
      }
      body = decodePostGridJwt(rawBody, secret);
    } else {
      if (secret) {
        verifyJsonSignature(rawBody, headers, secret);
      }

      try {
        body = rawBody ? (JSON.parse(rawBody) as unknown) : null;
      } catch {
        throw new Error("Invalid PostGrid webhook JSON body");
      }
    }

    const update = extractMailUpdate(body);
    if (!update) {
      return null;
    }

    return {
      providerMailId: update.providerMailId,
      providerStatus: update.providerStatus,
      internalStatus: mapProviderStatus(this.slug, update.providerStatus),
      raw: body,
    };
  }
}
