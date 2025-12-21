# cat-home プロジェクト

## 概要

日本にある猫飼育可能な賃貸物件をアーカイブ・検索できるサービス。

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | Nuxt 3 + Nuxt UI v3 + Pinia |
| バックエンド | Supabase (PostgreSQL + Edge Functions) |
| ホスティング | Cloudflare Pages |
| スクレイピング | GitHub Actions + Cheerio |
| 認証 | Supabase Auth |
| ストレージ | Supabase Storage |
| モノレポ | Turborepo + pnpm workspace |

## ディレクトリ構造

```
cat-home/
├── apps/
│   └── web/                    # Nuxt 3 アプリ
├── packages/
│   ├── shared/                 # 共有型定義
│   └── scraper/                # スクレイパーロジック
├── supabase/
│   ├── functions/              # Edge Functions
│   └── migrations/             # DBマイグレーション
└── .github/workflows/          # GitHub Actions
```

## パッケージ構成

- `@cat-home/web` - Nuxt 3 フロントエンド
- `@cat-home/shared` - 共有型定義（Property, SearchParams など）
- `@cat-home/scraper` - スクレイピングロジック

## プロジェクト固有のルール

グローバル設定（`~/.claude/CLAUDE.md`）を継承。

### 追加ルール

- スクレイピングは `packages/scraper` で実装
- 型定義は `packages/shared` で一元管理
- Supabase のマイグレーションは `supabase/migrations` で管理
- Edge Functions は `supabase/functions` で実装
