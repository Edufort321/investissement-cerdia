'use client';

import Link from 'next/link';

export default function Header() {
  return (
    <header className="flex justify-between items-center p-4 border-b border-gray-200 shadow-sm">
      <div className="flex items-center gap-2">
        <img src="/logo-cerdia.png" alt="Logo CERDIA" className="h-10 w-auto" />
        <span className="font-bold text-lg text-[#001F3F]">Investissement CERDIA</span>
      </div>

      <nav className="flex items-center space-x-6 text-[#001F3F] font-medium">
        <Link href="/" className="hover:underline">Accueil</Link>
        <Link href="/vision" className="hover:underline">Vision</Link>
        <Link href="/connexion" className="hover:underline">Connexion</Link>
        <Link href="/investir">
          <button className="bg-[#001F3F] text-white px-4 py-2 rounded-full hover:bg-[#003366] transition">
            Investir
          </button>
        </Link>
      </nav>
    </header>
  );
}
