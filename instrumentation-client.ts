import posthog from "posthog-js";
import { POSTHOG_KEY, POSTHOG_UI_HOST, shouldTrackPath } from "@/lib/posthog-config";

if (POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    api_host: "/ingest",
    ui_host: "/ingest",
    person_profiles: "identified_only",
    capture_exceptions: true,
    capture_pageleave: "if_capture_pageview",
    capture_pageview: "history_change",
    debug: process.env.NODE_ENV === "development",
    defaults: "2026-01-30",
    before_send: (event) => {
      if (typeof window !== "undefined" && !shouldTrackPath(window.location.pathname)) {
        return null;
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
