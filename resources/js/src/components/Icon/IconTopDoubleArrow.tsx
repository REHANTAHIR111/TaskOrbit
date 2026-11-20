import React from 'react';import { FC } from 'react';

interface IconTopDoubleArrowProps {
    className?: string;
    fill?: boolean;
    duotone?: boolean;
}

const IconTopDoubleArrow: FC<IconTopDoubleArrowProps> = ({ className, fill = false, duotone = true }) => {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <path d="M19 13L12 7L5 13" stroke="#1C274C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin ="round"/>
            <path opacity="0.5" d="M19 17L12 11L5 17" stroke="#1C274C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin ="round"/>
        </svg>
    );
};

export default IconTopDoubleArrow;
