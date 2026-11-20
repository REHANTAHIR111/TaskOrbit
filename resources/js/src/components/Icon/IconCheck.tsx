import React, { FC } from 'react';

interface IconCheckProps {
    className?: string;
}

const IconCheck: FC<IconCheckProps> = ({ className }) => {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <path d="M7 12.9L10.1429 16.5L18 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin ="round" />
        </svg>
    );
};

export default IconCheck;
