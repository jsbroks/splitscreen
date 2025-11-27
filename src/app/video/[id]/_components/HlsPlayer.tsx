"use client";

import dynamic from "next/dynamic";
import type React from "react";

const HlsPlyr = dynamic(() => import("./HlsPlyr"), { ssr: false });

export const Player: React.FC<{ src: string }> = ({ src }) => {
  return <HlsPlyr src={src} />;
};
