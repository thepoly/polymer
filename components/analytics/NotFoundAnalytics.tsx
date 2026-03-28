"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

export default function NotFoundAnalytics() {
  useEffect(() => {
    posthog.capture("page_not_found", {
      pathname: window.location.pathname,
      referrer: document.referrer || null,
    });
  }, []);

  return null;
}
