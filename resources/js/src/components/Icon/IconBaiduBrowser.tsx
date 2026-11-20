import React, { FC } from 'react';

interface IconBaiduBrowserProps {
    className?: string;
    fill?: boolean;
    duotone?: boolean;
}

const IconBaiduBrowser: FC<IconBaiduBrowserProps> = ({ className, fill = false, duotone = true }) => {
    return (
        <>
            {!fill ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
                    <path
                        d="M4 9C4 7.34315 5.34315 6 7 6H17C18.6569 6 20 7.34315 20 9V15C20 16.6569 18.6569 18 17 18H7C5.34315 18 4 16.6569 4 15V9Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                    />
                    <path
                        d="M10 12C10 10.3431 11.3431 9 13 9C14.6569 9 16 10.3431 16 12C16 13.6569 14.6569 15 13 15C11.3431 15 10 13.6569 10 12Z"
                        fill="currentColor"
                    />
                </svg>
            ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
                    <path
                        d="M4 9C4 7.34315 5.34315 6 7 6H17C18.6569 6 20 7.34315 20 9V15C20 16.6569 18.6569 18 17 18H7C5.34315 18 4 16.6569 4 15V9Z"
                        fill="currentColor"
                    />
                    <path
                        d="M10 12C10 10.3431 11.3431 9 13 9C14.6569 9 16 10.3431 16 12C16 13.6569 14.6569 15 13 15C11.3431 15 10 13.6569 10 12Z"
                        fill="currentColor"
                    />
                </svg>
            )}
        </>
    );
};

export default IconBaiduBrowser;
