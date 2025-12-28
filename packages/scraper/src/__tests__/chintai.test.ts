import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ChintaiScraper } from '../sources/chintai'

describe('ChintaiScraper', () => {
  let scraper: ChintaiScraper
  let fixtureHtml: string

  beforeEach(() => {
    scraper = new ChintaiScraper()
    fixtureHtml = readFileSync(
      join(__dirname, 'fixtures/chintai-list.html'),
      'utf-8',
    )
  })

  describe('source', () => {
    it('source は "chintai" を返す', () => {
      expect(scraper.source).toBe('chintai')
    })
  })

  describe('parseListHtml', () => {
    it('HTMLから物件情報を抽出できる', () => {
      const properties = scraper.parseListHtml(fixtureHtml)
      expect(properties.length).toBe(4) // 3建物、4部屋
    })

    it('建物名を正しく抽出する', () => {
      const properties = scraper.parseListHtml(fixtureHtml)
      expect(properties[0].name).toBe('京王井の頭線 神泉駅 14階建 築10年')
      expect(properties[2].name).toBe('JR中央線 中野駅 3階建 築5年')
      expect(properties[3].name).toBe('東京メトロ丸ノ内線 新宿御苑前駅 8階建 築15年')
    })

    it('住所を正しく抽出する', () => {
      const properties = scraper.parseListHtml(fixtureHtml)
      expect(properties[0].address).toBe('東京都目黒区青葉台４丁目')
      expect(properties[2].address).toBe('東京都中野区中野５丁目')
      expect(properties[3].address).toBe('東京都新宿区新宿２丁目')
    })

    it('externalId を正しく抽出する', () => {
      const properties = scraper.parseListHtml(fixtureHtml)
      expect(properties[0].externalId).toBe('C010104521798620019219950001')
      expect(properties[1].externalId).toBe('C010104521798620019220040001')
      expect(properties[2].externalId).toBe('NAKANO123456789')
      expect(properties[3].externalId).toBe('SHINJUKU987654321')
    })

    it('賃料を正しく抽出する', () => {
      const properties = scraper.parseListHtml(fixtureHtml)
      expect(properties[0].rent).toBe(152000) // 15.2万円
      expect(properties[1].rent).toBe(154000) // 15.4万円
      expect(properties[2].rent).toBe(85000) // 8.5万円
      expect(properties[3].rent).toBe(120000) // 12万円
    })

    it('管理費を正しく抽出する', () => {
      const properties = scraper.parseListHtml(fixtureHtml)
      expect(properties[0].managementFee).toBe(10000)
      expect(properties[1].managementFee).toBe(10000)
      expect(properties[2].managementFee).toBe(5000)
      expect(properties[3].managementFee).toBe(0) // "-" の場合
    })

    it('間取りを正しく抽出する', () => {
      const properties = scraper.parseListHtml(fixtureHtml)
      expect(properties[0].floorPlan).toBe('1K')
      expect(properties[2].floorPlan).toBe('1DK')
      expect(properties[3].floorPlan).toBe('2LDK')
    })

    it('専有面積を正しく抽出する', () => {
      const properties = scraper.parseListHtml(fixtureHtml)
      expect(properties[0].area).toBe(25.05)
      expect(properties[2].area).toBe(28.5)
      expect(properties[3].area).toBe(55.2)
    })

    it('sourceUrl を正しく抽出する', () => {
      const properties = scraper.parseListHtml(fixtureHtml)
      expect(properties[0].sourceUrl).toBe('https://www.chintai.net/detail/bk-C010104521798620019219950001/')
      expect(properties[2].sourceUrl).toBe('https://www.chintai.net/detail/bk-NAKANO123456789/')
    })

    it('source が "chintai" である', () => {
      const properties = scraper.parseListHtml(fixtureHtml)
      for (const prop of properties) {
        expect(prop.source).toBe('chintai')
      }
    })

    it('空のHTMLの場合は空配列を返す', () => {
      const properties = scraper.parseListHtml('')
      expect(properties).toEqual([])
    })

    it('物件カードがないHTMLの場合は空配列を返す', () => {
      const html = '<html><body><div>No properties</div></body></html>'
      const properties = scraper.parseListHtml(html)
      expect(properties).toEqual([])
    })
  })

  describe('parseRent', () => {
    it('「15.2万円」を 152000 に変換する', () => {
      expect(scraper.parseRent('15.2万円')).toBe(152000)
    })

    it('「8.5万円」を 85000 に変換する', () => {
      expect(scraper.parseRent('8.5万円')).toBe(85000)
    })

    it('「12万円」を 120000 に変換する', () => {
      expect(scraper.parseRent('12万円')).toBe(120000)
    })

    it('「5.05万円」を 50500 に変換する', () => {
      expect(scraper.parseRent('5.05万円')).toBe(50500)
    })

    it('"-" は 0 を返す', () => {
      expect(scraper.parseRent('-')).toBe(0)
    })

    it('空文字は 0 を返す', () => {
      expect(scraper.parseRent('')).toBe(0)
    })
  })

  describe('parseManagementFee', () => {
    it('「10,000円」を 10000 に変換する', () => {
      expect(scraper.parseManagementFee('10,000円')).toBe(10000)
    })

    it('「5,000円」を 5000 に変換する', () => {
      expect(scraper.parseManagementFee('5,000円')).toBe(5000)
    })

    it('「8000円」を 8000 に変換する', () => {
      expect(scraper.parseManagementFee('8000円')).toBe(8000)
    })

    it('"-" は 0 を返す', () => {
      expect(scraper.parseManagementFee('-')).toBe(0)
    })

    it('空文字は 0 を返す', () => {
      expect(scraper.parseManagementFee('')).toBe(0)
    })
  })

  describe('parseDeposit', () => {
    it('「152,000円」を 152000 に変換する', () => {
      expect(scraper.parseDeposit('152,000円')).toBe(152000)
    })

    it('「85,000円」を 85000 に変換する', () => {
      expect(scraper.parseDeposit('85,000円')).toBe(85000)
    })

    it('「--」は 0 を返す', () => {
      expect(scraper.parseDeposit('--')).toBe(0)
    })

    it('"-" は 0 を返す', () => {
      expect(scraper.parseDeposit('-')).toBe(0)
    })

    it('空文字は 0 を返す', () => {
      expect(scraper.parseDeposit('')).toBe(0)
    })
  })

  describe('parseArea', () => {
    it('「25.05m²」を 25.05 に変換する', () => {
      expect(scraper.parseArea('25.05m²')).toBe(25.05)
    })

    it('「55.2m²」を 55.2 に変換する', () => {
      expect(scraper.parseArea('55.2m²')).toBe(55.2)
    })

    it('「28.5m&#178;」を 28.5 に変換する', () => {
      expect(scraper.parseArea('28.5m&#178;')).toBe(28.5)
    })

    it('面積がない場合は 0 を返す', () => {
      expect(scraper.parseArea('')).toBe(0)
      expect(scraper.parseArea('-')).toBe(0)
    })
  })
})
