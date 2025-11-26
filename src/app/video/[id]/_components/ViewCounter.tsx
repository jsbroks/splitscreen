"use client";

import { useEffect } from "react";
import { useFingerprint } from "~/app/_components/useFigureprint";
import { authClient } from "~/server/better-auth/client";
import { api } from "~/trpc/react";

export const FingerPrintViewCounter: React.FC<{ videoId: string }> = ({
  videoId,
}) => {
  const { isPending, isRefetching } = authClient.useSession();
  const { fingerprint, isLoading } = useFingerprint();
  const view = api.videos.view.useMutation();
  const createNewView = view.mutate;

  useEffect(() => {
    if (isPending || isRefetching || isLoading) return;
    createNewView({ videoId, fingerprint: fingerprint?.visitorId ?? "" });
  }, [isLoading, isPending, isRefetching, createNewView, videoId, fingerprint]);

  return null;
};
