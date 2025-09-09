'use client';

import { useState, useEffect } from 'react';
import { Music, Youtube, Play, Loader2, Search, Clock, Star, AlertTriangle, Check, Plus, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  MusicLibraryShelf, 
  PlaylistShelf, 
  RecommendedTracksShelf, 
  RecentTracksShelf 
} from './MusicLibraryShelf';
import { SleepScoreBadge } from './SleepScoreVisualization';
import { 
  youtubeMusicService, 
  YouTubePlaylist, 
  YouTubeTrack
} from '@/services/youtubeMusicService';

// Type conversion helpers
const convertYouTubeTrackToTrack = (track: YouTubeTrack): Track => ({
  id: track.id,
  title: track.title,
  artist: track.artist,
  thumbnail_url: track.thumbnail_url || undefined,
  sleep_score: track.sleep_analysis?.sleep_score || 0,
  duration_seconds: track.duration_seconds || 0,
  youtube_url: track.youtube_url
});

const convertYouTubePlaylistToPlaylist = (playlist: YouTubePlaylist): Playlist => ({
  id: playlist.id,
  title: playlist.title,
  description: playlist.description || undefined,
  thumbnail_url: playlist.thumbnail_url || undefined,
  track_count: playlist.track_count
});

// Local type definitions to match the component needs
interface Track {
  id: string;
  title: string;
  artist: string;
  thumbnail_url?: string;
  sleep_score: number;
  duration_seconds: number;
  youtube_url: string;
}

interface Playlist {
  id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  track_count: number;
}

