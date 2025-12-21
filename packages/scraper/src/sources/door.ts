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

const DOOR_BASE_URL = 'https://door.ac'

/**
 * DOOR賃貸 物件情報スクレイパー
 *
 * @example
 * ```ts
 * const scraper = new DoorScraper()
 * const result = await scraper.scrapeList('https://door.ac/specials/feature7/tokyo/list')
 * console.log(result.properties)
 * ```
 */
export class DoorScraper extends BaseScraper {
  readonly source = 'door' as const

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
   * 1つの建物（building-box）に複数の部屋が含まれる構造に対応
   */
  parseListHtml(html: string): ScrapedProperty[] {
    const $ = cheerio.load(html)
    const properties: ScrapedProperty[] = []

    // デバッグ: 物件カードの数を確認
    const buildingCount = $('.building-box').length
    console.log(`📦 物件カード数: ${buildingCount}`)

    // 物件カードが0件の場合、HTMLの先頭を出力してデバッグ
    if (buildingCount === 0) {
      console.warn('⚠️ 物件カードが見つかりません。HTML先頭500文字:')
      console.warn(html.slice(0, 500))
    }

    $('.building-box').each((_, element) => {
      const $building = $(element)

      // 建物情報（共通）
      const name = $building.find('.heading a').first().text().trim()
        .replace(/の賃貸物件情報$/, '') // 「〜の賃貸物件情報」を削除

      // 所在地を取得
      const address = $building.find('.description-item').first().find('dd').text().trim()

      // 各部屋をループ（1建物 = 複数部屋）
      $building.find('table.table-secondary tbody tr').each((_, roomRow) => {
        const $room = $(roomRow)

        // 詳細ページURL
        const href = $room.find('a.btn-secondary').attr('href') || ''
        const sourceUrl = href.startsWith('http') ? href : `${DOOR_BASE_URL}${href}`

        // external_id を URL から抽出
        // /buildings/{buildingId}/properties/{propertyId} → propertyId を使用
        const externalIdMatch = href.match(/\/properties\/([a-f0-9-]+)/)
        const externalId = externalIdMatch ? externalIdMatch[1] : ''

        // externalId が取れない場合はスキップ
        if (!externalId) {
          console.warn(`⚠️ externalId が取得できませんでした: href="${href}"`)
          return // continue to next room
        }

        // 賃料（万円単位のテキストを円に変換）
        const rentText = $room.find('em.emphasis-primary').text().trim()
        const rent = this.parseRent(rentText)

        // 管理費
        const cells = $room.find('td')
        const managementFeeText = cells.eq(2).text().trim()
        const managementFee = this.parseManagementFee(managementFeeText)

        // 間取り
        const floorPlan = cells.eq(4).text().trim()

        // 専有面積
        const areaText = cells.eq(5).text().trim()
        const area = this.parseArea(areaText)

        properties.push({
          name,
          address,
          rent,
          managementFee,
          floorPlan,
          area,
          sourceUrl,
          externalId,
          source: 'door',
        })
      })
    })

    return properties
  }

  /**
   * 賃料テキストを円に変換
   * 例: "6.3" → 63000, "11.5" → 115000
   */
  parseRent(text: string): number {
    if (!text || text === '-' || text === 'なし') {
      return 0
    }
    const match = text.match(/([0-9.]+)/)
    if (!match) {
      return 0
    }
    const value = parseFloat(match[1])
    if (isNaN(value)) {
      return 0
    }
    // 万円単位を円に変換
    return Math.round(value * 10000)
  }

  /**
   * 管理費テキストを円に変換
   * 例: "5,000円" → 5000, "1.2万円" → 12000, "なし" → 0
   */
  parseManagementFee(text: string): number {
    if (!text || text === '-' || text === 'なし') {
      return 0
    }
    // 万円表記の場合
    if (text.includes('万')) {
      const match = text.match(/([0-9.]+)/)
      if (match) {
        return Math.round(parseFloat(match[1]) * 10000)
      }
    }
    // 円表記の場合
    const value = parseInt(text.replace(/[^0-9]/g, ''), 10)
    return isNaN(value) ? 0 : value
  }

  /**
   * 面積テキストを数値に変換
   * 例: "37.26m²" → 37.26
   */
  parseArea(text: string): number {
    if (!text) {
      return 0
    }
    const match = text.match(/([0-9.]+)/)
    if (!match) {
      return 0
    }
    const value = parseFloat(match[1])
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
