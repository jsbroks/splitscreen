"use client";

import { MoreVertical, Pencil, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { api } from "~/trpc/react";
import { VideoEditDialog } from "./VideoEditDialog";

interface VideoActionsMenuProps {
  videoId: string;
}

export function VideoActionsMenu({ videoId }: VideoActionsMenuProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const { data: video } = api.videos.getVideo.useQuery({ videoId });

  const deleteVideoMutation = api.videos.deleteVideo.useMutation({
    onSuccess: () => {
      toast.success("Video deleted successfully");
      router.push("/");
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete video");
      setIsDeleting(false);
    },
  });

  const handleDelete = () => {
    if (
      confirm(
        "Are you sure you want to delete this video? This action cannot be undone.",
      )
    ) {
      setIsDeleting(true);
      deleteVideoMutation.mutate({ videoId });
    }
  };

  const handleEdit = () => {
    setEditDialogOpen(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="rounded-full" size="sm" variant="outline">
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleEdit}>
            <Pencil className="mr-2 size-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive"
            disabled={isDeleting}
            onClick={handleDelete}
          >
            <Trash className="mr-2 size-4" />
            {isDeleting ? "Deleting..." : "Delete"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {video && (
        <VideoEditDialog
          initialData={{
            title: video.title,
            description: video.description,
            creatorId: video.creators?.find((c) => c.role === "producer")
              ?.creatorId,
            featuredCreatorIds: video.creators
              .filter((c) => c.role === "performer")
              .map((c) => c.creatorId),
          }}
          onOpenChange={setEditDialogOpen}
          open={editDialogOpen}
          videoId={videoId}
        />
      )}
    </>
  );
}
