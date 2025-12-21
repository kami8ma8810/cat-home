import * as cheerio from 'cheerio'

interface ScrapedProperty {
  name: string
  address: string
  rent: number
  managementFee: number
  floorPlan: string
  area: number
  sourceUrl: string
  externalId: string
  source: string
}

const SUUMO_BASE_URL = 'https://suumo.jp'

export class SuumoScraper {
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
}
