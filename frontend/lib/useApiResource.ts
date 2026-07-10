import { useEffect, useState } from "react";

import { apiFetch, ApiError } from "@/lib/api";

interface ApiResourceState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/** Fetches `path` on mount and exposes loading/error/data + a refetch you can
 * call after a mutation. Centralizes the fetch-on-mount pattern so individual
 * pages don't each re-implement loading/error state handling. */
export function useApiResource<T>(path: string): ApiResourceState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await apiFetch<T>(path);
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Unable to reach the server.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [path, version]);

  return { data, loading, error, refetch: () => setVersion((v) => v + 1) };
}
