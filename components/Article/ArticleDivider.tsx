import React from 'react';

type Props = {
  maxWidthClassName?: string;
  className?: string;
  lineClassName?: string;
  alignClassName?: string;
};

export const ArticleDivider: React.FC<Props> = ({
  maxWidthClassName = 'max-w-[680px]',
  className = 'mt-12',
  lineClassName = 'w-[10%]',
  alignClassName = '',
}) => {
  return (
    <div className={`${maxWidthClassName} mx-auto ${className}`}>
      <div className={`${alignClassName} ${lineClassName} border-t border-rule-strong`} />
    </div>
  );
};
