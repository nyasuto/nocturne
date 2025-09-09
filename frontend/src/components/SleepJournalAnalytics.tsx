'use client';

import { useState, useMemo } from 'react';
import { Calendar, TrendingUp, Clock, Star, Moon, BarChart3, ArrowUp, ArrowDown, Target, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SleepScoreBadge } from './SleepScoreVisualization';
import { cn } from '@/lib/utils';

interface SleepSession {
  id: string;
  date: string;
  duration_minutes: number;
  sleep_quality_rating: number;
  fall_asleep_time_minutes: number;
  wake_up_feeling: 'refreshed' | 'tired' | 'normal';
  playlist_used?: string;
  music_effectiveness?: number;
  notes?: string;
}

interface SleepTrend {
  period: string;
  avg_duration: number;
  avg_quality: number;
  avg_fall_asleep_time: number;
  sessions_count: number;
}

interface SleepInsight {
  type: 'improvement' | 'concern' | 'achievement' | 'recommendation';
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  data?: number | string;
}

// Mock data for Phase 2 demonstration
const mockSleepSessions: SleepSession[] = [
  {
    id: '1',
    date: '2025-01-08',
    duration_minutes: 450,
    sleep_quality_rating: 8,
    fall_asleep_time_minutes: 12,
    wake_up_feeling: 'refreshed',
    playlist_used: '深い眠りのための夜想曲',
    music_effectiveness: 9,
    notes: 'とてもリラックスできた'
  },
  {
    id: '2', 
    date: '2025-01-07',
    duration_minutes: 420,
    sleep_quality_rating: 7,
    fall_asleep_time_minutes: 18,
    wake_up_feeling: 'normal',
    playlist_used: '雨音とピアノ',
    music_effectiveness: 7
  },
  {
    id: '3',
    date: '2025-01-06',
    duration_minutes: 390,
    sleep_quality_rating: 6,
    fall_asleep_time_minutes: 25,
    wake_up_feeling: 'tired',
    playlist_used: '自然の音',
    music_effectiveness: 6,
    notes: 'なかなか眠れなかった'
  },
  {
    id: '4',
    date: '2025-01-05',
    duration_minutes: 480,
    sleep_quality_rating: 9,
    fall_asleep_time_minutes: 8,
    wake_up_feeling: 'refreshed',
    playlist_used: '深い眠りのための夜想曲',
    music_effectiveness: 9,
    notes: '最高の睡眠だった'
  },
  {
    id: '5',
    date: '2025-01-04',
    duration_minutes: 405,
    sleep_quality_rating: 7,
    fall_asleep_time_minutes: 15,
    wake_up_feeling: 'normal',
    playlist_used: 'アンビエント・ドリームス',
    music_effectiveness: 8
  }
];

