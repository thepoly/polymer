import React from "react";

/** The red-ruled heading that opens each block of the sports page */
export default function SportsHeading({
  id,
  gap = 16,
  children,
}: {
  id?: string;
  /** Space under the heading, in px */
  gap?: number;
  children: React.ReactNode;
}) {
  return (
    <div style={{ borderTop: "2px solid var(--accent-color)", paddingTop: 4, marginBottom: gap }}>
      <h2
        id={id}
        className="font-meta uppercase text-accent dark:text-white"
        style={{ fontSize: 21, letterSpacing: "0.08em", fontWeight: 500, margin: "0 0 2px" }}
      >
        {children}
      </h2>
    </div>
  );
}
