"use client";

import Plyr from "plyr";
import { useEffect, useRef } from "react";

import "plyr/dist/plyr.css";
import "~/styles/plyr.css";

export default function VidPlyr({
  src,
  posterUrl,
  previewThumbnails,
}: {
  src: string;
  posterUrl?: string;
  previewThumbnails?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const plyrRef = useRef<Plyr | null>(null);
  const ext = src.split(".").pop();

  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    window.requestAnimationFrame(() => {
      const player = new Plyr(video, {
        enabled: true,
        keyboard: {
          global: true,
        },
        ratio: "16:9",
        controls: [
          "play-large",
          "play",
          "progress",
          "current-time",
          "mute",
          "volume",
          "settings",
          "fullscreen",
        ],
        previewThumbnails:
          previewThumbnails != null && previewThumbnails.length > 0
            ? {
                enabled: true,
                src: previewThumbnails,
              }
            : undefined,
      });

      plyrRef.current = player;

      const playPromise = player.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Auto-play was prevented
        });
      }
    });

    // Cleanup
    return () => {
      if (plyrRef.current) {
        plyrRef.current.destroy();
        plyrRef.current = null;
      }
    };
  }, []);

  return (
    <video
      className="w-full"
      controls
      data-poster={posterUrl}
      key={src}
      loop
      poster={posterUrl}
      ref={videoRef}
    >
      <source src={src} type={`video/${ext}`} />
      <track kind="captions" />
    </video>
  );
}
