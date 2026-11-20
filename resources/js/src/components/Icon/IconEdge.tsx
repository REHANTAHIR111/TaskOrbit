import React, { FC } from 'react';

interface IconBrowserProps {
    className?: string;
}

const IconEdge: FC<IconBrowserProps> = ({ className }) => {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 2C7.589 2 4 5.686 4 10C4 14.314 7.589 18 12 18C14.764 18 17.176 16.528 18 14H12V10H22C22 6.686 18.311 2 12 2Z" stroke="currentColor" opacity="0.5"/>
        </svg>
    );
};

export default IconEdge;
