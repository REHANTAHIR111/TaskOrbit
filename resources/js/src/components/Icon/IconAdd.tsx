import React, { FC } from 'react';

interface IconBrowserProps {
    className?: string;
}

const IconAdd: FC<IconBrowserProps> = ({ className }) => {
    return (
        <svg  className={className} xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 1a.5.5 0 0 1 .5.5v6.5H15a.5.5 0 0 1 0 1H8.5V15a.5.5 0 0 1-1 0V9.5H1a.5.5 0 0 1 0-1h6.5V1.5A.5.5 0 0 1 8 1z" />
        </svg>
    );
};

export default IconAdd;
