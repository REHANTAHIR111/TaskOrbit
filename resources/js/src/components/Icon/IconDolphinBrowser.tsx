import React, { FC } from 'react';

interface IconDolphinBrowserProps {
    className?: string;
    fill?: boolean;
    duotone?: boolean;
}

const IconDolphinBrowser: FC<IconDolphinBrowserProps> = ({ className, fill = false, duotone = true }) => {
    return (
        <>
            {!fill ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
                    <path
                        opacity={duotone ? '0.5' : '1'}
                        d="M12 2C10.3431 2 9 3.34315 9 5C9 6.65685 10.3431 8 12 8C13.6569 8 15 6.65685 15 5C15 3.34315 13.6569 2 12 2ZM4 13C3.44772 13 3 13.4477 3 14V18C3 18.5523 3.44772 19 4 19H20C20.5523 19 21 18.5523 21 18V14C21 13.4477 20.5523 13 20 13H4ZM12 10C10.3431 10 9 11.3431 9 13C9 14.6569 10.3431 16 12 16C13.6569 16 15 14.6569 15 13C15 11.3431 13.6569 10 12 10Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                    ></path>
                </svg>
            ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
                    <path
                        opacity={duotone ? '0.5' : '1'}
                        d="M12 2C10.3431 2 9 3.34315 9 5C9 6.65685 10.3431 8 12 8C13.6569 8 15 6.65685 15 5C15 3.34315 13.6569 2 12 2ZM4 13C3.44772 13 3 13.4477 3 14V18C3 18.5523 3.44772 19 4 19H20C20.5523 19 21 18.5523 21 18V14C21 13.4477 20.5523 13 20 13H4ZM12 10C10.3431 10 9 11.3431 9 13C9 14.6569 10.3431 16 12 16C13.6569 16 15 14.6569 15 13C15 11.3431 13.6569 10 12 10Z"
                        fill="currentColor"
                    />
                </svg>
            )}
        </>
    );
};

export default IconDolphinBrowser;
