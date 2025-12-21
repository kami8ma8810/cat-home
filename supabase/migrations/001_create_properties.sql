-- =============================================
-- 物件テーブル (properties)
-- =============================================

CREATE TABLE IF NOT EXISTS properties (
  -- 基本ID
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT UNIQUE NOT NULL,        -- スクレイピング元のID
  source TEXT NOT NULL,                     -- データソース（suumo, homes, etc）

  -- 物件基本情報
  name TEXT NOT NULL,                       -- 物件名
  address TEXT NOT NULL,                    -- 住所
  prefecture TEXT NOT NULL,                 -- 都道府県
  city TEXT NOT NULL,                       -- 市区町村

  -- 費用
  rent INTEGER NOT NULL,                    -- 賃料（円）
  management_fee INTEGER DEFAULT 0,         -- 管理費（円）
  deposit INTEGER DEFAULT 0,                -- 敷金（円）
  key_money INTEGER DEFAULT 0,              -- 礼金（円）

  -- 物件詳細
  floor_plan TEXT,                          -- 間取り（1K, 2LDK等）
  area DECIMAL(6,2),                        -- 専有面積（m²）
  building_type TEXT,                       -- 建物種別（mansion, apartment等）
  floor INTEGER,                            -- 階数
  year_built INTEGER,                       -- 築年

  -- ペット条件（JSONB）
  pet_conditions JSONB DEFAULT '{}'::jsonb,
  -- {
  --   "catAllowed": true,
  --   "catLimit": 2,
  --   "dogAllowed": false,
  --   "smallDogOnly": false,
  --   "additionalDeposit": 50000,
  --   "notes": "猫2匹まで可"
  -- }

  -- 設備・特徴（配列）
  features TEXT[] DEFAULT '{}',

  -- 最寄り駅情報（JSONB配列）
  nearest_stations JSONB DEFAULT '[]'::jsonb,
  -- [
  --   { "line": "JR山手線", "station": "渋谷", "walkMinutes": 5 },
  --   { "line": "東京メトロ銀座線", "station": "表参道", "walkMinutes": 10 }
  -- ]

  -- 画像
  images TEXT[] DEFAULT '{}',               -- 画像URL配列

  -- 元URL
  source_url TEXT NOT NULL,                 -- 元サイトのURL

  -- ステータス
  is_active BOOLEAN DEFAULT true,           -- 掲載中フラグ

  -- タイムスタンプ
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),  -- 初回発見日時
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),   -- 最終確認日時
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- インデックス
-- =============================================

-- 検索用インデックス
CREATE INDEX IF NOT EXISTS idx_properties_prefecture ON properties(prefecture);
CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_rent ON properties(rent);
CREATE INDEX IF NOT EXISTS idx_properties_area ON properties(area);
CREATE INDEX IF NOT EXISTS idx_properties_is_active ON properties(is_active);
CREATE INDEX IF NOT EXISTS idx_properties_source ON properties(source);

-- 複合インデックス（よく使う検索パターン）
CREATE INDEX IF NOT EXISTS idx_properties_prefecture_rent ON properties(prefecture, rent);
CREATE INDEX IF NOT EXISTS idx_properties_active_rent ON properties(is_active, rent);

-- 日付インデックス
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_properties_last_seen_at ON properties(last_seen_at DESC);

-- =============================================
-- Row Level Security (RLS)
-- =============================================

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- 誰でも閲覧可能（公開データ）
CREATE POLICY "properties_select_policy" ON properties
  FOR SELECT
  USING (true);

-- 挿入・更新・削除は認証済みユーザーのみ（サービスロールキー使用時）
-- ※ スクレイピング時は service_role キーを使用
CREATE POLICY "properties_insert_policy" ON properties
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "properties_update_policy" ON properties
  FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "properties_delete_policy" ON properties
  FOR DELETE
  USING (auth.role() = 'service_role');

-- =============================================
-- 更新日時の自動更新トリガー
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================
-- コメント
-- =============================================

COMMENT ON TABLE properties IS '猫飼育可能賃貸物件データ';
COMMENT ON COLUMN properties.external_id IS 'スクレイピング元サイトでの物件ID';
COMMENT ON COLUMN properties.source IS 'データソース（suumo, homes, athome等）';
COMMENT ON COLUMN properties.pet_conditions IS 'ペット飼育条件（JSONB）';
COMMENT ON COLUMN properties.nearest_stations IS '最寄り駅情報（JSONB配列）';
