import React from 'react';

export const Byline = ({ author, date }: { author?: string | null, date?: string | null }) => {
    if (!author && !date) return null;

    const renderAuthor = (text: string) => {
        const parts = text.split(' AND ');
        return parts.map((part, index) => (
            <React.Fragment key={index}>
                <span className="text-[#D6001C] font-bold">{part}</span>
                {index < parts.length - 1 && <span className="text-black font-normal"> AND </span>}
            </React.Fragment>
        ));
    };

    return (
        <div className="mt-2 text-[10px] md:text-[11px] font-sans tracking-wide leading-tight uppercase">
            {author && (
                <span className="mr-1">
                    {renderAuthor(author)}
                </span>
            )}
            {author && date && <span className="text-gray-400 mx-1">|</span>}
            {date && <span className="text-black font-normal">{date}</span>}
        </div>
    );
};
