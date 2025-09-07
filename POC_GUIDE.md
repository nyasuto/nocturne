# 🌙 Nocturne PoC (Proof of Concept) ガイド

**バージョン**: v1.0.0  
**最終更新**: 2025年9月7日  
**ステータス**: ✅ 実行可能

## 📋 概要

NocturneのMVP（Minimum Viable Product）は完成し、PoCが開始できる状態です。このガイドでは実際の動作確認と検証項目を説明します。

## 🎯 PoCの目的

- **技術検証**: Web Audio API + Next.js/FastAPIの組み合わせ
- **ユーザー体験**: 睡眠支援アプリとしての基本機能
- **パフォーマンス**: 音源再生の安定性とレスポンス
- **UI/UX**: ダークモード最適化とモバイル対応

## 🚀 セットアップ手順

### 1. 前提条件
```bash
# Node.js 18+ と Python 3.11+ が必要
node --version  # v18.0.0+
python --version  # 3.11.0+
```

### 2. サーバー起動

#### バックエンド (port: 8000)
```bash
cd backend
source venv/bin/activate  # macOS/Linux
# または venv\Scripts\activate  # Windows

uvicorn app.main:app --reload --port 8000
```

#### フロントエンド (port: 3000)  
```bash
cd frontend
npm run dev
```

### 3. アクセス確認
- **フロントエンド**: http://localhost:3000
- **API Doc**: http://localhost:8000/api/v1/docs
- **Health Check**: http://localhost:8000/

## 🧪 PoC検証項目

### Phase 1: 基本機能テスト

#### ✅ データ取得確認
1. **ジャーニー一覧表示**
   - フロントエンド画面に3つのジャーニーが表示される
   - 「森と川のせせらぎ」「静かな海辺の夜」「星空の瞑想」

2. **API応答確認**
   ```bash
   curl http://localhost:8000/api/v1/journeys/ | jq
   ```

#### ✅ AudioEngine機能テスト
1. **プレイヤー起動**
   - ジャーニーカードの「プレイ」ボタンクリック
   - モーダルプレイヤー表示確認

2. **音源再生**
   - 再生ボタン押下で音が鳴る
   - 音量調整スライダー動作
   - タイマーカウントダウン

3. **制御機能**
   - 一時停止/再開
   - 停止機能
   - モーダル閉じる

#### ✅ UI/UX確認
1. **レスポンシブ対応**
   - デスクトップ表示 (1920x1080)
   - タブレット表示 (768x1024)  
   - モバイル表示 (375x667)

2. **ダークテーマ**
   - Nocturneカラーパレット適用
   - 視覚的統一性確認

### Phase 2: パフォーマンステスト

#### ⚡ 音源読み込み性能
```bash
# 音源ファイル確認
ls -la frontend/public/audio/
# Expected: silence.mp3, rain.mp3, ocean.mp3, forest.mp3
```

#### ⚡ API レスポンス性能  
```bash
# 応答時間測定
time curl -s http://localhost:8000/api/v1/journeys/ > /dev/null
# Expected: < 100ms
```

### Phase 3: ブラウザ互換性

| ブラウザ | 動作確認 | 備考 |
|---------|---------|------|
| Chrome 120+ | ✅ | 推奨環境 |
| Safari 17+ | ⚠️ | webkitAudioContext対応済み |
| Firefox 120+ | ✅ | 標準対応 |
| Edge 120+ | ✅ | Chromiumベース |

### Phase 4: 実用性テスト

#### 🎵 実際の睡眠シナリオ
1. **5分間テスト**
   - タイマー10分設定
   - 音量50%で開始
   - 5分経過後に状況確認

2. **マルチセグメント再生**
   - 「森と川のせせらぎ」選択
   - セグメント自動切り替え確認
   - フェード効果体験

## 📊 検証結果レポート

### ✅ 成功項目
- [x] 基本的なジャーニー再生機能
- [x] Web Audio API安定動作  
- [x] レスポンシブUI表示
- [x] REST API正常応答

### ⚠️ 改善点（将来実装）
- [ ] PWA対応（オフライン再生）
- [ ] ユーザー設定保存
- [ ] より多様な音源ライブラリ
- [ ] 睡眠データ分析機能

### 🐛 既知の制限
- 音源ファイルはテスト用合成音（実際の環境音ではない）
- ユーザーデータ永続化未実装
- プッシュ通知機能未実装

## 🔧 トラブルシューティング

### 音が再生されない場合
1. **ブラウザの自動再生ポリシー**
   - ユーザーインタラクション必須（プレイボタン押下）
   - Chrome://settings/content/sound で確認

2. **AudioContext状態確認**
   - コンソールでエラーログ確認
   - F12 → Console → 再生試行

### API接続エラー
```bash
# バックエンド起動確認
curl http://localhost:8000/health

# CORS設定確認  
curl -H "Origin: http://localhost:3000" http://localhost:8000/api/v1/journeys/
```

## 🚀 次のステップ

### Phase 2 開発候補
1. **PWA化** - オフライン対応とアプリインストール
2. **認証システム** - ユーザー個別データ管理
3. **睡眠分析** - 使用パターン追跡
4. **コンテンツ拡充** - 実際の環境音・音楽ライブラリ

### フィードバック収集
PoCテストの結果やユーザー体験について、以下の観点でフィードバックをお願いします：

- 音質・音量の適切性
- UI/UXの直感性  
- タイマー機能の実用性
- 全体的な睡眠支援効果

---

**🤖 Generated with Claude Code**  
**Contact**: 技術的な質問はGitHub Issues にて受付中