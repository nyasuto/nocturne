'use client';

import { useEffect, useState } from 'react';
import { Play, Clock, Star, Settings, User } from 'lucide-react';
import { api, Journey, JourneyDetail } from '@/lib/api';
import { formatTime } from '@/lib/utils';
import { JourneyPlayer } from '@/components/JourneyPlayer';
import { SettingsModal } from '@/components/SettingsModal';
import { AuthModal } from '@/components/AuthModal';
import { UserProfile } from '@/components/UserProfile';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [featuredJourneys, setFeaturedJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJourney, setSelectedJourney] = useState<JourneyDetail | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [loadingJourney, setLoadingJourney] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [allJourneys, featured] = await Promise.all([
          api.getJourneys({ limit: 6 }),
          api.getFeaturedJourneys(),
        ]);
        setJourneys(allJourneys);
        setFeaturedJourneys(featured);
      } catch (err) {
        setError('データの読み込みに失敗しました');
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handlePlayJourney = async (journey: Journey) => {
    try {
      setLoadingJourney(true);
      const journeyDetail = await api.getJourney(journey.id);
      setSelectedJourney(journeyDetail);
      setShowPlayer(true);
    } catch (err) {
      console.error('Failed to load journey details:', err);
      setError('ジャーニーの詳細情報の読み込みに失敗しました');
    } finally {
      setLoadingJourney(false);
    }
  };

  const handlePlayerComplete = () => {
    setShowPlayer(false);
    setSelectedJourney(null);
  };

  const handlePlayerClose = () => {
    setShowPlayer(false);
    setSelectedJourney(null);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-muted-foreground">
            読み込み中...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-destructive">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-12">
      {/* Top Controls */}
      <div className="fixed top-4 right-4 z-40 flex gap-2">
        {/* User/Auth Button */}
        <button
          onClick={() => isAuthenticated ? setShowProfile(true) : setShowAuth(true)}
          className="bg-nocturne-deep hover:bg-nocturne-moon border border-nocturne-moon hover:border-nocturne-star text-nocturne-moon hover:text-nocturne-star p-3 rounded-full transition-colors shadow-lg"
        >
          <User className="w-5 h-5" />
        </button>

        {/* Settings Button */}
        <button
          onClick={() => setShowSettings(true)}
          className="bg-nocturne-deep hover:bg-nocturne-moon border border-nocturne-moon hover:border-nocturne-star text-nocturne-moon hover:text-nocturne-star p-3 rounded-full transition-colors shadow-lg"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Welcome Message */}
      {isAuthenticated && user && (
        <div className="text-center py-4">
          <p className="text-nocturne-star">
            おかえりなさい、{user.name}さん 🌙
          </p>
        </div>
      )}

      {/* Hero Section */}
      <section className="text-center space-y-6 py-12">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold gradient-nocturne bg-clip-text text-transparent">
            🌙 Nocturne
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            パーソナライズされた音楽と物語で<br />
            質の高い睡眠をサポート
          </p>
        </div>
        <div className="flex gap-4 justify-center">
          <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-full text-lg font-medium transition-colors sleep-glow">
            今夜の睡眠を開始
          </button>
          <button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground px-8 py-3 rounded-full text-lg font-medium transition-colors">
            ジャーニーを探す
          </button>
        </div>
      </section>

      {/* Featured Journeys */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">おすすめのジャーニー</h2>
          <button className="text-accent hover:text-accent/80 font-medium">
            すべて見る →
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredJourneys.map((journey) => (
            <JourneyCard key={journey.id} journey={journey} onPlay={handlePlayJourney} loading={loadingJourney} />
          ))}
        </div>
      </section>

      {/* All Journeys */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold">睡眠ジャーニー</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {journeys.map((journey) => (
            <JourneyCard key={journey.id} journey={journey} onPlay={handlePlayJourney} loading={loadingJourney} />
          ))}
        </div>
      </section>

      {/* Player Modal */}
      {showPlayer && selectedJourney && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <JourneyPlayer
              journey={selectedJourney}
              onComplete={handlePlayerComplete}
              onClose={handlePlayerClose}
            />
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuth} 
        onClose={() => setShowAuth(false)} 
      />

      {/* User Profile Modal */}
      <UserProfile 
        isOpen={showProfile} 
        onClose={() => setShowProfile(false)} 
      />
    </div>
  );
}

function JourneyCard({ journey, onPlay, loading }: { 
  journey: Journey; 
  onPlay: (journey: Journey) => void;
  loading?: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-6 hover:border-accent/50 transition-colors group">
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground bg-secondary/50 px-2 py-1 rounded">
              {journey.category || 'その他'}
            </span>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Star className="w-4 h-4 text-yellow-500" />
              <span>{journey.rating}</span>
            </div>
          </div>
          <h3 className="text-lg font-semibold group-hover:text-accent transition-colors">
            {journey.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {journey.description}
          </p>
        </div>
        
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{formatTime(journey.duration_sec)}</span>
          </div>
          <span>{journey.play_count}回再生</span>
        </div>

        {/* プレイボタン */}
        <div className="pt-2">
          <button
            onClick={() => onPlay(journey)}
            disabled={loading}
            className="w-full bg-nocturne-dream hover:bg-nocturne-dream/80 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors group-hover:shadow-lg"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>読み込み中...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>プレイ</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}