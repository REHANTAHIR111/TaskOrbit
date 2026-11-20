import React, { FC } from 'react';

interface IconAmigoBrowserProps {
    className?: string;
    fill?: boolean;
    duotone?: boolean;
}

const IconAmigoBrowser: FC<IconAmigoBrowserProps> = ({ className, fill = false, duotone = true }) => {
    return (
        <>
            {!fill ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                    <path
                        d="M9.5 8.5C9.5 7.67157 10.1716 7 11 7C11.8284 7 12.5 7.67157 12.5 8.5C12.5 9.32843 11.8284 10 11 10C10.1716 10 9.5 9.32843 9.5 8.5Z"
                        fill="currentColor"
                    />
                    <path
                        d="M14 8.5C14 7.67157 13.3284 7 13 7C12.6716 7 12 7.67157 12 8.5C12 9.32843 12.6716 10 13 10C13.3284 10 14 9.32843 14 8.5Z"
                        fill="currentColor"
                    />
                </svg>
            ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
                    <circle cx="12" cy="12" r="10" fill="currentColor" />
                    <path
                        d="M9.5 8.5C9.5 7.67157 10.1716 7 11 7C11.8284 7 12.5 7.67157 12.5 8.5C12.5 9.32843 11.8284 10 11 10C10.1716 10 9.5 9.32843 9.5 8.5Z"
                        fill="currentColor"
                    />
                    <path
                        d="M14 8.5C14 7.67157 13.3284 7 13 7C12.6716 7 12 7.67157 12 8.5C12 9.32843 12.6716 10 13 10C13.3284 10 14 9.32843 14 8.5Z"
                        fill="currentColor"
                    />
                </svg>
            )}
        </>
    );
};

export default IconAmigoBrowser;
