# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Nocturne（ノクターン）は、パーソナライズされた音楽と物語で質の高い睡眠をサポートするWebアプリケーションです。

## 技術スタック

### フロントエンド
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- shadcn/ui
- PWA対応

### バックエンド
- FastAPI
- SQLite + SQLAlchemy
- Pydantic
- Python 3.11+

## プロジェクト構造

```
nocturne/
├── backend/        # FastAPIバックエンド
└── frontend/       # Next.jsフロントエンド
```

## 開発コマンド

### バックエンド
```bash
# 仮想環境の有効化
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate

# 開発サーバー起動
uvicorn app.main:app --reload --port 8000

# コード品質チェック
black .           # フォーマット
mypy app          # 型チェック
pytest            # テスト実行

# データベース操作
alembic upgrade head    # マイグレーション実行
python -m app.database init  # DB初期化
```

### フロントエンド
```bash
cd frontend

# 開発サーバー起動
npm run dev

# コード品質チェック
npm run lint      # ESLint
npm run format    # Prettier
npm run test      # テスト実行

# ビルド
npm run build
npm run start     # プロダクションサーバー
```

## 開発規約

### Git ワークフロー
- 機能ブランチ: `feature/[機能名]`
- バグ修正: `fix/[バグ内容]`
- ドキュメント: `docs/[内容]`
- コミットメッセージは日本語でも可

### コーディング規約

#### Python (Backend)
- PEP 8準拠
- 型ヒント必須
- docstring記述推奨
- Blackでフォーマット

#### TypeScript (Frontend)
- 厳格モード使用
- 関数コンポーネントで記述
- カスタムフックでロジック分離
- インターフェース名は`I`プレフィックスなし

## APIエンドポイント構造

```
/api/v1/
├── /auth/          # 認証関連
├── /users/         # ユーザー管理
├── /journeys/      # 睡眠ジャーニー
├── /audio/         # 音源管理
├── /analytics/     # 睡眠分析
└── /settings/      # 設定管理
```

## デザインシステム

### カラーパレット
- Primary: `#1e3a5f` (深い夜空の青)
- Secondary: `#4a5568` (月明かりのグレー)
- Accent: `#805ad5` (夢見る紫)
- Background: `#0f1419` (夜の闇)
- Text: `#e2e8f0` (柔らかい星明かり)

### UIコンポーネント
- shadcn/uiベース
- ダークモード優先デザイン
- アクセシビリティ重視

## 環境変数

### Backend (.env)
```
DATABASE_URL=sqlite:///./database.db
SECRET_KEY=[生成された秘密鍵]
CORS_ORIGINS=http://localhost:3000
OPENAI_API_KEY=[オプション]
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=Nocturne
```

## 開発時の注意事項

1. **音源ファイル**: `frontend/public/audio/`に配置、ライセンスフリーのみ使用
2. **PWA対応**: Service Workerでオフライン動作を考慮
3. **レスポンシブ**: モバイルファースト設計
4. **パフォーマンス**: Lighthouse Score 90以上を目標
5. **セキュリティ**: 環境変数で機密情報管理、HTTPS必須（本番環境）

## テスト戦略

- ユニットテスト: 個別機能のテスト
- 統合テスト: APIエンドポイントのテスト
- E2Eテスト: ユーザーフローのテスト（Playwright推奨）

## よく使うスクリプト

```bash
# 初期セットアップ（両環境）
./scripts/setup.sh

# 音源登録
python scripts/register_audio.py --file [ファイル名] --category [カテゴリ]

# DBリセット
python scripts/reset_db.py
```