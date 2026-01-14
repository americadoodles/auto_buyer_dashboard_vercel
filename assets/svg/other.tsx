import React from 'react';

interface OtherIconProps {
  className?: string;
}

const OtherIcon: React.FC<OtherIconProps> = ({ className = 'w-6 h-6 text-gray-400' }) => {
  return (
    <svg 
      className={className}
      viewBox="0 0 10 3" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M1.25 0C0.5625 0 0 0.5625 0 1.25C0 1.9375 0.5625 2.5 1.25 2.5C1.9375 2.5 2.5 1.9375 2.5 1.25C2.5 0.5625 1.9375 0 1.25 0ZM8.75 0C8.0625 0 7.5 0.5625 7.5 1.25C7.5 1.9375 8.0625 2.5 8.75 2.5C9.4375 2.5 10 1.9375 10 1.25C10 0.5625 9.4375 0 8.75 0ZM5 0C4.3125 0 3.75 0.5625 3.75 1.25C3.75 1.9375 4.3125 2.5 5 2.5C5.6875 2.5 6.25 1.9375 6.25 1.25C6.25 0.5625 5.6875 0 5 0Z" fill="currentColor"/>
    </svg>
  );
};

export default OtherIcon;
