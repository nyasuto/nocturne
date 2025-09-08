'use client';

import { useState } from 'react';
import { User, Mail, Lock, Eye, EyeOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        await login(formData.email, formData.password);
      } else {
        await register(formData.email, formData.password, formData.name);
      }
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError(null);
    setFormData({ name: '', email: '', password: '' });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-nocturne-night border-nocturne-moon">
        <CardHeader className="relative">
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 text-nocturne-moon hover:text-nocturne-star"
          >
            <X className="w-4 h-4" />
          </Button>
          
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-nocturne-dream rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-nocturne-star">
              {mode === 'login' ? 'ログイン' : '新規登録'}
            </CardTitle>
            <p className="text-sm text-nocturne-moon mt-2">
              {mode === 'login' 
                ? 'アカウントにログインしてください' 
                : '新しいアカウントを作成しましょう'
              }
            </p>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-nocturne-star">
                  お名前
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-nocturne-moon" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={handleInputChange('name')}
                    className="w-full pl-10 pr-4 py-2 bg-nocturne-deep border border-nocturne-moon rounded-lg text-nocturne-star placeholder-nocturne-moon focus:outline-none focus:border-nocturne-dream"
                    placeholder="山田太郎"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-nocturne-star">
                メールアドレス
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-nocturne-moon" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange('email')}
                  className="w-full pl-10 pr-4 py-2 bg-nocturne-deep border border-nocturne-moon rounded-lg text-nocturne-star placeholder-nocturne-moon focus:outline-none focus:border-nocturne-dream"
                  placeholder="example@email.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-nocturne-star">
                パスワード
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-nocturne-moon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  className="w-full pl-10 pr-12 py-2 bg-nocturne-deep border border-nocturne-moon rounded-lg text-nocturne-star placeholder-nocturne-moon focus:outline-none focus:border-nocturne-dream"
                  placeholder="パスワード"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-nocturne-moon hover:text-nocturne-star"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {mode === 'register' && (
                <p className="text-xs text-nocturne-moon">
                  パスワードは6文字以上で入力してください
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-nocturne-dream hover:bg-nocturne-dream/80"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  {mode === 'login' ? 'ログイン中...' : '登録中...'}
                </>
              ) : (
                mode === 'login' ? 'ログイン' : '新規登録'
              )}
            </Button>
          </form>

          <div className="text-center space-y-3 pt-4 border-t border-nocturne-deep">
            <p className="text-sm text-nocturne-moon">
              {mode === 'login' ? 'アカウントをお持ちでないですか？' : '既にアカウントをお持ちですか？'}
            </p>
            <Button
              onClick={switchMode}
              variant="ghost"
              size="sm"
              className="text-nocturne-dream hover:text-nocturne-dream/80"
            >
              {mode === 'login' ? '新規登録' : 'ログイン'}
            </Button>
          </div>

          <div className="text-center">
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-nocturne-moon hover:text-nocturne-star"
            >
              ゲストとして続ける
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}