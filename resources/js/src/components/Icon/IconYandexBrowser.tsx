import React, { FC } from 'react';

interface IconYandexBrowserProps {
    className?: string;
    fill?: boolean;
    duotone?: boolean;
}

const IconYandexBrowser: FC<IconYandexBrowserProps> = ({ className, fill = false, duotone = true }) => {
    return (
        <>
            {!fill ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
                    <path
                        opacity={duotone ? '0.5' : '1'}
                        d="M12 4C14.2091 4 16 5.79086 16 8C16 10.2091 14.2091 12 12 12C9.79086 12 8 10.2091 8 8C8 5.79086 9.79086 4 12 4Z"
                        fill="currentColor"
                    />
                    <path
                        d="M6 8C6 5.23858 8.23858 3 11 3C13.7614 3 16 5.23858 16 8C16 10.7614 13.7614 13 11 13C8.23858 13 6 10.7614 6 8Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                    />
                    <path
                        d="M11.5 13.5L11.5 16.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
                    <path
                        d="M12 4C14.2091 4 16 5.79086 16 8C16 10.2091 14.2091 12 12 12C9.79086 12 8 10.2091 8 8C8 5.79086 9.79086 4 12 4Z"
                        fill="currentColor"
                    />
                    <path
                        d="M6 8C6 5.23858 8.23858 3 11 3C13.7614 3 16 5.23858 16 8C16 10.7614 13.7614 13 11 13C8.23858 13 6 10.7614 6 8Z"
                        fill="currentColor"
                    />
                    <path
                        d="M11.5 13.5L11.5 16.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            )}
        </>
    );
};

export default IconYandexBrowser;
