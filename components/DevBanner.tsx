"use client";

import { useState, useSyncExternalStore } from "react";
import posthog from "posthog-js";

const DEV_HOSTNAME = "dev.poly.rpi.edu";
const BANNER_DISMISSED_KEY = "dev_banner_dismissed";

function isDevSite() {
  return typeof window !== "undefined" && window.location.hostname === DEV_HOSTNAME;
}

function getClientSnapshot(): "banner" | "opted-out" | "hidden" {
  if (!isDevSite()) return "hidden";
  if (posthog.has_opted_out_capturing()) return "opted-out";
  if (sessionStorage.getItem(BANNER_DISMISSED_KEY)) return "hidden";
  return "banner";
}

function getServerSnapshot(): "hidden" {
  return "hidden";
}

// No-op subscribe — state only changes via user-driven events, not external push
function subscribe() {
  return () => {};
}

export default function DevBanner() {
  // useSyncExternalStore returns server snapshot during SSR and client snapshot on the client,
  // avoiding hydration mismatches without requiring setState-in-effect.
  const persistedState = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  // Local override driven exclusively by user interaction (event handlers, not effects)
  const [override, setOverride] = useState<"opted-out" | "hidden" | null>(null);

  const state = override ?? persistedState;

  function handleOptOut() {
    posthog.opt_out_capturing();
    setOverride("opted-out");
  }

  function handleDismiss() {
    sessionStorage.setItem(BANNER_DISMISSED_KEY, "1");
    setOverride("hidden");
  }

  function handleOptIn() {
    posthog.opt_in_capturing();
    sessionStorage.removeItem(BANNER_DISMISSED_KEY);
    setOverride("banner");
  }

  if (state === "hidden") return null;

  if (state === "opted-out") {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-100 border-t border-gray-300 text-gray-600 px-4 py-2 text-xs flex items-center gap-3">
        <span>Analytics tracking is disabled on this device.</span>
        <button onClick={handleOptIn} className="underline hover:text-gray-900 transition-colors">
          Re-enable
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-yellow-100 border-t-2 border-yellow-400 text-yellow-900 px-4 py-3 text-sm flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
      <p className="flex-1">
        <strong>Development site.</strong> This is a pre-release version of The Polytechnic. Your
        activity — including page views, clicks, scroll behavior, session replays, and cookies — may
        be recorded via PostHog for internal testing purposes.
      </p>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={handleOptOut}
          className="bg-yellow-800 text-white px-3 py-1 rounded text-xs font-semibold hover:bg-yellow-900 transition-colors"
        >
          Opt out of tracking
        </button>
        <button
          onClick={handleDismiss}
          className="border border-yellow-700 text-yellow-800 px-3 py-1 rounded text-xs font-semibold hover:bg-yellow-200 transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
