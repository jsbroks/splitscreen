"use client";

import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import Link from "next/link";
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
import { Spinner } from "~/components/ui/spinner";
import { Textarea } from "~/components/ui/textarea";
import { api } from "~/trpc/react";

export default function VideosAdminPage() {
  const [selectedStatus, setSelectedStatus] = useState<
    "in_review" | "all_pending"
  >("in_review");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingVideoId, setRejectingVideoId] = useState<string | null>(null);
  const [rejectionMessage, setRejectionMessage] = useState("");

  const { data: videos, isLoading } = api.videos.search.useQuery({
    limit: 100,
    status: "in_review",
    sortBy: { field: "created_at", direction: "asc" },
  });

  const utils = api.useUtils();

  const approveVideo = api.videos.approveVideo.useMutation({
    onSuccess: () => {
      toast.success("Video approved successfully");
      void utils.videos.search.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const rejectVideo = api.videos.rejectVideo.useMutation({
    onSuccess: () => {
      toast.success("Video rejected");
      setRejectDialogOpen(false);
      setRejectingVideoId(null);
      setRejectionMessage("");
      void utils.videos.search.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleApprove = (videoId: string) => {
    approveVideo.mutate({ videoId });
  };

  const handleRejectClick = (videoId: string) => {
    setRejectingVideoId(videoId);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (!rejectingVideoId) return;
    rejectVideo.mutate({
      videoId: rejectingVideoId,
      message: rejectionMessage.trim() || undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      {
        variant: "default" | "secondary" | "destructive" | "outline";
        label: string;
      }
    > = {
      in_review: { variant: "outline", label: "In Review" },
      approved: { variant: "default", label: "Approved" },
      rejected: { variant: "destructive", label: "Rejected" },
    };

    const statusInfo = variants[status] ?? {
      variant: "secondary" as const,
      label: status,
    };

    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  return (
    <main>
      <div className="container mx-auto max-w-7xl space-y-6 px-6 py-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-3xl">Pending Videos</h1>
            <p className="text-muted-foreground">
              Review and manage videos awaiting approval
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/admin">Back to Admin</Link>
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => setSelectedStatus("in_review")}
            variant={selectedStatus === "in_review" ? "default" : "outline"}
          >
            In Review
          </Button>
          <Button
            onClick={() => setSelectedStatus("all_pending")}
            variant={selectedStatus === "all_pending" ? "default" : "outline"}
          >
            All Pending
          </Button>
        </div>

        {!isLoading && videos && (
          // biome-ignore lint/complexity/noUselessFragments: readability
          <>
            {videos.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    No{" "}
                    {selectedStatus === "in_review"
                      ? "videos in review"
                      : "pending videos"}{" "}
                    found.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium text-sm">
                        Thumbnail
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-sm">
                        Title
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-sm">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-sm">
                        Duration
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-sm">
                        Uploaded
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-sm">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {videos.map((video) => (
                      <tr className="border-b last:border-0" key={video.id}>
                        <td className="px-4 py-3">
                          {video.thumbnailUrl ? (
                            <div className="relative h-16 w-28 overflow-hidden rounded">
                              <Image
                                alt={video.title}
                                className="object-cover"
                                fill
                                src={video.thumbnailUrl}
                              />
                            </div>
                          ) : (
                            <div className="flex h-16 w-28 items-center justify-center rounded bg-muted text-muted-foreground text-xs">
                              No thumbnail
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="max-w-md">
                            <div className="font-medium">{video.title}</div>
                            {video.description && (
                              <div className="line-clamp-2 text-muted-foreground text-sm">
                                {video.description}
                              </div>
                            )}
                            <div className="mt-1 text-muted-foreground text-xs">
                              ID: {video.id}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(video.status)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {video.durationSeconds
                            ? `${Math.floor(video.durationSeconds / 60)}:${(video.durationSeconds % 60).toString().padStart(2, "0")}`
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {formatDistanceToNow(new Date(video.createdAt), {
                            addSuffix: true,
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/video/${video.id}`} target="_blank">
                                View
                              </Link>
                            </Button>
                            {video.status === "in_review" && (
                              <>
                                <Button
                                  disabled={approveVideo.isPending}
                                  onClick={() => handleApprove(video.id)}
                                  size="sm"
                                  variant="default"
                                >
                                  {approveVideo.isPending ? (
                                    <Spinner />
                                  ) : (
                                    "Approve"
                                  )}
                                </Button>
                                <Button
                                  onClick={() => handleRejectClick(video.id)}
                                  size="sm"
                                  variant="destructive"
                                >
                                  Reject
                                </Button>
                              </>
                            )}
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

      <Dialog onOpenChange={setRejectDialogOpen} open={rejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Video</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this video. This message will be
              visible to the uploader.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              onChange={(e) => setRejectionMessage(e.target.value)}
              placeholder="Enter rejection reason (optional)..."
              rows={4}
              value={rejectionMessage}
            />
          </div>
          <DialogFooter>
            <Button
              disabled={rejectVideo.isPending}
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectingVideoId(null);
                setRejectionMessage("");
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={rejectVideo.isPending}
              onClick={handleRejectConfirm}
              variant="destructive"
            >
              {rejectVideo.isPending ? <Spinner /> : "Reject Video"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
