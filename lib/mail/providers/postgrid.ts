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
    body: unknown
  ): Promise<WebhookResult> {
    const secret = process.env.POSTGRID_WEBHOOK_SECRET;
    if (secret) {
      const provided =
        headers.get("x-postgrid-signature") ||
        headers.get("x-webhook-secret") ||
        headers.get("authorization")?.replace(/^Bearer\s+/i, "");
      if (provided !== secret) {
        throw new Error("Invalid PostGrid webhook signature");
      }
    }

    const payload = body as {
      type?: string;
      data?: { id?: string; status?: string };
      id?: string;
      status?: string;
    };

    const data = payload.data ?? payload;
    const providerMailId = data.id;
    const providerStatus = data.status;

    if (!providerMailId || !providerStatus) {
      return null;
    }

    return {
      providerMailId,
      providerStatus,
      internalStatus: mapProviderStatus(this.slug, providerStatus),
      raw: body,
    };
  }
}
