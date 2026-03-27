"use client";

import { useReportWebVitals } from "next/web-vitals";
import posthog from "posthog-js";

export default function WebVitals() {
  useReportWebVitals((metric) => {
    posthog.capture("web_vital", {
      metric_name: metric.name,
      metric_value: Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value),
      metric_rating: metric.rating,
      metric_navigation_type: metric.navigationType,
      pathname: window.location.pathname,
    });
  });

  return null;
}
