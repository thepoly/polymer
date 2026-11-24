import posthog from "posthog-js";
import { POSTHOG_KEY, getPageType, shouldTrackPath } from "@/lib/posthog-config";

/**
 * True when this page is a live preview framed inside the newsroom (e.g. the
 * Get Involved Page photo editor), which shouldn't count as a visit.
 */
const isNewsroomPreview = () => {
  if (typeof window === "undefined" || window.self === window.top) return false;
  try {
    return window.top?.location.pathname.startsWith("/newsroom") ?? false;
  } catch {
    return false;
  }
};

if (POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    api_host: "/ingest",
    ui_host: "/ingest",
    person_profiles: "identified_only",
    capture_exceptions: true,
    disable_session_recording: true,
    autocapture: false,
    capture_pageleave: false,
    capture_pageview: "history_change",
    debug: process.env.NODE_ENV === "development",
    defaults: "2026-01-30",
    persistence: "sessionStorage",
    before_send: (event) => {
      if (typeof window !== "undefined" && !shouldTrackPath(window.location.pathname)) {
        return null;
      }
      if (isNewsroomPreview()) {
        return null;
      }

      if (!event) {
        return event;
      }

      delete event.properties["$ip"];
      delete event.properties["$browser_language"];
      delete event.properties["$timezone"];
      delete event.properties["$raw_user_agent"];
      delete event.properties["$screen_height"];
      delete event.properties["$screen_width"];
      delete event.properties["$viewport_height"];
      delete event.properties["$viewport_width"];

      if (typeof window !== "undefined" && event.event === "$pageview") {
        event.properties = {
          ...event.properties,
          page_type: getPageType(window.location.pathname),
        };
      }

      return event;
    },
    loaded: (instance) => {
      if (typeof window !== "undefined" && !shouldTrackPath(window.location.pathname)) {
        instance.opt_out_capturing();
      }
      // Newsroom previews are dropped in before_send instead: opting out here
      // would persist in sessionStorage, which a framed page shares with the
      // editor's tab, and stop tracking for the rest of that tab's session.
    },
  });
}
