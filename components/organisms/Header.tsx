'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../app/auth/useAuth';
import { useRouter } from 'next/navigation';
import { Input } from '../atoms/Input';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { ThemeToggle } from './ThemeToggle';
import { Search, Bell, User, LogOut, Settings, ChevronDown } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/auth');
  };

  // Handle Escape key to close dropdowns
  const handleEscapeKey = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setShowNotifications(false);
      setShowUserMenu(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [handleEscapeKey]);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-claude-border bg-claude-surface px-2 py-1.5 shadow-sm dark:border-coal-700 dark:bg-coal-850">
      {/* Left side - Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-claude-subtle" />
          <Input
            type="search"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 py-1.5 text-sm w-full"
          />
        </div>
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-1.5"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
          </Button>
          
          {showNotifications && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowNotifications(false)}
              />
              
              {/* Dropdown Panel */}
              <div className="absolute right-0 mt-2 w-80 bg-claude-surface border border-claude-border rounded-lg shadow-lg z-50 dark:bg-coal-850 dark:border-coal-700">
                <div className="p-4 border-b border-claude-border dark:border-coal-700">
                  <h3 className="font-semibold text-claude-ink dark:text-coal-100">Notifications</h3>
                </div>
                <div className="p-4 text-center text-claude-subtle dark:text-coal-400">
                  <p>No new notifications</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Menu */}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-1.5 px-2 py-1"
          >
            <div className="h-6 w-6 rounded-full bg-claude-accent flex items-center justify-center text-coal-100 text-xs font-medium">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <span className="hidden md:block text-sm font-medium">{user?.username || 'User'}</span>
            <ChevronDown className="h-3 w-3" />
          </Button>

          {showUserMenu && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowUserMenu(false)}
              />
              
              {/* Dropdown Menu */}
              <div className="absolute right-0 mt-2 w-56 bg-claude-surface border border-claude-border rounded-lg shadow-lg z-50 dark:bg-coal-850 dark:border-coal-700">
                <div className="p-4 border-b border-claude-border dark:border-coal-700">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-claude-accent flex items-center justify-center text-coal-100 font-medium">
                      {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-claude-ink dark:text-coal-100">
                        {user?.username || 'User'}
                      </p>
                      <p className="text-xs text-claude-subtle dark:text-coal-400">
                        {user?.email || ''}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-2">
                  <button
                    onClick={() => {
                      router.push('/profile');
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-claude-text rounded-md hover:bg-claude-sand dark:text-coal-300 dark:hover:bg-coal-700"
                  >
                    <User className="h-4 w-4" />
                    <span>View Profile</span>
                  </button>

                  <button
                    onClick={() => {
                      router.push('/settings');
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-claude-text rounded-md hover:bg-claude-sand dark:text-coal-300 dark:hover:bg-coal-700"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </button>
                </div>

                <div className="p-2 border-t border-claude-border dark:border-coal-700">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 rounded-md hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Log out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

