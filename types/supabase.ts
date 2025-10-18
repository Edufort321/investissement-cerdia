export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      ia_memory: {
        Row: {
          id: string
          user_id: string
          question: string
          answer: string
          is_strategic: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          question: string
          answer: string
          is_strategic?: boolean
          created_at?: string
        }
        Update: {
          is_strategic?: boolean
        }
      }
    }
    Views: {}
    Functions: {}
  }
}
