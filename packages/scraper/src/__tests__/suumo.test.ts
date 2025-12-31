import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SuumoScraper } from '../sources/suumo'

// テスト用HTMLの読み込み
const listHtml = readFileSync(
  resolve(__dirname, 'fixtures/suumo-list.html'),
  'utf-8',
)

const detailHtml = readFileSync(
  resolve(__dirname, 'fixtures/suumo-detail.html'),
  'utf-8',
)

describe('SuumoScraper', () => {
  describe('parseListHtml', () => {
    it('物件一覧HTMLから物件情報を抽出できる', () => {
      const scraper = new SuumoScraper()
      const properties = scraper.parseListHtml(listHtml)

      // 建物1に2部屋、建物2に1部屋 = 合計3物件
      expect(properties).toHaveLength(3)
    })

    it('物件名を正しく抽出できる（建物単位）', () => {
      const scraper = new SuumoScraper()
      const properties = scraper.parseListHtml(listHtml)

      // 建物1の部屋
      expect(properties[0].name).toBe('メゾン猫の家')
      expect(properties[1].name).toBe('メゾン猫の家')
      // 建物2の部屋
      expect(properties[2].name).toBe('キャットハウス目黒')
    })

    it('住所を正しく抽出できる', () => {
      const scraper = new SuumoScraper()
      const properties = scraper.parseListHtml(listHtml)

      expect(properties[0].address).toBe('東京都渋谷区神宮前1-1-1')
      expect(properties[1].address).toBe('東京都渋谷区神宮前1-1-1')
      expect(properties[2].address).toBe('東京都目黒区中目黒2-2-2')
    })

    it('賃料を数値（円）で抽出できる', () => {
      const scraper = new SuumoScraper()
      const properties = scraper.parseListHtml(listHtml)

      expect(properties[0].rent).toBe(85000) // 8.5万円 = 85000円
      expect(properties[1].rent).toBe(92000) // 9.2万円 = 92000円
      expect(properties[2].rent).toBe(120000) // 12万円 = 120000円
    })

    it('管理費を数値（円）で抽出できる', () => {
      const scraper = new SuumoScraper()
      const properties = scraper.parseListHtml(listHtml)

      expect(properties[0].managementFee).toBe(5000)
      expect(properties[1].managementFee).toBe(5000)
      expect(properties[2].managementFee).toBe(8000)
    })

    it('間取りを抽出できる', () => {
      const scraper = new SuumoScraper()
      const properties = scraper.parseListHtml(listHtml)

      expect(properties[0].floorPlan).toBe('1K')
      expect(properties[1].floorPlan).toBe('1K')
      expect(properties[2].floorPlan).toBe('1LDK')
    })

    it('専有面積を数値（m²）で抽出できる', () => {
      const scraper = new SuumoScraper()
      const properties = scraper.parseListHtml(listHtml)

      expect(properties[0].area).toBe(25.5)
      expect(properties[1].area).toBe(27.0)
      expect(properties[2].area).toBe(40.2)
    })

    it('詳細ページへのURLを抽出できる', () => {
      const scraper = new SuumoScraper()
      const properties = scraper.parseListHtml(listHtml)

      expect(properties[0].sourceUrl).toContain('/chintai/jnc_000000001/')
      expect(properties[1].sourceUrl).toContain('/chintai/jnc_000000001_02/')
      expect(properties[2].sourceUrl).toContain('/chintai/jnc_000000002/')
    })

    it('external_id を URL から抽出できる', () => {
      const scraper = new SuumoScraper()
      const properties = scraper.parseListHtml(listHtml)

      expect(properties[0].externalId).toBe('jnc_000000001')
      expect(properties[1].externalId).toBe('jnc_000000001_02')
      expect(properties[2].externalId).toBe('jnc_000000002')
    })

    it('source が "suumo" になる', () => {
      const scraper = new SuumoScraper()
      const properties = scraper.parseListHtml(listHtml)

      expect(properties[0].source).toBe('suumo')
      expect(properties[1].source).toBe('suumo')
      expect(properties[2].source).toBe('suumo')
    })
  })

  describe('parseRent', () => {
    it('「8.5万円」を 85000 に変換できる', () => {
      const scraper = new SuumoScraper()
      expect(scraper.parseRent('8.5万円')).toBe(85000)
    })

    it('「12万円」を 120000 に変換できる', () => {
      const scraper = new SuumoScraper()
      expect(scraper.parseRent('12万円')).toBe(120000)
    })

    it('「27.8万円」を 278000 に変換できる', () => {
      const scraper = new SuumoScraper()
      expect(scraper.parseRent('27.8万円')).toBe(278000)
    })

    it('数字だけの「8.5」も 85000 に変換できる', () => {
      const scraper = new SuumoScraper()
      expect(scraper.parseRent('8.5')).toBe(85000)
    })

    it('「-」は 0 を返す', () => {
      const scraper = new SuumoScraper()
      expect(scraper.parseRent('-')).toBe(0)
    })
  })

  describe('parseDetailHtml', () => {
    it('物件名を抽出できる', () => {
      const scraper = new SuumoScraper()
      const result = scraper.parseDetailHtml(detailHtml)
      expect(result.name).toBe('メゾン猫の家')
    })

    it('住所を抽出できる', () => {
      const scraper = new SuumoScraper()
      const result = scraper.parseDetailHtml(detailHtml)
      expect(result.address).toBe('東京都渋谷区神宮前1-1-1')
    })

    it('賃料を円で抽出できる', () => {
      const scraper = new SuumoScraper()
      const result = scraper.parseDetailHtml(detailHtml)
      expect(result.rent).toBe(85000)
    })

    it('管理費を円で抽出できる', () => {
      const scraper = new SuumoScraper()
      const result = scraper.parseDetailHtml(detailHtml)
      expect(result.managementFee).toBe(5000)
    })

    it('敷金を円で抽出できる', () => {
      const scraper = new SuumoScraper()
      const result = scraper.parseDetailHtml(detailHtml)
      expect(result.deposit).toBe(85000)
    })

    it('礼金を円で抽出できる', () => {
      const scraper = new SuumoScraper()
      const result = scraper.parseDetailHtml(detailHtml)
      expect(result.keyMoney).toBe(85000)
    })

    it('間取りを抽出できる', () => {
      const scraper = new SuumoScraper()
      const result = scraper.parseDetailHtml(detailHtml)
      expect(result.floorPlan).toBe('1K')
    })

    it('専有面積を抽出できる', () => {
      const scraper = new SuumoScraper()
      const result = scraper.parseDetailHtml(detailHtml)
      expect(result.area).toBe(25.5)
    })

    it('築年を抽出できる', () => {
      const scraper = new SuumoScraper()
      const result = scraper.parseDetailHtml(detailHtml)
      expect(result.yearBuilt).toBe(2019)
    })

    it('建物種別を抽出できる', () => {
      const scraper = new SuumoScraper()
      const result = scraper.parseDetailHtml(detailHtml)
      expect(result.buildingType).toBe('mansion')
    })

    it('建物の階数を抽出できる', () => {
      const scraper = new SuumoScraper()
      const result = scraper.parseDetailHtml(detailHtml)
      expect(result.floors).toBe(10)
    })

    it('最寄り駅情報を抽出できる', () => {
      const scraper = new SuumoScraper()
      const result = scraper.parseDetailHtml(detailHtml)
      expect(result.nearestStations).toHaveLength(2)
      expect(result.nearestStations[0]).toEqual({
        line: 'JR山手線',
        station: '渋谷駅',
        walkMinutes: 5,
        busMinutes: null,
      })
      expect(result.nearestStations[1]).toEqual({
        line: '東京メトロ銀座線',
        station: '表参道駅',
        walkMinutes: 8,
        busMinutes: null,
      })
    })

    it('設備情報を抽出できる', () => {
      const scraper = new SuumoScraper()
      const result = scraper.parseDetailHtml(detailHtml)
      expect(result.features).toContain('エアコン')
      expect(result.features).toContain('オートロック')
      expect(result.features).toContain('宅配ボックス')
      expect(result.features).toContain('ペット可')
    })

    it('画像URLを抽出できる', () => {
      const scraper = new SuumoScraper()
      const result = scraper.parseDetailHtml(detailHtml)
      expect(result.images).toHaveLength(3)
      expect(result.images[0]).toBe('https://img.suumo.jp/image/photo001.jpg')
    })

    it('ペット条件を抽出できる', () => {
      const scraper = new SuumoScraper()
      const result = scraper.parseDetailHtml(detailHtml)
      expect(result.petConditions).not.toBeNull()
      expect(result.petConditions?.catAllowed).toBe(true)
      expect(result.petConditions?.catLimit).toBe(2)
      expect(result.petConditions?.dogAllowed).toBe(true)
      expect(result.petConditions?.smallDogOnly).toBe(true)
      expect(result.petConditions?.additionalDeposit).toBe(85000)
      expect(result.petConditions?.notes).toContain('ペット飼育の場合は審査あり')
    })
  })
})
