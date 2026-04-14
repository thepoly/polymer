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
        return parts.map((part, index) => (
            <React.Fragment key={index}>
                {variant === "features" ? (
                    <span className="text-accent">{part}</span>
                ) : (
                    <span className="font-[650] md:font-[520] text-accent dark:text-white">{part}</span>
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
        ? `font-meta text-[13px] font-medium uppercase tracking-[0.04em] leading-tight ${className}`
        : `font-meta mt-1 md:mt-1.5 text-[12px] md:text-[11px] font-normal tracking-[0.04em] leading-tight ${className}`;

    return (
        <div
            data-marauders-obstacle="meta"
            className={containerClassName}
        >
            {author && (
                <span className="mr-1">
                    {variant === "features" && (
                        <span className="text-text-muted">BY </span>
                    )}
                    {renderAuthor(author)}
                </span>
            )}
            {author && date && <span className="text-text-muted ml-0.5 mr-1">&middot;</span>}
            {date && (
                <span suppressHydrationWarning className={variant === "features" ? "text-text-muted" : "text-text-muted font-semibold md:font-medium"}>
                    {date}
                </span>
            )}
        </div>
    );
};
