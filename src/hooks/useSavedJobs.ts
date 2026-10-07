import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/auth/AuthProvider";

const STORAGE_KEY_PREFIX = "talenttrack_saved_jobs_";

export function useSavedJobs() {
  const { user } = useAuth();
  const storageKey = `${STORAGE_KEY_PREFIX}${user?.id || "guest"}`;

  const getStoredSavedJobs = useCallback((): string[] => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, [storageKey]);

  const [savedJobIds, setSavedJobIds] = useState<string[]>(getStoredSavedJobs);

  useEffect(() => {
    setSavedJobIds(getStoredSavedJobs());
  }, [getStoredSavedJobs]);

  const persistSavedJobs = useCallback(
    (newIds: string[]) => {
      setSavedJobIds(newIds);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(storageKey, JSON.stringify(newIds));
          // Dispatch custom event to notify other mounted components in the same window
          window.dispatchEvent(new CustomEvent("talenttrack-saved-jobs-change", { detail: { key: storageKey, ids: newIds } }));
        } catch {
          // ignore storage errors
        }
      }
    },
    [storageKey],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        try {
          setSavedJobIds(JSON.parse(e.newValue));
        } catch {
          // ignore
        }
      }
    };
    const handleCustomChange = (e: Event) => {
      const custom = e as CustomEvent<{ key: string; ids: string[] }>;
      if (custom.detail?.key === storageKey) {
        setSavedJobIds(custom.detail.ids);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("talenttrack-saved-jobs-change", handleCustomChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("talenttrack-saved-jobs-change", handleCustomChange);
    };
  }, [storageKey]);

  const isSaved = useCallback(
    (jobId: string): boolean => {
      return savedJobIds.includes(jobId);
    },
    [savedJobIds],
  );

  const toggleSave = useCallback(
    (jobId: string) => {
      if (!jobId) return;
      const current = getStoredSavedJobs();
      const updated = current.includes(jobId)
        ? current.filter((id) => id !== jobId)
        : [...current, jobId];
      persistSavedJobs(updated);
    },
    [getStoredSavedJobs, persistSavedJobs],
  );

  const saveJob = useCallback(
    (jobId: string) => {
      if (!jobId) return;
      const current = getStoredSavedJobs();
      if (!current.includes(jobId)) {
        persistSavedJobs([...current, jobId]);
      }
    },
    [getStoredSavedJobs, persistSavedJobs],
  );

  const removeSavedJob = useCallback(
    (jobId: string) => {
      if (!jobId) return;
      const current = getStoredSavedJobs();
      persistSavedJobs(current.filter((id) => id !== jobId));
    },
    [getStoredSavedJobs, persistSavedJobs],
  );

  return {
    savedJobIds,
    savedCount: savedJobIds.length,
    isSaved,
    toggleSave,
    saveJob,
    removeSavedJob,
  };
}
