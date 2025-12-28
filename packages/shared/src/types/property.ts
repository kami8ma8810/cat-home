/** 物件の基本情報 */
export interface Property {
  /** 一意のID（UUID） */
  id: string
  /** スクレイピング元のID */
  externalId: string
  /** データソース（SUUMO, HOMES等） */
  source: PropertySource
  /** 物件名 */
  name: string
  /** 住所 */
  address: string
  /** 都道府県 */
  prefecture: string
  /** 市区町村 */
  city: string
  /** 賃料（円） */
  rent: number
  /** 管理費（円） */
  managementFee: number
  /** 敷金（円） */
  deposit: number
  /** 礼金（円） */
  keyMoney: number
  /** 間取り */
  floorPlan: string | null
  /** 専有面積（m²） */
  area: number | null
  /** 建物種別 */
  buildingType: BuildingType | null
  /** 階数 */
  floors: number | null
  /** 築年 */
  yearBuilt: number | null
  /** ペット条件詳細 */
  petConditions: PetConditions | null
  /** 設備・特徴 */
  features: string[]
  /** 最寄り駅情報 */
  nearestStations: NearestStation[]
  /** 画像URL配列 */
  images: string[]
  /** 元URL */
  sourceUrl: string
  /** 掲載中フラグ */
  isActive: boolean
  /** 初回発見日時 */
  firstSeenAt: string
  /** 最終確認日時 */
  lastSeenAt: string
  /** 作成日時 */
  createdAt: string
  /** 更新日時 */
  updatedAt: string
}

/** データソース */
export type PropertySource = 'suumo' | 'homes' | 'athome' | 'door' | 'chintai' | 'nifty' | 'other'

/** 建物種別 */
export type BuildingType = 'mansion' | 'apartment' | 'house' | 'terraced' | 'other'

/** ペット条件 */
export interface PetConditions {
  /** 猫飼育可 */
  catAllowed: boolean
  /** 猫の頭数制限 */
  catLimit: number | null
  /** 犬飼育可 */
  dogAllowed: boolean
  /** 小型犬のみ */
  smallDogOnly: boolean
  /** 追加敷金（円） */
  additionalDeposit: number | null
  /** 備考 */
  notes: string | null
}

/** 最寄り駅情報 */
export interface NearestStation {
  /** 路線名 */
  line: string
  /** 駅名 */
  station: string
  /** 徒歩（分） */
  walkMinutes: number | null
  /** バス（分） */
  busMinutes: number | null
}

/** 物件検索条件 */
export interface PropertySearchParams {
  /** キーワード */
  keyword?: string
  /** 都道府県 */
  prefecture?: string
  /** 市区町村 */
  city?: string
  /** 最低賃料 */
  rentMin?: number
  /** 最高賃料 */
  rentMax?: number
  /** 最小面積 */
  areaMin?: number
  /** 間取り */
  floorPlans?: string[]
  /** 築年数以内 */
  maxAge?: number
  /** 猫飼育可のみ */
  catOnly?: boolean
  /** ソート */
  sortBy?: PropertySortKey
  /** ソート順 */
  sortOrder?: 'asc' | 'desc'
  /** ページ番号 */
  page?: number
  /** 1ページあたりの件数 */
  perPage?: number
}

/** ソートキー */
export type PropertySortKey = 'rent' | 'area' | 'yearBuilt' | 'createdAt'

/** 物件一覧レスポンス */
export interface PropertyListResponse {
  /** 物件リスト */
  items: Property[]
  /** 総件数 */
  total: number
  /** 現在のページ */
  page: number
  /** 1ページあたりの件数 */
  perPage: number
  /** 総ページ数 */
  totalPages: number
}
