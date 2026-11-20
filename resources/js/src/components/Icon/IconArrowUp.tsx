import { ClassNames } from '@emotion/react';
import React, { FC } from 'react';

interface IconBrowserProps {
    className?: string;
}

const IconArrowUp: FC<IconBrowserProps> = ({ className }) => {
    return (
        <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 12L12 19L19 12" stroke="#00ab55" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 5V19" stroke="#00ab55" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
};

export default IconArrowUp;
