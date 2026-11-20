import React, { FC } from 'react';

interface IconBrowserProps {
    className?: string;
}

const IconNotAllow: FC<IconBrowserProps> = ({ className }) => {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}><circle opacity="0.5" cx="12" cy="12" r="10" stroke="#545454" strokeWidth="1.5"></circle><path d="M12 7V13" stroke="#545454" strokeWidth="1.5" strokeLinecap="round"></path><circle cx="12" cy="16" r="1" fill="#545454"></circle></svg>
    );
};

export default IconNotAllow;
