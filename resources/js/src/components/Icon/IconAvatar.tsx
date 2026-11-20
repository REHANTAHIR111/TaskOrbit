import React from 'react';import { FC } from 'react';

interface IconAvatarProps {
    className?: string;
    fill?: boolean;
    duotone?: boolean;
}

const IconAvatar: FC<IconAvatarProps> = ({ className, fill = false, duotone = true }) => {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <circle cx="12" cy="6" r="4" fill="currentColor"/>
            <ellipse cx="12" cy="17" rx="7" ry="4" fill="currentColor"/>
        </svg>
    );
};

export default IconAvatar;
