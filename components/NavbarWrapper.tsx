'use client'

import { usePathname } from 'next/navigation'
import Navbar from './Navbar'

// Routes where the CERDIA navbar should be hidden
const HIDDEN_ROUTES = ['/portfolio']

export default function NavbarWrapper() {
  const pathname = usePathname()
  const hidden = HIDDEN_ROUTES.some(r => pathname.startsWith(r))
  if (hidden) return null
  return <Navbar />
}
