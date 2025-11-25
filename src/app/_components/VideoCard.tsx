import { Eye } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export const VideoCard: React.FC = () => {
  return (
    <Link className="group" href="/video/1234567890">
      <div>
        <Image
          alt="Placeholder"
          className="rounded-sm"
          height={400}
          src="https://placehold.co/1920x1080.webp"
          width={600}
        />
      </div>

      <h2 className="transition-colors group-hover:text-primary">Title</h2>
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">kesppa</p>
        <p className="flex items-center justify-between gap-1 text-muted-foreground text-xs">
          <Eye className="size-2" />
          <span>100k</span>
        </p>
      </div>
    </Link>
  );
};
