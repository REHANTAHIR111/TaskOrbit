import React, { FC } from 'react';

interface IconBrowserProps {
    className?: string;
}

const IconSearch: FC<IconBrowserProps> = ({ className }) => {
    return (
        <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="11.5" cy="11.5" r="9.5" strokeWidth="1.5" />
            <path d="M18.5 18.5L22 22" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    );
};

export default IconSearch;
