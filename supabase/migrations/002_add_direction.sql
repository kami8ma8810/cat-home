-- 物件の向きカラムを追加
ALTER TABLE properties ADD COLUMN IF NOT EXISTS direction TEXT;

-- コメント
COMMENT ON COLUMN properties.direction IS '向き（north, northeast, east, southeast, south, southwest, west, northwest）';

-- 向きでのフィルタリング用インデックス（任意）
CREATE INDEX IF NOT EXISTS idx_properties_direction ON properties(direction);
