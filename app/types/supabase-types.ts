// app/types/supabase-types.ts

export type Database = {
  public: {
    Tables: {
      ia_memory: {
        Row: {
          id: number
          user_id: string
          role: string
          messages: { role: string; content: string }[]
          created_at: string
        }
        Insert: {
          user_id: string
          role: string
          messages: { role: string; content: string }[]
          created_at?: string
        }
        Update: Partial<{
          user_id: string
          role: string
          messages: { role: string; content: string }[]
          created_at: string
        }>
      }
    }
  }
}
