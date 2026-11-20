import React, { FC } from 'react';

interface IconBrowserProps {
    className?: string;
}

const IconSafari: FC<IconBrowserProps> = ({ className }) => {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
            <path
                d="M12 4L14 12L8 14L12 4Z"
                stroke="currentColor"
                opacity="0.5"
            />
        </svg>
    );
};

export default IconSafari;
