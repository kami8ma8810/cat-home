import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { NiftyScraper } from '../sources/nifty'

describe('NiftyScraper', () => {
  let scraper: NiftyScraper
  let fixtureHtml: string

  beforeEach(() => {
    scraper = new NiftyScraper()
    fixtureHtml = readFileSync(
      join(__dirname, 'fixtures/nifty-list.html'),
      'utf-8',
    )
  })

  describe('source', () => {
    it('source は "nifty" を返す', () => {
      expect(scraper.source).toBe('nifty')
    })
  })

  describe('parseListHtml', () => {
    it('HTMLから物件情報を抽出できる', () => {
      const properties = scraper.parseListHtml(fixtureHtml)
      expect(properties.length).toBe(4) // 3建物、4部屋
    })

    it('建物名を正しく抽出する（「の賃貸物件」を除去）', () => {
      const properties = scraper.parseListHtml(fixtureHtml)
      expect(properties[0].name).toBe('TRADIS両国III')
      expect(properties[2].name).toBe('ペットハウス中野')
      expect(properties[3].name).toBe('新宿ペットマンション')
    })

    it('住所を正しく抽出する', () => {
      const properties = scraper.parseListHtml(fixtureHtml)
      expect(properties[0].address).toBe('東京都墨田区緑２丁目11-11')
      expect(properties[2].address).toBe('東京都中野区中野５丁目1-1')
      expect(properties[3].address).toBe('東京都新宿区西新宿１丁目')
    })

    it('externalId を正しく抽出する', () => {
      const properties = scraper.parseListHtml(fixtureHtml)
      expect(properties[0].externalId).toBe('65ced47deb0c31f2a4204b7eff9248b3b1233c81545e2882a0bfb770c4234034')
      expect(properties[1].externalId).toBe('2e8878d4862f8ccff80c7a061d619aa757647a056578f311d2dcdd0890c55a74')
      expect(properties[2].externalId).toBe('nakano123456789abcdef')
      expect(properties[3].externalId).toBe('shinjuku987654321fedcba')
    })

    it('賃料を正しく抽出する', () => {
      const properties = scraper.parseListHtml(fixtureHtml)
      expect(properties[0].rent).toBe(180000) // 18万円
      expect(properties[1].rent).toBe(177000) // 17.7万円
      expect(properties[2].rent).toBe(85000) // 8.5万円
      expect(properties[3].rent).toBe(150000) // 15万円
    })

    it('管理費を正しく抽出する', () => {
      const properties = scraper.parseListHtml(fixtureHtml)
      expect(properties[0].managementFee).toBe(12000)
      expect(properties[1].managementFee).toBe(12000)
      expect(properties[2].managementFee).toBe(5000)
      expect(properties[3].managementFee).toBe(0) // "-" の場合
    })

    it('間取りを正しく抽出する', () => {
      const properties = scraper.parseListHtml(fixtureHtml)
      expect(properties[0].floorPlan).toBe('2LDK')
      expect(properties[2].floorPlan).toBe('1K')
      expect(properties[3].floorPlan).toBe('1LDK')
    })

    it('専有面積を正しく抽出する', () => {
      const properties = scraper.parseListHtml(fixtureHtml)
      expect(properties[0].area).toBe(34.54)
      expect(properties[2].area).toBe(25.0)
      expect(properties[3].area).toBe(40.5)
    })

    it('sourceUrl を正しく抽出する', () => {
      const properties = scraper.parseListHtml(fixtureHtml)
      expect(properties[0].sourceUrl).toBe('https://myhome.nifty.com/rent/tokyo/sumidaku_ct/detail_371d81c68b903a9a8ca8017f6d1b0a2d/')
      expect(properties[2].sourceUrl).toBe('https://myhome.nifty.com/rent/tokyo/nakanoku_ct/detail_nakano123456789/')
    })

    it('source が "nifty" である', () => {
      const properties = scraper.parseListHtml(fixtureHtml)
      for (const prop of properties) {
        expect(prop.source).toBe('nifty')
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
    it('「18万円」を 180000 に変換する', () => {
      expect(scraper.parseRent('18万円')).toBe(180000)
    })

    it('「17.7万円」を 177000 に変換する', () => {
      expect(scraper.parseRent('17.7万円')).toBe(177000)
    })

    it('「8.5万円」を 85000 に変換する', () => {
      expect(scraper.parseRent('8.5万円')).toBe(85000)
    })

    it('数値のみの場合も変換する', () => {
      expect(scraper.parseRent('15')).toBe(150000)
    })

    it('"-" は 0 を返す', () => {
      expect(scraper.parseRent('-')).toBe(0)
    })

    it('空文字は 0 を返す', () => {
      expect(scraper.parseRent('')).toBe(0)
    })
  })

  describe('parseManagementFee', () => {
    it('「12,000円」を 12000 に変換する', () => {
      expect(scraper.parseManagementFee('12,000円')).toBe(12000)
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

  describe('parseArea', () => {
    it('「34.54㎡」を 34.54 に変換する', () => {
      expect(scraper.parseArea('34.54㎡')).toBe(34.54)
    })

    it('「25.0㎡」を 25.0 に変換する', () => {
      expect(scraper.parseArea('25.0㎡')).toBe(25.0)
    })

    it('「40.5㎡」を 40.5 に変換する', () => {
      expect(scraper.parseArea('40.5㎡')).toBe(40.5)
    })

    it('面積がない場合は 0 を返す', () => {
      expect(scraper.parseArea('')).toBe(0)
      expect(scraper.parseArea('-')).toBe(0)
    })
  })

  describe('cleanBuildingName', () => {
    it('「〜の賃貸物件」を除去する', () => {
      expect(scraper.cleanBuildingName('TRADIS両国IIIの賃貸物件')).toBe('TRADIS両国III')
    })

    it('「〜の賃貸物件情報」を除去する', () => {
      expect(scraper.cleanBuildingName('ペットハウス中野の賃貸物件情報')).toBe('ペットハウス中野')
    })

    it('サフィックスがない場合はそのまま返す', () => {
      expect(scraper.cleanBuildingName('新宿マンション')).toBe('新宿マンション')
    })
  })
})
