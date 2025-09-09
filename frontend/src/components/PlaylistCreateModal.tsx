'use client';

import { useState, useEffect } from 'react';
import { Plus, X, Music, Clock, Star, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { SleepScoreBadge } from './SleepScoreVisualization';
import { cn } from '@/lib/utils';

interface Track {
  id: string;
  title: string;
  artist: string;
  thumbnail_url?: string;
  sleep_score: number;
  duration_seconds: number;
  youtube_url: string;
}

interface PlaylistCreateData {
  title: string;
  description: string;
  target_duration_minutes: number;
  sleep_goal: string;
  tracks: Track[];
}

interface PlaylistCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlaylistCreate: (playlistData: PlaylistCreateData) => Promise<void>;
}

const SLEEP_GOALS = [
  { value: 'fall_asleep', label: '入眠サポート', description: '眠りにつくのを手助けする' },
  { value: 'deep_sleep', label: '深い睡眠', description: '深いリラックスと回復睡眠' },
  { value: 'relaxation', label: 'リラクゼーション', description: 'ストレス解消とリラックス' },
  { value: 'meditation', label: '瞑想・集中', description: '瞑想や集中力向上' },
  { value: 'background', label: 'バックグラウンド', description: '作業中の背景音楽' }
];

// Mock tracks for demonstration
const MOCK_TRACKS: Track[] = [
  {
    id: 'track1',
    title: 'Rain on Glass - 3 Hours',
    artist: 'Nature Sounds',
    thumbnail_url: '/api/placeholder/120/120',
    sleep_score: 95,
    duration_seconds: 10800,
    youtube_url: 'https://youtube.com/watch?v=track1'
  },
  {
    id: 'track2', 
    title: 'Peaceful Piano',
    artist: 'Calm Music',
    thumbnail_url: '/api/placeholder/120/120',
    sleep_score: 88,
    duration_seconds: 2400,
    youtube_url: 'https://youtube.com/watch?v=track2'
  },
  {
    id: 'track3',
    title: 'Forest Whispers',
    artist: 'Sleep Stories',
    thumbnail_url: '/api/placeholder/120/120', 
    sleep_score: 92,
    duration_seconds: 1800,
    youtube_url: 'https://youtube.com/watch?v=track3'
  },
  {
    id: 'track4',
    title: 'Ocean Waves',
    artist: 'Natural Sounds',
    thumbnail_url: '/api/placeholder/120/120',
    sleep_score: 90,
    duration_seconds: 3600,
    youtube_url: 'https://youtube.com/watch?v=track4'
  },
  {
    id: 'track5',
    title: 'Ambient Dreams',
    artist: 'Meditation Music',
    thumbnail_url: '/api/placeholder/120/120',
    sleep_score: 85,
    duration_seconds: 2700,
    youtube_url: 'https://youtube.com/watch?v=track5'
  }
];

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}時間${minutes}分`;
  }
  return `${minutes}分`;
};

export function PlaylistCreateModal({
  isOpen,
  onClose,
  onPlaylistCreate
}: PlaylistCreateModalProps) {
  const [step, setStep] = useState<'info' | 'tracks' | 'review'>('info');
  const [playlistData, setPlaylistData] = useState<PlaylistCreateData>({
    title: '',
    description: '',
    target_duration_minutes: 45,
    sleep_goal: 'fall_asleep',
    tracks: []
  });
  const [availableTracks, setAvailableTracks] = useState<Track[]>(MOCK_TRACKS);
  const [searchQuery, setSearchQuery] = useState('');
  const [minSleepScore, setMinSleepScore] = useState(70);
  const [isCreating, setIsCreating] = useState(false);

  const filteredTracks = availableTracks.filter(track =>
    track.sleep_score >= minSleepScore &&
    (searchQuery === '' || 
     track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
     track.artist.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalDuration = playlistData.tracks.reduce(
    (sum, track) => sum + track.duration_seconds,
    0
  );
  const avgSleepScore = playlistData.tracks.length > 0
    ? playlistData.tracks.reduce((sum, track) => sum + track.sleep_score, 0) / playlistData.tracks.length
    : 0;

  const handleAddTrack = (track: Track) => {
    if (!playlistData.tracks.find(t => t.id === track.id)) {
      setPlaylistData(prev => ({
        ...prev,
        tracks: [...prev.tracks, track]
      }));
    }
  };

  const handleRemoveTrack = (trackId: string) => {
    setPlaylistData(prev => ({
      ...prev,
      tracks: prev.tracks.filter(t => t.id !== trackId)
    }));
  };

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      await onPlaylistCreate(playlistData);
      setStep('info');
      setPlaylistData({
        title: '',
        description: '',
        target_duration_minutes: 45,
        sleep_goal: 'fall_asleep',
        tracks: []
      });
      onClose();
    } catch (error) {
      console.error('Failed to create playlist:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const canProceedToTracks = playlistData.title.trim() !== '';
  const canProceedToReview = playlistData.tracks.length > 0;
  const targetDurationMillis = playlistData.target_duration_minutes * 60 * 1000;
  const durationMatch = Math.abs(totalDuration * 1000 - targetDurationMillis) / targetDurationMillis;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="w-5 h-5" />
            睡眠プレイリストを作成
          </DialogTitle>
        </DialogHeader>

        {/* Steps Indicator */}
        <div className="flex items-center justify-between mb-6 px-4">
          <div className="flex items-center gap-4">
            {[
              { id: 'info', label: '基本情報', icon: '1' },
              { id: 'tracks', label: '楽曲選択', icon: '2' },
              { id: 'review', label: '確認・作成', icon: '3' }
            ].map((stepInfo, index) => (
              <div key={stepInfo.id} className="flex items-center gap-2">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  step === stepInfo.id
                    ? 'bg-primary text-primary-foreground'
                    : index < ['info', 'tracks', 'review'].indexOf(step)
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                )}>
                  {stepInfo.icon}
                </div>
                <span className={cn(
                  'text-sm font-medium transition-colors',
                  step === stepInfo.id ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {stepInfo.label}
                </span>
                {index < 2 && (
                  <ChevronRight className="w-4 h-4 text-muted-foreground ml-2" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Step 1: Basic Information */}
          {step === 'info' && (
            <div className="space-y-6 p-6">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="title">プレイリスト名 *</Label>
                  <Input
                    id="title"
                    placeholder="例: 深い眠りのための夜想曲"
                    value={playlistData.title}
                    onChange={(e) => setPlaylistData(prev => ({ ...prev, title: e.target.value }))}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="description">説明（任意）</Label>
                  <Textarea
                    id="description"
                    placeholder="このプレイリストの説明や使用場面を記入..."
                    value={playlistData.description}
                    onChange={(e) => setPlaylistData(prev => ({ ...prev, description: e.target.value }))}
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sleep-goal">睡眠目標</Label>
                    <Select 
                      value={playlistData.sleep_goal} 
                      onValueChange={(value) => setPlaylistData(prev => ({ ...prev, sleep_goal: value }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SLEEP_GOALS.map((goal) => (
                          <SelectItem key={goal.value} value={goal.value}>
                            <div>
                              <div className="font-medium">{goal.label}</div>
                              <div className="text-xs text-muted-foreground">{goal.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="duration">目標再生時間: {playlistData.target_duration_minutes}分</Label>
                    <Slider
                      value={[playlistData.target_duration_minutes]}
                      onValueChange={([value]) => setPlaylistData(prev => ({ ...prev, target_duration_minutes: value }))}
                      min={15}
                      max={180}
                      step={15}
                      className="mt-3"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>15分</span>
                      <span>3時間</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  キャンセル
                </Button>
                <Button 
                  onClick={() => setStep('tracks')} 
                  disabled={!canProceedToTracks}
                >
                  楽曲を選択
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Track Selection */}
          {step === 'tracks' && (
            <div className="space-y-4 p-6">
              {/* Search and Filter */}
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="楽曲名・アーティスト名で検索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1"
                  />
                  <Button variant="outline">
                    <Search className="w-4 h-4" />
                  </Button>
                </div>

                <div>
                  <Label>最小睡眠スコア: {minSleepScore}</Label>
                  <Slider
                    value={[minSleepScore]}
                    onValueChange={([value]) => setMinSleepScore(value)}
                    min={0}
                    max={100}
                    step={10}
                    className="mt-2"
                  />
                </div>
              </div>

              {/* Selected Tracks Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>選択済み楽曲 ({playlistData.tracks.length}曲)</span>
                    <div className="text-sm text-muted-foreground">
                      {formatDuration(totalDuration)} / {formatDuration(playlistData.target_duration_minutes * 60)}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {playlistData.tracks.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      楽曲を選択してください
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {playlistData.tracks.map((track) => (
                        <div key={track.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded">
                          <img 
                            src={track.thumbnail_url}
                            alt={track.title}
                            className="w-10 h-10 rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{track.title}</p>
                            <p className="text-xs text-muted-foreground">{track.artist}</p>
                          </div>
                          <SleepScoreBadge score={track.sleep_score} size="sm" />
                          <span className="text-xs text-muted-foreground">
                            {formatDuration(track.duration_seconds)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveTrack(track.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Available Tracks */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">利用可能な楽曲</CardTitle>
                </CardHeader>
                <CardContent className="max-h-[300px] overflow-y-auto">
                  <div className="space-y-2">
                    {filteredTracks.map((track) => {
                      const isSelected = playlistData.tracks.some(t => t.id === track.id);
                      return (
                        <div key={track.id} className={cn(
                          'flex items-center gap-3 p-3 border rounded hover:bg-muted/50 transition-colors',
                          isSelected && 'bg-primary/10 border-primary/30'
                        )}>
                          <img 
                            src={track.thumbnail_url}
                            alt={track.title}
                            className="w-12 h-12 rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{track.title}</p>
                            <p className="text-xs text-muted-foreground">{track.artist}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDuration(track.duration_seconds)}
                            </p>
                          </div>
                          <SleepScoreBadge score={track.sleep_score} size="sm" />
                          <Button
                            size="sm"
                            onClick={() => isSelected ? handleRemoveTrack(track.id) : handleAddTrack(track)}
                            variant={isSelected ? "secondary" : "default"}
                          >
                            {isSelected ? (
                              <>
                                <X className="w-4 h-4 mr-1" />
                                削除
                              </>
                            ) : (
                              <>
                                <Plus className="w-4 h-4 mr-1" />
                                追加
                              </>
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('info')}>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  戻る
                </Button>
                <Button 
                  onClick={() => setStep('review')} 
                  disabled={!canProceedToReview}
                >
                  確認・作成
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 'review' && (
            <div className="space-y-6 p-6">
              <Card>
                <CardHeader>
                  <CardTitle>プレイリスト概要</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">プレイリスト名</p>
                      <p className="font-medium">{playlistData.title}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">睡眠目標</p>
                      <p className="font-medium">
                        {SLEEP_GOALS.find(g => g.value === playlistData.sleep_goal)?.label}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">総再生時間</p>
                      <p className="font-medium">{formatDuration(totalDuration)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">平均睡眠スコア</p>
                      <div className="flex items-center gap-2">
                        <SleepScoreBadge score={avgSleepScore} size="sm" />
                        <span className="font-medium">{avgSleepScore.toFixed(0)}</span>
                      </div>
                    </div>
                  </div>

                  {playlistData.description && (
                    <div>
                      <p className="text-sm text-muted-foreground">説明</p>
                      <p className="text-sm">{playlistData.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>楽曲一覧 ({playlistData.tracks.length}曲)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {playlistData.tracks.map((track, index) => (
                      <div key={track.id} className="flex items-center gap-3 p-2 border rounded">
                        <span className="w-6 text-sm text-muted-foreground text-center">
                          {index + 1}
                        </span>
                        <img 
                          src={track.thumbnail_url}
                          alt={track.title}
                          className="w-10 h-10 rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{track.title}</p>
                          <p className="text-xs text-muted-foreground">{track.artist}</p>
                        </div>
                        <SleepScoreBadge score={track.sleep_score} size="sm" />
                        <span className="text-xs text-muted-foreground">
                          {formatDuration(track.duration_seconds)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('tracks')}>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  楽曲選択に戻る
                </Button>
                <Button 
                  onClick={handleCreate}
                  disabled={isCreating}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isCreating ? (
                    <>
                      <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                      作成中...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-1" />
                      プレイリストを作成
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}