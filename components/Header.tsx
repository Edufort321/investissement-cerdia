'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { Globe } from 'lucide-react';

export default function Header() {
  const { language, setLanguage, t } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'fr' ? 'en' : 'fr');
  };

  return (
    <header className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800 transition-colors">
      <div className="flex items-center gap-2">
        <img src="/logo-cerdia.png" alt="Logo CERDIA" className="h-10 w-auto" />
        <span className="font-bold text-lg text-[#001F3F] dark:text-gray-100">Investissement CERDIA</span>
      </div>

      <nav className="flex items-center space-x-6 text-[#001F3F] dark:text-gray-300 font-medium">
        <Link href="/" className="hover:underline">{language === 'fr' ? 'Accueil' : 'Home'}</Link>
        <Link href="/vision" className="hover:underline">Vision</Link>
        <Link href="/connexion" className="hover:underline">{language === 'fr' ? 'Connexion' : 'Login'}</Link>

        {/* Bouton de changement de langue */}
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
          aria-label="Change language"
        >
          <Globe className="w-4 h-4" />
          <span className="font-semibold">{language === 'fr' ? 'EN' : 'FR'}</span>
        </button>

        <Link href="/investir">
          <button className="bg-[#001F3F] dark:bg-indigo-600 text-white px-4 py-2 rounded-full hover:bg-[#003366] dark:hover:bg-indigo-700 transition">
            {language === 'fr' ? 'Investir' : 'Invest'}
          </button>
        </Link>
      </nav>
    </header>
  );
}
