import React from 'react';import { FC } from 'react';

interface IconArrowDownProps {
    className?: string;
    fill?: boolean;
    duotone?: boolean;
}

const IconArrowDown: FC<IconArrowDownProps> = ({ className, fill = false, duotone = true }) => {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <path d="M19 9L12 15L5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin ="round"/>
        </svg>
    );
};

export default IconArrowDown;
