'use client';

import { useState } from 'react';
import { Play, Clock, Star, TrendingUp, Moon, Calendar, Pause } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SleepScoreBadge, SleepScoreBar } from './SleepScoreVisualization';
import { cn } from '@/lib/utils';

interface TonightPlaylist {
  id: string;
  title: string;
  thumbnail_url: string;
  track_count: number;
  total_duration_minutes: number;
  average_sleep_score: number;
  tracks: Array<{
    title: string;
    artist: string;
    sleep_score: number;
    duration: number;
  }>;
}

interface SleepMetrics {
  last_night: {
    sleep_duration_hours: number;
    sleep_quality_rating: number;
    fall_asleep_time_minutes: number;
    wake_up_feeling: 'refreshed' | 'tired' | 'normal';
  };
  weekly_average: {
    sleep_duration_hours: number;
    sleep_quality_rating: number;
  };
}

// Mock data - replace with real data from API
const mockTonightPlaylist: TonightPlaylist = {
  id: '1',
  title: '深い眠りのための夜想曲',
  thumbnail_url: '/api/placeholder/120/120',
  track_count: 12,
  total_duration_minutes: 45,
  average_sleep_score: 87,
  tracks: [
    { title: 'Rain on Glass', artist: 'Sleep Stories', sleep_score: 92, duration: 180 },
    { title: 'Forest Whispers', artist: 'Nature Sounds', sleep_score: 88, duration: 240 },
    { title: 'Gentle Piano', artist: 'Calm Music', sleep_score: 85, duration: 200 }
  ]
};

const mockSleepMetrics: SleepMetrics = {
  last_night: {
    sleep_duration_hours: 7.5,
    sleep_quality_rating: 8,
    fall_asleep_time_minutes: 12,
    wake_up_feeling: 'refreshed'
  },
  weekly_average: {
    sleep_duration_hours: 7.2,
    sleep_quality_rating: 7.8
  }
};

const contextChips = [
  { id: 'browse', label: 'Browse', icon: '🎵' },
  { id: 'create', label: 'Create', icon: '➕' },
  { id: 'search', label: 'Search', icon: '🔍' },
  { id: 'journal', label: 'Journal', icon: '📈' }
];

export function TonightDashboard() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedChip, setSelectedChip] = useState<string | null>(null);

  const handleStartSleep = () => {
    setIsPlaying(!isPlaying);
  };

  const getMoodColor = () => {
    const hour = new Date().getHours();
    if (hour >= 22 || hour < 6) return 'from-indigo-900 via-purple-900 to-pink-900';
    if (hour >= 18) return 'from-orange-900 via-red-900 to-purple-900';
    return 'from-blue-900 via-indigo-900 to-purple-900';
  };

  const formatSleepTime = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}時間${m}分`;
  };

  return (
    <div className="space-y-6">
      {/* Night Sky Header */}
      <div className={cn(
        'relative overflow-hidden rounded-2xl p-6 text-white',
        'bg-gradient-to-br', getMoodColor()
      )}>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Moon className="w-6 h-6" />
              <div>
                <p className="text-sm opacity-80">
                  {new Date().toLocaleDateString('ja-JP', { 
                    weekday: 'long',
                    month: 'long', 
                    day: 'numeric'
                  })}
                </p>
                <h1 className="text-2xl font-bold">今夜の睡眠</h1>
              </div>
            </div>
            <Button
              onClick={handleStartSleep}
              size="lg"
              className={cn(
                'rounded-full px-8 py-3 font-semibold transition-all shadow-lg',
                isPlaying
                  ? 'bg-nocturne-star/20 hover:bg-nocturne-star/30 text-white'
                  : 'bg-white/90 hover:bg-white text-gray-900 sleep-glow'
              )}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-5 h-5 mr-2" />
                  セッション終了
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  睡眠セッション開始
                </>
              )}
            </Button>
          </div>
        </div>
        
        {/* Decorative Stars */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-4 right-16 w-1 h-1 bg-white rounded-full animate-pulse" />
          <div className="absolute top-12 right-32 w-1.5 h-1.5 bg-white rounded-full animate-pulse delay-300" />
          <div className="absolute top-8 right-52 w-1 h-1 bg-white rounded-full animate-pulse delay-700" />
        </div>
      </div>

      {/* Main Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Tonight's Playlist Card */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>今夜のプレイリスト</span>
              <SleepScoreBadge score={mockTonightPlaylist.average_sleep_score} size="sm" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                <img
                  src={mockTonightPlaylist.thumbnail_url}
                  alt={mockTonightPlaylist.title}
                  className="w-full h-full object-cover rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <div className="hidden">
                  <Moon className="w-8 h-8 text-muted-foreground" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{mockTonightPlaylist.title}</h3>
                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                  <span>{mockTonightPlaylist.track_count}曲</span>
                  <span>{mockTonightPlaylist.total_duration_minutes}分</span>
                </div>
                <div className="mt-2">
                  <SleepScoreBar
                    scores={mockTonightPlaylist.tracks.map((track, i) => ({
                      time: track.duration,
                      score: track.sleep_score,
                      title: track.title
                    }))}
                    className="h-2"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1">
                <Play className="w-4 h-4 mr-1" />
                プレビュー
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                変更
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sleep Metrics Preview Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              睡眠メトリクス
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">昨夜の睡眠時間</span>
                <span className="font-semibold">
                  {formatSleepTime(mockSleepMetrics.last_night.sleep_duration_hours)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">睡眠品質</span>
                <div className="flex items-center gap-2">
                  <SleepScoreBadge 
                    score={mockSleepMetrics.last_night.sleep_quality_rating * 10} 
                    size="sm"
                    variant="inline" 
                  />
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">入眠時間</span>
                <span className="font-semibold">
                  {mockSleepMetrics.last_night.fall_asleep_time_minutes}分
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">起床時の気分</span>
                <span className="font-semibold">
                  {mockSleepMetrics.last_night.wake_up_feeling === 'refreshed' ? '😊 爽快' :
                   mockSleepMetrics.last_night.wake_up_feeling === 'tired' ? '😴 疲労' : '😐 普通'}
                </span>
              </div>
            </div>
            
            <Button variant="outline" size="sm" className="w-full">
              <Calendar className="w-4 h-4 mr-2" />
              詳細な分析を見る
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Context Panel */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-center gap-2">
            {contextChips.map((chip) => (
              <button
                key={chip.id}
                onClick={() => setSelectedChip(selectedChip === chip.id ? null : chip.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all',
                  selectedChip === chip.id
                    ? 'bg-nocturne-dream/20 text-nocturne-dream border-2 border-nocturne-dream/30'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                )}
              >
                <span>{chip.icon}</span>
                {chip.label}
              </button>
            ))}
          </div>
          
          {selectedChip && (
            <div className="mt-4 p-4 bg-muted/30 rounded-lg text-center text-muted-foreground">
              {selectedChip === 'browse' && 'プレイリストとトラックを探索'}
              {selectedChip === 'create' && '新しい睡眠プレイリストを作成'}
              {selectedChip === 'search' && '楽曲とアーティストを検索'}
              {selectedChip === 'journal' && '睡眠履歴と分析を確認'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}