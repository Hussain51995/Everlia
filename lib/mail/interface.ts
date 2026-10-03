import type {
  MailStatusResult,
  SendCardInput,
  SendCardResult,
  WebhookResult,
} from "@/lib/mail/types";

export interface MailProviderService {
  readonly slug: string;
  sendCard(input: SendCardInput): Promise<SendCardResult>;
  getMailStatus(providerMailId: string): Promise<MailStatusResult>;
  cancelMail(providerMailId: string): Promise<void>;
  handleWebhook(
    headers: Headers,
    body: unknown
  ): Promise<WebhookResult>;
}
