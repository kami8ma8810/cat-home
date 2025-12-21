/**
 * SUUMO スクレイピング実行スクリプト
 *
 * 環境変数:
 *   - SUPABASE_URL: Supabase プロジェクト URL
 *   - SUPABASE_SERVICE_KEY: Supabase サービスロールキー（service_role）
 *
 * 使用方法:
 *   pnpm --filter @cat-home/scraper scrape:suumo           # 通常実行（DB保存あり）
 *   pnpm --filter @cat-home/scraper scrape:suumo --dry-run # ドライラン（DB保存なし）
 */
import { DatabaseService } from '../services/database'
import { SuumoScraper } from '../sources/suumo'

// コマンドライン引数の解析
const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')

// 猫飼育可物件の検索URL（東京都）
const SUUMO_SEARCH_URLS = [
  // 東京都・猫飼育可・ページ1
  'https://suumo.jp/chintai/tokyo/sc_shibuya/?pet=2&page=1',
  // TODO: 他のエリア・ページを追加
]

async function main() {
  console.log('🐱 cat-home SUUMO scraper starting...')

  if (isDryRun) {
    console.log('📋 Dry run mode: DB への保存はスキップします')
  }

  // 環境変数チェック（ドライランの場合は不要）
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY

  if (!isDryRun && (!supabaseUrl || !supabaseKey)) {
    console.error('❌ Missing environment variables: SUPABASE_URL, SUPABASE_SERVICE_KEY')
    console.error('   ヒント: --dry-run オプションでDB保存なしで実行できます')
    process.exit(1)
  }

  const scraper = new SuumoScraper({
    requestDelay: 5000, // 5秒間隔でリクエスト
  })

  // ドライランでない場合のみ DB サービスを初期化
  const db = !isDryRun && supabaseUrl && supabaseKey
    ? new DatabaseService(supabaseUrl, supabaseKey)
    : null

  const allExternalIds: string[] = []
  let totalInserted = 0
  let totalUpdated = 0
  const errors: string[] = []

  for (const url of SUUMO_SEARCH_URLS) {
    console.log(`📄 Scraping: ${url}`)

    const result = await scraper.scrapeList(url)

    if (!result.success) {
      console.error(`❌ Scrape failed: ${result.error}`)
      errors.push(`${url}: ${result.error}`)
      continue
    }

    console.log(`✅ Found ${result.properties.length} properties (${result.duration}ms)`)

    // external_id を収集
    for (const prop of result.properties) {
      if (prop.externalId) {
        allExternalIds.push(prop.externalId)
      }
    }

    // ドライランの場合は取得した物件情報を表示
    if (isDryRun) {
      console.log('\n--- 取得した物件情報 ---')
      for (const prop of result.properties) {
        console.log(`  ${prop.name}`)
        console.log(`    住所: ${prop.address}`)
        console.log(`    賃料: ${prop.rent?.toLocaleString()}円`)
        console.log(`    管理費: ${prop.managementFee?.toLocaleString()}円`)
        console.log(`    間取り: ${prop.floorPlan}`)
        console.log(`    面積: ${prop.area}m²`)
        console.log(`    ID: ${prop.externalId}`)
        console.log('')
      }
    } else if (db) {
      // Supabase に保存
      const upsertResult = await db.upsertProperties(result.properties)
      totalInserted += upsertResult.inserted
      totalUpdated += upsertResult.updated
      errors.push(...upsertResult.errors)

      console.log(`💾 Saved: ${upsertResult.inserted} inserted, ${upsertResult.updated} updated`)
    }
  }

  // 掲載終了物件を非アクティブ化（ドライランでない場合のみ）
  if (!isDryRun && db && allExternalIds.length > 0) {
    const deactivated = await db.deactivateMissing('suumo', allExternalIds)
    console.log(`🔄 Deactivated: ${deactivated} properties`)
  }

  // サマリー
  console.log('\n📊 Summary:')
  console.log(`   取得物件数: ${allExternalIds.length}`)
  if (!isDryRun) {
    console.log(`   Inserted: ${totalInserted}`)
    console.log(`   Updated: ${totalUpdated}`)
  }
  console.log(`   Errors: ${errors.length}`)

  if (errors.length > 0) {
    console.log('\n❌ Errors:')
    errors.forEach((e) => console.log(`   - ${e}`))
    process.exit(1)
  }

  console.log('\n✅ Done!')
}

main().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