export function YouTubeMusicIntegration() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [playlists, setPlaylists] = useState<YouTubePlaylist[]>([]);
  const [sleepPlaylists, setSleepPlaylists] = useState<YouTubePlaylist[]>([]);
  const [recommendedTracks, setRecommendedTracks] = useState<YouTubeTrack[]>([]);
  const [recentTracks, setRecentTracks] = useState<YouTubeTrack[]>([]);
  const [searchResults, setSearchResults] = useState<YouTubeTrack[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState<string>('all');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('library');

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      setIsLoading(true);
      const status = await youtubeMusicService.getConnectionStatus();
      setIsConnected(status.connected);
      
      if (status.connected) {
        await Promise.all([
          loadPlaylists(),
          loadSleepPlaylists(),
          loadRecommendedTracks(),
          loadRecentTracks()
        ]);
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
      const response = await youtubeMusicService.getAuthUrl();
      
      // Phase 1: プレースホルダーURL をチェック
      if (response.includes('accounts.google.com/oauth2/auth') && !response.includes('client_id=')) {
        setError('YouTube Music 連携はPhase 1では準備中です。\nPhase 2でフル機能が実装される予定です。');
        return;
      }
      
      window.location.href = response;
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

  const loadSleepPlaylists = async () => {
    try {
      const sleepPlaylists = await youtubeMusicService.getSleepPlaylists();
      setSleepPlaylists(sleepPlaylists);
    } catch (error) {
      console.error('Failed to load sleep playlists:', error);
    }
  };

  const loadRecommendedTracks = async () => {
    try {
      // Search for sleep-optimized music
      const tracks = await youtubeMusicService.searchTracks('sleep relaxing ambient music', 20, 'sleep');
      setRecommendedTracks(tracks);
    } catch (error) {
      console.error('Failed to load recommended tracks:', error);
    }
  };

  const loadRecentTracks = async () => {
    try {
      // Mock recent tracks for Phase 2
      // In production, this would come from user's listening history
      const mockRecentTracks: YouTubeTrack[] = [
        {
          id: 'recent1',
          title: 'Rain on Glass - 10 Hours',
          artist: 'Sleep Stories',
          thumbnail_url: '/api/placeholder/120/120',
          sleep_score: 92,
          duration_seconds: 600,
          youtube_url: 'https://youtube.com/watch?v=recent1'
        },
        {
          id: 'recent2', 
          title: 'Forest Whispers',
          artist: 'Nature Sounds',
          thumbnail_url: '/api/placeholder/120/120',
          sleep_score: 88,
          duration_seconds: 420,
          youtube_url: 'https://youtube.com/watch?v=recent2'
        }
      ];
      setRecentTracks(mockRecentTracks);
    } catch (error) {
      console.error('Failed to load recent tracks:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setIsSearching(true);
      const results = await youtubeMusicService.searchTracks(
        searchQuery,
        25,
        searchFilter === 'all' ? undefined : searchFilter
      );
      setSearchResults(results);
    } catch (error) {
      console.error('Failed to search tracks:', error);
      setError('検索に失敗しました');
    } finally {
      setIsSearching(false);
    }
  };

  const handleCreatePlaylist = () => {
    // TODO: プレイリスト作成モーダルを開く
    console.log('プレイリスト作成機能（Phase 2で実装）');
  };

  const handlePlaylistClick = async (playlist: YouTubePlaylist) => {
    // TODO: プレイリスト詳細ページに移動
    console.log('プレイリスト詳細:', playlist);
  };

  const handleTrackClick = (track: YouTubeTrack) => {
    // TODO: トラック再生機能
    console.log('トラック再生:', track);
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

      {/* Main Content - Phase 2 Full Implementation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="library">ライブラリ</TabsTrigger>
          <TabsTrigger value="sleep">睡眠プレイリスト</TabsTrigger>
          <TabsTrigger value="search">検索・発見</TabsTrigger>
        </TabsList>

        {/* Library Tab */}
        <TabsContent value="library" className="space-y-6 mt-6">
          {/* Your Playlists */}
          <PlaylistShelf
            playlists={playlists.map(convertYouTubePlaylistToPlaylist)}
            isLoading={isLoading}
            onPlaylistClick={(playlist: Playlist) => handlePlaylistClick(playlist as any)}
          />
          
          {/* Recommended for Sleep */}
          <RecommendedTracksShelf
            tracks={recommendedTracks.map(convertYouTubeTrackToTrack)}
            isLoading={isLoading}
            onTrackClick={(track: Track) => handleTrackClick(track as any)}
          />
          
          {/* Recently Played */}
          <RecentTracksShelf
            tracks={recentTracks.map(convertYouTubeTrackToTrack)}
            isLoading={isLoading}
            onTrackClick={(track: Track) => handleTrackClick(track as any)}
          />
        </TabsContent>

        {/* Sleep Playlists Tab */}
        <TabsContent value="sleep" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">睡眠専用プレイリスト</h2>
              <p className="text-sm text-muted-foreground">
                Nocturneで作成された睡眠最適化プレイリスト
              </p>
            </div>
            <Button onClick={handleCreatePlaylist}>
              <Plus className="w-4 h-4 mr-2" />
              新しいプレイリスト
            </Button>
          </div>
          
          <MusicLibraryShelf
            title="睡眠プレイリスト"
            items={sleepPlaylists.map(convertYouTubePlaylistToPlaylist)}
            type="playlists"
            onItemClick={(item: Track | Playlist) => handlePlaylistClick(item as any)}
            isLoading={isLoading}
            showPlayAll={true}
          />
          
          {sleepPlaylists.length === 0 && !isLoading && (
            <Card>
              <CardContent className="text-center py-12">
                <Music className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">睡眠プレイリストがありません</h3>
                <p className="text-muted-foreground mb-4">
                  あなた専用の睡眠プレイリストを作成して、より良い睡眠体験を始めましょう
                </p>
                <Button onClick={handleCreatePlaylist}>
                  <Plus className="w-4 h-4 mr-2" />
                  最初のプレイリストを作成
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Search & Discovery Tab */}
        <TabsContent value="search" className="space-y-6 mt-6">
          {/* Search Section */}
          <Card>
            <CardHeader>
              <CardTitle>楽曲検索</CardTitle>
              <CardDescription>
                YouTube Musicから睡眠に適した楽曲を検索・発見しましょう
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="楽曲名、アーティスト名、キーワードを入力..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1"
                />
                <Select value={searchFilter} onValueChange={setSearchFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    <SelectItem value="sleep">睡眠音楽</SelectItem>
                    <SelectItem value="ambient">アンビエント</SelectItem>
                    <SelectItem value="nature">自然音</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleSearch} disabled={isSearching}>
                  {isSearching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Search Results */}
          {searchResults.length > 0 && (
            <MusicLibraryShelf
              title="検索結果"
              items={searchResults.map(convertYouTubeTrackToTrack)}
              type="tracks"
              onItemClick={(item: Track | Playlist) => handleTrackClick(item as any)}
              isLoading={isSearching}
            />
          )}
          
          {/* Quick Discovery Categories */}
          <Card>
            <CardHeader>
              <CardTitle>カテゴリ別発見</CardTitle>
              <CardDescription>
                人気のカテゴリから睡眠に適した音楽を探索
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { name: '雨音', query: 'rain sounds sleep', icon: '🌧️' },
                  { name: '自然音', query: 'nature sounds forest', icon: '🌲' },
                  { name: 'ピアノ', query: 'piano sleep peaceful', icon: '🎹' },
                  { name: 'オルゴール', query: 'music box lullaby', icon: '🎵' },
                  { name: 'アンビエント', query: 'ambient sleep music', icon: '🌌' },
                  { name: '瞑想音楽', query: 'meditation music calm', icon: '🧘' },
                  { name: 'ホワイトノイズ', query: 'white noise sleep', icon: '📻' },
                  { name: '波音', query: 'ocean waves peaceful', icon: '🌊' }
                ].map((category) => (
                  <Button
                    key={category.name}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center gap-2"
                    onClick={() => {
                      setSearchQuery(category.query);
                      setSearchFilter('sleep');
                    }}
                  >
                    <span className="text-2xl">{category.icon}</span>
                    <span className="text-sm">{category.name}</span>
                  </Button>
                ))}
              </div>
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-700"
            >
              ✕
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}