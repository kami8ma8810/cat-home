import type { PropertySource } from '@cat-home/shared'
import type { Scraper, ScraperConfig, ScrapeResult } from '../types'
import { DEFAULT_SCRAPER_CONFIG } from '../types'

/** スクレイパーの基底クラス */
export abstract class BaseScraper implements Scraper {
  abstract readonly source: PropertySource

  protected config: ScraperConfig

  constructor(config: Partial<ScraperConfig> = {}) {
    this.config = { ...DEFAULT_SCRAPER_CONFIG, ...config }
  }

  abstract scrapeList(url: string): Promise<ScrapeResult>
  abstract scrapeDetail(url: string): Promise<ScrapeResult>

  /** HTTPリクエストを実行（リトライ付き） */
  protected async fetchWithRetry(url: string): Promise<string> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': this.config.userAgent,
          },
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        return await response.text()
      }
      catch (error) {
        lastError = error as Error
        if (attempt < this.config.maxRetries - 1) {
          await this.delay(this.config.retryDelay)
        }
      }
    }

    throw lastError ?? new Error('Unknown error')
  }

  /** 指定時間待機 */
  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /** リクエスト間隔を確保 */
  protected async respectRateLimit(): Promise<void> {
    await this.delay(this.config.requestDelay)
  }
}
