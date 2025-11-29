"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { api } from "~/trpc/react";

export function TypesenseSync() {
  const [isSyncing, setIsSyncing] = useState<string | null>(null);

  const syncAll = api.typesense.syncAll.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setIsSyncing(null);
    },
    onError: (error) => {
      toast.error(`Sync failed: ${error.message}`);
      setIsSyncing(null);
    },
  });

  const syncRecent = api.typesense.syncRecent.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      if (data.details.failed > 0) {
        toast.warning(
          `${data.details.failed} videos failed to sync. Check server logs.`,
        );
      }
      setIsSyncing(null);
    },
    onError: (error) => {
      toast.error(`Sync failed: ${error.message}`);
      setIsSyncing(null);
    },
  });

  const syncApproved = api.typesense.syncApproved.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      if (data.details.failed > 0) {
        toast.warning(
          `${data.details.failed} videos failed to sync. Check server logs.`,
        );
      }
      setIsSyncing(null);
    },
    onError: (error) => {
      toast.error(`Sync failed: ${error.message}`);
      setIsSyncing(null);
    },
  });

  const handleSyncAll = () => {
    if (
      !confirm(
        "This will sync all videos to Typesense. This may take several minutes. Continue?",
      )
    ) {
      return;
    }
    setIsSyncing("all");
    syncAll.mutate();
  };

  const handleSyncRecent = (hours: number) => {
    setIsSyncing(`recent-${hours}`);
    syncRecent.mutate({ hours });
  };

  const handleSyncApproved = () => {
    if (
      !confirm("This will sync all approved videos to Typesense. Continue?")
    ) {
      return;
    }
    setIsSyncing("approved");
    syncApproved.mutate();
  };

  const isLoading = !!isSyncing;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Typesense Search Sync</CardTitle>
        <CardDescription>
          Sync video data to Typesense for search and discovery
        </CardDescription>

        <div className="space-y-2 pt-4">
          <Button
            className="w-full"
            disabled={isLoading}
            onClick={handleSyncAll}
            variant="default"
          >
            {isSyncing === "all" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing All Videos...
              </>
            ) : (
              "Sync All Videos"
            )}
          </Button>

          <Button
            className="w-full"
            disabled={isLoading}
            onClick={handleSyncApproved}
            variant="secondary"
          >
            {isSyncing === "approved" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing Approved...
              </>
            ) : (
              "Sync Approved Only"
            )}
          </Button>

          <div className="flex gap-2">
            <Button
              className="flex-1"
              disabled={isLoading}
              onClick={() => handleSyncRecent(24)}
              variant="outline"
            >
              {isSyncing === "recent-24" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                "Last 24h"
              )}
            </Button>

            <Button
              className="flex-1"
              disabled={isLoading}
              onClick={() => handleSyncRecent(168)}
              variant="outline"
            >
              {isSyncing === "recent-168" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                "Last Week"
              )}
            </Button>
          </div>

          <p className="pt-2 text-muted-foreground text-xs">
            Use "Sync All" for initial setup or full resync. Use "Last 24h" for
            regular updates.
          </p>
        </div>
      </CardHeader>
    </Card>
  );
}
