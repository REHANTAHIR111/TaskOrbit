import React, { FC } from 'react';

interface IconBrowserProps {
    className?: string;
}

const IconMobileDevice: FC<IconBrowserProps> = ({ className }) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            data-lucide="hotel"
            className="lucide lucide-hotel size-4 [--color:currentColor] stroke-(--color) fill-(--color)/25 stroke-1"
        >
            <path d="M10 22v-6.57"></path>
            <path d="M12 11h.01"></path>
            <path d="M12 7h.01"></path>
            <path d="M14 15.43V22"></path>
            <path d="M15 16a5 5 0 0 0-6 0"></path>
            <path d="M16 11h.01"></path>
            <path d="M16 7h.01"></path>
            <path d="M8 11h.01"></path>
            <path d="M8 7h.01"></path>
            <rect x="4" y="2" width="16" height="20" rx="2"></rect>
        </svg>
    );
};

export default IconMobileDevice;
