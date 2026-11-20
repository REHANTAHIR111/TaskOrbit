import React, { FC } from 'react';

interface IconMaxthonBrowserProps {
    className?: string;
    fill?: boolean;
    duotone?: boolean;
}

const IconMaxthonBrowser: FC<IconMaxthonBrowserProps> = ({ className, fill = false, duotone = true }) => {
    return (
        <>
            {!fill ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
                    <path
                        opacity={duotone ? '0.5' : '1'}
                        d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                    />
                    <path
                        d="M8 12C8 10.3431 9.34315 9 11 9C12.6569 9 14 10.3431 14 12C14 13.6569 12.6569 15 11 15C9.34315 15 8 13.6569 8 12Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                    />
                </svg>
            ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
                    <path
                        d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2Z"
                        fill="currentColor"
                    />
                    <path
                        d="M8 12C8 10.3431 9.34315 9 11 9C12.6569 9 14 10.3431 14 12C14 13.6569 12.6569 15 11 15C9.34315 15 8 13.6569 8 12Z"
                        fill="currentColor"
                    />
                </svg>
            )}
        </>
    );
};

export default IconMaxthonBrowser;
