'use client';

import { useState } from 'react';
import { 
  Settings, 
  Volume2, 
  Clock, 
  Palette, 
  Shield, 
  Download,
  Upload,
  RotateCcw,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { useSettings } from '@/contexts/SettingsContext';
import { exportSettings, importSettings } from '@/lib/settings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, updateSettings, resetSettings } = useSettings();
  const [activeTab, setActiveTab] = useState('audio');

  if (!isOpen) return null;

  const handleExportSettings = () => {
    const settingsData = exportSettings();
    const blob = new Blob([settingsData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nocturne-settings.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (importSettings(content)) {
          window.location.reload(); // 設定を再読み込み
        } else {
          alert('設定ファイルの読み込みに失敗しました');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleResetSettings = () => {
    if (confirm('すべての設定を初期値にリセットしますか？')) {
      resetSettings();
    }
  };

  const tabs = [
    { id: 'audio', label: '音響', icon: Volume2 },
    { id: 'timer', label: 'タイマー', icon: Clock },
    { id: 'theme', label: 'テーマ', icon: Palette },
    { id: 'privacy', label: 'プライバシー', icon: Shield },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto bg-nocturne-night border-nocturne-moon">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-nocturne-star">
            <Settings className="w-5 h-5" />
            設定
          </CardTitle>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-nocturne-moon hover:text-nocturne-star"
          >
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="p-0">
          {/* タブナビゲーション */}
          <div className="flex border-b border-nocturne-deep">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'text-nocturne-dream border-b-2 border-nocturne-dream bg-nocturne-deep/20'
                      : 'text-nocturne-moon hover:text-nocturne-star hover:bg-nocturne-deep/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="p-6 space-y-6">
            {/* 音響設定 */}
            {activeTab === 'audio' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-nocturne-star mb-3">
                    デフォルト音量: {settings.defaultVolume}%
                  </label>
                  <Slider
                    value={[settings.defaultVolume]}
                    onValueChange={([value]) => updateSettings({ defaultVolume: value })}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-nocturne-star mb-3">
                    フェードイン時間: {settings.fadeInDuration}秒
                  </label>
                  <Slider
                    value={[settings.fadeInDuration]}
                    onValueChange={([value]) => updateSettings({ fadeInDuration: value })}
                    min={0}
                    max={30}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-nocturne-star mb-3">
                    フェードアウト時間: {settings.fadeOutDuration}秒
                  </label>
                  <Slider
                    value={[settings.fadeOutDuration]}
                    onValueChange={([value]) => updateSettings({ fadeOutDuration: value })}
                    min={0}
                    max={60}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-nocturne-star mb-3">
                    音質設定
                  </label>
                  <div className="flex gap-2">
                    {(['low', 'medium', 'high'] as const).map((quality) => (
                      <button
                        key={quality}
                        onClick={() => updateSettings({ audioQuality: quality })}
                        className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                          settings.audioQuality === quality
                            ? 'bg-nocturne-dream text-white'
                            : 'bg-nocturne-deep text-nocturne-moon hover:bg-nocturne-moon hover:text-nocturne-night'
                        }`}
                      >
                        {quality === 'low' ? '低' : quality === 'medium' ? '中' : '高'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* タイマー設定 */}
            {activeTab === 'timer' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-nocturne-star mb-3">
                    デフォルトタイマー: {settings.defaultTimer}分
                  </label>
                  <Slider
                    value={[settings.defaultTimer]}
                    onValueChange={([value]) => updateSettings({ defaultTimer: value })}
                    min={5}
                    max={120}
                    step={5}
                    className="w-full"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-nocturne-star">
                    自動停止を有効にする
                  </label>
                  <button
                    onClick={() => updateSettings({ autoStop: !settings.autoStop })}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      settings.autoStop 
                        ? 'bg-nocturne-dream' 
                        : 'bg-nocturne-deep'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      settings.autoStop ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-nocturne-star">
                    就寝時間リマインダー
                  </label>
                  <button
                    onClick={() => updateSettings({ bedtimeReminder: !settings.bedtimeReminder })}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      settings.bedtimeReminder 
                        ? 'bg-nocturne-dream' 
                        : 'bg-nocturne-deep'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      settings.bedtimeReminder ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>

                {settings.bedtimeReminder && (
                  <div>
                    <label className="block text-sm font-medium text-nocturne-star mb-3">
                      リマインダー時刻
                    </label>
                    <input
                      type="time"
                      value={settings.reminderTime}
                      onChange={(e) => updateSettings({ reminderTime: e.target.value })}
                      className="w-full p-2 bg-nocturne-deep border border-nocturne-moon rounded-lg text-nocturne-star"
                    />
                  </div>
                )}
              </div>
            )}

            {/* テーマ設定 */}
            {activeTab === 'theme' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-nocturne-star mb-3">
                    テーマ
                  </label>
                  <div className="flex gap-2">
                    {(['dark', 'light', 'auto'] as const).map((theme) => (
                      <button
                        key={theme}
                        onClick={() => updateSettings({ theme })}
                        className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                          settings.theme === theme
                            ? 'bg-nocturne-dream text-white'
                            : 'bg-nocturne-deep text-nocturne-moon hover:bg-nocturne-moon hover:text-nocturne-night'
                        }`}
                      >
                        {theme === 'dark' ? 'ダーク' : theme === 'light' ? 'ライト' : '自動'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-nocturne-star">
                    アニメーション効果
                  </label>
                  <button
                    onClick={() => updateSettings({ animations: !settings.animations })}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      settings.animations 
                        ? 'bg-nocturne-dream' 
                        : 'bg-nocturne-deep'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      settings.animations ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
              </div>
            )}

            {/* プライバシー設定 */}
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-nocturne-star">
                      使用状況の分析
                    </label>
                    <p className="text-xs text-nocturne-moon mt-1">
                      アプリの改善のために匿名データを送信します
                    </p>
                  </div>
                  <button
                    onClick={() => updateSettings({ analytics: !settings.analytics })}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      settings.analytics 
                        ? 'bg-nocturne-dream' 
                        : 'bg-nocturne-deep'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      settings.analytics ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-nocturne-star">
                      クラッシュレポート
                    </label>
                    <p className="text-xs text-nocturne-moon mt-1">
                      エラーの修正のためにクラッシュ情報を送信します
                    </p>
                  </div>
                  <button
                    onClick={() => updateSettings({ crashReports: !settings.crashReports })}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      settings.crashReports 
                        ? 'bg-nocturne-dream' 
                        : 'bg-nocturne-deep'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      settings.crashReports ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
              </div>
            )}

            {/* 設定の管理 */}
            <div className="border-t border-nocturne-deep pt-6">
              <h3 className="text-sm font-medium text-nocturne-star mb-4">設定の管理</h3>
              <div className="flex gap-3">
                <Button
                  onClick={handleExportSettings}
                  variant="outline"
                  size="sm"
                  className="border-nocturne-moon text-nocturne-star hover:bg-nocturne-deep"
                >
                  <Download className="w-4 h-4 mr-2" />
                  エクスポート
                </Button>
                
                <label className="cursor-pointer">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-nocturne-moon text-nocturne-star hover:bg-nocturne-deep"
                    asChild
                  >
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      インポート
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportSettings}
                    className="hidden"
                  />
                </label>

                <Button
                  onClick={handleResetSettings}
                  variant="outline"
                  size="sm"
                  className="border-red-500 text-red-400 hover:bg-red-500/10"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  リセット
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}