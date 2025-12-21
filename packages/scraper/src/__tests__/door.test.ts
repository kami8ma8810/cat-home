import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DoorScraper } from '../sources/door'

// テスト用HTMLの読み込み
const listHtml = readFileSync(
  resolve(__dirname, 'fixtures/door-list.html'),
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
})
