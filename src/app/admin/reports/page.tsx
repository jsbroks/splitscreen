"use client";

import { formatDistanceToNow } from "date-fns";
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
import { api } from "~/trpc/react";

const REASON_LABELS: Record<string, string> = {
  underage_content: "Underage content",
  abuse: "Abuse",
  illegal_content: "Illegal Content",
  wrong_tags: "Wrong Tags",
  spam_unrelated: "Spam / Unrelated",
  dmca: "DMCA",
  other: "Other",
};

export default function ReportsAdminPage() {
  const [selectedFilter, setSelectedFilter] = useState<"active" | "archived">(
    "active",
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);
  const [deletingVideoTitle, setDeletingVideoTitle] = useState<string>("");

  const { data: reports, isLoading } = api.videos.getReports.useQuery({
    archived: selectedFilter === "archived",
    limit: 100,
  });

  const utils = api.useUtils();

  const archiveReport = api.videos.archiveReport.useMutation({
    onSuccess: () => {
      toast.success("Report archived");
      void utils.videos.getReports.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteVideo = api.videos.deleteVideo.useMutation({
    onSuccess: () => {
      toast.success("Video deleted");
      setDeleteDialogOpen(false);
      setDeletingVideoId(null);
      setDeletingVideoTitle("");
      void utils.videos.getReports.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleArchive = (reportId: string) => {
    archiveReport.mutate({ reportId });
  };

  const handleDeleteClick = (videoId: string, videoTitle: string) => {
    setDeletingVideoId(videoId);
    setDeletingVideoTitle(videoTitle);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!deletingVideoId) return;
    deleteVideo.mutate({ videoId: deletingVideoId });
  };

  return (
    <main>
      <div className="container mx-auto max-w-7xl space-y-6 px-6 py-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-3xl">Video Reports</h1>
            <p className="text-muted-foreground">
              Review and manage reported videos
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/admin">Back to Admin</Link>
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => setSelectedFilter("active")}
            variant={selectedFilter === "active" ? "default" : "outline"}
          >
            Active Reports
          </Button>
          <Button
            onClick={() => setSelectedFilter("archived")}
            variant={selectedFilter === "archived" ? "default" : "outline"}
          >
            Archived
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Spinner />
          </div>
        )}

        {!isLoading && reports && (
          <>
            {reports.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    No {selectedFilter} reports found.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium text-sm">
                        Video
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-sm">
                        Reporter
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-sm">
                        Reasons
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-sm">
                        Details
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-sm">
                        Reported
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-sm">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report) => (
                      <tr key={report.id} className="border-b last:border-0">
                        <td className="px-4 py-3">
                          <div className="max-w-xs">
                            <div className="font-medium">
                              {report.video?.title ?? "Deleted Video"}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              ID: {report.videoId}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="max-w-xs">
                            <div className="font-medium text-sm">
                              {report.fullName}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {report.email}
                            </div>
                            {report.reportedBy && (
                              <div className="text-muted-foreground text-xs">
                                User: @{report.reportedBy.username}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {report.reasons.map((reason) => (
                              <Badge key={reason} variant="outline">
                                {REASON_LABELS[reason] ?? reason}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="max-w-sm line-clamp-3 text-sm">
                            {report.details}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {formatDistanceToNow(new Date(report.createdAt), {
                            addSuffix: true,
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            {report.video && (
                              <Button asChild size="sm" variant="outline">
                                <Link
                                  href={`/video/${report.videoId}`}
                                  target="_blank"
                                >
                                  View Video
                                </Link>
                              </Button>
                            )}
                            {selectedFilter === "active" && (
                              <>
                                {report.video && (
                                  <Button
                                    onClick={() =>
                                      handleDeleteClick(
                                        report.videoId,
                                        report.video?.title ?? "",
                                      )
                                    }
                                    size="sm"
                                    variant="destructive"
                                  >
                                    Delete Video
                                  </Button>
                                )}
                                <Button
                                  disabled={archiveReport.isPending}
                                  onClick={() => handleArchive(report.id)}
                                  size="sm"
                                  variant="secondary"
                                >
                                  {archiveReport.isPending ? (
                                    <Spinner />
                                  ) : (
                                    "Archive"
                                  )}
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

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Video</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingVideoTitle}"? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeletingVideoId(null);
                setDeletingVideoTitle("");
              }}
              disabled={deleteVideo.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteVideo.isPending}
            >
              {deleteVideo.isPending ? <Spinner /> : "Delete Video"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

