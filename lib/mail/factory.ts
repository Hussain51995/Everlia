import { createAdminClient } from "@/lib/supabase/admin";
import type { MailProviderService } from "@/lib/mail/interface";
import { PostGridProvider } from "@/lib/mail/providers/postgrid";

function createProviderBySlug(slug: string): MailProviderService {
  switch (slug) {
    case "postgrid":
      return new PostGridProvider();
    case "lob":
      throw new Error("Lob provider is not implemented yet");
    case "click2mail":
      throw new Error("Click2Mail provider is not implemented yet");
    default:
      throw new Error(`Unknown mail provider: ${slug}`);
  }
}

export async function getMailProvider(
  forcedSlug?: string
): Promise<{ provider: MailProviderService; providerId: string | null; environment: string }> {
  if (forcedSlug) {
    return {
      provider: createProviderBySlug(forcedSlug),
      providerId: null,
      environment: process.env.POSTGRID_MODE === "live" ? "live" : "test",
    };
  }

  try {
    const admin = createAdminClient();
    const { data: config } = await admin
      .from("mail_provider_configs")
      .select(
        `
        id,
        environment,
        provider_id,
        provider:mail_providers (
          id,
          slug,
          name,
          is_active
        )
      `
      )
      .eq("is_active", true)
      .maybeSingle();

    const providerRow = config?.provider as
      | { id: string; slug: string; name: string; is_active: boolean }
      | { id: string; slug: string; name: string; is_active: boolean }[]
      | null
      | undefined;

    const provider =
      Array.isArray(providerRow) ? providerRow[0] : providerRow;

    if (provider?.slug) {
      return {
        provider: createProviderBySlug(provider.slug),
        providerId: provider.id,
        environment: config?.environment ?? "test",
      };
    }
  } catch {
  }

  const slug = process.env.MAIL_PROVIDER || "postgrid";
  return {
    provider: createProviderBySlug(slug),
    providerId: null,
    environment: process.env.POSTGRID_MODE === "live" ? "live" : "test",
  };
}

export async function resolveProviderId(slug: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("mail_providers")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  return data?.id ?? null;
}
