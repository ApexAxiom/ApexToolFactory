import { useCallback, useEffect, useRef, useState } from "react";

import { useEntitiesStore, type Entity } from "../state/entitiesStore";
import { useJourneyStore } from "../state/journeyStore";

interface LinkEntity {
  readonly id: string;
  readonly label?: string;
  readonly description?: string;
  readonly url?: string;
  readonly rank?: number;
}

interface LinkResponse {
  readonly query: string;
  readonly items?: LinkEntity[];
  readonly summary?: string | null;
  readonly error?: string;
}

type Status = "idle" | "loading" | "success" | "error";

function toEntity(item: LinkEntity, index: number): Entity {
  const label = item.label?.trim() || item.id;
  const rank = typeof item.rank === "number" ? item.rank : Math.max(1, 500 - index * 20);

  return {
    id: item.id,
    label,
    description: item.description?.trim() || undefined,
    url: item.url,
    rank
  };
}

function createJourneyId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // ignore
  }

  return `journey-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
}

export default function usePageEntities() {
  const setEntities = useEntitiesStore((state) => state.setEntities);
  const clearEntities = useEntitiesStore((state) => state.clear);
  const entities = useEntitiesStore((state) => state.entities);
  const addJourney = useJourneyStore((state) => state.add);

  const abortRef = useRef<AbortController | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState<string>("");

  const ask = useCallback(
    async (rawQuery: string) => {
      const query = rawQuery.trim();
      if (!query) {
        clearEntities();
        setSummary(null);
        setLastQuery("");
        setError("Enter a phrase or place to explore.");
        setStatus("error");
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setStatus("loading");
      setError(null);

      try {
        const response = await fetch("/api/link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: query }),
          signal: controller.signal
        });

        const payload = (await response.json().catch(() => ({}))) as LinkResponse;

        if (!response.ok) {
          const message = payload.error || `Request failed with status ${response.status}`;
          throw new Error(message);
        }

        const items = (payload.items ?? []).map(toEntity);
        setEntities(items);
        setSummary(payload.summary?.trim() ? payload.summary.trim() : null);
        setLastQuery(payload.query || query);
        addJourney({
          id: createJourneyId(),
          createdAt: Date.now(),
          query: payload.query || query,
          resultCount: items.length
        });
        setStatus("success");
      } catch (caught) {
        if (controller.signal.aborted) {
          return;
        }

        clearEntities();
        setSummary(null);
        const message = caught instanceof Error ? caught.message : "Unable to ask Book Lens right now.";
        setError(message);
        setStatus("error");
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    },
    [addJourney, clearEntities, setEntities]
  );

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return {
    ask,
    entities,
    status,
    error,
    summary,
    lastQuery
  };
}
