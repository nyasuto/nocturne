/**
 * ユーザー設定とプリファレンスの管理
 */

export interface UserSettings {
  // 音響設定
  defaultVolume: number;
  fadeInDuration: number;
  fadeOutDuration: number;
  audioQuality: 'low' | 'medium' | 'high';
  
  // タイマー設定
  defaultTimer: number; // minutes
  autoStop: boolean;
  
  // テーマ・UI設定
  theme: 'dark' | 'light' | 'auto';
  language: 'ja' | 'en';
  animations: boolean;
  
  // 睡眠設定
  preferredCategories: string[];
  sleepGoal: number; // hours
  bedtimeReminder: boolean;
  reminderTime: string; // HH:MM format
  
  // プライバシー設定
  analytics: boolean;
  crashReports: boolean;
  
  // 高度な設定
  offlineMode: boolean;
  backgroundPlay: boolean;
  skipIntro: boolean;
}

export const defaultSettings: UserSettings = {
  // 音響設定
  defaultVolume: 100,
  fadeInDuration: 5,
  fadeOutDuration: 10,
  audioQuality: 'medium',
  
  // タイマー設定
  defaultTimer: 30,
  autoStop: true,
  
  // テーマ・UI設定
  theme: 'dark',
  language: 'ja',
  animations: true,
  
  // 睡眠設定
  preferredCategories: ['nature'],
  sleepGoal: 8,
  bedtimeReminder: false,
  reminderTime: '22:00',
  
  // プライバシー設定
  analytics: false,
  crashReports: false,
  
  // 高度な設定
  offlineMode: false,
  backgroundPlay: true,
  skipIntro: false,
};

const SETTINGS_KEY = 'nocturne-settings';

/**
 * 設定の読み込み
 */
export const loadSettings = (): UserSettings => {
  if (typeof window === 'undefined') {
    return defaultSettings;
  }

  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // デフォルト設定とマージ（新しい設定項目への対応）
      return { ...defaultSettings, ...parsed };
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }

  return defaultSettings;
};

/**
 * 設定の保存
 */
export const saveSettings = (settings: UserSettings): void => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
};

/**
 * 設定の初期化（工場出荷時設定に戻す）
 */
export const resetSettings = (): UserSettings => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SETTINGS_KEY);
  }
  return defaultSettings;
};

/**
 * 特定の設定項目を更新
 */
export const updateSetting = <K extends keyof UserSettings>(
  key: K,
  value: UserSettings[K]
): UserSettings => {
  const currentSettings = loadSettings();
  const newSettings = { ...currentSettings, [key]: value };
  saveSettings(newSettings);
  return newSettings;
};

/**
 * 設定のエクスポート
 */
export const exportSettings = (): string => {
  const settings = loadSettings();
  return JSON.stringify(settings, null, 2);
};

/**
 * 設定のインポート
 */
export const importSettings = (settingsJson: string): boolean => {
  try {
    const settings = JSON.parse(settingsJson) as Partial<UserSettings>;
    const validatedSettings = { ...defaultSettings, ...settings };
    saveSettings(validatedSettings);
    return true;
  } catch (error) {
    console.error('Failed to import settings:', error);
    return false;
  }
};

/**
 * 就寝時間リマインダーの設定
 */
export const setBedtimeReminder = (time: string, enabled: boolean): void => {
  updateSetting('reminderTime', time);
  updateSetting('bedtimeReminder', enabled);

  if (enabled && 'Notification' in window) {
    // 通知許可のリクエスト
    Notification.requestPermission();
  }
};

/**
 * 就寝時間チェック
 */
export const checkBedtimeReminder = (): boolean => {
  const settings = loadSettings();
  
  if (!settings.bedtimeReminder || typeof window === 'undefined') {
    return false;
  }

  const now = new Date();
  const [hours, minutes] = settings.reminderTime.split(':').map(Number);
  const reminderTime = new Date();
  reminderTime.setHours(hours, minutes, 0, 0);

  // 現在時刻が就寝時間の±5分以内かチェック
  const diff = Math.abs(now.getTime() - reminderTime.getTime());
  return diff <= 5 * 60 * 1000; // 5分以内
};