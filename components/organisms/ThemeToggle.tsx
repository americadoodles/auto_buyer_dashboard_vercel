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
      className="group rounded-full bg-claude-sand p-[3px] text-claude-ink outline-1 outline-blue-500 focus-visible:outline dark:bg-coal-900 dark:text-coal-100"
    >
      <span className="sr-only">
        Switch to {theme === 'light' ? 'dark' : 'light'} mode
      </span>

      <span aria-hidden className="relative flex gap-1.5">
        {/* Indicator */}
        <span className="absolute h-[28px] w-[28px] rounded-full border border-claude-divider bg-claude-surface transition-all dark:translate-x-[34px] dark:border-coal-700 dark:bg-coal-850 dark:group-hover:bg-coal-700" />

        {THEMES.map(({ name, Icon }) => (
          <span
            key={name}
            className={`relative grid h-[28px] w-[28px] place-items-center rounded-full ${
              name === 'dark' ? 'dark:text-coal-100' : ''
            }`}
          >
            <Icon />
          </span>
        ))}
      </span>
    </button>
  );
};

