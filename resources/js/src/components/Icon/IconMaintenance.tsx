import React from 'react';import { FC } from 'react';

interface IconMaintenanceProps {
    className?: string;
    fill?: boolean;
    duotone?: boolean;
}

const IconMaintenance: FC<IconMaintenanceProps> = ({ className }) => {
    return (
        <>
            <svg width="24" height="24" viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path opacity="0.5" d="M12 9V13H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin ="round" />
                <circle opacity="0.5" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="0.5 3.5" />
            </svg>
        </>
    );
};
export default IconMaintenance;
