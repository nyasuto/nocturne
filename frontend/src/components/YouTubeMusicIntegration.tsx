'use client';

import { useState, useEffect } from 'react';
import { Music, Youtube, Play, Loader2, Search, Clock, Star, AlertTriangle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
// TODO: 不足しているUIコンポーネントを追加
// import { Input } from '@/components/ui/input';
// import { Badge } from '@/components/ui/badge';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  youtubeMusicService, 
  YouTubePlaylist, 
  YouTubeTrack
  // SleepPlaylist は Phase2で使用予定
} from '@/services/youtubeMusicService';

export function YouTubeMusicIntegration() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [playlists, setPlaylists] = useState<YouTubePlaylist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<YouTubePlaylist | null>(null);
  const [tracks, setTracks] = useState<YouTubeTrack[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkConnectionStatus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const checkConnectionStatus = async () => {
    try {
      setIsLoading(true);
      const status = await youtubeMusicService.getConnectionStatus();
      setIsConnected(status.connected);
      
      if (status.connected) {
        await loadPlaylists();
      }
    } catch (error) {
      console.error('Failed to check connection status:', error);
      setError('接続状態の確認に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      const authUrl = await youtubeMusicService.getAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to get auth URL:', error);
      setError('認証URLの取得に失敗しました');
    }
  };

  const handleDisconnect = async () => {
    try {
      await youtubeMusicService.disconnect();
      setIsConnected(false);
      setPlaylists([]);
    } catch (error) {
      console.error('Failed to disconnect:', error);
      setError('切断に失敗しました');
    }
  };

  const loadPlaylists = async () => {
    try {
      const userPlaylists = await youtubeMusicService.getPlaylists();
      setPlaylists(userPlaylists);
    } catch (error) {
      console.error('Failed to load playlists:', error);
      setError('プレイリストの読み込みに失敗しました');
    }
  };

  // TODO: Phase2で睡眠プレイリスト機能を実装

  const loadPlaylistTracks = async (playlist: YouTubePlaylist) => {
    try {
      setSelectedPlaylist(playlist);
      const playlistTracks = await youtubeMusicService.getPlaylistTracks(playlist.id);
      setTracks(playlistTracks);
    } catch (error) {
      console.error('Failed to load tracks:', error);
      setError('楽曲の読み込みに失敗しました');
    }
  };

  // TODO: Phase2で検索・プレイリスト作成機能を実装

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!isConnected) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Youtube className="w-6 h-6 text-red-600" />
            YouTube Music 連携
          </CardTitle>
          <CardDescription>
            YouTube Musicと連携して、あなたの音楽ライブラリから睡眠に最適な楽曲を発見しましょう
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Music className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-6">
              YouTube Musicアカウントを連携すると、パーソナライズされた睡眠音楽体験が可能になります
            </p>
            <Button onClick={handleConnect} className="bg-red-600 hover:bg-red-700">
              <Youtube className="w-4 h-4 mr-2" />
              YouTube Music と連携
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Youtube className="w-6 h-6 text-red-600" />
              YouTube Music
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm flex items-center gap-1">
                <Check className="w-3 h-3" />
                接続済み
              </span>
              <Button onClick={handleDisconnect} variant="outline" size="sm">
                切断
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Content - 簡易実装 */}
      <div className="w-full">
        <div className="mb-4">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button className="border-b-2 border-blue-500 py-2 px-1 text-sm font-medium text-blue-600">
                ライブラリ
              </button>
              <button className="border-b-2 border-transparent py-2 px-1 text-sm font-medium text-gray-500 hover:text-gray-700">
                睡眠プレイリスト
              </button>
              <button className="border-b-2 border-transparent py-2 px-1 text-sm font-medium text-gray-500 hover:text-gray-700">
                検索（準備中）
              </button>
            </nav>
          </div>
        </div>

        {/* Library Content */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>あなたのプレイリスト</CardTitle>
              <CardDescription>
                YouTube Musicのプレイリストから睡眠に適した楽曲を探しましょう
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {playlists.map((playlist) => (
                  <Card 
                    key={playlist.id} 
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => loadPlaylistTracks(playlist)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        {playlist.thumbnail_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img 
                            src={playlist.thumbnail_url} 
                            alt={playlist.title}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm line-clamp-2">
                            {playlist.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {playlist.track_count} 曲
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Selected Playlist Tracks */}
          {selectedPlaylist && tracks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{selectedPlaylist.title} の楽曲</CardTitle>
                <CardDescription>
                  {tracks.length} 曲 • 睡眠分析可能
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tracks.slice(0, 10).map((track) => (
                    <div key={track.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50">
                      {track.thumbnail_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                          src={track.thumbnail_url} 
                          alt={track.title}
                          className="w-12 h-12 rounded"
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-sm">{track.title}</p>
                        <p className="text-xs text-muted-foreground">{track.artist}</p>
                      </div>
                      {track.sleep_analysis && (
                        <div className="text-right">
                          <div className={`text-lg font-bold ${youtubeMusicService.getSleepScoreColor(track.sleep_analysis.sleep_score)}`}>
                            {track.sleep_analysis.sleep_score.toFixed(0)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            睡眠スコア
                          </div>
                        </div>
                      )}
                      <Button size="sm" variant="ghost">
                        <Play className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* TODO: Phase2で睡眠プレイリストと検索機能を追加 */}
        <div className="mt-6 p-4 border rounded-lg bg-gray-50">
          <p className="text-sm text-gray-600">
            睡眠プレイリストと楽曲検索機能は次のPhaseで実装予定です
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-2 py-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <p className="text-sm text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}