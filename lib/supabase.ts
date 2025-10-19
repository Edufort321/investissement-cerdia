import { createClient } from '@supabase/supabase-js'

// Utiliser des valeurs par défaut factices pendant le build si les variables ne sont pas définies
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder'

// Créer le client Supabase
// Note: Pendant le build SSG, des valeurs factices sont utilisées. Les vraies valeurs de Vercel sont utilisées au runtime.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: typeof window !== 'undefined', // Ne persister que côté client
  }
})

// Helper pour uploader un fichier dans Storage
export async function uploadFile(
  bucket: string,
  path: string,
  file: File
): Promise<{ data: { path: string } | null; error: Error | null }> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    })

  return { data, error }
}

// Helper pour télécharger un fichier depuis Storage
export function getFileUrl(bucket: string, path: string): string {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path)

  return data.publicUrl
}

// Helper pour supprimer un fichier de Storage
export async function deleteFile(
  bucket: string,
  path: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path])

  return { error }
}
