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
      const externalIdMatch = url.match(/detail_([a-f0-9]+)/)
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
        petConditions: detail.petConditions,
        features: detail.features,
        nearestStations: detail.nearestStations,
        images: detail.images,
        direction: detail.direction,
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
   * 物件詳細ページのHTMLをパースして詳細情報を抽出する
   */
  parseDetailHtml(html: string): ScrapedDetailProperty {
    const $ = cheerio.load(html)

    // 物件名
    const name = $('.property-title').text().trim()

    // 住所
    const address = this.extractTableValue($, '所在地')

    // 賃料・管理費・敷金・礼金
    const rentText = $('.price-value').first().text().trim()
    const rent = this.parseRent(rentText)

    const managementFeeText = this.extractTableValue($, '管理費・共益費')
    const managementFee = this.parseManagementFee(managementFeeText)

    const depositText = this.extractTableValue($, '敷金')
    const deposit = this.parseDepositWithRent(depositText, rent)

    const keyMoneyText = this.extractTableValue($, '礼金')
    const keyMoney = this.parseDepositWithRent(keyMoneyText, rent)

    // 間取り・面積
    const floorPlan = this.extractTableValue($, '間取り')
    const areaText = this.extractTableValue($, '専有面積')
    const areaMatch = areaText.match(/([0-9.]+)/)
    const area = areaMatch ? parseFloat(areaMatch[1]) : 0

    // 築年
    const yearBuiltText = this.extractTableValue($, '築年月')
    const yearBuilt = this.parseYearBuilt(yearBuiltText)

    // 建物種別
    const buildingTypeText = this.extractTableValue($, '建物種別')
    const buildingType = this.parseBuildingType(buildingTypeText)

    // 階数
    const structureText = this.extractTableValue($, '構造')
    const floors = this.parseFloors(structureText)

    // 向き
    const directionText = this.extractTableValue($, '向き')
    const direction = this.parseDirection(directionText)

    // 最寄り駅
    const nearestStations = this.parseNearestStations($)

    // 設備情報
    const features: string[] = []
    $('.equipment-list li').each((_, el) => {
      const feature = $(el).text().trim()
      if (feature) {
        features.push(feature)
      }
    })

    // 画像URL
    const images: string[] = []
    $('.gallery-list a').each((_, el) => {
      const href = $(el).attr('href')
      if (href) {
        images.push(href)
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
   * 敷金・礼金テキストを円に変換（「Nヶ月」形式対応）
   */
  private parseDepositWithRent(text: string, rent: number): number {
    if (!text || text === '-' || text === 'なし') {
      return 0
    }
    // 「Nヶ月」形式
    const monthMatch = text.match(/(\d+)[ヶか]月/)
    if (monthMatch) {
      const months = parseInt(monthMatch[1], 10)
      return rent * months
    }
    // 万円形式
    const rentValue = this.parseRent(text)
    if (rentValue > 0) {
      return rentValue
    }
    return 0
  }

  /**
   * 築年月テキストから築年を抽出
   * 例: "2019年9月" → 2019
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
   * 例: "鉄骨鉄筋コンクリート造（SRC） 地上15階建" → 15
   */
  private parseFloors(text: string): number | null {
    const match = text.match(/(\d+)階建/)
    return match ? parseInt(match[1], 10) : null
  }


  /** 日本語の向きを英語に変換 */
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
   * 最寄り駅情報を抽出
   */
  private parseNearestStations($: cheerio.CheerioAPI): NearestStation[] {
    const stations: NearestStation[] = []
    $('.access-list li').each((_, el) => {
      const text = $(el).text().trim()
      // 「都営大江戸線 都庁前駅 徒歩6分」のパターンを解析
      const match = text.match(/(.+?)\s+(.+?駅)\s*徒歩(\d+)分/)
      if (match) {
        stations.push({
          line: match[1].trim(),
          station: match[2].trim(),
          walkMinutes: parseInt(match[3], 10),
          busMinutes: null,
        })
      }
    })
    return stations
  }

  /**
   * HTMLからペット条件を抽出
   */
  private parsePetConditionsFromHtml($: cheerio.CheerioAPI, rent: number): PetConditions | null {
    const petConditions: string[] = []
    let notes: string | undefined

    // ペットセクションを探す
    $('.pet-table tr').each((_, row) => {
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

      if (th === 'ペット敷金') {
        const additionalCost = $row.find('td').text().trim()
        if (additionalCost) {
          petConditions.push(additionalCost)
        }
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
