import React, { useEffect, useState } from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  icon: LucideIcon;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  prefix = '',
  suffix = '',
  icon: Icon,
  color,
  trend,
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  // Animated Counter Effect
  useEffect(() => {
    let start = 0;
    const end = value;
    if (end === 0) {
      setDisplayValue(0);
      return;
    }
    
    // Duration in ms
    const duration = 800;
    const incrementTime = Math.max(Math.floor(duration / end), 15);
    
    const timer = setInterval(() => {
      start += Math.ceil(end / 40); // Increment chunk size
      if (start >= end) {
        clearInterval(timer);
        setDisplayValue(end);
      } else {
        setDisplayValue(start);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value]);

  const colorClasses = {
    primary: {
      iconBg: 'bg-blue-500/10 border-blue-500/20 text-game-primary',
      border: 'hover:border-game-primary/30',
      glow: 'shadow-neon-primary'
    },
    secondary: {
      iconBg: 'bg-purple-500/10 border-purple-500/20 text-game-secondary',
      border: 'hover:border-game-secondary/30',
      glow: 'shadow-neon-secondary'
    },
    success: {
      iconBg: 'bg-green-500/10 border-green-500/20 text-game-success',
      border: 'hover:border-game-success/30',
      glow: 'shadow-neon-success'
    },
    warning: {
      iconBg: 'bg-yellow-500/10 border-yellow-500/20 text-game-warning',
      border: 'hover:border-game-warning/30',
      glow: ''
    },
    danger: {
      iconBg: 'bg-red-500/10 border-red-500/20 text-game-danger',
      border: 'hover:border-game-danger/30',
      glow: 'shadow-neon-danger'
    }
  };

  const selectedColor = colorClasses[color];

  return (
    <div className={`glass-panel rounded-xl p-5 border border-slate-800/80 transition-all duration-300 ${selectedColor.border} hover:shadow-lg`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-game-muted uppercase tracking-wider">
            {title}
          </p>
          <h3 className="text-3xl font-extrabold text-white mt-1.5 tracking-tight font-mono">
            {prefix}
            {displayValue.toLocaleString('en-IN')}
            {suffix}
          </h3>
        </div>
        <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${selectedColor.iconBg}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>

      {trend && (
        <div className="flex items-center gap-1.5 mt-4">
          <span className={`text-xs font-bold ${trend.isPositive ? 'text-game-success' : 'text-game-danger'}`}>
            {trend.isPositive ? '+' : '-'}{trend.value}%
          </span>
          <span className="text-[10px] text-game-muted font-medium">
            vs previous month
          </span>
        </div>
      )}
    </div>
  );
};
