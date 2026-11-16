import React from 'react';

export const Byline = ({
    author,
    date,
    isoDate,
    className = "",
    variant = "default",
}: {
    author?: string | null;
    date?: string | null;
    isoDate?: string | null;
    className?: string;
    split?: boolean;
    variant?: "default" | "features";
}) => {
    if (!author && !date) return null;

    const renderAuthor = (text: string) => {
        const parts = text
            .split(/\s+and\s+/i)
            .map((part) => part.trim())
            .filter(Boolean);
        // Each name wraps as a whole: it moves to the next line only when it
        // doesn't fit, never splitting first name from last
        return parts.map((part, index) => (
            <React.Fragment key={index}>
                {variant === "features" ? (
                    <span className="whitespace-nowrap text-accent">{part}</span>
                ) : (
                    <span className="whitespace-nowrap font-[650] md:font-[520] text-accent dark:text-white">{part}</span>
                )}
                {index < parts.length - 1 && (
                    <span className={variant === "features" ? "text-text-muted" : "font-normal text-text-main/50"}>
                        {" & "}
                    </span>
                )}
            </React.Fragment>
        ));
    };

    const containerClassName = variant === "features"
        ? `font-meta overflow-x-clip text-[13px] font-medium uppercase tracking-[0.04em] leading-tight ${className}`
        : `font-meta overflow-x-clip mt-1 md:mt-1.5 text-[12px] md:text-[11px] font-normal tracking-[0.04em] leading-tight ${className}`;

    return (
        <div
            data-marauders-obstacle="meta"
            className={containerClassName}
        >
            {author && (
                <span>
                    {variant === "features" && (
                        <span className="text-text-muted">BY </span>
                    )}
                    {renderAuthor(author)}
                </span>
            )}
            {/* The em space is the only break point between the authors and
                the date, so the whole date moves to the next line together.
                The dot sits in that gap, hung off the date's left edge: when
                the date wraps it falls outside the byline and is clipped
                (overflow-x-clip), so the new line doesn't start with a dot. */}
            {author && date && " "}
            {date && (
                <span className="relative whitespace-nowrap">
                    {author && (
                        <span aria-hidden="true" className="absolute right-full mr-[0.36em] text-text-muted">
                            &middot;
                        </span>
                    )}
                    <span suppressHydrationWarning className={variant === "features" ? "text-text-muted" : "text-text-muted font-semibold md:font-medium"}>
                        {date}
                    </span>
                </span>
            )}
        </div>
    );
};
