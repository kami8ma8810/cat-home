/**
 * CHINTAIネット スクレイピング実行スクリプト
 *
 * 環境変数:
 *   - SUPABASE_URL: Supabase プロジェクト URL
 *   - SUPABASE_SERVICE_KEY: Supabase サービスロールキー（service_role）
 *
 * 使用方法:
 *   pnpm --filter @cat-home/scraper scrape:chintai                    # 通常実行（DB保存あり）
 *   pnpm --filter @cat-home/scraper scrape:chintai --dry-run          # ドライラン（DB保存なし）
 *   pnpm --filter @cat-home/scraper scrape:chintai --with-details     # 詳細ページも取得
 */
import { DatabaseService } from '../services/database'
import { ChintaiScraper } from '../sources/chintai'

// コマンドライン引数の解析
const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const withDetails = args.includes('--with-details')

// 猫飼育可物件の検索URL（東京23区）
// pet はペット相談可のフィルター
const CHINTAI_SEARCH_URLS = [
  // 東京23区・ペット可・ページ1
  'https://www.chintai.net/tokyo/area/13100/list/pet/',
  // TODO: 他のエリア・ページを追加
]

async function main() {
  console.log('🐱 cat-home CHINTAIネット scraper starting...')

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

  const scraper = new ChintaiScraper({
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

  for (const url of CHINTAI_SEARCH_URLS) {
    console.log(`📄 Scraping: ${url}`)

    const result = await scraper.scrapeList(url)

    if (!result.success) {
      console.error(`❌ Scrape failed: ${result.error}`)
      errors.push(`${url}: ${result.error}`)
      continue
    }

    console.log(`✅ Found ${result.properties.length} properties (${result.duration}ms)`)

    // --with-details: 詳細ページから追加情報を取得
    if (withDetails) {
      console.log(`📖 Fetching detail pages for ${result.properties.length} properties...`)
      for (let i = 0; i < result.properties.length; i++) {
        const prop = result.properties[i]
        if (!prop.sourceUrl) {
          console.log(`  ⚠️ [${i + 1}/${result.properties.length}] ${prop.name}: No source URL`)
          continue
        }

        console.log(`  📄 [${i + 1}/${result.properties.length}] ${prop.name}`)

        const detailResult = await scraper.scrapeDetail(prop.sourceUrl)
        const detailProp = detailResult.properties[0]
        if (detailResult.success && detailProp) {
          // Merge detail info into the property
          Object.assign(prop, {
            deposit: detailProp.deposit,
            keyMoney: detailProp.keyMoney,
            yearBuilt: detailProp.yearBuilt,
            buildingType: detailProp.buildingType,
            floors: detailProp.floors,
            direction: detailProp.direction,
            nearestStations: detailProp.nearestStations,
            features: detailProp.features,
            images: detailProp.images,
            petConditions: detailProp.petConditions,
          })
        } else {
          console.log(`    ⚠️ Detail fetch failed: ${detailResult.error}`)
        }
      }
    }

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
        // --with-details の追加情報
        if (withDetails) {
          console.log(`    敷金: ${prop.deposit?.toLocaleString() ?? '-'}円`)
          console.log(`    礼金: ${prop.keyMoney?.toLocaleString() ?? '-'}円`)
          console.log(`    築年: ${prop.yearBuilt ?? '-'}年`)
          console.log(`    建物種別: ${prop.buildingType ?? '-'}`)
          console.log(`    階数: ${prop.floors ?? '-'}階建`)
          console.log(`    向き: ${prop.direction ?? '-'}`)
          if (prop.nearestStations?.length) {
            console.log(`    最寄駅: ${prop.nearestStations.map((s) => `${s.station}(${s.walkMinutes}分)`).join(', ')}`)
          }
          if (prop.features?.length) {
            console.log(`    設備: ${prop.features.slice(0, 5).join(', ')}${prop.features.length > 5 ? '...' : ''}`)
          }
          if (prop.petConditions) {
            const pet = prop.petConditions
            const petInfo: string[] = []
            if (pet.catAllowed) petInfo.push(`猫可${pet.catLimit ? `(${pet.catLimit}匹まで)` : ''}`)
            if (pet.dogAllowed) petInfo.push(`犬可${pet.smallDogOnly ? '(小型犬のみ)' : ''}`)
            console.log(`    ペット条件: ${petInfo.join(', ') || '詳細不明'}`)
          }
          if (prop.images?.length) {
            console.log(`    画像: ${prop.images.length}枚`)
          }
        }
        console.log('')
      }
    }
    else if (db) {
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
    const deactivated = await db.deactivateMissing('chintai', allExternalIds)
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
    errors.forEach(e => console.log(`   - ${e}`))
    process.exit(1)
  }

  console.log('\n✅ Done!')
}

main().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
