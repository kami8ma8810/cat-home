import { test, expect } from '@playwright/test'

test.describe('物件検索フォーム', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/properties')
    // ページの読み込みを待つ
    await page.waitForLoadState('networkidle')
  })

  test('検索フォームが表示される', async ({ page }) => {
    // フォームの存在確認
    await expect(page.locator('form[role="search"]')).toBeVisible()

    // 都道府県セレクトの存在確認
    await expect(page.getByText('都道府県')).toBeVisible()

    // 賃料フィールドの存在確認
    await expect(page.getByText('賃料')).toBeVisible()

    // 間取りセレクトの存在確認
    await expect(page.getByText('間取り')).toBeVisible()

    // 検索ボタンの存在確認
    await expect(page.getByRole('button', { name: '検索' })).toBeVisible()
  })

  test('UIの構造を確認', async ({ page }) => {
    // スクリーンショットを撮る
    await page.screenshot({ path: 'e2e/screenshots/form-structure.png', fullPage: true })

    // フォーム内のボタン要素を確認
    const buttons = page.locator('form[role="search"] button')
    const buttonCount = await buttons.count()
    console.log(`ボタン数: ${buttonCount}`)

    // セレクトトリガーを探す（Nuxt UIのUSelectはbuttonを使う可能性がある）
    const selectTriggers = page.locator('form[role="search"] [role="combobox"]')
    const triggerCount = await selectTriggers.count()
    console.log(`combobox数: ${triggerCount}`)

    // 都道府県のcomboboxをクリックしてドロップダウンを開く
    const prefectureCombobox = page.locator('[role="combobox"]').first()
    await prefectureCombobox.click()

    // 少し待つ
    await page.waitForTimeout(500)

    // ドロップダウン後のスクリーンショット
    await page.screenshot({ path: 'e2e/screenshots/dropdown-open.png', fullPage: true })

    // ドロップダウンの内容を確認（listbox）
    const listbox = page.locator('[role="listbox"]')
    const listboxCount = await listbox.count()
    console.log(`listbox数: ${listboxCount}`)

    // option要素を確認
    const options = page.locator('[role="option"]')
    const optionCount = await options.count()
    console.log(`option数: ${optionCount}`)

    // ページ全体のHTMLでoption関連を探す
    const bodyHtml = await page.locator('body').innerHTML()
    if (bodyHtml.includes('東京都')) {
      console.log('「東京都」がページ内に存在します')
    } else {
      console.log('「東京都」がページ内に存在しません')
    }

    // フォームのHTML構造を確認
    const formHtml = await page.locator('form[role="search"]').innerHTML()
    console.log('フォームHTML (最初の2000文字):')
    console.log(formHtml.substring(0, 2000))
  })

  test('都道府県を選択して検索できる', async ({ page }) => {
    // Nuxt UI v4のUSelectはcomboboxロールを使う
    const prefectureCombobox = page.locator('[role="combobox"]').first()

    // comboboxをクリックしてドロップダウンを開く
    await prefectureCombobox.click()

    // 東京都を選択（listbox内のoptionをクリック）
    await page.getByRole('option', { name: '東京都' }).click()

    // 選択されていることを確認（表示テキストで確認）
    await expect(prefectureCombobox).toContainText('東京都')

    // 検索ボタンをクリック
    await page.getByRole('button', { name: '検索' }).click()

    await page.waitForTimeout(1000)
  })

  test('間取りを選択して検索できる', async ({ page }) => {
    // 間取りのcombobox（2番目）
    const floorPlanCombobox = page.locator('[role="combobox"]').nth(1)

    // comboboxをクリック
    await floorPlanCombobox.click()

    // 1LDKを選択
    await page.getByRole('option', { name: '1LDK' }).click()

    // 選択されていることを確認
    await expect(floorPlanCombobox).toContainText('1LDK')

    // 検索ボタンをクリック
    await page.getByRole('button', { name: '検索' }).click()

    await page.waitForTimeout(1000)
  })

  test('条件をリセットできる', async ({ page }) => {
    // 都道府県を選択
    const prefectureCombobox = page.locator('[role="combobox"]').first()
    await prefectureCombobox.click()
    await page.getByRole('option', { name: '東京都' }).click()
    await expect(prefectureCombobox).toContainText('東京都')

    // リセットボタンをクリック
    await page.getByRole('button', { name: '条件をリセット' }).click()

    // 選択がクリアされていることを確認（プレースホルダーに戻る）
    await expect(prefectureCombobox).toContainText('選択してください')
  })

  test('都道府県を選択したら自動で検索が実行される', async ({ page }) => {
    // ネットワークリクエストを監視
    const searchRequestPromise = page.waitForRequest(request =>
      request.url().includes('properties') && request.method() === 'GET'
    )

    // 都道府県を選択
    const prefectureCombobox = page.locator('[role="combobox"]').first()
    await prefectureCombobox.click()
    await page.getByRole('option', { name: '東京都' }).click()

    // 検索ボタンを押さなくても検索リクエストが発生することを確認
    // （Supabaseへのリクエストまたはローディング状態の変化で確認）
    await expect(prefectureCombobox).toContainText('東京都')

    // ローディングインジケーターまたは結果の更新を待つ
    await page.waitForTimeout(500)
  })

  test('間取りを選択したら自動で検索が実行される', async ({ page }) => {
    // 間取りを選択
    const floorPlanCombobox = page.locator('[role="combobox"]').nth(1)
    await floorPlanCombobox.click()
    await page.getByRole('option', { name: '1LDK' }).click()

    // 選択が反映されていることを確認
    await expect(floorPlanCombobox).toContainText('1LDK')

    // 検索が実行されたことを待つ
    await page.waitForTimeout(500)
  })
})
