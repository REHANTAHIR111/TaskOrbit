import React from 'react';

const TaskOrbitMark = ({ className = '' }: { className?: string }) => (
    <span className={`to-brand-mark ${className}`.trim()} aria-hidden="true">
        <svg viewBox="0 0 36 36" fill="none" focusable="false">
            <circle cx="18" cy="18" r="9.25" stroke="currentColor" strokeWidth="1.7" />
            <ellipse cx="18" cy="18" rx="14.5" ry="6" transform="rotate(-34 18 18)" stroke="currentColor" strokeWidth="1.35" />
            <circle cx="28.7" cy="10.25" r="2.4" fill="currentColor" />
            <circle cx="18" cy="18" r="2.2" fill="currentColor" />
        </svg>
    </span>
);

export default TaskOrbitMark;
