"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type VideoActivityContextValue = {
  isVideoPlaying: boolean;
  setIsVideoPlaying: (playing: boolean) => void;
};

const VideoActivityContext = createContext<VideoActivityContextValue | null>(null);

export function VideoActivityProvider({ children }: { children: ReactNode }) {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const value = useMemo(() => ({ isVideoPlaying, setIsVideoPlaying }), [isVideoPlaying]);

  return <VideoActivityContext.Provider value={value}>{children}</VideoActivityContext.Provider>;
}

export function useVideoActivity(): VideoActivityContextValue {
  const context = useContext(VideoActivityContext);
  if (!context) {
    throw new Error("useVideoActivity لازم يتستخدم جوا VideoActivityProvider");
  }
  return context;
}
