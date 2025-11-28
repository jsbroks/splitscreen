"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { MultiSelectCreator } from "~/components/MultiSelectCreator";
import { SingleSelectCreator } from "~/components/SingleSelectCreator";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { api } from "~/trpc/react";

interface VideoEditDialogProps {
  videoId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: {
    title: string;
    description?: string | null;
    creatorId?: string | null;
    featuredCreatorIds: string[];
  };
}

type FormValues = {
  title: string;
  description?: string;
};

export function VideoEditDialog({
  videoId,
  open,
  onOpenChange,
  initialData,
}: VideoEditDialogProps) {
  const router = useRouter();
  const utils = api.useUtils();
  const { data: creators } = api.creators.list.useQuery();
  const createCreatorMutation = api.creators.quickCreate.useMutation();

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
    reset,
  } = useForm<FormValues>({
    defaultValues: {
      title: initialData.title,
      description: initialData.description ?? "",
    },
  });

  const [selectedCreator, setSelectedCreator] = useState<string>(
    initialData.creatorId ?? "",
  );
  const [selectedFeaturedCreators, setSelectedFeaturedCreators] = useState<
    string[]
  >(initialData.featuredCreatorIds);

  // Reset form when dialog opens/closes or initialData changes
  useEffect(() => {
    if (open) {
      reset({
        title: initialData.title,
        description: initialData.description ?? "",
      });
      setSelectedCreator(initialData.creatorId ?? "");
      setSelectedFeaturedCreators(initialData.featuredCreatorIds);
    }
  }, [open, initialData, reset]);

  const updateVideoMutation = api.videos.updateVideo.useMutation({
    onSuccess: async () => {
      toast.success("Video updated successfully");
      // Invalidate queries to refresh data
      await utils.videos.getVideo.invalidate({ videoId });
      router.refresh();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update video");
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      // Identify new creators that need to be created
      const existingCreatorIds = new Set(creators?.map((c) => c.id) ?? []);
      const newCreatorNames: string[] = [];
      let finalCreatorId = selectedCreator;
      const finalFeaturedIds: string[] = [];

      // Handle main creator
      if (selectedCreator && !existingCreatorIds.has(selectedCreator)) {
        newCreatorNames.push(selectedCreator);
      } else if (selectedCreator) {
        finalCreatorId = selectedCreator;
      }

      // Handle featured creators
      for (const creatorValue of selectedFeaturedCreators) {
        if (!existingCreatorIds.has(creatorValue)) {
          newCreatorNames.push(creatorValue);
        } else {
          finalFeaturedIds.push(creatorValue);
        }
      }

      // Create all new creators
      const createdCreatorMap = new Map<string, string>();
      for (const creatorName of newCreatorNames) {
        try {
          const newCreator = await createCreatorMutation.mutateAsync({
            displayName: creatorName,
          });
          if (newCreator) {
            createdCreatorMap.set(creatorName, newCreator.id);
          }
        } catch {
          toast.error(`Failed to create creator "${creatorName}"`);
          return;
        }
      }

      // Map all selections to IDs
      if (selectedCreator && createdCreatorMap.has(selectedCreator)) {
        const createdId = createdCreatorMap.get(selectedCreator);
        if (createdId) finalCreatorId = createdId;
      }

      for (const creatorValue of selectedFeaturedCreators) {
        if (createdCreatorMap.has(creatorValue)) {
          const createdId = createdCreatorMap.get(creatorValue);
          if (createdId) finalFeaturedIds.push(createdId);
        }
      }

      // Update the video
      await updateVideoMutation.mutateAsync({
        videoId,
        title: values.title,
        description: values.description,
        creatorId: finalCreatorId || undefined,
        featuredCreatorIds: finalFeaturedIds,
      });
    } catch (e) {
      console.error(e);
      const message = e instanceof Error ? e.message : "Update failed";
      toast.error(message);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Video</DialogTitle>
          <DialogDescription>
            Update the title, description, and creators for this video.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="My awesome video"
              type="text"
              {...register("title", { required: true })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional description"
              {...register("description")}
            />
          </div>

          <div className="space-y-2">
            <Label>Video Creator (Optional)</Label>
            <SingleSelectCreator
              creators={creators ?? []}
              onChange={setSelectedCreator}
              placeholder="Type to search or create a new creator..."
              value={selectedCreator}
            />
            <p className="text-muted-foreground text-xs">
              Original creator of the video. Type a name and press Enter to
              create a new one.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Featured Creators (Optional)</Label>
            <MultiSelectCreator
              creators={creators ?? []}
              onChange={setSelectedFeaturedCreators}
              placeholder="Type to search or create new creators..."
              values={selectedFeaturedCreators}
            />
            <p className="text-muted-foreground text-xs">
              Creators who appear in this video. Type names and press Enter to
              create new ones.
            </p>
          </div>

          <DialogFooter>
            <Button
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
