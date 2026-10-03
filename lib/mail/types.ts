import type { GreetingCardStatus } from "@/lib/types/cards";

export type MailAddress = {
  firstName: string;
  lastName: string;
  companyName?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  provinceOrState: string;
  postalOrZip: string;
  countryCode: string;
};

export type SendCardInput = {
  frontUrl: string;
  backUrl: string;
  to: MailAddress;
  from: MailAddress;
  size?: "6x4" | "9x6" | "11x6";
  metadata?: Record<string, string>;
  description?: string;
};

export type SendCardResult = {
  providerMailId: string;
  providerStatus: string;
  raw: unknown;
};

export type MailStatusResult = {
  providerMailId: string;
  providerStatus: string;
  internalStatus: GreetingCardStatus;
  raw: unknown;
};

export type WebhookResult = {
  providerMailId: string;
  providerStatus: string;
  internalStatus: GreetingCardStatus;
  raw: unknown;
} | null;
