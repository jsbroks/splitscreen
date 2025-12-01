"use client";

import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Spinner } from "~/components/ui/spinner";
import { api } from "~/trpc/react";

type StatusFilter = "all" | "queued" | "running" | "done" | "failed";
type QueueStatus = "queued" | "running" | "done" | "failed";

export default function TranscodeJobsAdminPage() {
  const [statusFilter, setStatusFilter] = useQueryState<StatusFilter>(
    "status",
    parseAsStringEnum([
      "all",
      "queued",
      "running",
      "done",
      "failed",
    ]).withDefault("all"),
  );
  const [changeStatusDialogOpen, setChangeStatusDialogOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<QueueStatus>("queued");

  const { data: jobs, isLoading } = api.transcodeQueue.list.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
    limit: 100,
  });

  const { data: stats } = api.transcodeQueue.stats.useQuery();

  const utils = api.useUtils();

  const updateStatus = api.transcodeQueue.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Job status updated successfully");
      setChangeStatusDialogOpen(false);
      setSelectedJobId(null);
      void utils.transcodeQueue.list.invalidate();
      void utils.transcodeQueue.stats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const retryJob = api.transcodeQueue.retry.useMutation({
    onSuccess: () => {
      toast.success("Job queued for retry");
      void utils.transcodeQueue.list.invalidate();
      void utils.transcodeQueue.stats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteJob = api.transcodeQueue.delete.useMutation({
    onSuccess: () => {
      toast.success("Job deleted successfully");
      void utils.transcodeQueue.list.invalidate();
      void utils.transcodeQueue.stats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleChangeStatusClick = (
    jobId: string,
    currentStatus: QueueStatus,
  ) => {
    setSelectedJobId(jobId);
    setNewStatus(currentStatus);
    setChangeStatusDialogOpen(true);
  };

  const handleChangeStatusConfirm = () => {
    if (!selectedJobId) return;
    updateStatus.mutate({
      id: selectedJobId,
      status: newStatus,
    });
  };

  const handleRetry = (jobId: string) => {
    retryJob.mutate({ id: jobId });
  };

  const handleDelete = (jobId: string) => {
    if (confirm("Are you sure you want to delete this transcode job?")) {
      deleteJob.mutate({ id: jobId });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      {
        variant: "default" | "secondary" | "destructive" | "outline";
        label: string;
      }
    > = {
      queued: { variant: "outline", label: "Queued" },
      running: { variant: "default", label: "Running" },
      done: { variant: "secondary", label: "Done" },
      failed: { variant: "destructive", label: "Failed" },
    };

    const statusInfo = variants[status] ?? {
      variant: "secondary" as const,
      label: status,
    };

    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const getProcessingStatusBadge = (status: string) => {
    const variants: Record<
      string,
      {
        variant: "default" | "secondary" | "destructive" | "outline";
        label: string;
      }
    > = {
      pending: { variant: "outline", label: "Pending" },
      processing: { variant: "default", label: "Processing" },
      done: { variant: "secondary", label: "Done" },
      failed: { variant: "destructive", label: "Failed" },
    };

    const statusInfo = variants[status] ?? {
      variant: "secondary" as const,
      label: status,
    };

    return (
      <Badge className="text-xs" variant={statusInfo.variant}>
        {statusInfo.label}
      </Badge>
    );
  };

  const formatDuration = (start: Date | null, end: Date | null) => {
    if (!start || !end) return "-";
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    if (diffSecs < 60) return `${diffSecs}s`;
    const mins = Math.floor(diffSecs / 60);
    const secs = diffSecs % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <main>
      <div className="container mx-auto max-w-7xl space-y-6 px-6 py-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-3xl">Transcode Jobs</h1>
            <p className="text-muted-foreground">
              View and manage video transcoding queue
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/admin">Back to Admin</Link>
          </Button>
        </div>

        {stats && (
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardContent className="pt-6">
                <div className="font-bold text-2xl">{stats.total}</div>
                <div className="text-muted-foreground text-sm">Total Jobs</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="font-bold text-2xl">{stats.queued}</div>
                <div className="text-muted-foreground text-sm">Queued</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="font-bold text-2xl">{stats.running}</div>
                <div className="text-muted-foreground text-sm">Running</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="font-bold text-2xl">{stats.done}</div>
                <div className="text-muted-foreground text-sm">Done</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="font-bold text-2xl">{stats.failed}</div>
                <div className="text-muted-foreground text-sm">Failed</div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={() => setStatusFilter("all")}
            variant={statusFilter === "all" ? "default" : "outline"}
          >
            All ({stats?.total ?? 0})
          </Button>
          <Button
            onClick={() => setStatusFilter("queued")}
            variant={statusFilter === "queued" ? "default" : "outline"}
          >
            Queued ({stats?.queued ?? 0})
          </Button>
          <Button
            onClick={() => setStatusFilter("running")}
            variant={statusFilter === "running" ? "default" : "outline"}
          >
            Running ({stats?.running ?? 0})
          </Button>
          <Button
            onClick={() => setStatusFilter("done")}
            variant={statusFilter === "done" ? "default" : "outline"}
          >
            Done ({stats?.done ?? 0})
          </Button>
          <Button
            onClick={() => setStatusFilter("failed")}
            variant={statusFilter === "failed" ? "default" : "outline"}
          >
            Failed ({stats?.failed ?? 0})
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : (
          // biome-ignore lint/complexity/noUselessFragments: readability
          <>
            {!jobs || jobs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    No transcode jobs found
                    {statusFilter !== "all" && ` with status "${statusFilter}"`}
                    .
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium text-sm">
                        Video
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-sm">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-sm">
                        Processing Status
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-sm">
                        Attempts
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-sm">
                        Duration
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-sm">
                        Created
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-sm">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => (
                      <tr className="border-b last:border-0" key={job.id}>
                        <td className="px-4 py-3">
                          <div className="max-w-xs">
                            <div className="font-medium">
                              {job.video?.title ?? "Unknown"}
                            </div>
                            <div className="font-mono text-muted-foreground text-xs">
                              {job.videoId}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(job.status)}
                          {job.error && (
                            <div className="mt-1 max-w-xs truncate text-destructive text-xs">
                              {job.error}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs">HLS:</span>
                              {getProcessingStatusBadge(job.hlsStatus)}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs">Poster:</span>
                              {getProcessingStatusBadge(job.posterStatus)}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs">Scrubber:</span>
                              {getProcessingStatusBadge(
                                job.scrubberPreviewStatus,
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs">Hover:</span>
                              {getProcessingStatusBadge(job.hoverPreviewStatus)}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">{job.attempts}</td>
                        <td className="px-4 py-3 text-sm">
                          {formatDuration(job.startedAt, job.finishedAt)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {formatDistanceToNow(new Date(job.createdAt), {
                            addSuffix: true,
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            {job.video && (
                              <Button asChild size="sm" variant="outline">
                                <Link
                                  href={`/video/${job.videoId}`}
                                  target="_blank"
                                >
                                  View
                                </Link>
                              </Button>
                            )}
                            <Button
                              onClick={() =>
                                handleChangeStatusClick(job.id, job.status)
                              }
                              size="sm"
                              variant="outline"
                            >
                              Change Status
                            </Button>
                            {job.status === "failed" && (
                              <Button
                                disabled={retryJob.isPending}
                                onClick={() => handleRetry(job.id)}
                                size="sm"
                                variant="default"
                              >
                                Retry
                              </Button>
                            )}
                            <Button
                              disabled={deleteJob.isPending}
                              onClick={() => handleDelete(job.id)}
                              size="sm"
                              variant="destructive"
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog
        onOpenChange={setChangeStatusDialogOpen}
        open={changeStatusDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Job Status</DialogTitle>
            <DialogDescription>
              Select the new status for this transcode job.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select
              onValueChange={(value) => setNewStatus(value as QueueStatus)}
              value={newStatus}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="queued">Queued</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="done">Done</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              disabled={updateStatus.isPending}
              onClick={() => {
                setChangeStatusDialogOpen(false);
                setSelectedJobId(null);
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={updateStatus.isPending}
              onClick={handleChangeStatusConfirm}
            >
              {updateStatus.isPending ? <Spinner /> : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
