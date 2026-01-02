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
  deposit: number
  keyMoney: number
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

      // external_id を URL から抽出（例: /detail/123456789/）
      const externalIdMatch = url.match(/\/detail\/([^/]+)\//)
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
   * 物件詳細ページのHTMLをパースして詳細情報を抽出する
   */
  parseDetailHtml(html: string): ScrapedDetailProperty {
    const $ = cheerio.load(html)

    // 物件名
    const name = $('.ttl_main').text().trim()

    // 住所
    const address = this.extractTableValue($, '所在地')

    // 賃料
    const rentText = $('.price_num').first().text().trim()
    const rent = this.parseRent(rentText + '万円')

    // 管理費
    const managementFeeText = this.extractTableValue($, '管理費')
    const managementFee = this.parseManagementFee(managementFeeText)

    // 敷金・礼金（「1ヶ月」形式の場合は賃料から計算）
    const depositText = this.extractTableValue($, '敷金')
    const deposit = this.parseDepositWithRent(depositText, rent)

    const keyMoneyText = this.extractTableValue($, '礼金')
    const keyMoney = this.parseDepositWithRent(keyMoneyText, rent)

    // 間取り・面積
    const floorPlan = this.extractTableValue($, '間取り')
    const areaText = this.extractTableValue($, '専有面積')
    const area = this.parseArea(areaText)

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
    $('.equipment_list li').each((_, el) => {
      const feature = $(el).text().trim()
      if (feature) {
        features.push(feature)
      }
    })

    // 画像URL
    const images: string[] = []
    $('.photo_list a').each((_, el) => {
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
    $('table tr, table th').each((_, row) => {
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
    if (!text || text === '-' || text === '--') {
      return 0
    }

    // 「1ヶ月」「2ヶ月」などの形式
    const monthMatch = text.match(/(\d+)[ヶか]月/)
    if (monthMatch) {
      return rent * parseInt(monthMatch[1], 10)
    }

    // 金額が直接書かれている場合
    return this.parseDeposit(text)
  }

  /**
   * 築年月テキストから築年を抽出
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

    $('.station_list li').each((_, el) => {
      const text = $(el).text().trim()
      // 「JR山手線 新宿駅 徒歩5分」形式
      const match = text.match(/(.+?)\s+(.+?駅)\s+徒歩(\d+)分/)
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

    // ペット条件を探す
    $('.pet_list li').each((_, el) => {
      const condition = $(el).text().trim()
      if (condition) {
        petConditions.push(condition)
      }
    })

    // 追加費用
    const additionalCostText = this.extractTableValue($, '追加費用')
    if (additionalCostText) {
      petConditions.push(additionalCostText)
    }

    // 備考
    const petNotes = this.extractTableValue($, '備考')
    if (petNotes) {
      notes = petNotes
    }

    if (petConditions.length === 0) {
      return null
    }

    return parsePetConditions(petConditions, rent, notes)
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
