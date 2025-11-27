"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { CreatorLink } from "~/app/_components/CreatorBadge";
import { MultiSelectCreator } from "~/components/MultiSelectCreator";
import { MultiSelectTag } from "~/components/MultiSelectTag";
import { SingleSelectCreator } from "~/components/SingleSelectCreator";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { api } from "~/trpc/react";

type FormValues = {
  title: string;
  description?: string;
  creatorId?: string;
  featuredCreatorIds?: string[];
  tagIds?: string[];
};

export default function UploadPage() {
  const router = useRouter();
  const generateUrl = api.videos.generateUploadUrl.useMutation();
  const { data: creators } = api.creators.list.useQuery();
  const { data: tags } = api.tags.list.useQuery();
  const createCreatorMutation = api.creators.quickCreate.useMutation();

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
    reset,
    watch,
  } = useForm<FormValues>();

  const title = watch("title");
  const description = watch("description");

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreviewUrl, setThumbPreviewUrl] = useState<string>("");
  const [selectedCreator, setSelectedCreator] = useState<string>("");
  const [selectedFeaturedCreators, setSelectedFeaturedCreators] = useState<
    string[]
  >([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Create and cleanup thumbnail preview URL
  useEffect(() => {
    if (thumbFile) {
      const url = URL.createObjectURL(thumbFile);
      setThumbPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setThumbPreviewUrl("");
  }, [thumbFile]);

  const onDropVideo = useCallback((accepted: File[]) => {
    setVideoFile(accepted?.[0] ?? null);
  }, []);
  const onDropThumb = useCallback((accepted: File[]) => {
    setThumbFile(accepted?.[0] ?? null);
  }, []);

  const {
    getRootProps: getVideoRootProps,
    getInputProps: getVideoInputProps,
    isDragActive: isVideoDragActive,
    fileRejections: videoRejections,
  } = useDropzone({
    accept: { "video/*": [] },
    maxFiles: 1,
    multiple: false,
    onDrop: onDropVideo,
  });
  const {
    getRootProps: getThumbRootProps,
    getInputProps: getThumbInputProps,
    isDragActive: isThumbDragActive,
    fileRejections: thumbRejections,
  } = useDropzone({
    accept: { "image/*": [] },
    maxFiles: 1,
    multiple: false,
    onDrop: onDropThumb,
  });

  const onSubmit = async (values: FormValues) => {
    try {
      if (!videoFile) {
        toast.error("Please select a video file to upload.");
        return;
      }

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

      // Request presigned URL via tRPC
      const sign = await generateUrl.mutateAsync({
        title: values.title,
        description: values.description,
        filename: videoFile.name,
        contentType: videoFile.type || "application/octet-stream",
        creatorId: finalCreatorId || undefined,
        featuredCreatorIds:
          finalFeaturedIds.length > 0 ? finalFeaturedIds : undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
      });

      // Upload directly to S3
      const put = await fetch(sign.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": videoFile.type || "application/octet-stream",
        },
        body: videoFile,
      });
      if (!put.ok) {
        throw new Error(`Upload failed with ${put.status}`);
      }

      toast.success("Upload successful. Processing has started.");
      reset();
      setVideoFile(null);
      setThumbFile(null);
      setSelectedCreator("");
      setSelectedFeaturedCreators([]);
      setSelectedTags([]);
      // Navigate to the video page if it exists, else back to home
      router.push(`/video/${sign.videoId}`);
    } catch (e) {
      console.error(e);
      const message = e instanceof Error ? e.message : "Upload failed";
      toast.error(message);
    }
  };

  // Get display data for preview
  const selectedCreatorData = useMemo(
    () => creators?.find((c) => c.id === selectedCreator),
    [creators, selectedCreator],
  );
  const selectedFeaturedData = useMemo(
    () =>
      selectedFeaturedCreators.map((value) => {
        const creator = creators?.find((c) => c.id === value);
        return creator
          ? { ...creator, isNew: false }
          : {
              id: value,
              username: value,
              displayName: value,
              image: null,
              isNew: true,
            };
      }),
    [creators, selectedFeaturedCreators],
  );
  const selectedTagsData = useMemo(
    () =>
      selectedTags.map((value) => {
        const tag = tags?.find((t) => t.id === value);
        return tag
          ? { name: tag.name, isNew: false }
          : { name: value, isNew: true };
      }),
    [tags, selectedTags],
  );

  return (
    <div className="mx-auto max-w-7xl p-10">
      <h1 className="mb-6 font-semibold text-3xl">Upload a video</h1>
      <div className="flex gap-8">
        <div className="max-w-2xl flex-1">
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="My awesome video"
                type="text"
                {...register("title", { required: true })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
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

            <div className="space-y-2">
              <Label>Tags (Optional)</Label>
              <MultiSelectTag
                onChange={setSelectedTags}
                placeholder="Type to search or create new tags..."
                tags={tags ?? []}
                values={selectedTags}
              />
              <p className="text-muted-foreground text-xs">
                Tags for categorizing this video. Type tag names and press Enter
                to create new ones.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Video file</Label>
              <div
                {...getVideoRootProps()}
                className="flex cursor-pointer items-center justify-center rounded-md border border-input border-dashed p-6 text-center hover:bg-accent/50"
              >
                <input {...getVideoInputProps()} />
                <div className="space-y-1">
                  <p className="text-sm">
                    {isVideoDragActive
                      ? "Drop the video here..."
                      : "Drag and drop a video here, or click to select"}
                  </p>
                  {videoFile && (
                    <p className="text-muted-foreground text-xs">
                      Selected: {videoFile.name} (
                      {Math.round(videoFile.size / 1024)} KB)
                    </p>
                  )}
                  {videoRejections?.length > 0 && (
                    <p className="text-destructive text-xs">
                      Invalid file. Please select a video.
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Thumbnail (optional)</Label>
              <div
                {...getThumbRootProps()}
                className="flex cursor-pointer items-center justify-center rounded-md border border-input border-dashed p-6 text-center hover:bg-accent/50"
              >
                <input {...getThumbInputProps()} />
                <div className="space-y-1">
                  <p className="text-sm">
                    {isThumbDragActive
                      ? "Drop the image here..."
                      : "Drag and drop an image here, or click to select"}
                  </p>
                  {thumbFile && (
                    <p className="text-muted-foreground text-xs">
                      Selected: {thumbFile.name} (
                      {Math.round(thumbFile.size / 1024)} KB)
                    </p>
                  )}
                  {thumbRejections?.length > 0 && (
                    <p className="text-destructive text-xs">
                      Invalid file. Please select an image.
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="pt-2">
              <Button disabled={isSubmitting} type="submit">
                {isSubmitting ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </form>
        </div>

        {/* Preview Section */}
        <div className="w-96 shrink-0">
          <div className="sticky top-6">
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Title */}
                <div>
                  <p className="font-medium text-sm">Title</p>
                  <p className="text-muted-foreground text-sm">
                    {title || <span className="italic">No title</span>}
                  </p>
                </div>

                {/* Description */}
                {description && (
                  <div>
                    <p className="font-medium text-sm">Description</p>
                    <p className="line-clamp-3 text-muted-foreground text-sm">
                      {description}
                    </p>
                  </div>
                )}

                {/* Video Creator */}
                {selectedCreator && (
                  <div>
                    <p className="font-medium text-sm">Video Creator</p>
                    <div className="mt-1">
                      {selectedCreatorData ? (
                        <CreatorLink creator={selectedCreatorData} />
                      ) : (
                        <span className="rounded-md bg-secondary px-2 py-1 text-sm">
                          {selectedCreator}{" "}
                          <span className="text-muted-foreground">(new)</span>
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Featured Creators */}
                {selectedFeaturedData.length > 0 && (
                  <div>
                    <p className="font-medium text-sm">Featured Creators</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {selectedFeaturedData.map((creator) => (
                        <div key={creator.id}>
                          {creator.isNew ? (
                            <span className="rounded-md bg-secondary px-2 py-1 text-sm">
                              {creator.displayName}{" "}
                              <span className="text-muted-foreground">
                                (new)
                              </span>
                            </span>
                          ) : (
                            <CreatorLink creator={creator} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {selectedTagsData.length > 0 && (
                  <div>
                    <p className="font-medium text-sm">Tags</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {selectedTagsData.map((tag) => (
                        <span
                          className="rounded-md bg-secondary px-2 py-0.5 text-xs"
                          key={tag.name}
                        >
                          {tag.name}
                          {tag.isNew && " (new)"}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Video File */}
                {videoFile && (
                  <div>
                    <p className="font-medium text-sm">Video File</p>
                    <p className="text-muted-foreground text-xs">
                      {videoFile.name}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                )}

                {/* Thumbnail Preview */}
                {thumbFile && thumbPreviewUrl && (
                  <div>
                    <p className="font-medium text-sm">Thumbnail</p>
                    <div className="relative mt-1 aspect-video w-full overflow-hidden rounded-md border">
                      <Image
                        alt="Thumbnail preview"
                        className="object-cover"
                        fill
                        src={thumbPreviewUrl}
                      />
                    </div>
                  </div>
                )}

                {!title && !videoFile && (
                  <p className="text-center text-muted-foreground text-sm italic">
                    Fill out the form to see a preview
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
