"use client";

import dynamic from "next/dynamic";

import "plyr-react/plyr.css";
import "~/styles/plyr.css";

const Plyr = dynamic(() => import("plyr-react"), { ssr: false });

type VideoPreviewProps = {
  videoUrl: string;
};

export function VideoPreview({ videoUrl }: VideoPreviewProps) {
  if (!videoUrl) return null;

  return (
    <Plyr
      key={videoUrl}
      options={{
        keyboard: { global: false },
        resetOnEnd: true,
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
      }}
      source={{
        type: "video",
        sources: [
          {
            src: videoUrl,
            type: "video/mp4",
          },
        ],
      }}
    />
  );
}
