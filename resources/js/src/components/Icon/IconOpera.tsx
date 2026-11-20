import React, { FC } from 'react';

interface IconBrowserProps {
    className?: string;
}

const IconOpera: FC<IconBrowserProps> = ({ className }) => {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
            <path
                d="M12 4C8.686 4 6 6.686 6 10C6 13.314 8.686 16 12 16C15.314 16 18 13.314 18 10C18 6.686 15.314 4 12 4Z"
                stroke="currentColor"
                opacity="0.5"
            />
        </svg>
    );
};

export default IconOpera;
