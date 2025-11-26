"use client";

import FingerprintJS, { type GetResult } from "@fingerprintjs/fingerprintjs";
import { useEffect, useState } from "react";

export const useFingerprint = () => {
  const [fingerprint, setFingerprint] = useState<GetResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const getFingerprint = async () => {
      try {
        setIsLoading(true);
        // Initialize FingerprintJS
        const fp = await FingerprintJS.load();
        // Get the visitor identifier
        const result = await fp.get();
        setFingerprint(result);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to get fingerprint"),
        );
        setFingerprint(null);
      } finally {
        setIsLoading(false);
      }
    };

    getFingerprint();
  }, []);

  return { fingerprint, isLoading, error };
};
