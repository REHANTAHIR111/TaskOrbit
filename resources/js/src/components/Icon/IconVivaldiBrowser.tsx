import React, { FC } from 'react';

interface IconVivaldiProps {
    className?: string;
    fill?: boolean;
    duotone?: boolean;
}

const IconVivaldi: FC<IconVivaldiProps> = ({ className, fill = false, duotone = true }) => {
    return (
        <>
            {!fill ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
                    <path
                        opacity={duotone ? '0.5' : '1'}
                        d="M12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                    />
                    <path
                        d="M9 8L15 12L9 16V8Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                    />
                </svg>
            ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
                    <path
                        d="M12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2Z"
                        fill="currentColor"
                    />
                    <path
                        d="M9 8L15 12L9 16V8Z"
                        fill="currentColor"
                    />
                </svg>
            )}
        </>
    );
};

export default IconVivaldi;
