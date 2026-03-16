import React from 'react';

export const Byline = ({
    author,
    date,
    className = "",
    split = false,
}: {
    author?: string | null;
    date?: string | null;
    className?: string;
    split?: boolean;
}) => {
    if (!author && !date) return null;

    const renderAuthor = (text: string) => {
        const parts = text.split(' AND ');
        return parts.map((part, index) => (
            <React.Fragment key={index}>
                <span className="font-[440] text-accent">{part}</span>
                {index < parts.length - 1 && <span className="font-normal text-text-main/50"> & </span>}
            </React.Fragment>
        ));
    };

    return (
        <div className={`font-meta mt-2.5 text-[10px] md:text-[11px] font-normal tracking-[0.04em] leading-tight ${split ? "flex items-baseline justify-between gap-3" : ""} ${className}`}>
            {author && (
                <span className={split ? "min-w-0 text-left" : "mr-1"}>
                    {renderAuthor(author)}
                </span>
            )}
            {date && <span className={`text-text-muted font-medium ${split ? "shrink-0 text-right" : ""}`}>{date}</span>}
        </div>
    );
};
