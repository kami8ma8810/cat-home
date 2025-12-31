import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DoorScraper } from '../sources/door'

// テスト用HTMLの読み込み
const listHtml = readFileSync(
  resolve(__dirname, 'fixtures/door-list.html'),
  'utf-8',
)

const detailHtml = readFileSync(
  resolve(__dirname, 'fixtures/door-detail.html'),
  'utf-8',
)

describe('DoorScraper', () => {
  describe('parseListHtml', () => {
    it('物件一覧HTMLから物件情報を抽出できる', () => {
      const scraper = new DoorScraper()
      const properties = scraper.parseListHtml(listHtml)

      // 20件の建物カードがあり、それぞれに複数の部屋がある
      expect(properties.length).toBeGreaterThan(0)
    })

    it('物件名を正しく抽出できる（「〜の賃貸物件情報」を除去）', () => {
      const scraper = new DoorScraper()
      const properties = scraper.parseListHtml(listHtml)

      // 最初の建物名（「〜の賃貸物件情報」が削除されていること）
      expect(properties[0].name).toBe('ハイツサクマ')
    })

    it('住所を正しく抽出できる', () => {
      const scraper = new DoorScraper()
      const properties = scraper.parseListHtml(listHtml)

      // 最初の物件の住所
      expect(properties[0].address).toBe('東京都町田市金井5丁目')
    })

    it('賃料を数値（円）で抽出できる', () => {
      const scraper = new DoorScraper()
      const properties = scraper.parseListHtml(listHtml)

      // 最初の物件: 6.3万円 = 63000円
      expect(properties[0].rent).toBe(63000)
    })

    it('管理費を数値（円）で抽出できる', () => {
      const scraper = new DoorScraper()
      const properties = scraper.parseListHtml(listHtml)

      // 最初の物件: なし = 0円
      expect(properties[0].managementFee).toBe(0)
    })

    it('間取りを抽出できる', () => {
      const scraper = new DoorScraper()
      const properties = scraper.parseListHtml(listHtml)

      expect(properties[0].floorPlan).toBe('2K')
    })

    it('専有面積を数値（m²）で抽出できる', () => {
      const scraper = new DoorScraper()
      const properties = scraper.parseListHtml(listHtml)

      expect(properties[0].area).toBe(37.26)
    })

    it('詳細ページへのURLを抽出できる', () => {
      const scraper = new DoorScraper()
      const properties = scraper.parseListHtml(listHtml)

      expect(properties[0].sourceUrl).toContain('/buildings/')
      expect(properties[0].sourceUrl).toContain('/properties/')
    })

    it('external_id を URL から抽出できる', () => {
      const scraper = new DoorScraper()
      const properties = scraper.parseListHtml(listHtml)

      // UUID形式のexternalId
      expect(properties[0].externalId).toMatch(/^[a-f0-9-]+$/)
    })

    it('source が "door" になる', () => {
      const scraper = new DoorScraper()
      const properties = scraper.parseListHtml(listHtml)

      expect(properties[0].source).toBe('door')
    })
  })

  describe('parseRent', () => {
    it('「6.3」を 63000 に変換できる', () => {
      const scraper = new DoorScraper()
      expect(scraper.parseRent('6.3')).toBe(63000)
    })

    it('「11.5」を 115000 に変換できる', () => {
      const scraper = new DoorScraper()
      expect(scraper.parseRent('11.5')).toBe(115000)
    })

    it('「19」を 190000 に変換できる', () => {
      const scraper = new DoorScraper()
      expect(scraper.parseRent('19')).toBe(190000)
    })

    it('「なし」は 0 を返す', () => {
      const scraper = new DoorScraper()
      expect(scraper.parseRent('なし')).toBe(0)
    })

    it('「-」は 0 を返す', () => {
      const scraper = new DoorScraper()
      expect(scraper.parseRent('-')).toBe(0)
    })
  })

  describe('parseManagementFee', () => {
    it('「5,000円」を 5000 に変換できる', () => {
      const scraper = new DoorScraper()
      expect(scraper.parseManagementFee('5,000円')).toBe(5000)
    })

    it('「1.2万円」を 12000 に変換できる', () => {
      const scraper = new DoorScraper()
      expect(scraper.parseManagementFee('1.2万円')).toBe(12000)
    })

    it('「1万円」を 10000 に変換できる', () => {
      const scraper = new DoorScraper()
      expect(scraper.parseManagementFee('1万円')).toBe(10000)
    })

    it('「なし」は 0 を返す', () => {
      const scraper = new DoorScraper()
      expect(scraper.parseManagementFee('なし')).toBe(0)
    })
  })

  describe('parseArea', () => {
    it('「37.26m²」を 37.26 に変換できる', () => {
      const scraper = new DoorScraper()
      expect(scraper.parseArea('37.26m²')).toBe(37.26)
    })

    it('「25.5m2」を 25.5 に変換できる', () => {
      const scraper = new DoorScraper()
      expect(scraper.parseArea('25.5m2')).toBe(25.5)
    })

    it('空文字は 0 を返す', () => {
      const scraper = new DoorScraper()
      expect(scraper.parseArea('')).toBe(0)
    })
  })

  describe('parseDetailHtml', () => {
    it('物件名を抽出できる', () => {
      const scraper = new DoorScraper()
      const result = scraper.parseDetailHtml(detailHtml)
      expect(result.name).toBe('ペット可マンション渋谷')
    })

    it('住所を抽出できる', () => {
      const scraper = new DoorScraper()
      const result = scraper.parseDetailHtml(detailHtml)
      expect(result.address).toBe('東京都渋谷区神南1-2-3')
    })

    it('賃料を円で抽出できる', () => {
      const scraper = new DoorScraper()
      const result = scraper.parseDetailHtml(detailHtml)
      expect(result.rent).toBe(115000)
    })

    it('管理費を円で抽出できる', () => {
      const scraper = new DoorScraper()
      const result = scraper.parseDetailHtml(detailHtml)
      expect(result.managementFee).toBe(8000)
    })

    it('敷金を円で抽出できる', () => {
      const scraper = new DoorScraper()
      const result = scraper.parseDetailHtml(detailHtml)
      // 2ヶ月 × 115000円 = 230000円
      expect(result.deposit).toBe(230000)
    })

    it('礼金を円で抽出できる', () => {
      const scraper = new DoorScraper()
      const result = scraper.parseDetailHtml(detailHtml)
      // 1ヶ月 × 115000円 = 115000円
      expect(result.keyMoney).toBe(115000)
    })

    it('間取りを抽出できる', () => {
      const scraper = new DoorScraper()
      const result = scraper.parseDetailHtml(detailHtml)
      expect(result.floorPlan).toBe('2LDK')
    })

    it('専有面積を抽出できる', () => {
      const scraper = new DoorScraper()
      const result = scraper.parseDetailHtml(detailHtml)
      expect(result.area).toBe(55.8)
    })

    it('築年を抽出できる', () => {
      const scraper = new DoorScraper()
      const result = scraper.parseDetailHtml(detailHtml)
      expect(result.yearBuilt).toBe(2018)
    })

    it('建物種別を抽出できる', () => {
      const scraper = new DoorScraper()
      const result = scraper.parseDetailHtml(detailHtml)
      expect(result.buildingType).toBe('mansion')
    })

    it('建物の階数を抽出できる', () => {
      const scraper = new DoorScraper()
      const result = scraper.parseDetailHtml(detailHtml)
      expect(result.floors).toBe(8)
    })

    it('最寄り駅情報を抽出できる', () => {
      const scraper = new DoorScraper()
      const result = scraper.parseDetailHtml(detailHtml)
      expect(result.nearestStations).toHaveLength(2)
      expect(result.nearestStations[0]).toEqual({
        line: 'JR山手線',
        station: '渋谷駅',
        walkMinutes: 7,
        busMinutes: null,
      })
      expect(result.nearestStations[1]).toEqual({
        line: '東京メトロ半蔵門線',
        station: '渋谷駅',
        walkMinutes: 5,
        busMinutes: null,
      })
    })

    it('設備情報を抽出できる', () => {
      const scraper = new DoorScraper()
      const result = scraper.parseDetailHtml(detailHtml)
      expect(result.features).toContain('エアコン')
      expect(result.features).toContain('オートロック')
      expect(result.features).toContain('宅配ボックス')
      expect(result.features).toContain('ペット可')
    })

    it('画像URLを抽出できる', () => {
      const scraper = new DoorScraper()
      const result = scraper.parseDetailHtml(detailHtml)
      expect(result.images).toHaveLength(3)
      expect(result.images[0]).toBe('https://door.ac/images/photo001.jpg')
    })

    it('ペット条件を抽出できる', () => {
      const scraper = new DoorScraper()
      const result = scraper.parseDetailHtml(detailHtml)
      expect(result.petConditions).not.toBeNull()
      expect(result.petConditions?.catAllowed).toBe(true)
      expect(result.petConditions?.catLimit).toBe(2)
      expect(result.petConditions?.dogAllowed).toBe(true)
      expect(result.petConditions?.smallDogOnly).toBe(true)
      expect(result.petConditions?.additionalDeposit).toBe(115000)
      expect(result.petConditions?.notes).toContain('ペット飼育の場合は事前審査が必要')
    })
  })
})
