import type {
  PropertyDataCategory,
  PropertyProviderId,
  ProviderCapability,
} from "@/lib/types/property-intelligence";
import { PROPERTY_DATA_CATEGORIES } from "@/lib/types/property-intelligence";
import { createProviderError } from "@/lib/property-intelligence/errors";
import type {
  CategoryProviderMap,
  PropertyDataProvider,
  ProviderRegistryConfig,
} from "@/lib/property-intelligence/providers/types";

export class ProviderRegistryError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ProviderRegistryError";
    this.code = code;
  }
}

export class PropertyProviderRegistry {
  private readonly providers = new Map<PropertyProviderId, PropertyDataProvider>();
  private config: ProviderRegistryConfig;

  constructor(config?: Partial<ProviderRegistryConfig>) {
    this.config = {
      defaultProviderId: config?.defaultProviderId ?? "rentcast",
      categoryProviders: { ...(config?.categoryProviders ?? {}) },
    };
  }

  register(provider: PropertyDataProvider): void {
    if (!provider.id) {
      throw new ProviderRegistryError(
        "invalid_provider",
        "Provider id is required"
      );
    }
    this.providers.set(provider.id, provider);
  }

  unregister(providerId: PropertyProviderId): void {
    this.providers.delete(providerId);
  }

  listProviders(): PropertyDataProvider[] {
    return [...this.providers.values()];
  }

  getProvider(providerId: PropertyProviderId): PropertyDataProvider | null {
    return this.providers.get(providerId) ?? null;
  }

  setConfig(config: Partial<ProviderRegistryConfig>): void {
    this.config = {
      defaultProviderId:
        config.defaultProviderId ?? this.config.defaultProviderId,
      categoryProviders: {
        ...this.config.categoryProviders,
        ...(config.categoryProviders ?? {}),
      },
    };
  }

  getConfig(): ProviderRegistryConfig {
    return {
      defaultProviderId: this.config.defaultProviderId,
      categoryProviders: { ...this.config.categoryProviders },
    };
  }

  resolveProviderId(category: PropertyDataCategory): PropertyProviderId {
    return (
      this.config.categoryProviders[category] ?? this.config.defaultProviderId
    );
  }

  resolveForCategory(category: PropertyDataCategory): {
    provider: PropertyDataProvider;
    capability: ProviderCapability;
  } {
    if (!PROPERTY_DATA_CATEGORIES.includes(category)) {
      throw new ProviderRegistryError(
        "unknown_category",
        `Unknown property data category: ${category}`
      );
    }

    const providerId = this.resolveProviderId(category);
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new ProviderRegistryError(
        "provider_not_registered",
        `Provider "${providerId}" is not registered for category ${category}`
      );
    }

    if (provider.isMock === false && providerId === "mock") {
      throw new ProviderRegistryError(
        "invalid_mock_flag",
        "Provider id mock must set isMock=true"
      );
    }

    const capability = provider.getCapability(category);
    if (!capability || !capability.supported) {
      throw new ProviderRegistryError(
        "unsupported_combination",
        `Provider "${providerId}" does not support category ${category}`
      );
    }

    this.assertCapabilityShape(capability, providerId);
    return { provider, capability };
  }

  validateConfiguration(map?: CategoryProviderMap): {
    ok: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const effective: CategoryProviderMap = {
      ...this.config.categoryProviders,
      ...(map ?? {}),
    };

    for (const category of PROPERTY_DATA_CATEGORIES) {
      const providerId =
        effective[category] ?? this.config.defaultProviderId;
      const provider = this.providers.get(providerId);
      if (!provider) {
        errors.push(
          `Category ${category}: provider "${providerId}" is not registered`
        );
        continue;
      }
      const capability = provider.getCapability(category);
      if (!capability?.supported) {
        errors.push(
          `Category ${category}: provider "${providerId}" does not declare support`
        );
      }
    }

    return { ok: errors.length === 0, errors };
  }

  getCapabilityForCategory(
    category: PropertyDataCategory
  ): ProviderCapability {
    return this.resolveForCategory(category).capability;
  }

  private assertCapabilityShape(
    capability: ProviderCapability,
    providerId: PropertyProviderId
  ): void {
    if (!capability.category) {
      throw new ProviderRegistryError(
        "invalid_capability",
        `Provider "${providerId}" returned capability without category`
      );
    }
    if (!Array.isArray(capability.requiredInputs)) {
      throw new ProviderRegistryError(
        "invalid_capability",
        `Provider "${providerId}" capability missing requiredInputs`
      );
    }
  }
}

export function unsupportedOutcome(
  provider: PropertyDataProvider,
  category: PropertyDataCategory
) {
  return {
    status: "unsupported" as const,
    error: createProviderError({
      code: "unsupported_capability",
      message: `${provider.displayName} does not support ${category}`,
      providerId: provider.id,
      category,
      retryable: false,
    }),
  };
}
