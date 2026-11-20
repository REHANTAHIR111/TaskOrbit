import React from 'react';import { FC } from 'react';

interface IconStopWatchProps {
    className?: string;
    fill?: boolean;
    duotone?: boolean;
}

const IconStopWatch: FC<IconStopWatchProps> = ({ className, fill = false, duotone = true }) => {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <circle opacity="0.5" cx="12" cy="13" r="9" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M12 9V13L14.5 15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin ="round"/>
            <path d="M3.5 4.5L7.50002 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin ="round"/>
            <path d="M20.5 4.5L16.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin ="round"/>
        </svg>
    );
};

export default IconStopWatch;
