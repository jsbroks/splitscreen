"use client";

import Hls from "hls.js";
import Plyr from "plyr";
import { useEffect, useRef } from "react";

import "plyr/dist/plyr.css";
import "~/styles/plyr.css";

export default function HlsPlyr({
  src,
  previewThumbnails,
}: {
  src: string;
  previewThumbnails?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const plyrRef = useRef<Plyr | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    const plyrOptions: Plyr.Options = {
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
      settings: ["quality", "speed"],
      previewThumbnails: previewThumbnails
        ? {
            enabled: true,
            src: previewThumbnails,
          }
        : undefined,
    };

    const video = videoRef.current;

    // Initialize HLS if supported
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
      });

      hlsRef.current = hls;

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // Update quality options based on available HLS levels
        const qualities = [0]; // Start with Auto (0)
        const qualityLabels: { [key: number]: string } = { 0: "Auto" };

        // Add each quality level
        hls.levels.forEach((level, index) => {
          const quality = index + 1;
          qualities.push(quality);
          qualityLabels[quality] = `${level.height}p`;
        });

        const player = new Plyr(video, {
          ...plyrOptions,
          quality: {
            default: 0,
            options: qualities,
            forced: true,
            onChange: (quality: number) => {
              if (hlsRef.current) {
                // quality 0 = Auto, otherwise map to HLS level index
                hlsRef.current.currentLevel = quality === 0 ? -1 : quality - 1;
              }
            },
          },
          i18n: {
            qualityLabel: qualityLabels,
          },
        });
        plyrRef.current = player;

        // Auto-play (may be blocked by browser)
        const playPromise = player.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // Auto-play was prevented
          });
        }
      });

      // Handle errors
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native HLS support (Safari)
      video.src = src;
    }

    // Cleanup
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      if (plyrRef.current) {
        plyrRef.current.destroy();
      }
    };
  }, [previewThumbnails, src]);

  if (
    !Hls.isSupported() &&
    !videoRef.current?.canPlayType("application/vnd.apple.mpegurl")
  ) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black">
        <div className="text-white">HLS is not supported in this browser.</div>
      </div>
    );
  }

  return (
    <video className="w-full" loop ref={videoRef}>
      <track kind="captions" />
    </video>
  );
}
