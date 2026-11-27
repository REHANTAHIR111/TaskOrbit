import { ReactNode } from 'react';

export type IconName =
    | 'plus'
    | 'layers'
    | 'calendarCheck'
    | 'calendarAlert'
    | 'inbox'
    | 'flag'
    | 'clock'
    | 'sliders'
    | 'trash'
    | 'list'
    | 'pencil'
    | 'refresh'
    | 'chevronRight'
    | 'sparkle';

const PATHS: Record<IconName, ReactNode> = {
    plus: <path d="M12 5v14M5 12h14" />,
    layers: (
        <>
            <path d="M12 3 3 8l9 5 9-5-9-5Z" />
            <path d="m3 13 9 5 9-5" />
        </>
    ),
    calendarCheck: (
        <>
            <rect x="3" y="4" width="18" height="17" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4" />
        </>
    ),
    calendarAlert: (
        <>
            <rect x="3" y="4" width="18" height="17" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18M12 13.5v3M12 19v.01" />
        </>
    ),
    inbox: (
        <>
            <path d="m4 13 2-8h12l2 8" />
            <path d="M4 13v6h16v-6h-5a3 3 0 0 1-6 0H4Z" />
        </>
    ),
    flag: <path d="M5 21V4M5 4h11l-2 4 2 4H5" />,
    clock: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
        </>
    ),
    sliders: (
        <>
            <path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" />
            <circle cx="15" cy="6" r="2" />
            <circle cx="9" cy="12" r="2" />
            <circle cx="17" cy="18" r="2" />
        </>
    ),
    trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
    list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
    pencil: <path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" />,
    refresh: <path d="M20 11a8 8 0 0 0-14.9-3M4 5v4h4M4 13a8 8 0 0 0 14.9 3M20 19v-4h-4" />,
    chevronRight: <path d="m9 6 6 6-6 6" />,
    sparkle: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.4 2.4M15.3 15.3l2.4 2.4M17.7 6.3l-2.4 2.4M8.7 15.3l-2.4 2.4" />,
};

type IconProps = { name: IconName; size?: number };

/** Decorative icon. Pair it with visible text or an aria-label on the parent control. */
export function Icon({ name, size = 18 }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
        >
            {PATHS[name]}
        </svg>
    );
}
