import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { HomesScraper } from '../sources/homes'

describe('HomesScraper', () => {
  const listHtml = readFileSync(
    resolve(__dirname, 'fixtures/homes-list.html'),
    'utf-8',
  )

  const detailHtml = readFileSync(
    resolve(__dirname, 'fixtures/homes-detail.html'),
    'utf-8',
  )

  describe('parseListHtml', () => {
    it('物件一覧HTMLから物件情報を抽出できる', () => {
      const scraper = new HomesScraper()
      const properties = scraper.parseListHtml(listHtml)

      // 3件の物件が抽出されること
      expect(properties).toHaveLength(3)
    })

    it('物件名を正しく抽出できる', () => {
      const scraper = new HomesScraper()
      const properties = scraper.parseListHtml(listHtml)

      expect(properties[0].name).toBe('ＩＮＵＮＥＫＯ　ＨＩＬＬＳ　ＲＯＫＵＧＯＤＯＴＥ')
      expect(properties[1].name).toBe('ウィステリアコート関町')
      expect(properties[2].name).toBe('東京メトロ東西線 西葛西駅 徒歩13分')
    })

    it('住所を正しく抽出できる', () => {
      const scraper = new HomesScraper()
      const properties = scraper.parseListHtml(listHtml)

      expect(properties[0].address).toBe('東京都大田区仲六郷4丁目32-12')
      expect(properties[1].address).toBe('東京都練馬区関町北3丁目')
      expect(properties[2].address).toBe('東京都江戸川区西葛西1丁目')
    })

    it('賃料を数値（円）で抽出できる', () => {
      const scraper = new HomesScraper()
      const properties = scraper.parseListHtml(listHtml)

      // 9.1万円 → 91000円
      expect(properties[0].rent).toBe(91000)
      // 6.9万円 → 69000円
      expect(properties[1].rent).toBe(69000)
      // 10.05万円 → 100500円
      expect(properties[2].rent).toBe(100500)
    })

    it('管理費を数値（円）で抽出できる', () => {
      const scraper = new HomesScraper()
      const properties = scraper.parseListHtml(listHtml)

      expect(properties[0].managementFee).toBe(8000)
      expect(properties[1].managementFee).toBe(4000)
      expect(properties[2].managementFee).toBe(5800)
    })

    it('間取りを正しく抽出できる', () => {
      const scraper = new HomesScraper()
      const properties = scraper.parseListHtml(listHtml)

      expect(properties[0].floorPlan).toBe('1K')
      expect(properties[1].floorPlan).toBe('1K')
      expect(properties[2].floorPlan).toBe('1K')
    })

    it('専有面積を正しく抽出できる', () => {
      const scraper = new HomesScraper()
      const properties = scraper.parseListHtml(listHtml)

      expect(properties[0].area).toBe(25.2)
      expect(properties[1].area).toBe(20.18)
      expect(properties[2].area).toBe(27.68)
    })

    it('external_id を URL から抽出できる', () => {
      const scraper = new HomesScraper()
      const properties = scraper.parseListHtml(listHtml)

      expect(properties[0].externalId).toBe('305282f37697179ed20bc96c9ebac105663de8fb')
      expect(properties[1].externalId).toBe('0e769c17a454568cf0521a3da75e8e1a8b251efa')
      expect(properties[2].externalId).toBe('46676282dde05a67a3111bb7b339704823be96a7')
    })

    it('source が homes になる', () => {
      const scraper = new HomesScraper()
      const properties = scraper.parseListHtml(listHtml)

      expect(properties[0].source).toBe('homes')
      expect(properties[1].source).toBe('homes')
      expect(properties[2].source).toBe('homes')
    })

    it('sourceUrl が正しく設定される', () => {
      const scraper = new HomesScraper()
      const properties = scraper.parseListHtml(listHtml)

      expect(properties[0].sourceUrl).toBe('https://www.homes.co.jp/chintai/room/305282f37697179ed20bc96c9ebac105663de8fb/')
      expect(properties[1].sourceUrl).toBe('https://www.homes.co.jp/chintai/room/0e769c17a454568cf0521a3da75e8e1a8b251efa/')
      expect(properties[2].sourceUrl).toBe('https://www.homes.co.jp/chintai/room/46676282dde05a67a3111bb7b339704823be96a7/')
    })
  })

  describe('parseRent', () => {
    it('「9.1万円」を 91000 に変換できる', () => {
      const scraper = new HomesScraper()
      expect(scraper.parseRent('9.1万円')).toBe(91000)
    })

    it('「10.05万円」を 100500 に変換できる', () => {
      const scraper = new HomesScraper()
      expect(scraper.parseRent('10.05万円')).toBe(100500)
    })

    it('「-」を 0 に変換できる', () => {
      const scraper = new HomesScraper()
      expect(scraper.parseRent('-')).toBe(0)
    })

    it('空文字を 0 に変換できる', () => {
      const scraper = new HomesScraper()
      expect(scraper.parseRent('')).toBe(0)
    })
  })

  describe('parseManagementFee', () => {
    it('「8,000円」を 8000 に変換できる', () => {
      const scraper = new HomesScraper()
      expect(scraper.parseManagementFee('8,000円')).toBe(8000)
    })

    it('「5800円」を 5800 に変換できる', () => {
      const scraper = new HomesScraper()
      expect(scraper.parseManagementFee('5800円')).toBe(5800)
    })

    it('「-」を 0 に変換できる', () => {
      const scraper = new HomesScraper()
      expect(scraper.parseManagementFee('-')).toBe(0)
    })

    it('空文字を 0 に変換できる', () => {
      const scraper = new HomesScraper()
      expect(scraper.parseManagementFee('')).toBe(0)
    })
  })

  describe('parseDetailHtml', () => {
    it('物件名を抽出できる', () => {
      const scraper = new HomesScraper()
      const result = scraper.parseDetailHtml(detailHtml)
      expect(result.name).toBe('ペット可レジデンス目黒')
    })

    it('住所を抽出できる', () => {
      const scraper = new HomesScraper()
      const result = scraper.parseDetailHtml(detailHtml)
      expect(result.address).toBe('東京都目黒区中目黒2-5-8')
    })

    it('賃料を円で抽出できる', () => {
      const scraper = new HomesScraper()
      const result = scraper.parseDetailHtml(detailHtml)
      expect(result.rent).toBe(145000)
    })

    it('管理費を円で抽出できる', () => {
      const scraper = new HomesScraper()
      const result = scraper.parseDetailHtml(detailHtml)
      expect(result.managementFee).toBe(12000)
    })

    it('敷金を円で抽出できる', () => {
      const scraper = new HomesScraper()
      const result = scraper.parseDetailHtml(detailHtml)
      // 1ヶ月 × 145000円 = 145000円
      expect(result.deposit).toBe(145000)
    })

    it('礼金を円で抽出できる', () => {
      const scraper = new HomesScraper()
      const result = scraper.parseDetailHtml(detailHtml)
      // 1ヶ月 × 145000円 = 145000円
      expect(result.keyMoney).toBe(145000)
    })

    it('間取りを抽出できる', () => {
      const scraper = new HomesScraper()
      const result = scraper.parseDetailHtml(detailHtml)
      expect(result.floorPlan).toBe('1LDK')
    })

    it('専有面積を抽出できる', () => {
      const scraper = new HomesScraper()
      const result = scraper.parseDetailHtml(detailHtml)
      expect(result.area).toBe(42.5)
    })

    it('築年を抽出できる', () => {
      const scraper = new HomesScraper()
      const result = scraper.parseDetailHtml(detailHtml)
      expect(result.yearBuilt).toBe(2020)
    })

    it('建物種別を抽出できる', () => {
      const scraper = new HomesScraper()
      const result = scraper.parseDetailHtml(detailHtml)
      expect(result.buildingType).toBe('mansion')
    })

    it('建物の階数を抽出できる', () => {
      const scraper = new HomesScraper()
      const result = scraper.parseDetailHtml(detailHtml)
      expect(result.floors).toBe(10)
    })

    it('最寄り駅情報を抽出できる', () => {
      const scraper = new HomesScraper()
      const result = scraper.parseDetailHtml(detailHtml)
      expect(result.nearestStations).toHaveLength(3)
      expect(result.nearestStations[0]).toEqual({
        line: '東急東横線',
        station: '中目黒駅',
        walkMinutes: 8,
        busMinutes: null,
      })
    })

    it('設備情報を抽出できる', () => {
      const scraper = new HomesScraper()
      const result = scraper.parseDetailHtml(detailHtml)
      expect(result.features).toContain('エアコン')
      expect(result.features).toContain('オートロック')
      expect(result.features).toContain('床暖房')
      expect(result.features).toContain('ペット相談')
    })

    it('画像URLを抽出できる', () => {
      const scraper = new HomesScraper()
      const result = scraper.parseDetailHtml(detailHtml)
      expect(result.images).toHaveLength(4)
      expect(result.images[0]).toBe('https://img.homes.jp/photo001_full.jpg')
    })

    it('ペット条件を抽出できる', () => {
      const scraper = new HomesScraper()
      const result = scraper.parseDetailHtml(detailHtml)
      expect(result.petConditions).not.toBeNull()
      expect(result.petConditions?.catAllowed).toBe(true)
      expect(result.petConditions?.catLimit).toBe(2)
      expect(result.petConditions?.dogAllowed).toBe(true)
      expect(result.petConditions?.smallDogOnly).toBe(true)
      expect(result.petConditions?.additionalDeposit).toBe(145000)
      expect(result.petConditions?.notes).toContain('猫は2匹まで')
    })
  })
})
