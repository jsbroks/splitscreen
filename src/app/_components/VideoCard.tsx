import { Eye } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type VideoCardProps = {
  id: string;
  title: string;
  views: number;
};

export const VideoCard: React.FC<VideoCardProps> = ({ id, title, views }) => {
  const formattedViews = new Intl.NumberFormat("en", {
    notation: "compact",
  }).format(views);
  return (
    <Link className="group" href={`/video/${id}`}>
      <div>
        <Image
          alt="Placeholder"
          className="rounded-sm"
          height={400}
          src="https://placehold.co/1920x1080.webp"
          width={600}
        />
      </div>

      <h2 className="transition-colors group-hover:text-primary">{title}</h2>
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">kesppa</p>

        <p className="flex items-center justify-between gap-1 text-muted-foreground text-xs">
          <Eye className="size-2" />
          <span>{formattedViews}</span>
        </p>
      </div>
    </Link>
  );
};
