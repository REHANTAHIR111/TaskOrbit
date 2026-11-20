import { ClassNames } from '@emotion/react';
import React, { FC } from 'react';

interface IconBrowserProps {
    className?: string;
}

const IconDot: FC<IconBrowserProps> = ({ className }) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            style={{ transform: 'rotate(90deg)' }}
            focusable="false"
            viewBox="0 0 16 16"
            data-testid="Icon--ellipsis"
            aria-hidden="true"
            data-garden-id="buttons.icon"
            data-garden-version="8.76.7"
            className={className}
        >
            <g fill="currentColor">
                <circle cx="8" cy="8" r="1.5"></circle>
            </g>
        </svg>
    );
};

export default IconDot;
