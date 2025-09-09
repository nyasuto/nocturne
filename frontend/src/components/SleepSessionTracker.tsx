'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Clock, Moon, Star, Heart, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface SleepSession {
  id: string;
  playlist_id?: string;
  started_at: string;
  ended_at?: string;
  duration_minutes?: number;
  sleep_quality_rating?: number;
  fall_asleep_time_minutes?: number;
  wake_up_feeling?: 'refreshed' | 'tired' | 'normal';
  notes?: string;
}

interface SleepSessionTrackerProps {
  playlistId?: string;
  onSessionStart?: (sessionId: string) => void;
  onSessionEnd?: (session: SleepSession) => void;
}

const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const getTimeOfDayMessage = () => {
  const hour = new Date().getHours();
  if (hour >= 22 || hour < 6) {
    return { message: 'おやすみなさい 🌙', color: 'text-blue-400' };
  } else if (hour >= 18) {
    return { message: 'リラックスタイムですね 🌅', color: 'text-orange-400' };
  }
  return { message: 'リラックスしましょう ✨', color: 'text-green-400' };
};

export function SleepSessionTracker({
  playlistId,
  onSessionStart,
  onSessionEnd
}: SleepSessionTrackerProps) {
  const [sessionState, setSessionState] = useState<'idle' | 'active' | 'paused'>('idle');
  const [currentSession, setCurrentSession] = useState<SleepSession | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showEndModal, setShowEndModal] = useState(false);
  const [feedbackData, setFeedbackData] = useState({
    sleep_quality_rating: 7,
    fall_asleep_time_minutes: 15,
    wake_up_feeling: 'normal' as const,
    notes: ''
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const pausedTimeRef = useRef<number>(0);

  const timeMessage = getTimeOfDayMessage();

  useEffect(() => {
    if (sessionState === 'active' && intervalRef.current === null) {
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const now = new Date();
          const elapsed = Math.floor((now.getTime() - startTimeRef.current.getTime()) / 1000) - pausedTimeRef.current;
          setElapsedTime(elapsed);
        }
      }, 1000);
    } else if (sessionState !== 'active' && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [sessionState]);

  const handleStartSession = async () => {
    const session: SleepSession = {
      id: `session_${Date.now()}`,
      playlist_id: playlistId,
      started_at: new Date().toISOString()
    };

    setCurrentSession(session);
    setSessionState('active');
    setElapsedTime(0);
    startTimeRef.current = new Date();
    pausedTimeRef.current = 0;
    onSessionStart?.(session.id);
  };

  const handlePauseResume = () => {
    if (sessionState === 'active') {
      setSessionState('paused');
      pausedTimeRef.current = elapsedTime;
    } else if (sessionState === 'paused') {
      setSessionState('active');
      startTimeRef.current = new Date(Date.now() - elapsedTime * 1000);
      pausedTimeRef.current = 0;
    }
  };

  const handleStopSession = () => {
    if (currentSession) {
      setShowEndModal(true);
    }
  };

  const handleEndSession = async () => {
    if (!currentSession) return;

    const endedSession: SleepSession = {
      ...currentSession,
      ended_at: new Date().toISOString(),
      duration_minutes: Math.round(elapsedTime / 60),
      ...feedbackData
    };

    setSessionState('idle');
    setCurrentSession(null);
    setElapsedTime(0);
    setShowEndModal(false);
    
    // Reset feedback data
    setFeedbackData({
      sleep_quality_rating: 7,
      fall_asleep_time_minutes: 15,
      wake_up_feeling: 'normal',
      notes: ''
    });

    onSessionEnd?.(endedSession);
  };

  const handleCancelEndSession = () => {
    setShowEndModal(false);
  };

  if (sessionState === 'idle') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="text-center p-8">
          <div className="mb-6">
            <Moon className="w-16 h-16 mx-auto mb-4 text-nocturne-star" />
            <p className={cn('text-lg font-medium mb-2', timeMessage.color)}>
              {timeMessage.message}
            </p>
            <p className="text-muted-foreground text-sm">
              睡眠セッションを開始して、リラックスした時間を追跡しましょう
            </p>
          </div>

          <Button 
            onClick={handleStartSession}
            size="lg"
            className="w-full bg-nocturne-dream hover:bg-nocturne-dream/90 text-white"
          >
            <Play className="w-5 h-5 mr-2" />
            睡眠セッション開始
          </Button>

          <p className="text-xs text-muted-foreground mt-4">
            セッション中は睡眠の質と時間を自動で記録します
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center gap-2">
              <div className={cn(
                'w-3 h-3 rounded-full animate-pulse',
                sessionState === 'active' ? 'bg-green-500' : 'bg-yellow-500'
              )} />
              睡眠セッション
            </div>
            <span className="text-sm text-muted-foreground">
              {sessionState === 'active' ? '進行中' : '一時停止'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Timer Display */}
          <div className="text-center">
            <div className="text-4xl font-mono font-bold text-nocturne-star mb-2">
              {formatTime(elapsedTime)}
            </div>
            <p className="text-sm text-muted-foreground">
              {currentSession?.started_at && (
                <>開始時刻: {new Date(currentSession.started_at).toLocaleTimeString('ja-JP')}</>
              )}
            </p>
          </div>

          {/* Session Stats */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <Clock className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">経過時間</p>
              <p className="font-medium">{Math.round(elapsedTime / 60)}分</p>
            </div>
            <div>
              <Heart className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">リラックス</p>
              <p className="font-medium">
                {sessionState === 'active' ? '進行中' : '一時停止'}
              </p>
            </div>
            <div>
              <BarChart3 className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">睡眠モード</p>
              <p className="font-medium">ON</p>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handlePauseResume}
              variant="outline"
              size="lg"
              className="flex-1"
            >
              {sessionState === 'active' ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  一時停止
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  再開
                </>
              )}
            </Button>
            <Button
              onClick={handleStopSession}
              variant="destructive"
              size="lg"
              className="flex-1"
            >
              <Square className="w-4 h-4 mr-2" />
              セッション終了
            </Button>
          </div>

          {/* Tips */}
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-xs text-muted-foreground text-center">
              💡 セッション終了時に睡眠の質や感想をフィードバックできます
            </p>
          </div>
        </CardContent>
      </Card>

      {/* End Session Modal */}
      <Dialog open={showEndModal} onOpenChange={setShowEndModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-5 h-5" />
              睡眠セッション終了
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="text-center">
              <p className="text-2xl font-bold mb-1">{formatTime(elapsedTime)}</p>
              <p className="text-muted-foreground text-sm">セッション時間</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="sleep-quality">
                  睡眠の質はいかがでしたか？ ({feedbackData.sleep_quality_rating}/10)
                </Label>
                <Slider
                  id="sleep-quality"
                  value={[feedbackData.sleep_quality_rating]}
                  onValueChange={([value]) => 
                    setFeedbackData(prev => ({ ...prev, sleep_quality_rating: value }))
                  }
                  min={1}
                  max={10}
                  step={1}
                  className="mt-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>悪い</span>
                  <span>とても良い</span>
                </div>
              </div>

              <div>
                <Label htmlFor="fall-asleep-time">
                  眠りにつくまでの時間（分）
                </Label>
                <Slider
                  id="fall-asleep-time"
                  value={[feedbackData.fall_asleep_time_minutes]}
                  onValueChange={([value]) => 
                    setFeedbackData(prev => ({ ...prev, fall_asleep_time_minutes: value }))
                  }
                  min={1}
                  max={60}
                  step={1}
                  className="mt-2"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {feedbackData.fall_asleep_time_minutes}分
                </p>
              </div>

              <div>
                <Label htmlFor="wake-feeling">起床時の気分</Label>
                <Select 
                  value={feedbackData.wake_up_feeling} 
                  onValueChange={(value: 'refreshed' | 'tired' | 'normal') => 
                    setFeedbackData(prev => ({ ...prev, wake_up_feeling: value }))
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="refreshed">😊 爽快・リフレッシュ</SelectItem>
                    <SelectItem value="normal">😐 普通</SelectItem>
                    <SelectItem value="tired">😴 疲労・まだ眠い</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">メモ・感想（任意）</Label>
                <Textarea
                  id="notes"
                  placeholder="今日の睡眠について気づいたことがあれば..."
                  value={feedbackData.notes}
                  onChange={(e) => 
                    setFeedbackData(prev => ({ ...prev, notes: e.target.value }))
                  }
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCancelEndSession}
                className="flex-1"
              >
                キャンセル
              </Button>
              <Button
                onClick={handleEndSession}
                className="flex-1 bg-nocturne-dream hover:bg-nocturne-dream/90"
              >
                記録を保存
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}