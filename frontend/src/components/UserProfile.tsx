'use client';

import { useState } from 'react';
import { User, TrendingUp, Clock, Flame, Star, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { getUserLevel } from '@/lib/auth';

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfile({ isOpen, onClose }: UserProfileProps) {
  const { user, stats, logout, isAuthenticated } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!isOpen) return null;

  if (!isAuthenticated || !user || !stats) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md bg-nocturne-night border-nocturne-moon">
          <CardContent className="p-6 text-center">
            <p className="text-nocturne-star mb-4">ログインしてプロフィールを表示</p>
            <Button onClick={onClose} variant="outline" className="border-nocturne-moon">
              閉じる
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const userLevel = getUserLevel(user.totalSleepTime);

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}時間${mins}分`;
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  const handleDeleteAccount = async () => {
    if (showDeleteConfirm) {
      const { deleteAccount } = await import('@/lib/auth');
      deleteAccount();
      window.location.reload();
    } else {
      setShowDeleteConfirm(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-auto bg-nocturne-night border-nocturne-moon">
        <CardHeader className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-nocturne-dream rounded-full flex items-center justify-center">
            <User className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-nocturne-star">{user.name}</CardTitle>
          <p className="text-sm text-nocturne-moon">{user.email}</p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* レベル情報 */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-nocturne-star mb-2">
              レベル {userLevel.level}
            </h3>
            <div className="w-full bg-nocturne-deep rounded-full h-3 mb-2">
              <div 
                className="bg-nocturne-dream h-3 rounded-full transition-all duration-500"
                style={{ width: `${userLevel.progress}%` }}
              />
            </div>
            <p className="text-sm text-nocturne-moon">
              次のレベルまで{formatTime(userLevel.nextLevelMinutes)}
            </p>
          </div>

          {/* 統計情報 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-nocturne-deep rounded-lg p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Flame className="w-5 h-5 text-orange-500" />
              </div>
              <p className="text-2xl font-bold text-nocturne-star">{stats.streak}</p>
              <p className="text-sm text-nocturne-moon">連続日数</p>
            </div>
            
            <div className="bg-nocturne-deep rounded-lg p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-nocturne-star">{stats.totalSessions}</p>
              <p className="text-sm text-nocturne-moon">総セッション数</p>
            </div>
            
            <div className="bg-nocturne-deep rounded-lg p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-nocturne-star">{formatTime(stats.totalSleepTime)}</p>
              <p className="text-sm text-nocturne-moon">総睡眠時間</p>
            </div>
            
            <div className="bg-nocturne-deep rounded-lg p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Star className="w-5 h-5 text-yellow-500" />
              </div>
              <p className="text-2xl font-bold text-nocturne-star">{formatTime(stats.averageSessionLength)}</p>
              <p className="text-sm text-nocturne-moon">平均セッション</p>
            </div>
          </div>

          {/* お気に入りジャーニー */}
          {stats.favoriteJourneys.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-nocturne-star mb-3">
                お気に入りジャーニー
              </h3>
              <div className="space-y-2">
                {stats.favoriteJourneys.map((journey, index) => (
                  <div 
                    key={journey.id}
                    className="flex items-center justify-between bg-nocturne-deep rounded-lg p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-nocturne-moon">#{index + 1}</span>
                      <span className="text-nocturne-star">{journey.title}</span>
                    </div>
                    <span className="text-sm text-nocturne-moon">
                      {journey.playCount}回再生
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* アクションボタン */}
          <div className="flex flex-col gap-3 pt-4 border-t border-nocturne-deep">
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-nocturne-moon text-nocturne-star hover:bg-nocturne-deep"
            >
              <LogOut className="w-4 h-4 mr-2" />
              ログアウト
            </Button>
            
            <Button
              onClick={onClose}
              className="bg-nocturne-dream hover:bg-nocturne-dream/80"
            >
              閉じる
            </Button>

            {/* アカウント削除 */}
            <div className="text-center pt-2">
              {showDeleteConfirm ? (
                <div className="space-y-2">
                  <p className="text-sm text-red-400">本当にアカウントを削除しますか？</p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      onClick={handleDeleteAccount}
                      size="sm"
                      variant="destructive"
                    >
                      削除する
                    </Button>
                    <Button
                      onClick={() => setShowDeleteConfirm(false)}
                      size="sm"
                      variant="ghost"
                      className="text-nocturne-moon"
                    >
                      キャンセル
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleDeleteAccount}
                  className="text-xs text-red-400 hover:text-red-300 underline"
                >
                  アカウントを削除
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}