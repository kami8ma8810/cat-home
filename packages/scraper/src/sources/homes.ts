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
      const externalIdMatch = url.match(/\/chintai\/room\/([a-f0-9]+)\//)
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
   * 物件詳細ページのHTMLをパースして詳細情報を抽出する
   */
  parseDetailHtml(html: string): ScrapedDetailProperty {
    const $ = cheerio.load(html)

    // 物件名
    const name = $('.mod-buildingHeader .heading').text().trim()

    // 住所
    const address = $('.mod-buildingDetail .address').text().trim()

    // 賃料・管理費・敷金・礼金
    const rentText = $('.mod-priceDetail .rent .price').text().trim()
    const rent = this.parseRent(rentText + '万円')

    const managementFeeText = $('.mod-priceDetail .managementFee').text().trim()
    const managementFee = this.parseManagementFee(managementFeeText)

    const depositText = $('.mod-priceDetail .deposit').text().trim()
    const deposit = this.parseDepositWithRent(depositText, rent)

    const keyMoneyText = $('.mod-priceDetail .keyMoney').text().trim()
    const keyMoney = this.parseDepositWithRent(keyMoneyText, rent)

    // 間取り・面積
    const floorPlan = $('.mod-roomDetail .floorPlan').text().trim()
    const areaText = $('.mod-roomDetail .area').text().trim()
    const areaMatch = areaText.match(/([0-9.]+)/)
    const area = areaMatch ? parseFloat(areaMatch[1]) : 0

    // 築年
    const yearBuilt = this.parseYearBuilt($)

    // 建物種別
    const buildingType = this.parseBuildingType($)

    // 階数
    const floors = this.parseFloors($)

    // 向き
    const direction = this.parseDirection($)

    // 最寄り駅
    const nearestStations = this.parseNearestStations($)

    // 設備情報
    const features: string[] = []
    $('.mod-equipment .equipmentList li').each((_, el) => {
      const feature = $(el).text().trim()
      if (feature) {
        features.push(feature)
      }
    })

    // 画像URL
    const images: string[] = []
    $('.mod-gallery .galleryList a').each((_, el) => {
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
   */
  private parseYearBuilt($: cheerio.CheerioAPI): number | null {
    let text = ''
    $('.mod-buildingDetail table tr').each((_, row) => {
      const th = $(row).find('th').text().trim()
      if (th === '築年月') {
        text = $(row).find('td').text().trim()
        return false
      }
    })
    const match = text.match(/(\d{4})年/)
    return match ? parseInt(match[1], 10) : null
  }

  /**
   * 建物種別テキストを BuildingType に変換
   */
  private parseBuildingType($: cheerio.CheerioAPI): BuildingType | null {
    let text = ''
    $('.mod-buildingDetail table tr').each((_, row) => {
      const th = $(row).find('th').text().trim()
      if (th === '建物種別') {
        text = $(row).find('td').text().trim()
        return false
      }
    })
    if (text.includes('マンション')) return 'mansion'
    if (text.includes('アパート')) return 'apartment'
    if (text.includes('一戸建て') || text.includes('戸建')) return 'house'
    if (text.includes('テラスハウス') || text.includes('タウンハウス')) return 'terraced'
    if (text) return 'other'
    return null
  }

  /**
   * 建物構造テキストから階数を抽出
   */
  private parseFloors($: cheerio.CheerioAPI): number | null {
    let text = ''
    $('.mod-buildingDetail table tr').each((_, row) => {
      const th = $(row).find('th').text().trim()
      if (th === '構造') {
        text = $(row).find('td').text().trim()
        return false
      }
    })
    const match = text.match(/(\d+)階建/)
    return match ? parseInt(match[1], 10) : null
  }

  /**
   * 向きテキストを Direction に変換
   */
  private parseDirection($: cheerio.CheerioAPI): Direction | null {
    let text = ''
    $('.mod-buildingDetail table tr').each((_, row) => {
      const th = $(row).find('th').text().trim()
      if (th === '向き') {
        text = $(row).find('td').text().trim()
        return false
      }
    })
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
    $('.mod-buildingDetail .access li').each((_, el) => {
      const text = $(el).text().trim()
      // 「東急東横線 中目黒駅 徒歩8分」のパターンを解析
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
    $('.mod-petInfo table tr').each((_, row) => {
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
