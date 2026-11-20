import React, { FC } from 'react';

interface IconBrowserProps {
    className?: string;
}

const IconClock: FC<IconBrowserProps> = ({ className }) => {
    return (
        <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="#1C274C" strokeWidth="1.5" />
            <path d="M12 8V12L14.5 14.5" stroke="#1C274C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
};

export default IconClock;
