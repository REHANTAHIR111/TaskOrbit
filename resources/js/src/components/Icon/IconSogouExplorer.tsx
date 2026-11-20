import React from 'react';
import { FC } from 'react';

interface IconSogouExplorerProps {
    className?: string;
    fill?: boolean;
    duotone?: boolean;
}

const IconSogouExplorer: FC<IconSogouExplorerProps> = ({ className, fill = false, duotone = true }) => {
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
                        d="M8 12C8 10 9.5 8.5 11.5 8.5H16C17 8.5 18 9.5 18 11C18 12.5 17 13.5 15.5 13.5H12.5C11.5 13.5 11 14 11 15C11 16 12 16.5 13 16.5H15.5C16.5 16.5 17.5 16 18 15"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        opacity={duotone ? '0.5' : '1'}
                    />
                    <path
                        d="M9 8C9 6.5 10.5 5.5 12.5 5.5C14.5 5.5 16 6.5 16.5 8"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        opacity={duotone ? '0.5' : '1'}
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
                        d="M8 12C8 10 9.5 8.5 11.5 8.5H16C17 8.5 18 9.5 18 11C18 12.5 17 13.5 15.5 13.5H12.5C11.5 13.5 11 14 11 15C11 16 12 16.5 13 16.5H15.5C16.5 16.5 17.5 16 18 15"
                        fill="currentColor"
                    />
                </svg>
            )}
        </>
    );
};

export default IconSogouExplorer;
