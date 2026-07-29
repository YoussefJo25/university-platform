"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useVideoActivity } from "@/contexts/VideoActivityContext";

const IDLE_THRESHOLD_MS = 2 * 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 60 * 1000;
// تحديث "آخر نشاط" مرة كل ثانية كحد أقصى بدل كل حركة ماوس/ضغطة سكرول —
// كفاية جدًا لدقة دقيقتين ومبيحمّلش المتصفح بتحديثات لا داعي لها.
const ACTIVITY_THROTTLE_MS = 1000;

export function useActivityHeartbeat(enabled: boolean) {
  const { isVideoPlaying } = useVideoActivity();
  const isVideoPlayingRef = useRef(isVideoPlaying);
  const lastActivityRef = useRef(Date.now());
  const lastThrottledUpdateRef = useRef(0);

  useEffect(() => {
    isVideoPlayingRef.current = isVideoPlaying;
  }, [isVideoPlaying]);

  useEffect(() => {
    if (!enabled) return;

    function markActive() {
      const now = Date.now();
      if (now - lastThrottledUpdateRef.current < ACTIVITY_THROTTLE_MS) return;
      lastThrottledUpdateRef.current = now;
      lastActivityRef.current = now;
    }

    const events = ["mousemove", "keydown", "scroll", "touchstart"] as const;
    events.forEach((eventName) => window.addEventListener(eventName, markActive, { passive: true }));

    const supabase = createClient();

    async function sendHeartbeatIfActive() {
      const isRecentlyActive = Date.now() - lastActivityRef.current < IDLE_THRESHOLD_MS;
      const isTabVisible = document.visibilityState === "visible";
      const isVideoPlayingNow = isVideoPlayingRef.current;

      if ((isRecentlyActive && isTabVisible) || isVideoPlayingNow) {
        await supabase.rpc("record_heartbeat", { is_video: isVideoPlayingNow });
      }
    }

    const intervalId = window.setInterval(sendHeartbeatIfActive, HEARTBEAT_INTERVAL_MS);

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, markActive));
      window.clearInterval(intervalId);
    };
  }, [enabled]);
}
