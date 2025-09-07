'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Square, Volume2, Timer, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { getAudioEngine, AudioSegment } from '@/lib/audio';
import type { JourneyDetail } from '@/lib/api';

interface JourneyPlayerProps {
  journey: JourneyDetail;
  onComplete?: () => void;
  onClose?: () => void;
}

const TIMER_OPTIONS = [10, 20, 30, 45, 60]; // minutes

export function JourneyPlayer({ journey, onComplete, onClose }: JourneyPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [volume, setVolume] = useState(70);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedTimer, setSelectedTimer] = useState(30); // default 30 minutes
  const [timeRemaining, setTimeRemaining] = useState(selectedTimer * 60);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const audioEngine = useRef(getAudioEngine({ baseURL: '/audio' }));
  const timerInterval = useRef<NodeJS.Timeout | null>(null);
  const segmentTimeout = useRef<NodeJS.Timeout | null>(null);

  // AudioEngine初期化
  useEffect(() => {
    const engine = audioEngine.current;
    
    const initAudio = async () => {
      try {
        await engine.initialize();
      } catch (error) {
        console.error('Failed to initialize audio engine:', error);
        setError('音声システムの初期化に失敗しました');
      }
    };

    initAudio();

    // クリーンアップ
    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
      if (segmentTimeout.current) {
        clearTimeout(segmentTimeout.current);
      }
      engine.stop();
    };
  }, []);

  // タイマー設定変更時の処理
  useEffect(() => {
    if (!isPlaying) {
      setTimeRemaining(selectedTimer * 60);
    }
  }, [selectedTimer, isPlaying]);

  // セグメント再生の処理
  const playCurrentSegment = useCallback(async () => {
    if (currentSegmentIndex >= journey.segments.length) {
      // 全セグメント再生完了、最初に戻る
      setCurrentSegmentIndex(0);
      return;
    }

    const segment = journey.segments[currentSegmentIndex];
    const audioSegment: AudioSegment = {
      id: segment.id,
      audio_file: segment.content.audio_url || 'silence.mp3',
      volume: segment.content.gain || 0.7,
      fade_in_sec: segment.fade_in_sec,
      fade_out_sec: segment.fade_out_sec,
      duration_sec: segment.duration_sec
    };

    try {
      setIsLoading(true);
      await audioEngine.current.playSegment(audioSegment);
      setIsLoading(false);

      // セグメントの長さが指定されている場合、次のセグメントに自動移行
      if (segment.duration_sec) {
        segmentTimeout.current = setTimeout(() => {
          if (isPlaying) {
            setCurrentSegmentIndex((prev) => 
              (prev + 1) % journey.segments.length
            );
          }
        }, segment.duration_sec * 1000);
      }
    } catch (error) {
      console.error('Error playing segment:', error);
      setError('音声の再生に失敗しました');
      setIsLoading(false);
    }
  }, [currentSegmentIndex, journey.segments, isPlaying]);

  // セグメント変更時の再生処理
  useEffect(() => {
    if (isPlaying && !isPaused) {
      playCurrentSegment();
    }
  }, [currentSegmentIndex, isPlaying, isPaused, playCurrentSegment]);

  const handlePlay = async () => {
    if (isPaused) {
      // 再開
      setIsPaused(false);
      setIsPlaying(true);
      startTimer();
      await playCurrentSegment();
    } else {
      // 新規開始
      setIsPlaying(true);
      setTimeRemaining(selectedTimer * 60);
      setCurrentTime(0);
      startTimer();
      await playCurrentSegment();
    }
  };

  const handlePause = async () => {
    setIsPaused(true);
    setIsPlaying(false);
    stopTimer();
    await audioEngine.current.pause();
  };

  const handleStop = async () => {
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentTime(0);
    setTimeRemaining(selectedTimer * 60);
    setCurrentSegmentIndex(0);
    stopTimer();
    
    if (segmentTimeout.current) {
      clearTimeout(segmentTimeout.current);
    }
    
    await audioEngine.current.stop();
  };

  const handleVolumeChange = (newVolume: number[]) => {
    const vol = newVolume[0];
    setVolume(vol);
    audioEngine.current.setVolume(vol / 100);
  };

  const startTimer = () => {
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
    }

    timerInterval.current = setInterval(() => {
      setCurrentTime((prev) => prev + 1);
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // タイマー終了
          handleComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
  };

  const handleComplete = async () => {
    await handleStop();
    onComplete?.();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = selectedTimer > 0 ? 
    ((selectedTimer * 60 - timeRemaining) / (selectedTimer * 60)) * 100 : 0;

  if (error) {
    return (
      <Card className="w-full max-w-md mx-auto bg-nocturne-night border-nocturne-moon">
        <CardContent className="p-6">
          <div className="text-center text-red-400">
            <p className="mb-4">{error}</p>
            <Button onClick={() => setError(null)} variant="outline">
              再試行
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto bg-nocturne-night border-nocturne-moon">
      <CardContent className="p-6">
        {/* ジャーニー情報 */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-nocturne-deep rounded-full flex items-center justify-center">
            <Moon className="w-8 h-8 text-nocturne-star" />
          </div>
          <h3 className="text-lg font-semibold text-nocturne-star mb-2">
            {journey.title}
          </h3>
          <p className="text-sm text-nocturne-moon">
            {journey.description}
          </p>
        </div>

        {/* 進行状況 */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-nocturne-moon mb-2">
            <span>経過時間: {formatTime(currentTime)}</span>
            <span>残り時間: {formatTime(timeRemaining)}</span>
          </div>
          <div className="w-full bg-nocturne-deep rounded-full h-2">
            <div 
              className="bg-nocturne-dream h-2 rounded-full transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 現在のセグメント */}
        <div className="mb-6 text-center">
          <p className="text-sm text-nocturne-moon mb-1">現在の音源</p>
          <p className="text-nocturne-star">
            {journey.segments[currentSegmentIndex]?.content?.text || 
             journey.segments[currentSegmentIndex]?.type || '準備中...'}
          </p>
        </div>

        {/* タイマー設定 */}
        {!isPlaying && (
          <div className="mb-6">
            <label className="block text-sm text-nocturne-moon mb-3">
              <Timer className="w-4 h-4 inline mr-2" />
              タイマー設定
            </label>
            <div className="flex gap-2 flex-wrap">
              {TIMER_OPTIONS.map((minutes) => (
                <button
                  key={minutes}
                  onClick={() => setSelectedTimer(minutes)}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedTimer === minutes
                      ? 'bg-nocturne-dream text-white'
                      : 'bg-nocturne-deep text-nocturne-moon hover:bg-nocturne-moon hover:text-nocturne-night'
                  }`}
                >
                  {minutes}分
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 音量コントロール */}
        <div className="mb-6">
          <label className="block text-sm text-nocturne-moon mb-3">
            <Volume2 className="w-4 h-4 inline mr-2" />
            音量: {volume}%
          </label>
          <Slider
            value={[volume]}
            onValueChange={handleVolumeChange}
            max={100}
            step={5}
            className="w-full"
          />
        </div>

        {/* 操作ボタン */}
        <div className="flex gap-3 justify-center">
          <Button
            onClick={isPlaying ? handlePause : handlePlay}
            disabled={isLoading}
            size="lg"
            className="bg-nocturne-dream hover:bg-nocturne-dream/80"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5" />
            )}
          </Button>
          
          <Button
            onClick={handleStop}
            disabled={isLoading}
            size="lg"
            variant="outline"
            className="border-nocturne-moon text-nocturne-moon hover:bg-nocturne-moon hover:text-nocturne-night"
          >
            <Square className="w-5 h-5" />
          </Button>
        </div>

        {/* 閉じるボタン */}
        {onClose && (
          <div className="text-center mt-4">
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-nocturne-moon hover:text-nocturne-star"
            >
              閉じる
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}