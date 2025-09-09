'use client';

import { cn } from '@/lib/utils';

export interface SleepScoreProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'badge' | 'ring' | 'inline';
  showLabel?: boolean;
}

// Sleep Score Color Mapping (based on o3 suggestions)
export const getSleepScoreColor = (score: number) => {
  if (score >= 90) return {
    color: '#3F51B5', // Deep Blue "Dream" 
    bgColor: 'bg-blue-600',
    textColor: 'text-blue-600',
    bgLight: 'bg-blue-600/20',
    label: 'Dream'
  };
  if (score >= 70) return {
    color: '#009688', // Teal "Calm"
    bgColor: 'bg-teal-600', 
    textColor: 'text-teal-600',
    bgLight: 'bg-teal-600/20',
    label: 'Calm'
  };
  if (score >= 50) return {
    color: '#FFB74D', // Amber "Neutral"
    bgColor: 'bg-amber-500',
    textColor: 'text-amber-600',
    bgLight: 'bg-amber-500/20',
    label: 'Neutral'
  };
  return {
    color: '#EF5350', // Warm Red "Alerting"
    bgColor: 'bg-red-500',
    textColor: 'text-red-500',
    bgLight: 'bg-red-500/20',
    label: 'Alerting'
  };
};

export function SleepScoreBadge({ score, size = 'md', variant = 'badge', showLabel = false }: SleepScoreProps) {
  const scoreData = getSleepScoreColor(score);
  
  if (variant === 'inline') {
    return (
      <span className={cn(
        'inline-flex items-center gap-1 font-medium',
        scoreData.textColor,
        size === 'sm' && 'text-xs',
        size === 'md' && 'text-sm',
        size === 'lg' && 'text-base'
      )}>
        <div className={cn(
          'w-2 h-2 rounded-full',
          scoreData.bgColor
        )} />
        {Math.round(score)}
        {showLabel && <span className="text-muted-foreground ml-1">({scoreData.label})</span>}
      </span>
    );
  }
  
  if (variant === 'ring') {
    const circumference = 2 * Math.PI * 16; // r=16
    const strokeDasharray = `${(score / 100) * circumference} ${circumference}`;
    
    return (
      <div className={cn(
        'relative inline-flex items-center justify-center',
        size === 'sm' && 'w-10 h-10',
        size === 'md' && 'w-14 h-14', 
        size === 'lg' && 'w-20 h-20'
      )}>
        <svg className="transform -rotate-90" width="100%" height="100%" viewBox="0 0 40 40">
          <circle
            cx="20"
            cy="20"
            r="16"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            className="text-muted/20"
          />
          <circle
            cx="20"
            cy="20"
            r="16"
            stroke={scoreData.color}
            strokeWidth="2"
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeLinecap="round"
            className="transition-all duration-300"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn(
            'font-bold',
            scoreData.textColor,
            size === 'sm' && 'text-xs',
            size === 'md' && 'text-sm',
            size === 'lg' && 'text-lg'
          )}>
            {Math.round(score)}
          </span>
          {showLabel && size !== 'sm' && (
            <span className={cn(
              'text-muted-foreground leading-none',
              size === 'md' && 'text-xs',
              size === 'lg' && 'text-sm'
            )}>
              {scoreData.label}
            </span>
          )}
        </div>
      </div>
    );
  }
  
  // Badge variant (default)
  return (
    <div className={cn(
      'inline-flex items-center justify-center rounded-full font-medium',
      scoreData.bgLight,
      scoreData.textColor,
      size === 'sm' && 'w-8 h-8 text-xs',
      size === 'md' && 'w-10 h-10 text-sm', 
      size === 'lg' && 'w-12 h-12 text-base'
    )}>
      {Math.round(score)}
    </div>
  );
}

export function SleepScoreBar({ 
  scores, 
  className 
}: { 
  scores: Array<{ time: number; score: number; title?: string }>; 
  className?: string;
}) {
  const maxTime = Math.max(...scores.map(s => s.time));
  
  return (
    <div className={cn('w-full h-8 bg-muted/20 rounded-lg overflow-hidden', className)}>
      <div className="flex h-full">
        {scores.map((item, index) => {
          const scoreData = getSleepScoreColor(item.score);
          const width = (item.time / maxTime) * 100;
          
          return (
            <div
              key={index}
              className={cn('h-full transition-all duration-200 hover:opacity-80', scoreData.bgColor)}
              style={{ width: `${width}%` }}
              title={item.title ? `${item.title}: ${Math.round(item.score)}` : `Score: ${Math.round(item.score)}`}
            />
          );
        })}
      </div>
    </div>
  );
}