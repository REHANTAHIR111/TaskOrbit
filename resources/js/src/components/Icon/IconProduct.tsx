import React, { FC } from 'react';

interface IconBrowserProps {
    className?: string;
}

const IconProduct: FC<IconBrowserProps> = ({ className }) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            data-lucide="kanban-square"
            className="lucide lucide-kanban-square stroke-[1.5] [--color:currentColor] stroke-(--color) fill-(--color)/25 size-4"
        >
            <rect width="18" height="18" x="3" y="3" rx="2"></rect>
            <path d="M8 7v7"></path>
            <path d="M12 7v4"></path>
            <path d="M16 7v9"></path>
        </svg>
    );
};

export default IconProduct;
