'use client';

import React, { useState } from 'react';
import { BookOpen, Sparkles, Layers, Settings, Compass, Search, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

export type ActiveTab = 'today' | 'library' | 'cards' | 'settings';

interface AppNavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenCommandPalette: () => void;
  dueCardsCount?: number;
}

export function AppNavbar({
  activeTab,
  onTabChange,
  onOpenCommandPalette,
  dueCardsCount = 0,
}: AppNavbarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems: Array<{ id: ActiveTab; label: string; icon: React.ReactNode; badge?: number }> = [
    {
      id: 'today',
      label: 'Today',
      icon: <Compass className="w-5 h-5 shrink-0" />,
    },
    {
      id: 'library',
      label: 'Library',
      icon: <BookOpen className="w-5 h-5 shrink-0" />,
    },
    {
      id: 'cards',
      label: 'Cards',
      icon: <Layers className="w-5 h-5 shrink-0" />,
      badge: dueCardsCount > 0 ? dueCardsCount : undefined,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-5 h-5 shrink-0" />,
    },
  ];

  return (
    <>
      {/* Desktop / Tablet Collapsible Sidebar */}
      <aside
        className={`hidden md:flex flex-col ${
          isCollapsed ? 'w-20' : 'w-64'
        } border-r border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950 p-4 shrink-0 justify-between select-none transition-all duration-300 ease-in-out`}
      >
        <div className="space-y-6">
          {/* Brand with Logo Hover Collapse/Expand Button ON the Logo */}
          <div className="flex items-center gap-2.5 px-1 pt-2">
            <div
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="relative group/logo w-8 h-8 rounded-lg bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-950 flex items-center justify-center font-bold text-sm tracking-tight shadow-sm shrink-0 cursor-pointer"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <span className="group-hover/logo:opacity-0 transition-opacity">P</span>
              <div className="absolute inset-0 opacity-0 group-hover/logo:opacity-100 flex items-center justify-center transition-opacity bg-stone-900 dark:bg-stone-100 text-stone-100 dark:text-stone-950 rounded-lg shadow-sm">
                {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
              </div>
            </div>

            {!isCollapsed && (
              <div className="truncate transition-opacity duration-200 flex-1">
                <span className="font-semibold text-base tracking-tight text-stone-900 dark:text-stone-100 block truncate">
                  Pagewise
                </span>
                <span className="text-[11px] text-stone-500 dark:text-stone-400 block -mt-0.5 truncate">
                  AI Study Companion
                </span>
              </div>
            )}
          </div>

          {/* Quick Search / Command Palette Trigger */}
          {isCollapsed ? (
            <button
              onClick={onOpenCommandPalette}
              title="Search or jump to... (⌘K)"
              className="w-full flex items-center justify-center p-2.5 text-stone-500 dark:text-stone-400 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl hover:border-stone-300 dark:hover:border-stone-700 transition-colors shadow-2xs group"
            >
              <Search className="w-4 h-4 text-stone-500 group-hover:text-stone-900 dark:group-hover:text-stone-100" />
            </button>
          ) : (
            <button
              onClick={onOpenCommandPalette}
              className="w-full flex items-center justify-between px-3 py-2 text-xs text-stone-500 dark:text-stone-400 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl hover:border-stone-300 dark:hover:border-stone-700 transition-colors shadow-2xs group"
            >
              <span className="flex items-center gap-2 truncate">
                <Search className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-600 dark:group-hover:text-stone-300 shrink-0" />
                <span className="truncate">Search or jump to...</span>
              </span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded text-stone-500 shrink-0">
                ⌘K
              </kbd>
            </button>
          )}

          {/* Nav Links */}
          <nav className="space-y-1">
            {navItems.map(item => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center ${
                    isCollapsed ? 'justify-center p-3' : 'justify-between px-3 py-2.5'
                  } text-sm font-medium rounded-xl transition-colors text-left relative group/nav ${
                    isActive
                      ? 'bg-stone-200/80 text-stone-900 dark:bg-stone-800 dark:text-stone-100 shadow-2xs font-semibold'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-stone-200 dark:hover:bg-stone-900'
                  }`}
                >
                  <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} min-w-0`}>
                    <span className={isActive ? 'text-stone-900 dark:text-stone-100' : 'text-stone-500 dark:text-stone-400'}>
                      {item.icon}
                    </span>
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </div>

                  {item.badge !== undefined && (
                    isCollapsed ? (
                      <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-amber-500 text-[10px] text-white flex items-center justify-center font-bold shadow-xs">
                        {item.badge}
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shrink-0">
                        {item.badge}
                      </span>
                    )
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer indicator */}
        <div className={`py-3 border-t border-stone-200/80 dark:border-stone-800/80 text-xs text-stone-500 dark:text-stone-400 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-2" title="Local Browser Storage">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0" />
            {!isCollapsed && <span className="truncate">Local Storage</span>}
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-stone-50/95 dark:bg-stone-950/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 px-3 py-2 flex items-center justify-around">
        {navItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg relative ${
                isActive
                  ? 'text-stone-950 dark:text-stone-50 font-semibold'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              <div className="relative">
                {item.icon}
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-amber-500 text-[10px] text-white flex items-center justify-center font-bold">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-1">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
