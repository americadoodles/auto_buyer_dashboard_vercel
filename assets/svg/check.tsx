import React from 'react';

interface CheckIconProps {
  className?: string;
}

const CheckIcon: React.FC<CheckIconProps> = ({ className = 'w-4 h-4 text-brand-primary' }) => {
  return (
    <svg 
      className={className}
      viewBox="0 0 20 18" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M 19.375 1.020 L 19.219 0.984 L 15.898 2.812 L 12.422 5.309 L 10.703 6.855 L 9.180 8.473 L 6.836 11.637 L 5.703 10.512 L 3.945 9.457 L 2.031 8.754 L 0.703 8.508 L 0.508 8.613 L 0.508 8.859 L 1.953 9.984 L 3.750 12.023 L 5.156 14.133 L 6.719 16.945 L 6.875 16.980 L 7.070 16.840 L 8.320 14.484 L 9.805 12.059 L 12.852 7.840 L 16.055 4.289 L 18.203 2.320 L 19.414 1.371 L 19.492 1.195 Z" fill="currentColor"/>
    </svg>
  );
};

export default CheckIcon;
