import React from 'react';

const ProgressBar = () => {
  return (
    <div
        className="bg-primary h-3.5 rounded-full w-full animated-progress border border-[#4361ee]"
        style={{
            backgroundImage:
                'linear-gradient(135deg, #4361ee 25%, white 25%, white 50%, #4361ee 50%, #4361ee 75%, white 75%, white)',
            backgroundSize: '1rem 1rem',
        }}
      >
    </div>
  );
};

export default ProgressBar;