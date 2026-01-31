'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from './ThemeToggle/icons';

const THEMES = [
  {
    name: 'light',
    Icon: Sun,
  },
  {
    name: 'dark',
    Icon: Moon,
  },
];

export const ThemeToggle: React.FC = () => {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <button
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      className="group rounded-full bg-gray-200 p-[3px] text-gray-900 outline-1 outline-blue-500 focus-visible:outline dark:bg-gray-900 dark:text-white"
    >
      <span className="sr-only">
        Switch to {theme === 'light' ? 'dark' : 'light'} mode
      </span>

      <span aria-hidden className="relative flex gap-1.5">
        {/* Indicator */}
        <span className="absolute h-[28px] w-[28px] rounded-full border border-gray-300 bg-white transition-all dark:translate-x-[34px] dark:border-gray-700 dark:bg-gray-800 dark:group-hover:bg-gray-700" />

        {THEMES.map(({ name, Icon }) => (
          <span
            key={name}
            className={`relative grid h-[28px] w-[28px] place-items-center rounded-full ${
              name === 'dark' ? 'dark:text-white' : ''
            }`}
          >
            <Icon />
          </span>
        ))}
      </span>
    </button>
  );
};

