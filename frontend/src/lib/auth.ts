/**
 * 認証とユーザー管理（シンプルなローカルストレージベースの実装）
 */

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
  sleepGoal: number;
  totalSleepTime: number; // total minutes
  streak: number; // consecutive days
  favoriteCategories: string[];
}

export interface UserStats {
  totalSessions: number;
  totalSleepTime: number; // minutes
  averageSessionLength: number; // minutes
  streak: number;
  lastActiveDate: string;
  favoriteJourneys: Array<{
    id: number;
    title: string;
    playCount: number;
  }>;
}

const AUTH_KEY = 'nocturne-auth';
const USER_KEY = 'nocturne-user';
const USER_STATS_KEY = 'nocturne-user-stats';

/**
 * 現在のユーザーを取得
 */
export const getCurrentUser = (): User | null => {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
};

/**
 * ユーザーのログイン状態をチェック
 */
export const isAuthenticated = (): boolean => {
  return getCurrentUser() !== null;
};

/**
 * ユーザー登録（シンプルな実装）
 */
export const register = async (email: string, password: string, name: string): Promise<User> => {
  // 実際のアプリでは、これはAPIコールになります
  if (typeof window === 'undefined') {
    throw new Error('Registration not available on server side');
  }

  // 既存ユーザーのチェック（シンプルな実装）
  const existingUser = getCurrentUser();
  if (existingUser && existingUser.email === email) {
    throw new Error('このメールアドレスは既に登録されています');
  }

  const newUser: User = {
    id: Math.random().toString(36).substr(2, 9),
    email,
    name,
    createdAt: new Date().toISOString(),
    sleepGoal: 8, // デフォルト8時間
    totalSleepTime: 0,
    streak: 0,
    favoriteCategories: ['nature'],
  };

  // ローカルストレージに保存
  localStorage.setItem(USER_KEY, JSON.stringify(newUser));
  localStorage.setItem(AUTH_KEY, 'true');

  // 初期統計データを作成
  const initialStats: UserStats = {
    totalSessions: 0,
    totalSleepTime: 0,
    averageSessionLength: 0,
    streak: 0,
    lastActiveDate: new Date().toISOString(),
    favoriteJourneys: [],
  };

  localStorage.setItem(USER_STATS_KEY, JSON.stringify(initialStats));

  return newUser;
};

/**
 * ユーザーログイン
 */
export const login = async (email: string, password: string): Promise<User> => {
  // 実際のアプリでは、これはAPIコールになります
  if (typeof window === 'undefined') {
    throw new Error('Login not available on server side');
  }

  // シンプルな実装：既存ユーザーをチェック
  const existingUser = getCurrentUser();
  if (!existingUser || existingUser.email !== email) {
    throw new Error('ユーザーが見つかりません');
  }

  localStorage.setItem(AUTH_KEY, 'true');
  return existingUser;
};

/**
 * ユーザーログアウト
 */
export const logout = (): void => {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(AUTH_KEY);
  // ユーザーデータは残しておく（次回ログイン時に使用）
};

/**
 * ユーザー情報の更新
 */
export const updateUser = (updates: Partial<Omit<User, 'id' | 'createdAt'>>): User | null => {
  const currentUser = getCurrentUser();
  if (!currentUser) return null;

  const updatedUser = { ...currentUser, ...updates };
  localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
  return updatedUser;
};

/**
 * ユーザー統計の取得
 */
export const getUserStats = (): UserStats | null => {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(USER_STATS_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Failed to get user stats:', error);
    return null;
  }
};

/**
 * セッション記録の追加
 */
export const recordSession = (durationMinutes: number, journeyId: number, journeyTitle: string): void => {
  const stats = getUserStats();
  if (!stats) return;

  const now = new Date();
  const today = now.toDateString();
  const lastActiveDate = new Date(stats.lastActiveDate).toDateString();

  // 連続記録の更新
  if (today === lastActiveDate) {
    // 今日既にセッションがある場合は連続記録はそのまま
  } else if (new Date(today).getTime() - new Date(lastActiveDate).getTime() === 24 * 60 * 60 * 1000) {
    // 昨日から連続している場合
    stats.streak += 1;
  } else {
    // 連続が途切れた場合
    stats.streak = 1;
  }

  // 統計の更新
  stats.totalSessions += 1;
  stats.totalSleepTime += durationMinutes;
  stats.averageSessionLength = Math.round(stats.totalSleepTime / stats.totalSessions);
  stats.lastActiveDate = now.toISOString();

  // お気に入りジャーニーの更新
  const existingJourney = stats.favoriteJourneys.find(j => j.id === journeyId);
  if (existingJourney) {
    existingJourney.playCount += 1;
  } else {
    stats.favoriteJourneys.push({
      id: journeyId,
      title: journeyTitle,
      playCount: 1,
    });
  }

  // お気に入りジャーニーを再生回数順にソート（上位5つまで保持）
  stats.favoriteJourneys.sort((a, b) => b.playCount - a.playCount);
  stats.favoriteJourneys = stats.favoriteJourneys.slice(0, 5);

  localStorage.setItem(USER_STATS_KEY, JSON.stringify(stats));

  // ユーザー情報も更新
  const user = getCurrentUser();
  if (user) {
    updateUser({ 
      totalSleepTime: user.totalSleepTime + durationMinutes,
      streak: stats.streak,
    });
  }
};

/**
 * ゲストモードかどうかチェック
 */
export const isGuestMode = (): boolean => {
  return !isAuthenticated();
};

/**
 * ゲストデータをユーザーアカウントに移行
 */
export const migrateGuestData = (newUser: User): void => {
  // ゲストモードで蓄積されたデータをユーザーアカウントに移行
  // 実際のアプリでは、より複雑なデータ移行ロジックが必要
  const guestStats = getUserStats();
  if (guestStats) {
    updateUser({
      totalSleepTime: newUser.totalSleepTime + guestStats.totalSleepTime,
      streak: Math.max(newUser.streak, guestStats.streak),
    });
  }
};

/**
 * アカウント削除
 */
export const deleteAccount = (): void => {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(USER_STATS_KEY);
};

/**
 * ユーザーレベルの計算（ゲーミフィケーション）
 */
export const getUserLevel = (totalSleepTimeMinutes: number): { level: number; progress: number; nextLevelMinutes: number } => {
  // 簡単なレベル計算: 60時間（3600分）ごとにレベルアップ
  const minutesPerLevel = 60 * 60; // 60 hours
  const level = Math.floor(totalSleepTimeMinutes / minutesPerLevel) + 1;
  const currentLevelMinutes = (level - 1) * minutesPerLevel;
  const nextLevelMinutes = level * minutesPerLevel;
  const progress = ((totalSleepTimeMinutes - currentLevelMinutes) / minutesPerLevel) * 100;

  return {
    level,
    progress: Math.round(progress),
    nextLevelMinutes: nextLevelMinutes - totalSleepTimeMinutes,
  };
};