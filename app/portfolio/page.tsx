import { redirect } from 'next/navigation'

// Le start_url du manifest PWA pointe ici. On redirige vers /commerce
// afin que la page soit accessible (200) et que Chrome accepte d'installer le PWA.
export default function PortfolioRoot() {
  redirect('/commerce')
}
