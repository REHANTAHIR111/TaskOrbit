import React from 'react';
import { FC } from 'react';

interface IconQQBrowserProps {
    className?: string;
    fill?: boolean;
    duotone?: boolean;
}

const IconQQBrowser: FC<IconQQBrowserProps> = ({ className, fill = false, duotone = true }) => {
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
                    <path
                        opacity={duotone ? '0.5' : '1'}
                        d="M12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2ZM9.341 14.341C9.896 14.896 10.446 15 11.1 15H12C12.554 15 13.104 14.896 13.66 14.341C14.219 13.782 14.322 12.683 13.762 12.125C13.202 11.566 12.102 11.464 11.542 12.024C11.418 12.175 11.284 12.344 11.142 12.529C10.782 12.985 10.368 13.387 9.914 13.729C9.635 13.991 9.366 14.245 9.098 14.51C9.035 14.584 9.01 14.61 9.006 14.61H9.001C9 14.605 9 14.503 9.341 14.341Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                    ></path>
                    <path d="M12 15C12.552 15 13 14.552 13 14C13 13.448 12.552 13 12 13C11.448 13 11 13.448 11 14C11 14.552 11.448 15 12 15Z" stroke="currentColor" strokeWidth="1.5"></path>
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
                    <path
                        d="M12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2Z"
                        fill="currentColor"
                    />
                    <path
                        d="M9.341 14.341C9.896 14.896 10.446 15 11.1 15H12C12.554 15 13.104 14.896 13.66 14.341C14.219 13.782 14.322 12.683 13.762 12.125C13.202 11.566 12.102 11.464 11.542 12.024C11.418 12.175 11.284 12.344 11.142 12.529C10.782 12.985 10.368 13.387 9.914 13.729C9.635 13.991 9.366 14.245 9.098 14.51C9.035 14.584 9.01 14.61 9.006 14.61H9.001C9 14.605 9 14.503 9.341 14.341Z"
                        fill="currentColor"
                    />
                    <path
                        d="M12 15C12.552 15 13 14.552 13 14C13 13.448 12.552 13 12 13C11.448 13 11 13.448 11 14C11 14.552 11.448 15 12 15Z"
                        fill="currentColor"
                    />
                </svg>
            )}
        </>
    );
};

export default IconQQBrowser;
