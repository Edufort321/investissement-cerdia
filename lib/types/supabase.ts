import { Database } from '@/lib/database.types'

export type Tables = Database['public']['Tables']
export type MemoryEntry = Tables['ia_memory']['Row']
export type InsertMemory = Tables['ia_memory']['Insert']
