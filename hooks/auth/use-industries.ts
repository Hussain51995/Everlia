"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Industry } from "@/lib/types/auth";
import { authKeys } from "@/hooks/auth/keys";

export function useIndustries() {
  return useQuery({
    queryKey: authKeys.industries(),
    queryFn: () => apiClient<Industry[]>("/api/industries"),
  });
}
