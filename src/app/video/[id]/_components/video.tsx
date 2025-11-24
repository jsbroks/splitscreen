"use client";
import Plyr, { type APITypes } from "plyr-react";

import "plyr-react/plyr.css";
import { useEffect, useRef } from "react";
import "~/styles/plyr.css";

export const VimoExample = () => {
  const plyr = useRef<APITypes>(null);
  useEffect(() => {
    if (plyr.current) {
    }
  }, []);

  return (
    <Plyr
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
