'use client';

import { useState, useEffect } from 'react';
import { Music, Youtube, Play, Loader2, Search, Clock, Star, AlertTriangle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  youtubeMusicService, 
  YouTubePlaylist, 
  YouTubeTrack, 
  SleepPlaylist 
} from '@/services/youtubeMusicService';

export function YouTubeMusicIntegration() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [playlists, setPlaylists] = useState<YouTubePlaylist[]>([]);
  const [sleepPlaylists, setSleepPlaylists] = useState<SleepPlaylist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<YouTubePlaylist | null>(null);
  const [tracks, setTracks] = useState<YouTubeTrack[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<YouTubeTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      setIsLoading(true);
      const status = await youtubeMusicService.getConnectionStatus();
      setIsConnected(status.connected);
      
      if (status.connected) {
        await loadPlaylists();
        await loadSleepPlaylists();
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
      setSleepPlaylists([]);
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

  const loadSleepPlaylists = async () => {
    try {
      const sleepLists = await youtubeMusicService.getSleepPlaylists();
      setSleepPlaylists(sleepLists);
    } catch (error) {
      console.error('Failed to load sleep playlists:', error);
    }
  };

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

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setIsSearching(true);
      const results = await youtubeMusicService.searchTracks(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      setError('検索に失敗しました');
    } finally {
      setIsSearching(false);
    }
  };

  const createSleepPlaylist = async (trackIds: string[], title: string) => {
    try {
      const playlist = await youtubeMusicService.createSleepPlaylist({
        title,
        track_ids: trackIds,
        sleep_goal: 'general',
        sync_to_youtube: true
      });
      
      await loadSleepPlaylists();
      return playlist;
    } catch (error) {
      console.error('Failed to create playlist:', error);
      setError('プレイリストの作成に失敗しました');
    }
  };

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
              <Badge variant="success" className="flex items-center gap-1">
                <Check className="w-3 h-3" />
                接続済み
              </Badge>
              <Button onClick={handleDisconnect} variant="outline" size="sm">
                切断
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="library" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="library">ライブラリ</TabsTrigger>
          <TabsTrigger value="sleep">睡眠プレイリスト</TabsTrigger>
          <TabsTrigger value="search">検索</TabsTrigger>
        </TabsList>

        {/* Library Tab */}
        <TabsContent value="library" className="space-y-4">
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
        </TabsContent>

        {/* Sleep Playlists Tab */}
        <TabsContent value="sleep" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>睡眠プレイリスト</CardTitle>
              <CardDescription>
                Nocturneで作成した睡眠専用プレイリスト
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sleepPlaylists.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    まだ睡眠プレイリストがありません
                  </p>
                  <Button className="mt-4" onClick={() => {}}>
                    プレイリストを作成
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {sleepPlaylists.map((playlist) => (
                    <Card key={playlist.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold">{playlist.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {playlist.description}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Music className="w-3 h-3" />
                                {playlist.track_count} 曲
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {youtubeMusicService.formatDuration(playlist.total_duration_seconds)}
                              </span>
                              {playlist.average_sleep_score && (
                                <span className="flex items-center gap-1">
                                  <Star className="w-3 h-3" />
                                  スコア {playlist.average_sleep_score.toFixed(0)}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button size="sm">
                            <Play className="w-4 h-4 mr-1" />
                            再生
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Search Tab */}
        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>楽曲検索</CardTitle>
              <CardDescription>
                YouTube Musicから睡眠に適した楽曲を検索
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="アーティスト名や曲名を入力..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={isSearching}>
                  {isSearching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-3">
                  {searchResults.map((track) => (
                    <div key={track.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50">
                      {track.thumbnail_url && (
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
                      <Button size="sm" variant="outline">
                        分析
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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