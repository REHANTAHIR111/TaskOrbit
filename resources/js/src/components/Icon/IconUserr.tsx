import { ClassNames } from '@emotion/react';
import React, { FC } from 'react';

interface IconBrowserProps {
    className?: string;
}

const IconUserr: FC<IconBrowserProps> = ({ className }) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            data-lucide="users2"
            className={className}
        >
            <path d="M18 21a8 8 0 0 0-16 0"></path>
            <circle cx="10" cy="8" r="5"></circle>
            <path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3"></path>
        </svg>
    );
};

export default IconUserr;
