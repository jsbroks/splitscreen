"use client";

import { UserMinus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { api } from "~/trpc/react";

export function FollowButton({
  userId,
  className,
}: {
  userId: string;
  className?: string;
}) {
  const { data: followData, isLoading } = api.users.isFollowing.useQuery({
    userId,
  });

  const utils = api.useUtils();

  const followUser = api.users.followUser.useMutation({
    onSuccess: () => {
      toast.success("User followed");
      void utils.users.isFollowing.invalidate();
      void utils.users.getFollowStats.invalidate();
    },
    onError: (error) => {
      if (error.message.toLowerCase().includes("not authenticated")) {
        toast.error("Please sign in to follow users");
      } else {
        toast.error(error.message);
      }
    },
  });

  const unfollowUser = api.users.unfollowUser.useMutation({
    onSuccess: () => {
      toast.success("User unfollowed");
      void utils.users.isFollowing.invalidate();
      void utils.users.getFollowStats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleClick = () => {
    if (followData?.isFollowing) {
      unfollowUser.mutate({ userId });
    } else {
      followUser.mutate({ userId });
    }
  };

  const isPending = followUser.isPending || unfollowUser.isPending;

  if (isLoading) {
    return (
      <Button className={className} disabled size="lg" variant="outline">
        <Spinner />
      </Button>
    );
  }

  return (
    <Button
      className={className}
      disabled={isPending}
      onClick={handleClick}
      size="lg"
      variant={followData?.isFollowing ? "secondary" : "outline"}
    >
      {isPending ? (
        <Spinner />
      ) : followData?.isFollowing ? (
        <>
          <UserMinus className="size-4" />
          Unfollow
        </>
      ) : (
        <>
          <UserPlus className="size-4" />
          Follow
        </>
      )}
    </Button>
  );
}
