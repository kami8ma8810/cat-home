/** Supabase Database 型定義 */

export interface Database {
  public: {
    Tables: {
      properties: {
        Row: {
          id: string
          external_id: string
          source: string
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
          direction: string | null
          pet_conditions: PetConditionsJson
          features: string[]
          nearest_stations: NearestStationJson[]
          images: string[]
          source_url: string
          is_active: boolean
          first_seen_at: string
          last_seen_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          external_id: string
          source: string
          name: string
          address: string
          prefecture: string
          city: string
          rent: number
          management_fee?: number
          deposit?: number
          key_money?: number
          floor_plan?: string | null
          area?: number | null
          building_type?: string | null
          floor?: number | null
          year_built?: number | null
          direction?: string | null
          pet_conditions?: PetConditionsJson
          features?: string[]
          nearest_stations?: NearestStationJson[]
          images?: string[]
          source_url: string
          is_active?: boolean
          first_seen_at?: string
          last_seen_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          external_id?: string
          source?: string
          name?: string
          address?: string
          prefecture?: string
          city?: string
          rent?: number
          management_fee?: number
          deposit?: number
          key_money?: number
          floor_plan?: string | null
          area?: number | null
          building_type?: string | null
          floor?: number | null
          year_built?: number | null
          direction?: string | null
          pet_conditions?: PetConditionsJson
          features?: string[]
          nearest_stations?: NearestStationJson[]
          images?: string[]
          source_url?: string
          is_active?: boolean
          first_seen_at?: string
          last_seen_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

/** ペット条件（JSONB） */
export interface PetConditionsJson {
  catAllowed?: boolean
  catLimit?: number | null
  dogAllowed?: boolean
  smallDogOnly?: boolean
  additionalDeposit?: number | null
  notes?: string | null
}

/** 最寄り駅情報（JSONB） */
export interface NearestStationJson {
  line: string
  station: string
  walkMinutes?: number | null
  busMinutes?: number | null
}

/** 物件行の型エイリアス */
export type PropertyRow = Database['public']['Tables']['properties']['Row']
export type PropertyInsert = Database['public']['Tables']['properties']['Insert']
export type PropertyUpdate = Database['public']['Tables']['properties']['Update']
