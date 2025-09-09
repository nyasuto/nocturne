'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  Volume2, 
  VolumeX, 
  Download,
  Sparkles,
  Music,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface GeneratedTrack {
  id: string;
  title: string;
  genre: string;
  duration: number;
  file_url: string;
  format: string;
  bitrate: number;
  file_size: number;
  created_at: string;
  generation_method: string;
}

interface AIMusicGenerationRequest {
  genre: 'sleep' | 'ambient' | 'white_noise' | 'nature_sounds' | 'meditation';
  duration: number;
  intensity: 'low' | 'medium' | 'high';
  format: 'wav' | 'mp3';
  bitrate: number;
  prompt?: string;
}

interface AIMusicPlayerProps {
  className?: string;
}

export function AIMusicPlayer({ className }: AIMusicPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState([50]);
  const [isMuted, setIsMuted] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<GeneratedTrack | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // 生成設定
  const [genre, setGenre] = useState<AIMusicGenerationRequest['genre']>('sleep');
  const [trackDuration, setTrackDuration] = useState(1800); // 30分
  const [intensity, setIntensity] = useState<AIMusicGenerationRequest['intensity']>('low');
  
  const audioRef = useRef<HTMLAudioElement>(null);

  // オーディオイベントハンドラー
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      setError('音声の再生に失敗しました');
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [currentTrack]);

  // 音量変更
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = isMuted ? 0 : volume[0] / 100;
    }
  }, [volume, isMuted]);

  // 音楽生成
  const generateMusic = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);
    setError(null);

    // プログレスシミュレーション
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + Math.random() * 10;
      });
    }, 200);

    try {
      const request: AIMusicGenerationRequest = {
        genre,
        duration: trackDuration,
        intensity,
        format: 'wav',
        bitrate: 128
      };

      const response = await fetch('http://localhost:8001/api/v1/ai-music/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error('音楽生成に失敗しました');
      }

      const result = await response.json();
      
      if (result.success && result.track) {
        setCurrentTrack(result.track);
        setGenerationProgress(100);
        
        // 音声ファイルを読み込み
        if (audioRef.current) {
          audioRef.current.src = `http://localhost:8001${result.track.file_url}`;
          audioRef.current.load();
        }
      } else {
        throw new Error(result.error_message || '音楽生成に失敗しました');
      }
      
    } catch (error) {
      console.error('音楽生成エラー:', error);
      setError(error instanceof Error ? error.message : '音楽生成に失敗しました');
    } finally {
      clearInterval(progressInterval);
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  // 再生・一時停止
  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {
        setError('音声の再生に失敗しました');
      });
    }
    setIsPlaying(!isPlaying);
  };

  // 停止
  const stop = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentTime(0);
  };

  // シーク
  const seek = (value: number[]) => {
    const audio = audioRef.current;
    if (audio && duration > 0) {
      audio.currentTime = (value[0] / 100) * duration;
      setCurrentTime(audio.currentTime);
    }
  };

  // 時間フォーマット
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // ダウンロード
  const downloadTrack = () => {
    if (currentTrack) {
      const link = document.createElement('a');
      link.href = `http://localhost:8001${currentTrack.file_url}`;
      link.download = `${currentTrack.title}.${currentTrack.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <Card className={`w-full max-w-2xl mx-auto bg-nocturne-night border-nocturne-moon ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-nocturne-star">
          <Sparkles className="w-5 h-5" />
          AI音楽生成プレーヤー
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* 生成設定 */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-nocturne-star">生成設定</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-nocturne-moon block mb-2">ジャンル</label>
              <Select value={genre} onValueChange={(value: AIMusicGenerationRequest['genre']) => setGenre(value)}>
                <SelectTrigger className="bg-nocturne-deep border-nocturne-moon">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sleep">睡眠</SelectItem>
                  <SelectItem value="ambient">アンビエント</SelectItem>
                  <SelectItem value="white_noise">ホワイトノイズ</SelectItem>
                  <SelectItem value="nature_sounds">自然音</SelectItem>
                  <SelectItem value="meditation">瞑想</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-xs text-nocturne-moon block mb-2">強度</label>
              <Select value={intensity} onValueChange={(value: AIMusicGenerationRequest['intensity']) => setIntensity(value)}>
                <SelectTrigger className="bg-nocturne-deep border-nocturne-moon">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">低</SelectItem>
                  <SelectItem value="medium">中</SelectItem>
                  <SelectItem value="high">高</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-xs text-nocturne-moon block mb-2">時間（分）</label>
              <Select value={trackDuration.toString()} onValueChange={(value) => setTrackDuration(parseInt(value))}>
                <SelectTrigger className="bg-nocturne-deep border-nocturne-moon">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">0.5分（テスト）</SelectItem>
                  <SelectItem value="300">5分</SelectItem>
                  <SelectItem value="600">10分</SelectItem>
                  <SelectItem value="1800">30分</SelectItem>
                  <SelectItem value="3600">60分</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button 
            onClick={generateMusic} 
            disabled={isGenerating}
            className="w-full bg-nocturne-dream hover:bg-nocturne-dream/80"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                音楽を生成
              </>
            )}
          </Button>
          
          {isGenerating && (
            <div>
              <div className="flex justify-between text-xs text-nocturne-moon mb-1">
                <span>生成進行中</span>
                <span>{Math.round(generationProgress)}%</span>
              </div>
              <Progress value={generationProgress} className="w-full" />
            </div>
          )}
        </div>
        
        {/* エラー表示 */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
        
        {/* 現在のトラック情報 */}
        {currentTrack && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-nocturne-deep rounded-lg flex items-center justify-center">
                  <Music className="w-6 h-6 text-nocturne-dream" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-nocturne-star">{currentTrack.title}</h4>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline" className="text-xs border-nocturne-moon">
                      {currentTrack.genre}
                    </Badge>
                    <Badge variant="outline" className="text-xs border-nocturne-moon">
                      {currentTrack.generation_method}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  onClick={downloadTrack}
                  variant="outline"
                  size="sm"
                  className="border-nocturne-moon text-nocturne-star hover:bg-nocturne-deep"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {/* 再生進行バー */}
            <div className="space-y-2">
              <Slider
                value={[duration > 0 ? (currentTime / duration) * 100 : 0]}
                onValueChange={seek}
                max={100}
                step={0.1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-nocturne-moon">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
            
            {/* 再生コントロール */}
            <div className="flex items-center justify-center gap-4">
              <Button
                onClick={togglePlayPause}
                disabled={!currentTrack}
                size="lg"
                className="w-12 h-12 rounded-full bg-nocturne-dream hover:bg-nocturne-dream/80"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6" />
                )}
              </Button>
              
              <Button
                onClick={stop}
                disabled={!currentTrack}
                variant="outline"
                size="sm"
                className="border-nocturne-moon text-nocturne-star hover:bg-nocturne-deep"
              >
                <Square className="w-4 h-4" />
              </Button>
            </div>
            
            {/* 音量コントロール */}
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setIsMuted(!isMuted)}
                variant="ghost"
                size="sm"
                className="text-nocturne-moon hover:text-nocturne-star"
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </Button>
              
              <Slider
                value={volume}
                onValueChange={setVolume}
                max={100}
                step={1}
                className="flex-1"
              />
              
              <span className="text-xs text-nocturne-moon w-10 text-right">
                {isMuted ? 0 : volume[0]}%
              </span>
            </div>
            
            {/* トラック詳細 */}
            <div className="text-xs text-nocturne-moon space-y-1">
              <div className="flex justify-between">
                <span>フォーマット:</span>
                <span>{currentTrack.format.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span>ビットレート:</span>
                <span>{currentTrack.bitrate} kbps</span>
              </div>
              <div className="flex justify-between">
                <span>ファイルサイズ:</span>
                <span>{(currentTrack.file_size / 1024 / 1024).toFixed(1)} MB</span>
              </div>
              <div className="flex justify-between">
                <span>生成日時:</span>
                <span>{new Date(currentTrack.created_at).toLocaleString('ja-JP')}</span>
              </div>
            </div>
          </div>
        )}
        
        {/* 音声要素 */}
        <audio ref={audioRef} preload="metadata" />
      </CardContent>
    </Card>
  );
}