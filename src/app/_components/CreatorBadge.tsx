import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";

type CreatorLinkProps = {
  creator: {
    username: string;
    displayName: string;
    image?: string | null;
  };
};

export function CreatorLink({ creator }: CreatorLinkProps) {
  return (
    <Link
      className="inline-flex items-center gap-2 rounded-md bg-secondary px-2 py-1 text-sm hover:bg-secondary/80"
      href={`/creator/${creator.username}`}
    >
      {creator.image && (
        <Avatar className="size-4">
          <AvatarImage src={creator.image} />
          <AvatarFallback>{creator.displayName.slice(0, 2)}</AvatarFallback>
        </Avatar>
      )}
      <span className="font-medium">{creator.displayName}</span>
    </Link>
  );
}
