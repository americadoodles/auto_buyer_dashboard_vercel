import React from 'react';

interface AftermarketIconProps {
  className?: string;
}

const AftermarketIcon: React.FC<AftermarketIconProps> = ({ className = 'w-6 h-6 text-gray-400' }) => {
  return (
    <svg 
      className={className}
      viewBox="0 0 9 10" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="4.5" cy="5.5" r="4.2877" stroke="currentColor" strokeWidth="0.424592"/>
      <path d="M4.13381 2.54314H4.87515L6.99217 8H6.2279L5.6547 6.47911H3.31604L2.74284 8H2.00915L4.13381 2.54314ZM5.4407 5.8677L4.47773 3.33798L3.53004 5.8677H5.4407Z" fill="currentColor"/>
    </svg>
  );
};

export default AftermarketIcon;
