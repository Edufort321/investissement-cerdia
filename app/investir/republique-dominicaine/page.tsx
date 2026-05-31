import type { Metadata } from 'next'
import Link from 'next/link'

/**
 * Page de contenu SEO — marché République Dominicaine.
 * Server component (pas 'use client') → metadata complet + contenu indexable.
 * MODÈLE à dupliquer pour les autres marchés (Floride, Mexique).
 */

export const metadata: Metadata = {
  title: 'Investir en immobilier en République Dominicaine | CERDIA',
  description:
    "Investir dans l'immobilier en République Dominicaine avec CERDIA : Punta Cana, Cabarete, Las Terrenas. Rendements locatifs 6-12 %, exonération fiscale CONFOTUR 15 ans, gestion professionnelle. Découvrez nos opportunités.",
  keywords: [
    'investir immobilier République Dominicaine', 'acheter condo Punta Cana',
    'investissement Punta Cana', 'immobilier Cabarete', 'CONFOTUR', 'IRNR',
    'rendement locatif Caraïbes', 'investir République Dominicaine Canada',
  ],
  alternates: { canonical: '/investir/republique-dominicaine' },
  openGraph: {
    title: 'Investir en immobilier en République Dominicaine — CERDIA',
    description:
      'Punta Cana, Cabarete, Las Terrenas. Rendements 6-12 %, exonération CONFOTUR 15 ans, gestion clé en main.',
    url: '/investir/republique-dominicaine',
    type: 'article',
  },
}

export default function RepubliqueDominicainePage() {
  return (
    <main className="bg-[#0c0c0e] text-gray-200 min-h-screen">
      <div className="max-w-3xl mx-auto px-6 py-20 sm:py-28">
        <p className="text-amber-400 text-xs tracking-[0.25em] uppercase mb-3">
          🇩🇴 Marché — République Dominicaine
        </p>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-white leading-tight mb-6">
          Investir dans l'immobilier en République Dominicaine
        </h1>
        <p className="text-gray-300 text-base leading-relaxed mb-10">
          La République Dominicaine est l'une des destinations les plus attractives des Caraïbes
          pour l'investissement immobilier locatif. Avec une croissance touristique soutenue
          (plus de 11 millions de visiteurs en 2024, +9 % sur un an), des prix d'entrée
          compétitifs et un régime fiscal avantageux, elle offre un potentiel de rendement
          parmi les plus élevés de la région. CERDIA y sélectionne, acquiert et gère des
          propriétés pour le compte de ses investisseurs.
        </p>

        <Section title="Pourquoi la République Dominicaine ?">
          <ul className="space-y-3">
            <Bullet><strong className="text-white">Rendements locatifs élevés</strong> — un
              rendement brut de l'ordre de 6 à 12 % selon l'emplacement et le type de location
              (court terme touristique ou long terme).</Bullet>
            <Bullet><strong className="text-white">Croissance touristique</strong> — Punta Cana
              est l'une des destinations les plus visitées des Caraïbes, soutenant une demande
              locative saisonnière forte toute l'année.</Bullet>
            <Bullet><strong className="text-white">Prix d'entrée compétitifs</strong> — un
              ticket d'entrée nettement inférieur à des marchés comparables comme la Floride.</Bullet>
          </ul>
        </Section>

        <Section title="L'avantage fiscal CONFOTUR (Loi 158-01)">
          <p className="leading-relaxed">
            Les projets certifiés <strong className="text-white">CONFOTUR</strong> bénéficient
            d'une exonération fiscale pouvant aller jusqu'à <strong className="text-white">15 ans</strong> :
            exonération de l'impôt sur le revenu locatif, de l'impôt sur le patrimoine immobilier (IPI)
            et des droits de transfert. C'est un levier majeur de rentabilité que CERDIA priorise
            dans sa sélection de projets. La conformité (IRNR, ITBIS) est suivie et révisée selon
            la réglementation dominicaine.
          </p>
        </Section>

        <Section title="Nos zones ciblées">
          <ul className="space-y-3">
            <Bullet><strong className="text-white">Punta Cana</strong> — capitale touristique,
              forte demande de location court terme.</Bullet>
            <Bullet><strong className="text-white">Cabarete</strong> — destination prisée des
              sports nautiques et de la clientèle internationale.</Bullet>
            <Bullet><strong className="text-white">Las Terrenas</strong> — marché en croissance,
              clientèle européenne et nord-américaine.</Bullet>
          </ul>
        </Section>

        <Section title="Comment CERDIA gère votre investissement">
          <p className="leading-relaxed">
            Vous investissez dans des projets concrets, sans gérer les opérations vous-même.
            CERDIA prend en charge l'acquisition, la mise en location et la revente, tout en vous
            donnant un suivi transparent : valeur de vos parts (NAV) en temps réel, rapports de
            performance et conformité fiscale multi-juridiction. Vous restez un investisseur passif.
          </p>
        </Section>

        {/* CTA */}
        <div className="mt-12 rounded-2xl border border-amber-400/25 bg-[#111115] p-6 text-center">
          <h2 className="text-xl font-semibold text-white mb-2">
            Prêt à explorer les opportunités en République Dominicaine ?
          </h2>
          <p className="text-gray-400 text-sm mb-5">
            Essayez la démo de la plateforme ou contactez notre équipe pour en savoir plus.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/demo">
              <span className="inline-block bg-amber-400 hover:bg-amber-300 text-black font-bold px-6 py-3 rounded-full text-sm transition-colors">
                Voir la démo
              </span>
            </Link>
            <a href="mailto:eric.dufort@cerdia.ai?subject=Investir en République Dominicaine">
              <span className="inline-block bg-white/10 hover:bg-white/20 text-white font-semibold px-6 py-3 rounded-full text-sm border border-white/20 transition-colors">
                Nous écrire
              </span>
            </a>
          </div>
        </div>

        <p className="text-gray-600 text-xs mt-8 text-center">
          Information générale à but indicatif — ne constitue pas un conseil en investissement.
          Les rendements passés ne préjugent pas des rendements futurs.
        </p>
      </div>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl sm:text-2xl font-serif font-bold text-white mb-4">{title}</h2>
      <div className="text-gray-300 text-sm sm:text-base">{children}</div>
    </section>
  )
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5 leading-relaxed">
      <span className="text-amber-400 flex-shrink-0">✓</span>
      <span>{children}</span>
    </li>
  )
}
