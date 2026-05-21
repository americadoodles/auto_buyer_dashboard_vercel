"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Users, 
  UserPlus, 
  Shield, 
  ChevronLeft, 
  ChevronRight,
  Home,
  Settings,
  BarChart3,
  Car,
  List,
  Target,
  Phone,
  Handshake,
  CheckSquare,
  Plus,
  FolderKanban,
  Bot
} from 'lucide-react';
import { useAuth } from '../../app/auth/useAuth';
import { LeadCreateWithSelectionModal } from './LeadCreateWithSelectionModal';

interface NavItem {
  href?: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  subItems?: NavItem[];
  onClick?: () => void;
  alwaysShowSubItems?: boolean; // If true, sub-items are always visible without expand/collapse
}

// Get navigation items based on user role
const getNavItems = (userRole?: string): NavItem[] => {
  const baseItems: NavItem[] = [
    {
      href: '/',
      label: 'Dashboard',
      icon: Home,
    },
    {
      href: '/agents',
      label: 'AI Agents',
      icon: Bot,
    },
    {
      href: '/listings',
      label: 'Vehicle Listings',
      icon: List,
    },
    {
      href: '/crm',
      label: 'CRM Dashboard',
      icon: BarChart3,
    },
    {
      href: '/crm/leads',
      label: 'Leads',
      icon: Target,
      subItems: [
        {
          label: 'Create New Lead',
          icon: Plus,
          onClick: () => {} // Will be handled by parent component
        }
      ]
    },
    {
      href: '/crm/contacts',
      label: 'Contacts',
      icon: Phone,
    },
    {
      href: '/crm/deals',
      label: 'Deals',
      icon: Handshake,
    },
    {
      href: '/crm/tasks',
      label: 'Tasks',
      icon: CheckSquare,
    },
    {
      href: '/user-management/signup-requests',
      label: 'Signup Requests',
      icon: UserPlus,
    },
    {
      href: '/user-management',
      label: 'Current Users',
      icon: Users,
    },
    {
      href: '/user-management/roles',
      label: 'Role Management',
      icon: Shield,
    },
    {
      href: '/settings',
      label: 'Settings',
      icon: Settings,
    }
  ];

  if (userRole === 'admin') {
    return baseItems;
  }

      if (userRole === 'buyer') {
        // Return only listings, leads, contacts, deals, tasks
        return baseItems.filter(item =>
          item.href && [
            '/',
            '/agents',
            '/listings',
            '/crm/leads',
            '/crm/contacts',
            '/crm/deals',
            '/crm/tasks'
          ].includes(item.href)
        );
      }

  // Default: return all for undefined role, or adjust as needed
  return baseItems;
};

