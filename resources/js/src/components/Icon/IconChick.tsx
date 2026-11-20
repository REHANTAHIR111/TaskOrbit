import React, { FC } from 'react';

interface IconBrowserProps {
    className?: string;
}

const IconCheck: FC<IconBrowserProps> = ({ className }) => {
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
            data-lucide="check"
            className="stroke-[1.5] stroke-white w-4 h-4"
        >
            <path d="M20 6 9 17l-5-5"></path>
        </svg>
    );
};

export default IconCheck;
