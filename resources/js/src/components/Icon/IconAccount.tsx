import React from 'react'; import { FC } from 'react';

interface IconAccountProps {
    className?: string;
    fill?: boolean;
    duotone?: boolean;
}

const IconAccount: FC<IconAccountProps> = ({ className, fill = false, duotone = true }) => {
    return (
        <>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
                <circle cx="10" cy="6" r="4" fill="#FFFFFF" />
                <path d="M18 17.5C18 19.9853 18 22 10 22C2 22 2 19.9853 2 17.5C2 15.0147 5.58172 13 10 13C14.4183 13 18 15.0147 18 17.5Z" fill="#FFFFFF" />
                <path d="M21 10H19M19 10H17M19 10L19 8M19 10L19 12" stroke="#1C274C" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
        </>
    );
};
export default IconAccount;
