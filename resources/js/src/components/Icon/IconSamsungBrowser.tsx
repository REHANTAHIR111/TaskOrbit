import React, { FC } from 'react';

interface IconSamsungBrowserProps {
    className?: string;
    fill?: boolean;
    duotone?: boolean;
}

const IconSamsungBrowser: FC<IconSamsungBrowserProps> = ({ className, fill = false, duotone = true }) => {
    return (
        <>
            {!fill ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
                    <path
                        opacity={duotone ? '0.5' : '1'}
                        d="M12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                    />
                    <path
                        d="M7.5 15L12 10.5L16.5 15H7.5Z"
                        fill="currentColor"
                    />
                </svg>
            ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
                    <path
                        opacity={duotone ? '0.5' : '1'}
                        d="M12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2Z"
                        fill="currentColor"
                    />
                    <path
                        d="M7.5 15L12 10.5L16.5 15H7.5Z"
                        fill="currentColor"
                    />
                </svg>
            )}
        </>
    );
};

export default IconSamsungBrowser;
