"use client";

import { AspectRatio } from "@radix-ui/react-aspect-ratio";
import { Eye } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";

type VideoCardProps = {
  id: string;
  title: string;
  views: number;
  status?:
    | "uploaded"
    | "processing"
    | "in_review"
    | "approved"
    | "rejected"
    | "failed";
  previewVideoUrl?: string | null;
  thumbnailUrl?: string | null;
  thumbnail25pctUrl?: string | null;
};

export const VideoCard: React.FC<VideoCardProps> = ({
  id,
  title,
  views,
  previewVideoUrl,
  thumbnail25pctUrl,
  thumbnailUrl,
}) => {
  const [isHovering, setIsHovering] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const formattedViews = new Intl.NumberFormat("en", {
    notation: "compact",
  }).format(views);

  const handleMouseEnter = () => {
    setIsHovering(true);
    if (videoRef.current && previewVideoUrl) {
      videoRef.current.currentTime = 0;
      videoRef.current.muted = true;
      videoRef.current.volume = 0;
      videoRef.current.play().catch(() => {
        // Auto-play was prevented, ignore
      });
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <Link
      className="group col-span-1"
      href={`/video/${id}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <AspectRatio
        className="relative overflow-hidden rounded-sm bg-black"
        ratio={16 / 9}
      >
        <Image
          alt={title}
          className="rounded-sm object-contain transition-opacity duration-200"
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          src={thumbnailUrl ?? thumbnail25pctUrl ?? ""}
          style={{ opacity: isHovering && previewVideoUrl ? 0 : 1 }}
        />

        {previewVideoUrl && (
          <video
            className="absolute inset-0 h-full w-full rounded-sm bg-black object-contain transition-opacity duration-200"
            loop
            muted
            playsInline
            preload="metadata"
            ref={videoRef}
            src={previewVideoUrl}
            style={{ opacity: isHovering ? 1 : 0 }}
          />
        )}
      </AspectRatio>

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
