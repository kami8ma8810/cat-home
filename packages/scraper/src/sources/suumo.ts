import type { BuildingType, Direction, NearestStation, PetConditions, Property, PropertySource } from '@cat-home/shared'
import type { ScraperConfig, ScrapeResult } from '../types'
import * as cheerio from 'cheerio'
import { BaseScraper } from './base'
import { parsePetConditions } from '../utils/pet-condition-parser'

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

/** 詳細ページからスクレイピングした物件情報 */
export interface ScrapedDetailProperty {
  name: string
  address: string
  rent: number
  managementFee: number
  deposit: number
  keyMoney: number
  floorPlan: string
  area: number
  yearBuilt: number | null
  buildingType: BuildingType | null
  floors: number | null
  direction: Direction | null
  nearestStations: NearestStation[]
  features: string[]
  images: string[]
  petConditions: PetConditions | null
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
   * 物件詳細ページをスクレイピング
   */
  async scrapeDetail(url: string): Promise<ScrapeResult> {
    const startTime = Date.now()

    try {
      await this.respectRateLimit()
      const html = await this.fetchWithRetry(url)
      const detail = this.parseDetailHtml(html)

      // 住所から都道府県・市区町村を抽出
      const { prefecture, city } = this.parseAddress(detail.address)

      // external_id を URL から抽出
      const externalIdMatch = url.match(/\/chintai\/(jnc_[^/]+)\//)
      const externalId = externalIdMatch ? externalIdMatch[1] : ''

      const property: Partial<Property> = {
        externalId,
        source: this.source,
        name: detail.name,
        address: detail.address,
        prefecture,
        city,
        rent: detail.rent,
        managementFee: detail.managementFee,
        deposit: detail.deposit,
        keyMoney: detail.keyMoney,
        floorPlan: detail.floorPlan,
        area: detail.area,
        buildingType: detail.buildingType,
        floors: detail.floors,
        yearBuilt: detail.yearBuilt,
        direction: detail.direction,
        petConditions: detail.petConditions,
        features: detail.features,
        nearestStations: detail.nearestStations,
        images: detail.images,
        sourceUrl: url,
      }

      return {
        success: true,
        properties: [property],
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
   * 物件一覧HTMLをパースして物件情報を抽出する
   * 1つの建物（cassetteitem）に複数の部屋が含まれる構造に対応
   */
  parseListHtml(html: string): ScrapedProperty[] {
    const $ = cheerio.load(html)
    const properties: ScrapedProperty[] = []

    // デバッグ: 物件カードの数を確認
    const cassetteCount = $('.cassetteitem').length
    console.log(`📦 物件カード数: ${cassetteCount}`)

    // 物件カードが0件の場合、HTMLの先頭を出力してデバッグ
    if (cassetteCount === 0) {
      console.warn('⚠️ 物件カードが見つかりません。HTML先頭500文字:')
      console.warn(html.slice(0, 500))
    }

    $('.cassetteitem').each((_, element) => {
      const $item = $(element)

      // 建物情報（共通）
      const name = $item.find('.cassetteitem_content-title').text().trim()
      const address = $item.find('.cassetteitem_detail-col1').text().trim()

      // 各部屋をループ（1建物 = 複数部屋）
      $item.find('tbody tr.js-cassette_link').each((_, roomRow) => {
        const $room = $(roomRow)

        // 詳細ページURL
        const href = $room.find('.js-cassette_link_href').attr('href') || ''
        const sourceUrl = href.startsWith('http') ? href : `${SUUMO_BASE_URL}${href}`

        // external_id を URL から抽出（例: /chintai/jnc_000103254717/?bc=... → jnc_000103254717）
        const externalIdMatch = href.match(/\/chintai\/(jnc_[^/]+)\//)
        const externalId = externalIdMatch ? externalIdMatch[1] : ''

        // externalId が取れない場合はスキップ（ボット検出等で HTML が正常でない可能性）
        if (!externalId) {
          console.warn(`⚠️ externalId が取得できませんでした: href="${href}"`)
          return // continue to next room
        }

        // 賃料（万円単位のテキストを円に変換）
        const rentText = $room
          .find('.cassetteitem_price--rent .cassetteitem_other-emphasis')
          .text()
          .trim()
        const rent = this.parseRent(rentText)

        // 管理費
        const managementFeeText = $room
          .find('.cassetteitem_price--administration')
          .text()
          .trim()
        const managementFee = this.parseManagementFee(managementFeeText)

        // 間取り
        const floorPlan = $room.find('.cassetteitem_madori').text().trim()

        // 専有面積
        const areaText = $room.find('.cassetteitem_menseki').text().trim()
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
    })

    return properties
  }

  /**
   * 賃料テキストを円に変換
   * 例: "8.5万円" → 85000, "27.8万円" → 278000, "-" → 0
   */
  parseRent(text: string): number {
    if (text === '-' || !text) {
      return 0
    }
    // 「27.8万円」などから数値部分を抽出
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
   * 物件詳細ページのHTMLをパースして詳細情報を抽出する
   */
  parseDetailHtml(html: string): ScrapedDetailProperty {
    const $ = cheerio.load(html)

    // 物件名
    const name = $('.section_h1-header-title-text').text().trim()

    // 住所
    const address = this.extractTableValue($, '所在地')

    // 賃料・管理費・敷金・礼金
    const rentText = $('.property_view_detail-emphasis').first().text().trim()
    const rent = this.parseRent(rentText)

    const managementFeeText = this.extractTableValue($, '管理費・共益費')
    const managementFee = this.parseManagementFee(managementFeeText)

    const depositText = this.extractTableValue($, '敷金')
    const deposit = this.parseRent(depositText)

    const keyMoneyText = this.extractTableValue($, '礼金')
    const keyMoney = this.parseRent(keyMoneyText)

    // 間取り・面積
    const floorPlan = this.extractTableValue($, '間取り')
    const areaText = this.extractTableValue($, '専有面積')
    const area = parseFloat(areaText) || 0

    // 築年
    const yearBuiltText = this.extractTableValue($, '築年月')
    const yearBuilt = this.parseYearBuilt(yearBuiltText)

    // 建物種別
    const buildingTypeText = this.extractTableValue($, '建物種別')
    const buildingType = this.parseBuildingType(buildingTypeText)

    // 階数
    const structureText = this.extractTableValue($, '建物構造')
    const floors = this.parseFloors(structureText)

    // 向き
    const directionText = this.extractTableValue($, '向き')
    const direction = this.parseDirection(directionText)

    // 最寄り駅
    const transportText = this.extractTableValue($, '交通')
    const nearestStations = this.parseNearestStations(transportText)

    // 設備情報
    const features: string[] = []
    $('.property_view_tag li span').each((_, el) => {
      const feature = $(el).text().trim()
      if (feature) {
        features.push(feature)
      }
    })

    // 画像URL（遅延読み込み対応: data-src, data-original, src の順で取得）
    const images: string[] = []
    $('.property_view_object-img').each((_, el) => {
      const src = $(el).attr('data-src') || $(el).attr('data-original') || $(el).attr('src')
      if (src && src.startsWith('http')) {
        images.push(src)
      }
    })

    // ペット条件
    const petConditions = this.parsePetConditionsFromHtml($, rent)

    return {
      name,
      address,
      rent,
      managementFee,
      deposit,
      keyMoney,
      floorPlan,
      area,
      yearBuilt,
      buildingType,
      floors,
      direction,
      nearestStations,
      features,
      images,
      petConditions,
    }
  }

  /**
   * テーブルから指定したラベルの値を抽出
   */
  private extractTableValue($: cheerio.CheerioAPI, label: string): string {
    let value = ''
    $('table tr').each((_, row) => {
      const $row = $(row)
      const th = $row.find('th').text().trim()
      if (th === label) {
        value = $row.find('td').text().trim()
        return false // break
      }
    })
    return value
  }

  /**
   * 築年月テキストから築年を抽出
   * 例: "2019年3月" → 2019
   */
  private parseYearBuilt(text: string): number | null {
    const match = text.match(/(\d{4})年/)
    return match ? parseInt(match[1], 10) : null
  }

  /**
   * 建物種別テキストを BuildingType に変換
   */
  private parseBuildingType(text: string): BuildingType | null {
    if (text.includes('マンション')) return 'mansion'
    if (text.includes('アパート')) return 'apartment'
    if (text.includes('一戸建て') || text.includes('戸建')) return 'house'
    if (text.includes('テラスハウス') || text.includes('タウンハウス')) return 'terraced'
    if (text) return 'other'
    return null
  }

  /**
   * 建物構造テキストから階数を抽出
   * 例: "RC / 10階建" → 10
   */
  private parseFloors(text: string): number | null {
    const match = text.match(/(\d+)階建/)
    return match ? parseInt(match[1], 10) : null
  }

  /**
   * 向きテキストを Direction に変換
   * 例: "南" → 'south', "南東" → 'southeast'
   */
  private parseDirection(text: string): Direction | null {
    const directionMap: Record<string, Direction> = {
      '北': 'north',
      '北東': 'northeast',
      '東': 'east',
      '南東': 'southeast',
      '南': 'south',
      '南西': 'southwest',
      '西': 'west',
      '北西': 'northwest',
    }
    for (const [jp, en] of Object.entries(directionMap)) {
      if (text.includes(jp)) return en
    }
    return null
  }

  /**
   * 交通情報テキストから最寄り駅情報を抽出
   * 例: "JR山手線/渋谷駅 歩5分" → { line: 'JR山手線', station: '渋谷駅', walkMinutes: 5 }
   */
  private parseNearestStations(text: string): NearestStation[] {
    const stations: NearestStation[] = []
    // 複数の駅情報を分割（改行やスペースで区切られている可能性）
    const lines = text.split(/[\n\r]+/).filter(s => s.trim())

    for (const line of lines) {
      const match = line.match(/(.+?)\/(.+?駅)\s*歩(\d+)分/)
      if (match) {
        stations.push({
          line: match[1].trim(),
          station: match[2].trim(),
          walkMinutes: parseInt(match[3], 10),
          busMinutes: null,
        })
      }
    }

    return stations
  }

  /**
   * HTMLからペット条件を抽出
   */
  private parsePetConditionsFromHtml($: cheerio.CheerioAPI, rent: number): PetConditions | null {
    const petConditions: string[] = []
    let notes: string | undefined

    // ペットセクションを探す
    $('table tr').each((_, row) => {
      const $row = $(row)
      const th = $row.find('th').text().trim()

      if (th === 'ペット') {
        $row.find('td li').each((_, li) => {
          const condition = $(li).text().trim()
          if (condition) {
            petConditions.push(condition)
          }
        })
      }

      if (th === '備考') {
        notes = $row.find('td').text().trim()
      }
    })

    if (petConditions.length === 0) {
      return null
    }

    return parsePetConditions(petConditions, rent, notes)
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