export const AdminNavPanel = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isCreateLeadModalOpen, setIsCreateLeadModalOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const navItems = getNavItems(user?.role);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const toggleItemExpanded = (itemLabel: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemLabel)) {
        newSet.delete(itemLabel);
      } else {
        // Close all other items and open only this one
        newSet.clear();
        newSet.add(itemLabel);
      }
      return newSet;
    });
  };

  const isActiveRoute = (href?: string) => {
    if (!href) return false;
    if (href === '/') {
      return pathname === '/';
    }
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  const handleItemClick = (item: NavItem) => {
    if (item.onClick) {
      item.onClick();
    } else if (item.href) {
      router.push(item.href);
    }
  };

  return (
    <nav 
      className={`h-full bg-claude-surface dark:bg-coal-850 border-r border-claude-border dark:border-coal-700 flex flex-col transition-all duration-300 ease-in-out ${
        isExpanded ? 'w-48' : 'w-14'
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-claude-border dark:border-coal-700">
        <div className="flex items-center justify-between">
          {isExpanded && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-claude-accent rounded-lg flex items-center justify-center">
                <Car className="h-5 w-5 text-coal-100" />
              </div>
              <span className="text-lg font-bold text-claude-ink dark:text-coal-100">Dashboard</span>
            </div>
          )}
          <button
            onClick={toggleExpanded}
            className="p-1 rounded-md hover:bg-claude-sand dark:hover:bg-coal-700 transition-colors"
            title={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isExpanded ? (
              <ChevronLeft className="w-4 h-4 text-claude-muted dark:text-coal-300" />
            ) : (
              <ChevronRight className="w-4 h-4 text-claude-muted dark:text-coal-300" />
            )}
          </button>
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 mt-4 flex flex-col overflow-y-auto">
        <ul className="space-y-1 px-2 flex-1">
          {navItems.map((item, index) => {
            const isActive = item.href ? isActiveRoute(item.href) : false;
            const Icon = item.icon;
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isItemExpanded = expandedItems.has(item.label);
            
            return (
              <li key={item.href || `${item.label}-${index}`}>
                <div>
                  {item.href ? (
                    <div 
                      className={`group/item flex items-center px-2 py-1 rounded-lg transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'bg-claude-accent/10 dark:bg-claude-accent/15'
                          : 'hover:bg-claude-sand dark:hover:bg-coal-700'
                      }`}
                      onClick={(e) => {
                        if (hasSubItems) {
                          // Navigate to the page first
                          if (item.href) {
                            router.push(item.href);
                          }
                          // Then toggle expansion (this will close other items)
                          toggleItemExpanded(item.label);
                        } else {
                          // If no sub-items, close all expanded items when navigating
                          setExpandedItems(new Set());
                        }
                      }}
                    >
                      <Link
                        href={item.href}
                        className="flex items-center flex-1"
                        onClick={(e) => {
                          if (hasSubItems) {
                            e.preventDefault();
                            // Navigation is handled by parent div onClick
                          }
                        }}
                        title={!isExpanded ? item.label : undefined}
                      >
                        <Icon
                          className={`w-5 h-5 flex-shrink-0 ${
                            isActive
                              ? 'text-claude-accent dark:text-claude-accent'
                              : 'text-claude-muted dark:text-coal-400 group-hover/item:text-claude-ink dark:group-hover/item:text-coal-200'
                          }`}
                        />
                        {isExpanded && (
                          <span className={`ml-3 min-w-0 flex-1 text-sm font-medium truncate ${
                            isActive
                              ? 'text-claude-accent dark:text-claude-accent'
                              : 'text-claude-text dark:text-coal-300 group-hover/item:text-claude-ink dark:group-hover/item:text-coal-100'
                          }`}>
                            {item.label}
                          </span>
                        )}
                      </Link>
                      {isExpanded && hasSubItems && (
                        <ChevronRight 
                          className={`w-4 h-4 flex-shrink-0 ml-1 transition-transform ${
                            isItemExpanded ? 'rotate-90' : ''
                          } ${
                            isActive
                              ? 'text-claude-accent dark:text-claude-accent'
                              : 'text-claude-muted dark:text-coal-400 group-hover/item:text-claude-ink dark:group-hover/item:text-coal-200'
                          }`}
                        />
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleItemClick(item)}
                      className={`group flex items-center w-full px-2 py-1 rounded-lg transition-all duration-200 text-claude-text dark:text-coal-300 hover:bg-claude-sand dark:hover:bg-coal-700 hover:text-claude-ink dark:hover:text-coal-100`}
                      title={!isExpanded ? item.label : undefined}
                    >
                      <Icon
                        className="w-5 h-5 flex-shrink-0 text-claude-muted dark:text-coal-400 group-hover:text-claude-ink dark:group-hover:text-coal-200"
                      />
                      {isExpanded && (
                        <div className="ml-3 min-w-0 flex-1 text-left">
                          <span className="text-sm font-medium truncate">
                            {item.label}
                          </span>
                        </div>
                      )}
                    </button>
                  )}
                  
                  {/* Sub-items */}
                  {isExpanded && hasSubItems && isItemExpanded && (
                    <ul className="ml-6 mt-1 space-y-1">
                      {item.subItems?.map((subItem) => {
                        const SubIcon = subItem.icon;
                        return (
                          <li key={subItem.label}>
                            <button
                              onClick={() => {
                                if (subItem.onClick) {
                                  subItem.onClick();
                                } else if (subItem.href) {
                                  router.push(subItem.href);
                                }
                                // Special handling for Create New Lead
                                if (subItem.label === 'Create New Lead') {
                                  setIsCreateLeadModalOpen(true);
                                }
                              }}
                              className="group flex items-center w-full px-2 py-1 rounded-lg transition-all duration-200 text-claude-muted dark:text-coal-400 hover:bg-claude-sand dark:hover:bg-coal-700 hover:text-claude-ink dark:hover:text-coal-100"
                            >
                              <SubIcon
                                className="w-4 h-4 flex-shrink-0 text-claude-subtle dark:text-coal-500 group-hover:text-claude-muted dark:group-hover:text-coal-300"
                              />
                              <span className="ml-2 text-xs font-medium truncate">
                                {subItem.label}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Footer */}
      {isExpanded && (
        <div className="p-4 border-t border-claude-border dark:border-coal-700">
          <div className="flex items-center space-x-3 p-2 rounded-lg bg-claude-sand dark:bg-coal-800/70">
            <div className="w-8 h-8 bg-claude-accent rounded-full flex items-center justify-center">
              <Settings className="w-4 h-4 text-coal-100" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-claude-ink dark:text-coal-100 truncate">
                {user?.role === 'admin' ? 'Admin Panel' : user?.role === 'buyer' ? 'Buyer Dashboard' : 'Dashboard'}
              </p>
              <p className="text-xs text-claude-muted dark:text-coal-400 truncate">
                {user?.role === 'admin' ? 'Full access control' : user?.role === 'buyer' ? 'Buyer access' : 'User access'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Create New Lead Modal */}
      <LeadCreateWithSelectionModal
        isOpen={isCreateLeadModalOpen}
        onClose={() => setIsCreateLeadModalOpen(false)}
        onSuccess={() => {
          setIsCreateLeadModalOpen(false);
          // Optionally refresh the page or navigate to leads page
          router.push('/crm/leads');
        }}
      />
    </nav>
  );
};
