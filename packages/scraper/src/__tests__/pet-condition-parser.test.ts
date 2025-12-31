import { describe, expect, it } from 'vitest'
import { parsePetConditions } from '../utils/pet-condition-parser'

describe('parsePetConditions', () => {
  describe('猫飼育可の判定', () => {
    it('「猫飼育可」で catAllowed が true になる', () => {
      const result = parsePetConditions(['猫飼育可'])
      expect(result.catAllowed).toBe(true)
    })

    it('「猫可」で catAllowed が true になる', () => {
      const result = parsePetConditions(['猫可'])
      expect(result.catAllowed).toBe(true)
    })

    it('「ペット可」で catAllowed が true になる', () => {
      const result = parsePetConditions(['ペット可'])
      expect(result.catAllowed).toBe(true)
    })

    it('「ペット相談」で catAllowed が true になる', () => {
      const result = parsePetConditions(['ペット相談'])
      expect(result.catAllowed).toBe(true)
    })

    it('ペット条件がない場合は catAllowed が false になる', () => {
      const result = parsePetConditions([])
      expect(result.catAllowed).toBe(false)
    })
  })

  describe('猫の頭数制限', () => {
    it('「猫2匹まで」で catLimit が 2 になる', () => {
      const result = parsePetConditions(['猫飼育可（2匹まで）'])
      expect(result.catLimit).toBe(2)
    })

    it('「猫1匹まで」で catLimit が 1 になる', () => {
      const result = parsePetConditions(['猫1匹まで'])
      expect(result.catLimit).toBe(1)
    })

    it('「猫3頭まで」で catLimit が 3 になる', () => {
      const result = parsePetConditions(['猫3頭まで'])
      expect(result.catLimit).toBe(3)
    })

    it('頭数制限がない場合は catLimit が null になる', () => {
      const result = parsePetConditions(['猫飼育可'])
      expect(result.catLimit).toBeNull()
    })
  })

  describe('犬飼育可の判定', () => {
    it('「犬飼育可」で dogAllowed が true になる', () => {
      const result = parsePetConditions(['犬飼育可'])
      expect(result.dogAllowed).toBe(true)
    })

    it('「犬可」で dogAllowed が true になる', () => {
      const result = parsePetConditions(['犬可'])
      expect(result.dogAllowed).toBe(true)
    })

    it('「小型犬飼育可」で dogAllowed が true, smallDogOnly が true になる', () => {
      const result = parsePetConditions(['小型犬飼育可（1匹まで）'])
      expect(result.dogAllowed).toBe(true)
      expect(result.smallDogOnly).toBe(true)
    })

    it('「小型犬のみ」で smallDogOnly が true になる', () => {
      const result = parsePetConditions(['小型犬のみ'])
      expect(result.dogAllowed).toBe(true)
      expect(result.smallDogOnly).toBe(true)
    })

    it('「ペット可」で dogAllowed が true になる', () => {
      const result = parsePetConditions(['ペット可'])
      expect(result.dogAllowed).toBe(true)
    })
  })

  describe('追加敷金', () => {
    it('「敷金1ヶ月追加」で additionalDeposit が計算される', () => {
      const result = parsePetConditions(['敷金1ヶ月追加'], 85000)
      expect(result.additionalDeposit).toBe(85000)
    })

    it('「敷金2ヶ月増」で additionalDeposit が計算される', () => {
      const result = parsePetConditions(['敷金2ヶ月増'], 100000)
      expect(result.additionalDeposit).toBe(200000)
    })

    it('「敷金プラス1ヶ月」で additionalDeposit が計算される', () => {
      const result = parsePetConditions(['敷金プラス1ヶ月'], 80000)
      expect(result.additionalDeposit).toBe(80000)
    })

    it('追加敷金の記載がない場合は additionalDeposit が null になる', () => {
      const result = parsePetConditions(['猫飼育可'])
      expect(result.additionalDeposit).toBeNull()
    })
  })

  describe('備考', () => {
    it('ペット関連の備考を notes に格納する', () => {
      const result = parsePetConditions(
        ['猫飼育可'],
        undefined,
        'ペット飼育の場合は審査あり。大型犬・爬虫類不可。',
      )
      expect(result.notes).toBe('ペット飼育の場合は審査あり。大型犬・爬虫類不可。')
    })

    it('備考がない場合は notes が null になる', () => {
      const result = parsePetConditions(['猫飼育可'])
      expect(result.notes).toBeNull()
    })
  })

  describe('複合条件', () => {
    it('猫と犬の両方が飼育可能な場合を正しくパースできる', () => {
      const result = parsePetConditions([
        '猫飼育可（2匹まで）',
        '小型犬飼育可（1匹まで）',
        '敷金1ヶ月追加',
      ], 85000)

      expect(result.catAllowed).toBe(true)
      expect(result.catLimit).toBe(2)
      expect(result.dogAllowed).toBe(true)
      expect(result.smallDogOnly).toBe(true)
      expect(result.additionalDeposit).toBe(85000)
    })
  })
})
