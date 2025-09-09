'use client';

import { Home, Music2, Plus, BarChart3, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NavigationTab {
  id: 'home' | 'library' | 'create' | 'journal' | 'profile';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const tabs: NavigationTab[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'library', label: 'Library', icon: Music2 },
  { id: 'create', label: 'Create', icon: Plus },
  { id: 'journal', label: 'Journal', icon: BarChart3 },
  { id: 'profile', label: 'Profile', icon: User },
];

interface BottomNavigationProps {
  activeTab: NavigationTab['id'];
  onTabChange: (tab: NavigationTab['id']) => void;
}

export function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-nocturne-deep/90 backdrop-blur-lg border-t border-nocturne-moon/20 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-around py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isCreate = tab.id === 'create';
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-all duration-200',
                  isActive 
                    ? isCreate 
                      ? 'text-nocturne-dream bg-nocturne-dream/20 scale-110' 
                      : 'text-nocturne-star bg-nocturne-star/10'
                    : 'text-nocturne-moon hover:text-nocturne-star',
                  isCreate && 'transform hover:scale-105'
                )}
              >
                <div className={cn(
                  'relative',
                  isCreate && isActive && 'animate-pulse'
                )}>
                  <Icon className={cn(
                    'transition-all',
                    isCreate ? 'w-6 h-6' : 'w-5 h-5',
                    isCreate && isActive && 'drop-shadow-lg'
                  )} />
                  {isCreate && isActive && (
                    <div className="absolute inset-0 bg-nocturne-dream/30 rounded-full blur-md -z-10" />
                  )}
                </div>
                <span className={cn(
                  'text-xs font-medium mt-1 transition-colors',
                  isCreate && 'font-semibold'
                )}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}