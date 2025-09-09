'use client';

import { useState } from 'react';
import { Play, MoreHorizontal, Clock, Music, Headphones } from 'lucide-react';
// Removed unused Card components
import { Button } from '@/components/ui/button';
import { SleepScoreBadge } from './SleepScoreVisualization';
// Removed unused cn utility

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
  description: string;
  thumbnail_url?: string;
  track_count: number;
  privacy_status: string;
  average_sleep_score?: number;
}

interface MusicShelfProps {
  title: string;
  items: (Track | Playlist)[];
  type: 'playlists' | 'tracks' | 'recommended' | 'recent';
  onItemClick?: (item: Track | Playlist) => void;
  isLoading?: boolean;
  showPlayAll?: boolean;
}

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

const ShelfItem = ({ 
  item, 
  onClick 
}: { 
  item: Track | Playlist; 
  onClick?: (item: Track | Playlist) => void;
}) => {
  const isPlaylist = 'track_count' in item;
  const isTrack = 'duration_seconds' in item;
  
  return (
    <div
      className="group relative bg-card rounded-lg p-3 hover:bg-accent/50 transition-colors cursor-pointer min-w-[200px]"
      onClick={() => onClick?.(item)}
    >
      {/* Thumbnail */}
      <div className="relative aspect-square rounded-md overflow-hidden mb-3 bg-muted">
        {item.thumbnail_url ? (
          <img 
            src={item.thumbnail_url}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {isPlaylist ? (
              <Music className="w-8 h-8 text-muted-foreground" />
            ) : (
              <Headphones className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
        )}
        
        {/* Play Button Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <Button size="sm" className="rounded-full w-12 h-12 p-0">
            <Play className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Sleep Score Badge */}
        {item.sleep_score && (
          <div className="absolute top-2 right-2">
            <SleepScoreBadge score={item.sleep_score} size="sm" />
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="space-y-1">
        <h3 className="font-medium text-sm truncate" title={item.title}>
          {item.title}
        </h3>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="truncate mr-2">{item.artist}</span>
          {isPlaylist && (
            <span className="flex items-center gap-1">
              <Music className="w-3 h-3" />
              {item.track_count}
            </span>
          )}
          {isTrack && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDuration(item.duration_seconds)}
            </span>
          )}
        </div>
        
        {/* Additional info for playlists */}
        {isPlaylist && item.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
            {item.description}
          </p>
        )}
      </div>
      
      {/* More Options */}
      <Button
        variant="ghost" 
        size="sm"
        className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 p-0 bg-black/50 hover:bg-black/70"
        onClick={(e) => {
          e.stopPropagation();
          // Handle more options
        }}
      >
        <MoreHorizontal className="w-4 h-4 text-white" />
      </Button>
    </div>
  );
};

const ShelfSkeleton = () => (
  <div className="flex gap-4 pb-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="min-w-[200px]">
        <div className="bg-muted rounded-lg p-3 animate-pulse">
          <div className="aspect-square bg-muted-foreground/20 rounded-md mb-3" />
          <div className="space-y-2">
            <div className="h-4 bg-muted-foreground/20 rounded w-3/4" />
            <div className="h-3 bg-muted-foreground/20 rounded w-1/2" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export function MusicLibraryShelf({
  title,
  items,
  type,
  onItemClick,
  isLoading = false,
  showPlayAll = false
}: MusicShelfProps) {
  const [scrollPosition, setScrollPosition] = useState(0);
  
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollPosition(e.currentTarget.scrollLeft);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 bg-muted rounded w-48 animate-pulse" />
        </div>
        <ShelfSkeleton />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <div className="text-center">
            <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>アイテムが見つかりませんでした</p>
            <p className="text-sm mt-1">
              {type === 'playlists' && 'プレイリストを作成してみましょう'}
              {type === 'tracks' && '楽曲を検索してみましょう'}
              {type === 'recommended' && 'おすすめが更新されるまでお待ちください'}
              {type === 'recent' && '楽曲を再生すると履歴が表示されます'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          {title}
          <span className="text-sm text-muted-foreground font-normal">
            ({items.length})
          </span>
        </h2>
        
        <div className="flex gap-2">
          {showPlayAll && items.length > 0 && (
            <Button variant="outline" size="sm">
              <Play className="w-4 h-4 mr-1" />
              すべて再生
            </Button>
          )}
          
          {items.length > 6 && (
            <Button variant="ghost" size="sm">
              すべて表示
            </Button>
          )}
        </div>
      </div>

      {/* Scrollable Shelf */}
      <div
        className="overflow-x-auto scrollbar-hide"
        onScroll={handleScroll}
      >
        <div className="flex gap-4 pb-4" style={{ minWidth: 'max-content' }}>
          {items.map((item) => (
            <ShelfItem
              key={item.id}
              item={item}
              type={type}
              onClick={onItemClick}
            />
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      {items.length > 6 && (
        <div className="flex justify-center">
          <div className="w-24 h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-transform duration-300"
              style={{
                width: '20%',
                transform: `translateX(${Math.min(scrollPosition / 4, 96)}px)`
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Specialized shelf components
export function PlaylistShelf({
  playlists,
  isLoading = false,
  onPlaylistClick
}: {
  playlists: Playlist[];
  isLoading?: boolean;
  onPlaylistClick?: (playlist: Playlist) => void;
}) {
  return (
    <MusicLibraryShelf
      title="マイプレイリスト"
      items={playlists}
      type="playlists"
      onItemClick={onPlaylistClick}
      isLoading={isLoading}
      showPlayAll={true}
    />
  );
}

export function RecommendedTracksShelf({
  tracks,
  isLoading = false,
  onTrackClick
}: {
  tracks: Track[];
  isLoading?: boolean;
  onTrackClick?: (track: Track) => void;
}) {
  return (
    <MusicLibraryShelf
      title="睡眠におすすめ"
      items={tracks}
      type="recommended"
      onItemClick={onTrackClick}
      isLoading={isLoading}
      showPlayAll={true}
    />
  );
}

export function RecentTracksShelf({
  tracks,
  isLoading = false,
  onTrackClick
}: {
  tracks: Track[];
  isLoading?: boolean;
  onTrackClick?: (track: Track) => void;
}) {
  return (
    <MusicLibraryShelf
      title="最近再生した楽曲"
      items={tracks}
      type="recent"
      onItemClick={onTrackClick}
      isLoading={isLoading}
    />
  );
}