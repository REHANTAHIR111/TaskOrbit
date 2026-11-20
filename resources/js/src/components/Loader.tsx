import React from 'react';

interface LoaderProps {
    loader: any
}

const Loader: React.FC<LoaderProps> = ( ) => {
    return (
        <div>
            <span className="animate-spin border-4 border-transparent border-l-primary rounded-full w-10 h-10 inline-block align-middle mb-10"></span>
        </div>
    );
};

export default Loader;