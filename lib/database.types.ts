export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      ia_memory: {
        Row: {
          id: number
          created_at: string
          user_id: string
          role: string
          messages: Json
        }
        Insert: {
          user_id: string
          role: string
          messages: Json
        }
        Update: {
          messages?: Json
        }
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}
