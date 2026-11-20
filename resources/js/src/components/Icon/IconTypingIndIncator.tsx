import React from 'react';import { FC } from 'react';

interface IconTypingIndIncatorProps {
    className?: string;
    duotone?: boolean;
}

const IconTypingIndIncator: FC<IconTypingIndIncatorProps> = ({ className, fill = false, duotone = true }) => {
    return (
        <>
           <svg height="30" width="40">
                <circle className="dot" cx="10" cy="20" r="3" style={{fill:"blue"}} />
                <circle className="dot" cx="20" cy="20" r="3" style={{fill:"blue"}} />
                <circle className="dot" cx="30" cy="20" r="3" style={{fill:"blue"}} />
            </svg>
        </>
    );
};

export default IconTypingIndIncator;
