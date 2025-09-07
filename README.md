# 🌙 Nocturne - AI睡眠サポートアプリ

## 📋 プロジェクト概要

**Nocturne（ノクターン）**は、パーソナライズされた音楽と物語で質の高い睡眠をサポートするWebアプリケーションです。夜想曲のように優しく、あなたを深い眠りへと導きます。

### 🎯 コアコンセプト
- **睡眠ジャーニー**: 優しいナレーションと音楽で、物語の世界へ導きながら自然な眠りを誘導
- **パーソナライズ**: ユーザーの睡眠パターンを学習し、最適な音源を自動選択
- **完全無料音源**: 高品質な無料音源のみを使用し、持続可能な開発を実現

## プロジェクト名について

**Nocturne（ノクターン）** という名前は、ショパンなどの作曲家が作った「夜想曲」から取られています。静かな夜に奏でられる優しい音楽のように、このアプリがユーザーを心地よい眠りへと導くことを願って名付けられました。

## 🚀 技術スタック

### フロントエンド
- **Next.js 14** - App Routerを使用
- **React 18** - UIコンポーネント
- **TypeScript** - 型安全な開発
- **Tailwind CSS** - スタイリング
- **shadcn/ui** - 美しいUIコンポーネント
- **PWA対応** - オフライン利用可能

### バックエンド
- **FastAPI** - 高速なPython Webフレームワーク
- **SQLite** - 軽量で設定不要なデータベース
- **SQLAlchemy** - ORM
- **Pydantic** - データバリデーション

### AI・音声機能
- **OpenAI TTS** - ナレーション音声生成（オプション）
- **Web Audio API** - 音源の動的制御
- **Stable Audio API** (オプション) - AI音楽生成

### インフラ
- **Vercel** - フロントエンドホスティング
- **ローカル環境** - 個人利用の場合は完全ローカルでOK

## 📁 プロジェクト構造

```
nocturne/
├── backend/                    # FastAPI バックエンド
│   ├── app/
│   │   ├── main.py            # アプリケーションエントリポイント
│   │   ├── models/            # SQLAlchemyモデル
│   │   ├── schemas/           # Pydanticスキーマ
│   │   ├── routers/           # APIルート
│   │   ├── services/          # ビジネスロジック
│   │   └── database.py        # データベース設定
│   ├── migrations/            # Alembicマイグレーション
│   ├── tests/                 # テスト
│   ├── scripts/               # ユーティリティスクリプト
│   ├── database.db            # SQLiteデータベース
│   ├── requirements.txt       # Python依存関係
│   └── .env                   # 環境変数
│
├── frontend/                   # Next.js フロントエンド
│   ├── app/                   # App Router
│   │   ├── (auth)/            # 認証関連ページ
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (main)/            # メインアプリ
│   │   │   ├── journey/       # 睡眠ジャーニー
│   │   │   ├── library/       # 音源ライブラリ
│   │   │   ├── profile/       # ユーザープロフィール
│   │   │   └── settings/      # 設定
│   │   ├── api/               # API Routes (BFF用)
│   │   └── layout.tsx
│   ├── components/            # Reactコンポーネント
│   │   ├── audio/             # 音声プレイヤー関連
│   │   ├── journey/           # ジャーニー関連
│   │   └── ui/                # 汎用UIコンポーネント
│   ├── lib/                   # ユーティリティ
│   │   ├── audio/             # 音源処理
│   │   ├── ai/                # AI関連
│   │   └── api/               # API通信クライアント
│   ├── public/                # 静的ファイル
│   │   └── audio/             # ローカル音源
│   ├── package.json
│   └── .env.local             # 環境変数
│
└── docs/                       # ドキュメント
    ├── CLAUDE.md              # Claude Code用開発ガイド
    └── API.md                 # API仕様書
```

## 🔧 開発環境セットアップ

### 必要な環境
- Python 3.11 以上
- Node.js 20.x 以上
- npm または yarn
- Git

### インストール手順

```bash
# リポジトリのクローン
git clone https://github.com/[your-username]/nocturne.git
cd nocturne

# バックエンドのセットアップ
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# データベースの初期化
python -m app.database init

# フロントエンドのセットアップ
cd ../frontend
npm install

# 環境変数の設定
cp .env.example .env.local
# .env.localを編集して必要な値を設定
```

### 開発サーバーの起動

```bash
# Terminal 1: バックエンド
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Terminal 2: フロントエンド
cd frontend
npm run dev
```

アプリケーションは http://localhost:3000 でアクセスできます。

### 環境変数

