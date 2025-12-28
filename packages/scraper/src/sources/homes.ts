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

/**
 * LIFULL HOME'S 物件情報スクレイパー
 *
 * @example
 * ```ts
 * const scraper = new HomesScraper()
 * const result = await scraper.scrapeList('https://www.homes.co.jp/chintai/ltag/284/tokyo/list/')
 * console.log(result.properties)
 * ```
 */
export class HomesScraper extends BaseScraper {
  readonly source = 'homes' as const

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
   * HOME'Sの構造: 建物カード(.mod-mergeBuilding--rent--photo) > 部屋リスト(.prg-roomList tr.prg-roomInfo)
   */
  parseListHtml(html: string): ScrapedProperty[] {
    const $ = cheerio.load(html)
    const properties: ScrapedProperty[] = []

    // デバッグ: 物件カードの数を確認
    const buildingCount = $('.mod-mergeBuilding--rent--photo').length
    console.log(`📦 HOME'S 建物カード数: ${buildingCount}`)

    if (buildingCount === 0) {
      console.warn('⚠️ 物件カードが見つかりません。HTML先頭500文字:')
      console.warn(html.slice(0, 500))
    }

    // 建物ごとにループ
    $('.mod-mergeBuilding--rent--photo').each((_, buildingElement) => {
      const $building = $(buildingElement)

      // 建物情報（共通）
      const name = $building.find('.bukkenName').text().trim()
      const address = $building.find('.bukkenSpec table tr').filter((_, el) => {
        return $(el).find('th').text().includes('所在地')
      }).find('td').text().trim()

      // 各部屋をループ
      $building.find('.prg-roomList tr.prg-roomInfo').each((_, roomElement) => {
        const $room = $(roomElement)

        // 詳細ページURL (data-href 属性から取得)
        const sourceUrl = $room.attr('data-href') || ''

        // external_id を URL から抽出
        // 例: /chintai/room/305282f37697179ed20bc96c9ebac105663de8fb/ → 305282f37697179ed20bc96c9ebac105663de8fb
        const externalIdMatch = sourceUrl.match(/\/chintai\/room\/([a-f0-9]+)\//)
        const externalId = externalIdMatch ? externalIdMatch[1] : ''

        if (!externalId) {
          console.warn(`⚠️ externalId が取得できませんでした: sourceUrl="${sourceUrl}"`)
          return // continue to next room
        }

        // 賃料 (「9.1万円」形式)
        const rentText = $room.find('.price .priceLabel .num').text().trim()
        const rent = this.parseRent(rentText + '万円')

        // 管理費 (「/8,000円」形式から抽出)
        const priceCell = $room.find('.price').first().text()
        const managementFeeMatch = priceCell.match(/\/([0-9,]+)円/)
        const managementFeeText = managementFeeMatch ? managementFeeMatch[1] + '円' : ''
        const managementFee = this.parseManagementFee(managementFeeText)

        // 間取り (.layout から間取りパターンを抽出)
        const layoutText = $room.find('.layout').text().trim()
        // 間取りパターン: 1R, 1K, 1DK, 1LDK, 2K, 2DK, 2LDK, ...
        const floorPlanMatch = layoutText.match(/^(\d+[SLDK]+R?|ワンルーム)/)
        const floorPlan = floorPlanMatch ? floorPlanMatch[1] : ''

        // 専有面積 (.layout の m² を含む部分)
        const areaMatch = layoutText.match(/([0-9.]+)m²/)
        const area = areaMatch ? parseFloat(areaMatch[1]) : 0

        properties.push({
          name,
          address,
          rent,
          managementFee,
          floorPlan,
          area,
          sourceUrl,
          externalId,
          source: 'homes',
        })
      })
    })

    return properties
  }

  /**
   * 賃料テキストを円に変換
   * 例: "9.1万円" → 91000, "10.05万円" → 100500, "-" → 0
   */
  parseRent(text: string): number {
    if (text === '-' || !text) {
      return 0
    }
    // 「9.1万円」などから数値部分を抽出
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
   * 例: "8,000円" → 8000, "5800円" → 5800, "-" → 0
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
