"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { api } from "~/trpc/react";

type FormValues = {
  title: string;
  description?: string;
};

export default function UploadPage() {
  const router = useRouter();
  const generateUrl = api.videos.generateUploadUrl.useMutation();
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
    reset,
  } = useForm<FormValues>();

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);

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
      // Request presigned URL via tRPC
      const sign = await generateUrl.mutateAsync({
        title: values.title,
        description: values.description,
        filename: videoFile.name,
        contentType: videoFile.type || "application/octet-stream",
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
      // Navigate to the video page if it exists, else back to home
      router.push(`/video/${sign.videoId}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Upload failed";
      toast.error(message);
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-10">
      <div className="max-w-xl">
        <h1 className="mb-6 font-semibold text-2xl">Upload a video</h1>
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
    </div>
  );
}
