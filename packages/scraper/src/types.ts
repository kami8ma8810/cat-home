import type { Property, PropertySource } from '@cat-home/shared'

/** スクレイピング設定 */
export interface ScraperConfig {
  /** リクエスト間隔（ミリ秒） */
  requestDelay: number
  /** User-Agent */
  userAgent: string
  /** robots.txt を尊重するか */
  respectRobotsTxt: boolean
  /** 最大同時接続数 */
  maxConcurrent: number
  /** 最大リトライ回数 */
  maxRetries: number
  /** リトライ間隔（ミリ秒） */
  retryDelay: number
}

/** デフォルトのスクレイピング設定 */
export const DEFAULT_SCRAPER_CONFIG: ScraperConfig = {
  requestDelay: 3000,
  // 一般的なブラウザの User-Agent を使用（ボット検出を回避）
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  respectRobotsTxt: true,
  maxConcurrent: 1,
  maxRetries: 3,
  retryDelay: 10000,
}

/** スクレイピング結果 */
export interface ScrapeResult {
  /** 成功したか */
  success: boolean
  /** 取得した物件（部分的なデータ） */
  properties: Partial<Property>[]
  /** エラー（あれば） */
  error?: string
  /** スクレイピング元 */
  source: PropertySource
  /** 処理時間（ミリ秒） */
  duration: number
}

/** スクレイパーインターフェース */
export interface Scraper {
  /** データソース名 */
  readonly source: PropertySource
  /** 物件一覧をスクレイピング */
  scrapeList(url: string): Promise<ScrapeResult>
  /** 物件詳細をスクレイピング */
  scrapeDetail(url: string): Promise<ScrapeResult>
}
