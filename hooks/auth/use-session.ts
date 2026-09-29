"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { SessionPayload } from "@/lib/types/auth";
import { useAuthStore } from "@/stores/auth-store";
import { authKeys } from "@/hooks/auth/keys";

type SessionResponse = {
  session: SessionPayload;
};

export function useSession(options?: { enabled?: boolean }) {
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);

  return useQuery({
    queryKey: authKeys.session(),
    queryFn: async () => {
      try {
        const data = await apiClient<SessionResponse>("/api/auth/session");
        setSession(data.session);
        return data.session;
      } catch {
        clearSession();
        return null;
      }
    },
    enabled: options?.enabled ?? true,
  });
}
