import { ClassNames } from '@emotion/react';
import React, { FC } from 'react';

interface IconBrowserProps {
    className?: string;
}

const IconArrowDownward: FC<IconBrowserProps> = ({ className }) => {
    return (
        <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 12L12 19L19 12" stroke="#d32f2f" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 5V19" stroke="#d32f2f" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
};

export default IconArrowDownward;
