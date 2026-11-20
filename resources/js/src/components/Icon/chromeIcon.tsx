import React, { FC } from 'react';

interface IconChromeProps {
    className?: string;
}

const IconChrome: FC<IconChromeProps> = ({ className }) => {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
            <path
                d="M6 12C6 7.589 8.686 4 12 4C15.314 4 18 7.589 18 12C18 16.411 14.418 20 12 20C9.582 20 6 16.411 6 12Z"
                stroke="currentColor"
                opacity="0.5"
            />
        </svg>
    );
};

export default IconChrome;