const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}時間${mins}分`;
};

const getWakeUpFeelingEmoji = (feeling: string): string => {
  switch (feeling) {
    case 'refreshed': return '😊';
    case 'tired': return '😴';
    default: return '😐';
  }
};

const getTrendChange = (current: number, previous: number): { change: number; isPositive: boolean } => {
  const change = ((current - previous) / previous) * 100;
  return { change: Math.abs(change), isPositive: change > 0 };
};

export function SleepJournalAnalytics() {
  const [timeRange, setTimeRange] = useState('7days');
  const [activeTab, setActiveTab] = useState('overview');

  const filteredSessions = useMemo(() => {
    const days = timeRange === '7days' ? 7 : timeRange === '30days' ? 30 : 90;
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return mockSleepSessions.filter(session => new Date(session.date) >= cutoffDate);
  }, [timeRange]);

  const analytics = useMemo(() => {
    if (filteredSessions.length === 0) {
      return {
        avgDuration: 0,
        avgQuality: 0,
        avgFallAsleepTime: 0,
        totalSessions: 0,
        bestStreak: 0,
        mostEffectivePlaylist: null
      };
    }

    const avgDuration = filteredSessions.reduce((sum, s) => sum + s.duration_minutes, 0) / filteredSessions.length;
    const avgQuality = filteredSessions.reduce((sum, s) => sum + s.sleep_quality_rating, 0) / filteredSessions.length;
    const avgFallAsleepTime = filteredSessions.reduce((sum, s) => sum + s.fall_asleep_time_minutes, 0) / filteredSessions.length;
    
    // Find most effective playlist
    const playlistEffectiveness: Record<string, { total: number; count: number }> = {};
    filteredSessions.forEach(session => {
      if (session.playlist_used && session.music_effectiveness) {
        if (!playlistEffectiveness[session.playlist_used]) {
          playlistEffectiveness[session.playlist_used] = { total: 0, count: 0 };
        }
        playlistEffectiveness[session.playlist_used].total += session.music_effectiveness;
        playlistEffectiveness[session.playlist_used].count += 1;
      }
    });

    let mostEffectivePlaylist = null;
    let highestEffectiveness = 0;
    Object.entries(playlistEffectiveness).forEach(([playlist, data]) => {
      const avg = data.total / data.count;
      if (avg > highestEffectiveness) {
        highestEffectiveness = avg;
        mostEffectivePlaylist = { name: playlist, effectiveness: avg };
      }
    });

    return {
      avgDuration,
      avgQuality,
      avgFallAsleepTime,
      totalSessions: filteredSessions.length,
      bestStreak: 3, // Mock streak data
      mostEffectivePlaylist
    };
  }, [filteredSessions]);

  const insights = useMemo((): SleepInsight[] => {
    const insights: SleepInsight[] = [];

    // Quality improvement insight
    if (analytics.avgQuality >= 8) {
      insights.push({
        type: 'achievement',
        title: '素晴らしい睡眠品質',
        description: `平均睡眠品質が${analytics.avgQuality.toFixed(1)}/10と高い水準を維持しています`,
        icon: Star,
        data: analytics.avgQuality.toFixed(1)
      });
    } else if (analytics.avgQuality < 6) {
      insights.push({
        type: 'concern',
        title: '睡眠品質の改善が必要',
        description: '睡眠品質が平均を下回っています。リラックス時間を増やしてみましょう',
        icon: Target,
        data: analytics.avgQuality.toFixed(1)
      });
    }

    // Fall asleep time insight
    if (analytics.avgFallAsleepTime <= 15) {
      insights.push({
        type: 'achievement',
        title: '入眠時間が理想的',
        description: `平均${analytics.avgFallAsleepTime.toFixed(0)}分で眠りにつけています`,
        icon: Clock,
        data: `${analytics.avgFallAsleepTime.toFixed(0)}分`
      });
    } else if (analytics.avgFallAsleepTime > 20) {
      insights.push({
        type: 'recommendation',
        title: '入眠時間の短縮を推奨',
        description: 'より穏やかな音楽や瞑想音楽を試してみることをお勧めします',
        icon: Lightbulb,
        data: `${analytics.avgFallAsleepTime.toFixed(0)}分`
      });
    }

    // Duration insight
    if (analytics.avgDuration >= 420) { // 7+ hours
      insights.push({
        type: 'achievement',
        title: '十分な睡眠時間',
        description: `平均${formatDuration(analytics.avgDuration)}の良質な睡眠を確保しています`,
        icon: Moon,
        data: formatDuration(analytics.avgDuration)
      });
    } else if (analytics.avgDuration < 360) { // <6 hours
      insights.push({
        type: 'concern',
        title: '睡眠時間が不足',
        description: 'より多くの睡眠時間を確保することを推奨します',
        icon: Clock,
        data: formatDuration(analytics.avgDuration)
      });
    }

    // Playlist effectiveness insight
    if (analytics.mostEffectivePlaylist) {
      insights.push({
        type: 'improvement',
        title: '効果的なプレイリスト発見',
        description: `「${analytics.mostEffectivePlaylist.name}」が最も効果的です`,
        icon: TrendingUp,
        data: `効果度 ${analytics.mostEffectivePlaylist.effectiveness.toFixed(1)}/10`
      });
    }

    return insights;
  }, [analytics]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-nocturne-dream" />
            睡眠ジャーナル
          </h1>
          <p className="text-muted-foreground mt-1">
            あなたの睡眠パターンを分析し、より良い眠りのための洞察を提供します
          </p>
        </div>

        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7days">過去7日間</SelectItem>
            <SelectItem value="30days">過去30日間</SelectItem>
            <SelectItem value="90days">過去90日間</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">平均睡眠時間</p>
                <p className="text-2xl font-bold">{formatDuration(analytics.avgDuration)}</p>
              </div>
              <Clock className="w-8 h-8 text-nocturne-dream" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">平均睡眠品質</p>
                <div className="flex items-center gap-2 mt-1">
                  <SleepScoreBadge score={analytics.avgQuality * 10} size="sm" />
                  <span className="text-2xl font-bold">{analytics.avgQuality.toFixed(1)}</span>
                </div>
              </div>
              <Star className="w-8 h-8 text-nocturne-star" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">平均入眠時間</p>
                <p className="text-2xl font-bold">{analytics.avgFallAsleepTime.toFixed(0)}分</p>
              </div>
              <Moon className="w-8 h-8 text-nocturne-moon" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">セッション数</p>
                <p className="text-2xl font-bold">{analytics.totalSessions}</p>
              </div>
              <Calendar className="w-8 h-8 text-nocturne-deep" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">概要</TabsTrigger>
          <TabsTrigger value="insights">洞察</TabsTrigger>
          <TabsTrigger value="history">履歴</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Insights Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {insights.slice(0, 4).map((insight, index) => (
              <Card key={index} className={cn(
                'border-l-4',
                insight.type === 'achievement' && 'border-l-green-500',
                insight.type === 'improvement' && 'border-l-blue-500',
                insight.type === 'concern' && 'border-l-red-500',
                insight.type === 'recommendation' && 'border-l-yellow-500'
              )}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'p-2 rounded-lg',
                      insight.type === 'achievement' && 'bg-green-100 text-green-600',
                      insight.type === 'improvement' && 'bg-blue-100 text-blue-600',
                      insight.type === 'concern' && 'bg-red-100 text-red-600',
                      insight.type === 'recommendation' && 'bg-yellow-100 text-yellow-600'
                    )}>
                      <insight.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm mb-1">{insight.title}</h3>
                      <p className="text-xs text-muted-foreground mb-2">{insight.description}</p>
                      {insight.data && (
                        <p className="text-sm font-medium text-nocturne-dream">{insight.data}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Most Effective Playlist */}
          {analytics.mostEffectivePlaylist && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  最も効果的な音楽
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div>
                    <h3 className="font-semibold">{analytics.mostEffectivePlaylist.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      効果度 {analytics.mostEffectivePlaylist.effectiveness.toFixed(1)}/10
                    </p>
                  </div>
                  <SleepScoreBadge score={analytics.mostEffectivePlaylist.effectiveness * 10} size="md" />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          <div className="space-y-4">
            {insights.map((insight, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      'p-3 rounded-full',
                      insight.type === 'achievement' && 'bg-green-100 text-green-600',
                      insight.type === 'improvement' && 'bg-blue-100 text-blue-600',
                      insight.type === 'concern' && 'bg-red-100 text-red-600',
                      insight.type === 'recommendation' && 'bg-yellow-100 text-yellow-600'
                    )}>
                      <insight.icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2">{insight.title}</h3>
                      <p className="text-muted-foreground mb-3">{insight.description}</p>
                      {insight.data && (
                        <div className="inline-flex items-center px-3 py-1 bg-nocturne-dream/10 text-nocturne-dream rounded-full text-sm font-medium">
                          {insight.data}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>睡眠履歴</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredSessions.map((session) => (
                  <div key={session.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-muted-foreground" />
                        <span className="font-medium">
                          {new Date(session.date).toLocaleDateString('ja-JP', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <SleepScoreBadge score={session.sleep_quality_rating * 10} size="sm" />
                        <span className="text-sm text-muted-foreground">
                          {formatDuration(session.duration_minutes)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">睡眠品質</p>
                        <p className="font-medium">{session.sleep_quality_rating}/10</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">入眠時間</p>
                        <p className="font-medium">{session.fall_asleep_time_minutes}分</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">起床時の気分</p>
                        <p className="font-medium">
                          {getWakeUpFeelingEmoji(session.wake_up_feeling)} 
                          {session.wake_up_feeling === 'refreshed' ? '爽快' :
                           session.wake_up_feeling === 'tired' ? '疲労' : '普通'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">音楽効果</p>
                        <p className="font-medium">
                          {session.music_effectiveness ? `${session.music_effectiveness}/10` : '-'}
                        </p>
                      </div>
                    </div>

                    {session.playlist_used && (
                      <div className="mb-2">
                        <p className="text-xs text-muted-foreground mb-1">使用プレイリスト</p>
                        <p className="text-sm font-medium text-nocturne-dream">{session.playlist_used}</p>
                      </div>
                    )}

                    {session.notes && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">メモ</p>
                        <p className="text-sm text-muted-foreground italic">"{session.notes}"</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}