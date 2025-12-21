import type { Property, PropertySource } from '@cat-home/shared'
import type { ScraperConfig, ScrapeResult } from '../types'
import * as cheerio from 'cheerio'
import { BaseScraper } from './base'

interface ScrapedProperty {
  name: string
  address: string
  rent: number
  managementFee: number
  floorPlan: string
  area: number
  sourceUrl: string
  externalId: string
  source: PropertySource
}

const SUUMO_BASE_URL = 'https://suumo.jp'

/**
 * SUUMO 物件情報スクレイパー
 *
 * @example
 * ```ts
 * const scraper = new SuumoScraper()
 * const result = await scraper.scrapeList('https://suumo.jp/chintai/tokyo/...')
 * console.log(result.properties)
 * ```
 */
export class SuumoScraper extends BaseScraper {
  readonly source = 'suumo' as const

  constructor(config: Partial<ScraperConfig> = {}) {
    super(config)
  }

  /**
   * 物件一覧ページをスクレイピング
   */
  async scrapeList(url: string): Promise<ScrapeResult> {
    const startTime = Date.now()

    try {
      await this.respectRateLimit()
      const html = await this.fetchWithRetry(url)
      const properties = this.parseListHtml(html)

      return {
        success: true,
        properties: properties.map(p => this.toPartialProperty(p)),
        source: this.source,
        duration: Date.now() - startTime,
      }
    }
    catch (error) {
      return {
        success: false,
        properties: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        source: this.source,
        duration: Date.now() - startTime,
      }
    }
  }

  /**
   * 物件詳細ページをスクレイピング（未実装）
   */
  async scrapeDetail(_url: string): Promise<ScrapeResult> {
    // TODO: 詳細ページのパース実装
    return {
      success: false,
      properties: [],
      error: 'Not implemented',
      source: this.source,
      duration: 0,
    }
  }

  /**
   * 物件一覧HTMLをパースして物件情報を抽出する
   */
  parseListHtml(html: string): ScrapedProperty[] {
    const $ = cheerio.load(html)
    const properties: ScrapedProperty[] = []

    $('.cassetteitem').each((_, element) => {
      const $item = $(element)

      // 物件名と詳細ページURL
      const $titleLink = $item.find('.cassetteitem_content-title a')
      const name = $titleLink.text().trim()
      const href = $titleLink.attr('href') || ''
      const sourceUrl = href.startsWith('http') ? href : `${SUUMO_BASE_URL}${href}`

      // external_id を URL から抽出（例: /chintai/jnc_000000001/ → jnc_000000001）
      const externalIdMatch = href.match(/\/chintai\/([^/]+)\//)
      const externalId = externalIdMatch ? externalIdMatch[1] : ''

      // 住所
      const address = $item
        .find('.cassetteitem_detail-col1 .cassetteitem_detail-text')
        .first()
        .text()
        .trim()

      // 賃料（万円単位のテキストを円に変換）
      const rentText = $item
        .find('.cassetteitem_price--rent .cassetteitem_other-emphasis')
        .text()
        .trim()
      const rent = this.parseRent(rentText)

      // 管理費
      const managementFeeText = $item
        .find('.cassetteitem_price--administration span')
        .text()
        .trim()
      const managementFee = this.parseManagementFee(managementFeeText)

      // 間取り
      const floorPlan = $item.find('.cassetteitem_madori span').text().trim()

      // 専有面積
      const areaText = $item.find('.cassetteitem_menseki span').text().trim()
      const area = parseFloat(areaText) || 0

      properties.push({
        name,
        address,
        rent,
        managementFee,
        floorPlan,
        area,
        sourceUrl,
        externalId,
        source: 'suumo',
      })
    })

    return properties
  }

  /**
   * 賃料テキストを円に変換
   * 例: "8.5" → 85000, "12" → 120000, "-" → 0
   */
  parseRent(text: string): number {
    if (text === '-' || !text) {
      return 0
    }
    const value = parseFloat(text)
    if (isNaN(value)) {
      return 0
    }
    // 万円単位を円に変換
    return Math.round(value * 10000)
  }

  /**
   * 管理費テキストを円に変換
   * 例: "5000" → 5000, "-" → 0
   */
  parseManagementFee(text: string): number {
    if (text === '-' || !text) {
      return 0
    }
    const value = parseInt(text.replace(/[^0-9]/g, ''), 10)
    return isNaN(value) ? 0 : value
  }

  /**
   * ScrapedProperty を Partial<Property> に変換
   */
  private toPartialProperty(scraped: ScrapedProperty): Partial<Property> {
    // 住所から都道府県・市区町村を抽出
    const { prefecture, city } = this.parseAddress(scraped.address)

    return {
      externalId: scraped.externalId,
      source: scraped.source,
      name: scraped.name,
      address: scraped.address,
      prefecture,
      city,
      rent: scraped.rent,
      managementFee: scraped.managementFee,
      floorPlan: scraped.floorPlan,
      area: scraped.area,
      sourceUrl: scraped.sourceUrl,
    }
  }

  /**
   * 住所から都道府県・市区町村を抽出
   */
  private parseAddress(address: string): { prefecture: string; city: string } {
    // 都道府県を抽出（北海道、東京都、大阪府、京都府、〜県）
    const prefectureMatch = address.match(
      /^(北海道|東京都|大阪府|京都府|.{2,3}県)/,
    )
    const prefecture = prefectureMatch ? prefectureMatch[1] : ''

    // 市区町村を抽出（〜市、〜区、〜町、〜村）
    const cityMatch = address.match(
      /(?:北海道|東京都|大阪府|京都府|.{2,3}県)(.+?[市区町村])/,
    )
    const city = cityMatch ? cityMatch[1] : ''

    return { prefecture, city }
  }
}
