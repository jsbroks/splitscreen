"use client";

import dynamic from "next/dynamic";
import type React from "react";

const HlsPlyr = dynamic(() => import("./HlsPlyr"), { ssr: false });
const VidPlyr = dynamic(() => import("./VidPlyr"), { ssr: false });

export const Player: React.FC<{
  src: string;
  posterUrl?: string;
  previewThumbnails?: string;
}> = ({ src, posterUrl, previewThumbnails }) => {
  const isHls = src.endsWith(".m3u8");
  if (isHls) {
    return <HlsPlyr previewThumbnails={previewThumbnails} src={src} />;
  }
  return (
    <VidPlyr
      posterUrl={posterUrl}
      previewThumbnails={previewThumbnails}
      src={src}
    />
  );
};