**Backend (.env)**
```env
DATABASE_URL=sqlite:///./database.db
SECRET_KEY=your-secret-key-here-change-in-production
CORS_ORIGINS=http://localhost:3000

# OpenAI (オプション)
OPENAI_API_KEY=sk-...

# Stable Audio (オプション)
STABLE_AUDIO_API_KEY=...
```

**Frontend (.env.local)**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=Nocturne
```

## 🎵 音源管理

### 無料音源の取得先

1. **YouTube Audio Library**
   - https://www.youtube.com/audiolibrary
   - 商用利用可能、帰属表示不要

2. **Freesound.org**
   - https://freesound.org
   - CC0ライセンスの音源を選択

3. **Free Music Archive**
   - https://freemusicarchive.org
   - CCライセンスの音源

### 音源の追加方法

```bash
# 音源を適切なディレクトリに配置
frontend/public/audio/nature/ocean-waves.mp3

# メタデータを登録
cd backend
python scripts/register_audio.py --file ocean-waves.mp3 --category nature
```

## 🚦 開発フロー

### フェーズ1: MVP (2週間)
- [x] プロジェクト構造のセットアップ
- [ ] 基本的なUIの実装
- [ ] 音源プレイヤーの実装
- [ ] 3つの睡眠ジャーニーストーリー
- [ ] タイマー機能
- [ ] PWA対応

### フェーズ2: パーソナライゼーション (1ヶ月)
- [ ] ユーザー登録・ログイン
- [ ] 睡眠記録の保存
- [ ] お気に入り機能
- [ ] 睡眠パターンの分析
- [ ] AIによる音源推薦

### フェーズ3: 高度な機能 (2ヶ月)
- [ ] リアルタイムナレーション生成
- [ ] バイノーラルビート
- [ ] ウェアラブルデバイス連携
- [ ] ソーシャル機能（オプション）

## 📝 コマンド一覧

### バックエンド開発
```bash
cd backend
uvicorn app.main:app --reload     # 開発サーバー起動
pytest                             # テスト実行
black .                            # コードフォーマット
mypy app                           # 型チェック
alembic upgrade head               # DBマイグレーション
```

### フロントエンド開発
```bash
cd frontend
npm run dev                        # 開発サーバー起動
npm run build                      # プロダクションビルド
npm run start                      # プロダクションサーバー起動
npm run lint                       # ESLint実行
npm run format                     # Prettier実行
npm run test                       # テスト実行
```

## 🧪 テスト戦略

### ユニットテスト
- 音源フェード処理のテスト
- プレイリスト生成ロジックのテスト
- パーソナライゼーションアルゴリズムのテスト

### 統合テスト
- API エンドポイントのテスト
- データベース操作のテスト

### E2Eテスト
- ジャーニー開始から終了までのフロー
- タイマー機能の動作確認
- PWAオフライン動作

## 🎨 UI/UXデザインガイドライン

### デザイン原則
- **ダークモード優先**: 睡眠前の使用を考慮
- **最小限のインタラクション**: 簡単な操作で睡眠開始
- **視覚的な静けさ**: 落ち着いた色彩、滑らかなアニメーション

### カラーパレット
```css
--primary: #1e3a5f      /* 深い夜空の青 */
--secondary: #4a5568    /* 月明かりのグレー */
--accent: #805ad5       /* 夢見る紫 */
--background: #0f1419   /* 夜の闇 */
--text: #e2e8f0        /* 柔らかい星明かり */
```

## 🤝 コントリビューション

### 開発に参加する方法

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

### コーディング規約

**Python (Backend)**
- PEP 8 準拠
- 型ヒントを使用
- docstringを記述

**TypeScript (Frontend)**
- 厳格モードを使用
- 関数コンポーネントで記述
- カスタムフックでロジックを分離

## 📊 パフォーマンス目標

- **First Contentful Paint**: < 1.5秒
- **Time to Interactive**: < 3秒
- **Lighthouse Score**: > 90
- **音源ロード時間**: < 2秒
- **API レスポンス時間**: < 200ms

## 🔒 セキュリティ考慮事項

- SQLインジェクション対策（SQLAlchemy使用）
- XSS対策（React自動エスケープ）
- CORS設定の適切な管理
- 環境変数による機密情報の管理
- HTTPS必須（プロダクション環境）

## 📜 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照

## 🙏 謝辞

- 音源提供: YouTube Audio Library, Freesound.org
- インスピレーション: ショパンの夜想曲
- 開発サポート: Claude (Anthropic)

## 📞 お問い合わせ

- Issue: [GitHub Issues](https://github.com/[your-username]/nocturne/issues)
- Email: [your-email]
- Twitter: [@your-twitter]

---

**Nocturne** - 夜想曲が奏でる、最高の睡眠体験を。 🌙✨