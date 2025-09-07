'use client';

import { useEffect, useState } from 'react';
import { api, Journey } from '@/lib/api';
import { formatTime } from '@/lib/utils';

export default function Home() {
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [featuredJourneys, setFeaturedJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
            <JourneyCard key={journey.id} journey={journey} />
          ))}
        </div>
      </section>

      {/* All Journeys */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold">睡眠ジャーニー</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {journeys.map((journey) => (
            <JourneyCard key={journey.id} journey={journey} />
          ))}
        </div>
      </section>
    </div>
  );
}

function JourneyCard({ journey }: { journey: Journey }) {
  return (
    <div className="bg-card border border-border rounded-lg p-6 hover:border-accent/50 transition-colors cursor-pointer group">
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground bg-secondary/50 px-2 py-1 rounded">
              {journey.category || 'その他'}
            </span>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span>⭐</span>
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
          <span>{formatTime(journey.duration_sec)}</span>
          <span>{journey.play_count}回再生</span>
        </div>
      </div>
    </div>
  );
}