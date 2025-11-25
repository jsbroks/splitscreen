"use client";

import dynamic from "next/dynamic";

import "plyr-react/plyr.css";
import "~/styles/plyr.css";

const Plyr = dynamic(() => import("plyr-react"), { ssr: false });

export const VimoExample = () => {
  return (
    <Plyr
      className="h-full w-full"
      options={{
        keyboard: { global: true },
        resetOnEnd: true,
      }}
      source={{
        type: "video",
        sources: [{ src: "265284284", provider: "vimeo" }],
      }}
    />
  );
};
