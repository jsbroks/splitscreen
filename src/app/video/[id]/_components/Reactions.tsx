"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useFingerprint } from "~/app/_components/useFigureprint";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

export const Reactions: React.FC<{ videoId: string }> = ({ videoId }) => {
  const { fingerprint } = useFingerprint();

  const currentReaction = api.videos.getReaction.useQuery({
    videoId: videoId,
    fingerprint: fingerprint?.visitorId,
  });
  const react = api.videos.react.useMutation();

  const handleReact = async (reaction: "like" | "dislike") => {
    await react.mutateAsync({
      videoId: videoId,
      fingerprint: fingerprint?.visitorId ?? "",
      reaction: reactionType === reaction ? "none" : reaction,
    });

    await currentReaction.refetch();
  };

  const totalLikes = currentReaction.data?.totalLikes ?? 0;
  const reactionType = currentReaction.data?.reaction?.reactionType ?? "none";
  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        className={cn(
          "flex cursor-pointer items-center gap-1",
          reactionType === "like" && "text-primary",
        )}
        onClick={() => handleReact("like")}
        type="button"
      >
        <ThumbsUp className="size-4" />
        <span>{totalLikes}</span>
      </button>{" "}
      |{" "}
      <button
        className={cn(
          "flex cursor-pointer items-center gap-1",
          reactionType === "dislike" && "text-destructive",
        )}
        onClick={() => handleReact("dislike")}
        type="button"
      >
        <ThumbsDown className="size-4" />
      </button>
    </div>
  );
};
