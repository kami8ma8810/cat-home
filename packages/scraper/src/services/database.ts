import type { Property, PropertySource } from '@cat-home/shared'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

/** Supabase テーブルの行型 */
interface PropertyRow {
  id: string
  external_id: string
  source: PropertySource
  name: string
  address: string
  prefecture: string
  city: string
  rent: number
  management_fee: number
  deposit: number
  key_money: number
  floor_plan: string | null
  area: number | null
  building_type: string | null
  floor: number | null
  year_built: number | null
  pet_conditions: Record<string, unknown> | null
  features: string[]
  nearest_stations: Record<string, unknown>[]
  images: string[]
  source_url: string
  is_active: boolean
  first_seen_at: string
  last_seen_at: string
  created_at: string
  updated_at: string
}

/** Upsert 用の入力型 */
type PropertyInsert = Omit<PropertyRow, 'id' | 'created_at' | 'updated_at' | 'first_seen_at'>

/** Upsert の結果 */
export interface UpsertResult {
  inserted: number
  updated: number
  errors: string[]
}

/**
 * Supabase データベースサービス
 *
 * @example
 * ```ts
 * const db = new DatabaseService(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
 * const result = await db.upsertProperties(properties)
 * ```
 */
export class DatabaseService {
  private client: SupabaseClient

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.client = createClient(supabaseUrl, supabaseKey)
  }

  /**
   * 物件を Upsert（挿入または更新）
   *
   * external_id が一致する場合は更新、なければ挿入
   */
  async upsertProperties(properties: Partial<Property>[]): Promise<UpsertResult> {
    const result: UpsertResult = {
      inserted: 0,
      updated: 0,
      errors: [],
    }

    for (const property of properties) {
      try {
        // external_id が必須
        if (!property.externalId) {
          result.errors.push('Missing externalId')
          continue
        }

        // 既存データをチェック
        const { data: existing } = await this.client
          .from('properties')
          .select('id')
          .eq('external_id', property.externalId)
          .single()

        const row = this.toRow(property)

        if (existing) {
          // 更新
          const { error } = await this.client
            .from('properties')
            .update({
              ...row,
              last_seen_at: new Date().toISOString(),
            })
            .eq('external_id', property.externalId)

          if (error) {
            result.errors.push(`Update failed: ${error.message}`)
          } else {
            result.updated++
          }
        } else {
          // 挿入
          const { error } = await this.client
            .from('properties')
            .insert({
              ...row,
              first_seen_at: new Date().toISOString(),
              last_seen_at: new Date().toISOString(),
            })

          if (error) {
            result.errors.push(`Insert failed: ${error.message}`)
          } else {
            result.inserted++
          }
        }
      } catch (error) {
        result.errors.push(
          error instanceof Error ? error.message : 'Unknown error',
        )
      }
    }

    return result
  }

  /**
   * 掲載終了した物件を非アクティブ化
   *
   * 指定した external_id 以外の物件を is_active = false に
   */
  async deactivateMissing(
    source: PropertySource,
    activeExternalIds: string[],
  ): Promise<number> {
    if (activeExternalIds.length === 0) {
      return 0
    }

    const { data, error } = await this.client
      .from('properties')
      .update({ is_active: false })
      .eq('source', source)
      .eq('is_active', true)
      .not('external_id', 'in', `(${activeExternalIds.join(',')})`)
      .select('id')

    if (error) {
      throw new Error(`Deactivate failed: ${error.message}`)
    }

    return data?.length ?? 0
  }

  /**
   * Partial<Property> を PropertyRow に変換
   */
  private toRow(property: Partial<Property>): Partial<PropertyInsert> {
    return {
      external_id: property.externalId,
      source: property.source,
      name: property.name,
      address: property.address,
      prefecture: property.prefecture,
      city: property.city,
      rent: property.rent,
      management_fee: property.managementFee ?? 0,
      deposit: property.deposit ?? 0,
      key_money: property.keyMoney ?? 0,
      floor_plan: property.floorPlan ?? null,
      area: property.area ?? null,
      building_type: property.buildingType ?? null,
      floor: property.floors ?? null,
      year_built: property.yearBuilt ?? null,
      pet_conditions: property.petConditions as Record<string, unknown> | null ?? null,
      features: property.features ?? [],
      nearest_stations: (property.nearestStations ?? []) as unknown as Record<string, unknown>[],
      images: property.images ?? [],
      source_url: property.sourceUrl,
      is_active: true,
    }
  }
}
