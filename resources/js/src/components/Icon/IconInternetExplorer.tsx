import React from 'react';
import { FC } from 'react';

interface IconInternetExplorerProps {
    className?: string;
    fill?: boolean;
    duotone?: boolean;
}

const IconInternetExplorer: FC<IconInternetExplorerProps> = ({ className, fill = false, duotone = true }) => {
    return (
        <>
            {!fill ? (
                <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className={className}
                >
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                    <path
                        opacity={duotone ? '0.5' : '1'}
                        d="M6.5 15.5C8.5 16.5 11 17 13 17C15 17 17.5 16 18.5 14C19 12 16 11.5 13.5 11.5H6.5C6 10 5.8 8.5 6.5 7C7.2 5.5 9.5 5 11.5 5C14 5 16.5 6.5 17.5 8.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                    />
                    <path
                        d="M5.5 19C7.5 18 9 16 10 14.5C10.5 13.5 10.7 12.5 11 11.5C11.3 10.5 11.5 9.5 12 8.5"
                        opacity={duotone ? '0.5' : '1'}
                        stroke="currentColor"
                        strokeWidth="1.5"
                    />
                </svg>
            ) : (
                <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className={className}
                >
                    <circle cx="12" cy="12" r="10" fill="currentColor" />
                    <path
                        d="M6.5 15.5C8.5 16.5 11 17 13 17C15 17 17.5 16 18.5 14C19 12 16 11.5 13.5 11.5H6.5C6 10 5.8 8.5 6.5 7C7.2 5.5 9.5 5 11.5 5C14 5 16.5 6.5 17.5 8.5"
                        fill="currentColor"
                    />
                </svg>
            )}
        </>
    );
};

export default IconInternetExplorer;
