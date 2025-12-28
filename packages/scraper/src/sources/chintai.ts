import type { Property, PropertySource } from '@cat-home/shared'
import type { ScraperConfig, ScrapeResult } from '../types'
import * as cheerio from 'cheerio'
import { BaseScraper } from './base'

interface ScrapedProperty {
  name: string
  address: string
  rent: number
  managementFee: number
  deposit: number
  keyMoney: number
  floorPlan: string
  area: number
  sourceUrl: string
  externalId: string
  source: PropertySource
}

/**
 * CHINTAIネット 物件情報スクレイパー
 *
 * @example
 * ```ts
 * const scraper = new ChintaiScraper()
 * const result = await scraper.scrapeList('https://www.chintai.net/tokyo/area/13100/list/pet/')
 * console.log(result.properties)
 * ```
 */
export class ChintaiScraper extends BaseScraper {
  readonly source = 'chintai' as const

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
   * CHINTAIネットの構造: 建物カード(.cassette_item.build) > 部屋リスト(.cassette_detail tbody)
   */
  parseListHtml(html: string): ScrapedProperty[] {
    const $ = cheerio.load(html)
    const properties: ScrapedProperty[] = []

    // デバッグ: 物件カードの数を確認
    const buildingCount = $('section.cassette_item.build').length
    console.log(`📦 CHINTAIネット 建物カード数: ${buildingCount}`)

    if (buildingCount === 0) {
      console.warn('⚠️ 物件カードが見つかりません。HTML先頭500文字:')
      console.warn(html.slice(0, 500))
    }

    // 建物ごとにループ
    $('section.cassette_item.build').each((_, buildingElement) => {
      const $building = $(buildingElement)

      // 建物名（h2から建物種別スパンを除いたテキスト）
      const h2Text = $building.find('.cassette_ttl.ttl_main h2').text().trim()
      // 「賃貸マンション」「賃貸アパート」などのプレフィックスを除去
      const name = h2Text.replace(/^賃貸(マンション|アパート|一戸建て|テラスハウス)/, '').trim()

      // 住所
      const $infoTable = $building.find('.bukken_information table')
      const address = $infoTable.find('tr:first-child td:first-of-type').text().trim()

      // 各部屋をループ
      $building.find('.cassette_detail tbody').each((_, roomElement) => {
        const $room = $(roomElement)

        // external_id（data-bkkey 属性から取得）
        const externalId = $room.attr('data-bkkey') || ''

        if (!externalId) {
          console.warn(`⚠️ externalId が取得できませんでした`)
          return // continue to next room
        }

        // 詳細ページURL（data-detailurl 属性から取得）
        const detailUrl = $room.attr('data-detailurl') || ''
        const sourceUrl = detailUrl ? `https://www.chintai.net${detailUrl}` : ''

        // 賃料（「15.2万円」形式 - .num クラスから数値を取得）
        const rentNum = $room.find('.price .num').text().trim()
        const rent = this.parseRent(rentNum + '万円')

        // 管理費（価格セルの2行目）
        const priceText = $room.find('.price').text()
        // 「15.2万円<br>10,000円」のような形式から管理費を抽出
        const managementFeeMatch = priceText.match(/万円[\s\S]*?(\d{1,3}(?:,\d{3})*円|-)/)
        const managementFeeText = managementFeeMatch ? managementFeeMatch[1] : ''
        const managementFee = this.parseManagementFee(managementFeeText)

        // 敷金・礼金
        const $otherPrice = $room.find('.other_price')
        const otherPriceSpans = $otherPrice.find('span')
        const depositText = otherPriceSpans.eq(0).text().trim()
        const keyMoneyText = otherPriceSpans.eq(1).text().trim()
        const deposit = this.parseDeposit(depositText)
        const keyMoney = this.parseDeposit(keyMoneyText)

        // 間取り・専有面積（テーブルセルのテキストから抽出）
        // hidden input から取得するのがより確実
        const floorPlanFromInput = $room.find('input.madori').val() as string || ''
        const areaFromInput = $room.find('input.senMenseki').val() as string || ''

        // hidden input がなければテーブルセルから抽出
        let floorPlan = floorPlanFromInput
        let area = areaFromInput ? parseFloat(areaFromInput) : 0

        if (!floorPlan || !area) {
          // テーブルセルから間取りと面積を抽出（「1K<br>25.05m²」形式）
          const layoutCellText = $room.find('tr.detail-inner td').filter((_, el) => {
            const text = $(el).text()
            return text.includes('m') && !$(el).hasClass('price')
          }).first().text()

          if (layoutCellText) {
            const floorPlanMatch = layoutCellText.match(/^(\d+[SLDK]+R?|ワンルーム)/)
            if (floorPlanMatch && !floorPlan) {
              floorPlan = floorPlanMatch[1]
            }

            if (!area) {
              area = this.parseArea(layoutCellText)
            }
          }
        }

        properties.push({
          name,
          address,
          rent,
          managementFee,
          deposit,
          keyMoney,
          floorPlan,
          area,
          sourceUrl,
          externalId,
          source: 'chintai',
        })
      })
    })

    return properties
  }

  /**
   * 賃料テキストを円に変換
   * 例: "15.2万円" → 152000, "8.5万円" → 85000, "-" → 0
   */
  parseRent(text: string): number {
    if (text === '-' || !text) {
      return 0
    }
    // 「15.2万円」などから数値部分を抽出
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
   * 例: "10,000円" → 10000, "5,000円" → 5000, "-" → 0
   */
  parseManagementFee(text: string): number {
    if (text === '-' || !text) {
      return 0
    }
    const value = parseInt(text.replace(/[^0-9]/g, ''), 10)
    return isNaN(value) ? 0 : value
  }

  /**
   * 敷金・礼金テキストを円に変換
   * 例: "152,000円" → 152000, "--" → 0
   */
  parseDeposit(text: string): number {
    if (text === '-' || text === '--' || !text) {
      return 0
    }
    const value = parseInt(text.replace(/[^0-9]/g, ''), 10)
    return isNaN(value) ? 0 : value
  }

  /**
   * 専有面積テキストを数値に変換
   * 例: "25.05m²" → 25.05, "28.5m&#178;" → 28.5
   */
  parseArea(text: string): number {
    if (!text || text === '-') {
      return 0
    }
    // m² または m&#178; の前の数値を抽出
    const match = text.match(/([0-9.]+)\s*m/)
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
      deposit: scraped.deposit,
      keyMoney: scraped.keyMoney,
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
