'use client';

import { useState } from 'react';
import { BottomNavigation, NavigationTab } from '@/components/BottomNavigation';
import { TonightDashboard } from '@/components/TonightDashboard';
import { SettingsModal } from '@/components/SettingsModal';
import { AuthModal } from '@/components/AuthModal';
import { UserProfile } from '@/components/UserProfile';
import { AIMusicPlayer } from '@/components/AIMusicPlayer';
import { useAuth } from '@/contexts/AuthContext';
import { Settings, User } from 'lucide-react';

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const [activeTab, setActiveTab] = useState<NavigationTab['id']>('home');
  const [showSettings, setShowSettings] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="space-y-6">
            {/* Welcome Message */}
            {isAuthenticated && user && (
              <div className="text-center py-4">
                <p className="text-nocturne-star">
                  おかえりなさい、{user.name}さん 🌙
                </p>
              </div>
            )}
            <TonightDashboard />
          </div>
        );
      
      case 'library':
        return (
          <div className="space-y-6">
            <div className="text-center py-8">
              <h2 className="text-2xl font-bold mb-4 text-nocturne-star">AI音楽生成</h2>
              <p className="text-nocturne-moon mb-6">
                AIが生成する睡眠に最適な音楽で、質の高い休息をサポートします
              </p>
            </div>
            <AIMusicPlayer />
          </div>
        );
      
      case 'create':
        return (
          <div className="space-y-6">
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold mb-4">プレイリスト作成</h2>
              <p className="text-muted-foreground mb-6">
                あなただけの睡眠プレイリストを作成しましょう
              </p>
              <div className="bg-muted/50 border-2 border-dashed border-muted rounded-lg p-8">
                <p className="text-muted-foreground">
                  プレイリスト作成機能はPhase 2で実装予定です
                </p>
              </div>
            </div>
          </div>
        );
      
      case 'journal':
        return (
          <div className="space-y-6">
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold mb-4">睡眠ジャーナル</h2>
              <p className="text-muted-foreground mb-6">
                あなたの睡眠パターンと改善点を確認しましょう
              </p>
              <div className="bg-muted/50 border-2 border-dashed border-muted rounded-lg p-8">
                <p className="text-muted-foreground">
                  睡眠ジャーナル機能はPhase 2で実装予定です
                </p>
              </div>
            </div>
          </div>
        );
      
      case 'profile':
        return (
          <div className="space-y-6">
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold mb-4">プロフィール・設定</h2>
              <p className="text-muted-foreground mb-6">
                アカウント設定とアプリの設定を管理
              </p>
              <div className="flex flex-col gap-4 max-w-sm mx-auto">
                <button
                  onClick={() => isAuthenticated ? setShowProfile(true) : setShowAuth(true)}
                  className="flex items-center justify-center gap-2 bg-nocturne-deep hover:bg-nocturne-moon border border-nocturne-moon hover:border-nocturne-star text-nocturne-moon hover:text-nocturne-star p-4 rounded-lg transition-colors"
                >
                  <User className="w-5 h-5" />
                  {isAuthenticated ? 'プロフィール' : 'ログイン'}
                </button>
                
                <button
                  onClick={() => setShowSettings(true)}
                  className="flex items-center justify-center gap-2 bg-nocturne-deep hover:bg-nocturne-moon border border-nocturne-moon hover:border-nocturne-star text-nocturne-moon hover:text-nocturne-star p-4 rounded-lg transition-colors"
                >
                  <Settings className="w-5 h-5" />
                  設定
                </button>
              </div>
            </div>
          </div>
        );
      
      default:
        return <TonightDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-nocturne-night pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-nocturne-night/90 backdrop-blur-lg border-b border-nocturne-moon/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🌙</div>
              <h1 className="text-xl font-bold gradient-nocturne bg-clip-text text-transparent">
                Nocturne
              </h1>
            </div>
            
            {/* Quick Actions */}
            <div className="flex gap-2">
              {!isAuthenticated && (
                <button
                  onClick={() => setShowAuth(true)}
                  className="bg-nocturne-deep hover:bg-nocturne-moon border border-nocturne-moon hover:border-nocturne-star text-nocturne-moon hover:text-nocturne-star p-2 rounded-full transition-colors"
                >
                  <User className="w-4 h-4" />
                </button>
              )}
              
              <button
                onClick={() => setShowSettings(true)}
                className="bg-nocturne-deep hover:bg-nocturne-moon border border-nocturne-moon hover:border-nocturne-star text-nocturne-moon hover:text-nocturne-star p-2 rounded-full transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {renderContent()}
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation 
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Modals */}
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />

      <AuthModal 
        isOpen={showAuth} 
        onClose={() => setShowAuth(false)} 
      />

      <UserProfile 
        isOpen={showProfile} 
        onClose={() => setShowProfile(false)} 
      />
    </div>
  );
}