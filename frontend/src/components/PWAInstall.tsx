'use client';

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  showInstallPrompt, 
  isPWAInstalled, 
  isPWASupported,
  initPWAInstallPrompt 
} from '@/lib/pwa';

export function PWAInstall() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsInstalled(isPWAInstalled());
    setIsSupported(isPWASupported());

    if (!isPWAInstalled() && isPWASupported()) {
      // PWAインストール促進の初期化
      initPWAInstallPrompt();
      
      // 少し遅延してから表示（ユーザビリティのため）
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleInstall = async () => {
    const success = await showInstallPrompt();
    if (success) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // 一時的に非表示にする（セッションストレージに記録）
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  // インストール済み、サポートされていない、または一時的に非表示の場合は表示しない
  if (
    isInstalled || 
    !isSupported || 
    !showPrompt ||
    sessionStorage.getItem('pwa-prompt-dismissed')
  ) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <Card className="bg-nocturne-night border-nocturne-dream shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-nocturne-dream rounded-lg flex items-center justify-center">
                <Download className="w-5 h-5 text-white" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-nocturne-star mb-1">
                Nocturneをインストール
              </h3>
              <p className="text-xs text-nocturne-moon mb-3">
                ホーム画面に追加して、より快適にご利用いただけます
              </p>
              
              <div className="flex space-x-2">
                <Button
                  onClick={handleInstall}
                  size="sm"
                  className="bg-nocturne-dream hover:bg-nocturne-dream/80 text-white"
                >
                  インストール
                </Button>
                <Button
                  onClick={handleDismiss}
                  size="sm"
                  variant="ghost"
                  className="text-nocturne-moon hover:text-nocturne-star"
                >
                  後で
                </Button>
              </div>
            </div>
            
            <Button
              onClick={handleDismiss}
              size="sm"
              variant="ghost"
              className="flex-shrink-0 text-nocturne-moon hover:text-nocturne-star p-1"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}