// app/ecommerce/page.tsx
import CerdiaSection1 from '../components/CerdiaSection1';

// Page Next.js valide avec typage correct
export default function EcommercePage() {
  return (
    <main className="min-h-screen">
      <CerdiaSection1 />
    </main>
  );
}

// Metadata pour Next.js (optionnel)
export const metadata = {
  title: 'CERDIA Platform - E-commerce Intelligent',
  description: 'Plateforme e-commerce avec IA intégrée',
};    
