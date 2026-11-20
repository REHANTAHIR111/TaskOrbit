import React from 'react';import { FC } from 'react';

interface IconTopArrowProps {
    className?: string;
    fill?: boolean;
    duotone?: boolean;
}

const IconTopArrow: FC<IconTopArrowProps> = ({ className }) => {
    return (
        <>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
                <path d="M19 15L12 9L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin ="round"/>
            </svg>
        </>
    );
};
export default IconTopArrow;
