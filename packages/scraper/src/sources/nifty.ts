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
 * ニフティ不動産 物件情報スクレイパー
 *
 * 注意: ニフティ不動産はアグリゲーターサイトのため、
 * SUUMO/HOME'S/athome などと重複するデータがある可能性があります。
 *
 * @example
 * ```ts
 * const scraper = new NiftyScraper()
 * const result = await scraper.scrapeList('https://myhome.nifty.com/rent/ft_pet/tokyo/search/')
 * console.log(result.properties)
 * ```
 */
export class NiftyScraper extends BaseScraper {
  readonly source = 'nifty' as const

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
   * ニフティ不動産の構造: 物件カード(li.result-bukken-list) > 部屋リスト(.result-bukken-table tbody.click-area)
   */
  parseListHtml(html: string): ScrapedProperty[] {
    const $ = cheerio.load(html)
    const properties: ScrapedProperty[] = []

    // デバッグ: 物件カードの数を確認
    const buildingCount = $('li.result-bukken-list').length
    console.log(`📦 ニフティ不動産 建物カード数: ${buildingCount}`)

    if (buildingCount === 0) {
      console.warn('⚠️ 物件カードが見つかりません。HTML先頭500文字:')
      console.warn(html.slice(0, 500))
    }

    // 建物ごとにループ
    $('li.result-bukken-list').each((_, buildingElement) => {
      const $building = $(buildingElement)

      // 建物名（h2 a のテキスト、「〜の賃貸物件」を除去）
      const rawName = $building.find('h2 a').text().trim()
      const name = this.cleanBuildingName(rawName)

      // 住所（地図マーカーの後のテキスト）
      const address = $building.find('svg[role="img"] title:contains("地図マーカー")')
        .closest('.box')
        .next('.box')
        .find('p')
        .text()
        .trim()

      // 各部屋をループ
      $building.find('.result-bukken-table tbody.click-area').each((_, roomElement) => {
        const $room = $(roomElement)

        // external_id（data-detail-id 属性から取得）
        const externalId = $room.find('a[data-detail-id]').attr('data-detail-id') || ''

        if (!externalId) {
          console.warn(`⚠️ externalId が取得できませんでした`)
          return // continue to next room
        }

        // 詳細ページURL
        const detailPath = $room.find('a[data-detail-id]').attr('href') || ''
        const sourceUrl = detailPath ? `https://myhome.nifty.com${detailPath}` : ''

        // 賃料（span.is-xl から数値を取得、万円単位）
        const rentText = $room.find('.bukken-info-rent .text.is-xl').text().trim()
        const rent = this.parseRent(rentText)

        // 管理費（.bukken-info-rent の2番目の p）
        const managementFeeText = $room.find('.bukken-info-rent p').eq(1).text().trim()
        const managementFee = this.parseManagementFee(managementFeeText)

        // 間取り・専有面積（テーブルセルから抽出）
        // data-link-wrap-item 属性付きセル: eq(0)=階数, eq(1)=間取り/面積, eq(2)=賃料
        const $layoutCell = $room.find('tr:first-child td[data-link-wrap-item]').eq(1)
        const floorPlan = $layoutCell.find('p').eq(0).text().trim()
        const areaText = $layoutCell.find('p').eq(1).text().trim()
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
          source: 'nifty',
        })
      })
    })

    return properties
  }

  /**
   * 建物名から「〜の賃貸物件」「〜の賃貸物件情報」を除去
   */
  cleanBuildingName(name: string): string {
    return name.replace(/の賃貸物件(情報)?$/, '').trim()
  }

  /**
   * 賃料テキストを円に変換
   * 例: "18" → 180000, "17.7" → 177000, "-" → 0
   */
  parseRent(text: string): number {
    if (text === '-' || !text) {
      return 0
    }
    // 数値部分を抽出
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
   * 例: "12,000円" → 12000, "5,000円" → 5000, "-" → 0
   */
  parseManagementFee(text: string): number {
    if (text === '-' || !text) {
      return 0
    }
    const value = parseInt(text.replace(/[^0-9]/g, ''), 10)
    return isNaN(value) ? 0 : value
  }

  /**
   * 専有面積テキストを数値に変換
   * 例: "34.54㎡" → 34.54, "25.0㎡" → 25.0
   */
  parseArea(text: string): number {
    if (!text || text === '-') {
      return 0
    }
    // ㎡の前の数値を抽出
    const match = text.match(/([0-9.]+)\s*㎡/)
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
