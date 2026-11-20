import React from 'react'; import { FC } from 'react';

interface IconCustomerSegmentationProps {
    className?: string;
    fill?: boolean;
    duotone?: boolean;
}

const IconCustomerSegmentation: FC<IconCustomerSegmentationProps> = ({ className, fill = false, duotone = true }) => {
    return (
        <>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                className={className}
                height="24"
                width="24"
                viewBox="0 0 24 24"
                fill="none"
            >
                <circle cx="12" cy="12" r="10" stroke="#1C274C" strokeWidth="1.5" fill="white" />
                <path d="M12 2C6.476 2 2 6.476 2 12h10V2Z" fill="black" />
                <circle cx="6.5" cy="9.5" r="2.5" fill="#FFFFFF" />
                <circle cx="17.5" cy="10.5" r="2.5" fill="#FFFFFF" />
                <circle cx="12" cy="16.5" r="2.5" fill="#FFFFFF" />
            </svg>
        </>
    );
};

export default IconCustomerSegmentation;
