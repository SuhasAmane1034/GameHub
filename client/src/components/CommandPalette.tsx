import React, { useState, useEffect, useRef } from 'react';
import { Search, Monitor, Play, FileText, Calendar, Users, BarChart2, Settings, LogOut, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
  onStartSession: () => void;
  onLogout: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onStartSession,
  onLogout,
}) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const commands: CommandItem[] = [
    {
      id: 'nav-dash',
      title: 'Go to Dashboard',
      description: 'View real-time metrics, charts and cafe overview.',
      category: 'Navigation',
      icon: <BarChart2 className="w-5 h-5 text-game-primary" />,
      action: () => { onNavigate('dashboard'); onClose(); }
    },
    {
      id: 'nav-stations',
      title: 'Go to Gaming Stations',
      description: 'View active consoles and gaming PCs on the floor.',
      category: 'Navigation',
      icon: <Monitor className="w-5 h-5 text-game-primary" />,
      action: () => { onNavigate('stations'); onClose(); }
    },
    {
      id: 'nav-floor',
      title: 'Go to Live Floor View (TV)',
      description: 'Open full-screen floor layout optimized for display TVs.',
      category: 'Navigation',
      icon: <Monitor className="w-5 h-5 text-purple-400" />,
      action: () => { onNavigate('floor'); onClose(); }
    },
    {
      id: 'action-start',
      title: 'Start New Session',
      description: 'Assign a station and launch a gaming timer.',
      category: 'Quick Actions',
      icon: <Play className="w-5 h-5 text-game-success" />,
      action: () => { onStartSession(); onClose(); }
    },
    {
      id: 'nav-bookings',
      title: 'Go to Bookings Calendar',
      description: 'Reserve console slots and view bookings schedule.',
      category: 'Navigation',
      icon: <Calendar className="w-5 h-5 text-game-primary" />,
      action: () => { onNavigate('bookings'); onClose(); }
    },
    {
      id: 'nav-customers',
      title: 'Go to Customers Directory',
      description: 'Browse client spending and profile records.',
      category: 'Navigation',
      icon: <Users className="w-5 h-5 text-game-primary" />,
      action: () => { onNavigate('customers'); onClose(); }
    },
    {
      id: 'nav-billing',
      title: 'Go to Invoices & Billing',
      description: 'Verify receipt history and check invoice items.',
      category: 'Navigation',
      icon: <FileText className="w-5 h-5 text-game-primary" />,
      action: () => { onNavigate('billing'); onClose(); }
    },
    {
      id: 'nav-settings',
      title: 'Go to Cafe Settings',
      description: 'Configure pricing rules and cafe GST information.',
      category: 'System',
      icon: <Settings className="w-5 h-5 text-game-muted" />,
      action: () => { onNavigate('settings'); onClose(); }
    },
    {
      id: 'action-logout',
      title: 'Log Out',
      description: 'Sign out of the current administrative session.',
      category: 'System',
      icon: <LogOut className="w-5 h-5 text-game-danger" />,
      action: () => { onLogout(); onClose(); }
    }
  ];

  // Filter commands based on search term
  const filteredCommands = commands.filter(
    cmd =>
      cmd.title.toLowerCase().includes(search.toLowerCase()) ||
      cmd.description.toLowerCase().includes(search.toLowerCase()) ||
      cmd.category.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard shortcut listener for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
          }
        } else if (e.key === 'Escape') {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  // Close palette on outer click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-slate-950/80 backdrop-blur-sm cursor-default"
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            ref={containerRef}
            className="w-full max-w-xl overflow-hidden rounded-xl border border-slate-800 bg-[#141B34]/95 shadow-2xl shadow-black/80"
          >
            {/* Header / Search Input */}
            <div className="flex items-center px-4 py-3 border-b border-slate-800">
              <Search className="w-5 h-5 text-slate-500 mr-3" />
              <input
                ref={inputRef}
                type="text"
                className="w-full bg-transparent border-0 text-white placeholder-slate-500 focus:outline-none focus:ring-0 text-[15px]"
                placeholder="Search commands, pages, or actions..."
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setSelectedIndex(0);
                }}
              />
              <button
                onClick={onClose}
                className="p-1 rounded-md text-slate-500 hover:text-white hover:bg-slate-800/50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Commands List */}
            <div className="max-h-[350px] overflow-y-auto py-2">
              {filteredCommands.length === 0 ? (
                <div className="px-4 py-8 text-center text-slate-500">
                  No commands matched "{search}"
                </div>
              ) : (
                Object.entries(
                  filteredCommands.reduce((groups, item) => {
                    if (!groups[item.category]) groups[item.category] = [];
                    groups[item.category].push(item);
                    return groups;
                  }, {} as { [key: string]: CommandItem[] })
                ).map(([category, items]) => (
                  <div key={category}>
                    {/* Category Header */}
                    <div className="px-4 py-1.5 text-[11px] font-bold text-slate-500 tracking-wider uppercase bg-slate-900/20">
                      {category}
                    </div>
                    {/* Category Items */}
                    {items.map(item => {
                      const globalIndex = filteredCommands.findIndex(c => c.id === item.id);
                      const isSelected = globalIndex === selectedIndex;
                      
                      return (
                        <div
                          key={item.id}
                          onClick={item.action}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                          className={`flex items-center px-4 py-3 cursor-pointer transition-colors duration-150 ${
                            isSelected
                              ? 'bg-slate-800/60 border-l-2 border-game-primary'
                              : 'border-l-2 border-transparent hover:bg-slate-900/40'
                          }`}
                        >
                          <div className="mr-3">{item.icon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[14px] font-medium text-white">
                              {item.title}
                            </div>
                            <div className="text-[12px] text-slate-400 truncate">
                              {item.description}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="text-[10px] bg-slate-900 border border-slate-700 text-game-primary px-1.5 py-0.5 rounded font-mono">
                              ENTER
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center px-4 py-2 border-t border-slate-800 bg-[#0B1020]/50 text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <span>Navigate:</span>
                <span className="px-1.5 py-0.5 bg-slate-900 rounded font-mono">↑↓</span>
                <span>Select:</span>
                <span className="px-1.5 py-0.5 bg-slate-900 rounded font-mono">⏎</span>
              </div>
              <div>
                <span>Press</span>
                <span className="px-1.5 py-0.5 ml-1 bg-slate-900 rounded font-mono">ESC</span>
                <span className="ml-1">to close</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
