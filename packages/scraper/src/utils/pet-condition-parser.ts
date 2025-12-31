import type { PetConditions } from '@cat-home/shared'

/**
 * ペット条件のテキストを解析して PetConditions オブジェクトに変換する
 *
 * @param conditions - ペット条件のテキスト配列（例: ['猫飼育可（2匹まで）', '敷金1ヶ月追加']）
 * @param rentAmount - 家賃（円）。追加敷金の計算に使用
 * @param notes - 備考テキスト
 * @returns PetConditions オブジェクト
 *
 * @example
 * ```ts
 * const result = parsePetConditions(['猫飼育可（2匹まで）', '敷金1ヶ月追加'], 85000)
 * // => { catAllowed: true, catLimit: 2, dogAllowed: false, smallDogOnly: false, additionalDeposit: 85000, notes: null }
 * ```
 */
export function parsePetConditions(
  conditions: string[],
  rentAmount?: number,
  notes?: string,
): PetConditions {
  const joinedText = conditions.join(' ')

  return {
    catAllowed: isCatAllowed(joinedText),
    catLimit: extractCatLimit(joinedText),
    dogAllowed: isDogAllowed(joinedText),
    smallDogOnly: isSmallDogOnly(joinedText),
    additionalDeposit: extractAdditionalDeposit(joinedText, rentAmount),
    notes: notes ?? null,
  }
}

/**
 * 猫飼育可かどうかを判定
 */
function isCatAllowed(text: string): boolean {
  // 「猫」を含む条件、または「ペット可」「ペット相談」
  return /猫|ペット可|ペット相談/.test(text)
}

/**
 * 猫の頭数制限を抽出
 */
function extractCatLimit(text: string): number | null {
  // 「猫N匹まで」「猫N頭まで」「（N匹まで）」のパターンを検出
  const match = text.match(/猫[飼育可]*[（(]?(\d+)[匹頭]まで/)
  if (match) {
    return parseInt(match[1], 10)
  }

  // 「猫飼育可（N匹まで）」のような括弧内のパターン
  const bracketMatch = text.match(/猫[^）)]*[（(](\d+)[匹頭]まで[）)]/)
  if (bracketMatch) {
    return parseInt(bracketMatch[1], 10)
  }

  return null
}

/**
 * 犬飼育可かどうかを判定
 */
function isDogAllowed(text: string): boolean {
  // 「犬」を含む条件、または「ペット可」「ペット相談」
  return /犬|ペット可|ペット相談/.test(text)
}

/**
 * 小型犬のみかどうかを判定
 */
function isSmallDogOnly(text: string): boolean {
  return /小型犬/.test(text)
}

/**
 * 追加敷金を抽出
 */
function extractAdditionalDeposit(
  text: string,
  rentAmount?: number,
): number | null {
  if (!rentAmount) {
    return null
  }

  // 「敷金Nヶ月追加」「敷金Nヶ月増」「敷金プラスNヶ月」のパターンを検出
  const match = text.match(/敷金(?:プラス|\+)?(\d+)[ヶか]月[追加増]?/)
  if (match) {
    const months = parseInt(match[1], 10)
    return rentAmount * months
  }

  return null
}
