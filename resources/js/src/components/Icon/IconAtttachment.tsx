import React, { FC } from 'react';

interface IconBrowserProps {
    className?: string;
}

const IconAttachment: FC<IconBrowserProps> = ({ className }) => {
    return (
        <svg
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            focusable="false"
            viewBox="0 0 14 14"
            data-testid="Icon--chat-attachment"
            data-garden-id="buttons.icon"
            data-garden-version="8.76.7"
        >
            <path
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin ="round"
                d="M6 4.6v5c0 .6.5 1.1 1.1 1.1s1.1-.5 1.1-1.1V2.7C8.2 1.5 7.2.5 6 .5s-2.2 1-2.2 2.2v7.5c0 1.8 1.5 3.3 3.3 3.3s3.3-1.5 3.3-3.3V4.6"
            ></path>
        </svg>
    );
};

export default IconAttachment;
