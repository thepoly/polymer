import posthog from "posthog-js";
import { POSTHOG_KEY, getPageType, shouldTrackPath } from "@/lib/posthog-config";

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
    persistence: "localStorage",
    before_send: (event) => {
      if (typeof window !== "undefined" && !shouldTrackPath(window.location.pathname)) {
        return null;
      }

      if (!event) {
        return event;
      }

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
    },
  });
}
