'use client';

import { useState } from 'react';

// Guide opérateur : comment travailler avec Claude Code (dépannage / développement) sur C-Secur360 ou
// CERDIA. S'adapte à la personne : Eric (connaît déjà) ou Benjamin (consignes pas-à-pas, surtout
// migrations). Adapté aux conditions RÉELLES des projets (vrais repos, branches, méthode Supabase = SQL
// collé dans l'éditeur du bon projet). Composant statique (aucune donnée).

const OPENING_PROMPT = `Analyse la consigne en profondeur. Lis le fichier CLAUDE.md à la racine et explore la structure complète du dépôt (app/, supabase/migrations/, lib/) avant d'agir. Ne modifie rien tant que tu n'as pas une vue d'ensemble. Quand tu es prêt, demande-moi : « Est-ce qu'on fait du DÉPANNAGE ou du DÉVELOPPEMENT aujourd'hui ? » puis attends ma réponse et la consigne précise avant de proposer un plan. N'exécute aucune commande git push ni aucune migration Supabase sans mon accord explicite.`;

const PROJECTS = [
  {
    nom: 'C-Secur360', prod: 'https://www.c-secur360.ca',
    repo: 'https://github.com/Edufort321/c-secur360-ast.git', dossier: 'C:\\C-Secur360',
    branche: 'feat/modular-foundation', supabase: 'nzjjgcccxlqhbtpitmpo',
    migrations: 'supabase/migrations/ (numérotées : 170, 171, …)',
  },
  {
    nom: 'CERDIA', prod: 'https://www.cerdia.ai',
    repo: 'https://github.com/Edufort321/investissement-cerdia.git', dossier: 'C:\\CERDIA\\investissement-cerdia-main',
    branche: 'main', supabase: 'svwolnvknfmakgmjhoml',
    migrations: 'supabase/migrations-investisseur/',
  },
];

function Code({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ position: 'relative', margin: '6px 0' }}>
      <pre style={{ background: '#0f172a', color: '#e2e8f0', borderRadius: 8, padding: '12px 14px', fontSize: 12.5, overflowX: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, monospace' }}>{children}</pre>
      <button onClick={() => { navigator.clipboard?.writeText(children); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        style={{ position: 'absolute', top: 8, right: 8, fontSize: 11, fontWeight: 600, background: copied ? '#16a34a' : '#334155', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>
        {copied ? 'Copié ✓' : 'Copier'}
      </button>
    </div>
  );
}

export default function GuideOperateurTab() {
  const [who, setWho] = useState<'' | 'eric' | 'benjamin'>('');

  return (
    <div style={{ maxWidth: 920, margin: '0 auto' }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>📘 Guide opérateur — travailler avec Claude</h2>
      <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 16 }}>Dépannage ou développement sur C-Secur360 ou CERDIA, en autonomie.</p>

      {/* Qui travaille ? */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700, alignSelf: 'center' }}>Qui travaille aujourd'hui ?</span>
        {[['eric', '👨‍💻 Eric'], ['benjamin', '🧑‍🔧 Benjamin']].map(([v, l]) => (
          <button key={v} onClick={() => setWho(v as any)}
            style={{ padding: '8px 16px', borderRadius: 10, border: `2px solid ${who === v ? '#2563eb' : '#d1d5db'}`, background: who === v ? '#eff6ff' : '#fff', fontWeight: 600, cursor: 'pointer' }}>
            {l}
          </button>
        ))}
      </div>

      {/* Tableau des projets (commun) */}
      <div style={{ overflowX: 'auto', marginBottom: 18 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ background: '#f8fafc', textAlign: 'left' }}>
            <th style={{ padding: 8 }}>Projet</th><th style={{ padding: 8 }}>Dossier local</th><th style={{ padding: 8 }}>Branche</th><th style={{ padding: 8 }}>Migrations</th><th style={{ padding: 8 }}>Projet Supabase</th>
          </tr></thead>
          <tbody>
            {PROJECTS.map(p => (
              <tr key={p.nom} style={{ borderTop: '1px solid #e5e7eb' }}>
                <td style={{ padding: 8, fontWeight: 700 }}>{p.nom}<div style={{ fontWeight: 400, color: '#6b7280', fontSize: 11 }}>{p.prod}</div></td>
                <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 11 }}>{p.dossier}</td>
                <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 11 }}>{p.branche}</td>
                <td style={{ padding: 8, fontSize: 11 }}>{p.migrations}</td>
                <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 11 }}>{p.supabase}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Règles non négociables (commun) */}
      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 14, marginBottom: 18 }}>
        <div style={{ fontWeight: 700, color: '#b91c1c', marginBottom: 6 }}>⚠️ Règles non négociables</div>
        <ul style={{ margin: 0, paddingLeft: 18, color: '#7f1d1d', fontSize: 13, lineHeight: 1.6 }}>
          <li>RLS obligatoire sur toute nouvelle table.</li>
          <li>Les routes serveur (service_role) ne sont JAMAIS appelées depuis un composant client.</li>
          <li><b>Jamais de `git push` en prod ni de migration Supabase sans l'accord d'Eric.</b></li>
          <li>Migration = coller le SQL dans l'éditeur SQL du <b>BON</b> projet Supabase (voir tableau), puis Run.</li>
        </ul>
      </div>

      {who === '' && <p style={{ color: '#6b7280' }}>👆 Choisis qui travaille pour afficher les consignes adaptées.</p>}

      {/* ───────── ERIC ───────── */}
      {who === 'eric' && (
        <div>
          <h3 style={{ fontWeight: 700, fontSize: 16, margin: '8px 0' }}>Rappels rapides (tu connais le reste)</h3>
          <ul style={{ paddingLeft: 18, fontSize: 14, lineHeight: 1.7 }}>
            <li>Ouvre le dossier, <code>git pull</code>, puis <code>claude</code>, et colle la consigne d'ouverture.</li>
            <li>Migrations : ouvre le fichier <code>.sql</code> sous <code>supabase/migrations(-investisseur)/</code>, copie, colle dans l'éditeur SQL du bon projet, Run.</li>
            <li>Déploiement : <code>git push</code> → Vercel redéploie (C-Secur sur <code>main</code>, CERDIA sur <code>main</code>).</li>
            <li>Demande à Claude « quelles migrations sont en attente ? » — il tient la liste à jour en mémoire.</li>
          </ul>
          <h4 style={{ fontWeight: 700, marginTop: 14 }}>Consigne d'ouverture à coller dans Claude</h4>
          <Code>{OPENING_PROMPT}</Code>
        </div>
      )}

      {/* ───────── BENJAMIN ───────── */}
      {who === 'benjamin' && (
        <div style={{ fontSize: 14, lineHeight: 1.6 }}>
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: 12, marginBottom: 14 }}>
            Salut Benjamin 👋 Suis les étapes dans l'ordre. <b>En cas de doute sur une migration ou un déploiement, écris à Eric avant de cliquer.</b> Claude t'expliquera chaque étape si tu lui demandes.
          </div>

          <h3 style={{ fontWeight: 700, fontSize: 16 }}>1) Vérifier les outils (une seule fois)</h3>
          <Code>{`git --version\nnode --version\nclaude --version`}</Code>

          <h3 style={{ fontWeight: 700, fontSize: 16 }}>2) Ouvrir le projet (dans PowerShell)</h3>
          <p><b>Première fois</b> (le dossier n'existe pas encore) — exemple C-Secur360 :</p>
          <Code>{`cd C:\\\ngit clone https://github.com/Edufort321/c-secur360-ast.git C-Secur360\ncd C:\\C-Secur360\nnpm install`}</Code>
          <p>Pour CERDIA :</p>
          <Code>{`cd C:\\CERDIA\ngit clone https://github.com/Edufort321/investissement-cerdia.git investissement-cerdia-main\ncd C:\\CERDIA\\investissement-cerdia-main\nnpm install`}</Code>
          <p><b>Le dossier existe déjà</b> (mise à jour) :</p>
          <Code>{`cd C:\\C-Secur360        # ou  cd C:\\CERDIA\\investissement-cerdia-main\ngit pull\nnpm install`}</Code>

          <h3 style={{ fontWeight: 700, fontSize: 16 }}>3) Reproduire un bug en local (optionnel)</h3>
          <Code>{`npm run dev\n# Ouvre http://localhost:3000 dans le navigateur\n# (Ctrl + C dans PowerShell pour arrêter)`}</Code>

          <h3 style={{ fontWeight: 700, fontSize: 16 }}>4) Lancer Claude et coller la consigne</h3>
          <Code>{`claude`}</Code>
          <p>Puis colle exactement ce texte :</p>
          <Code>{OPENING_PROMPT}</Code>

          <h3 style={{ fontWeight: 700, fontSize: 16 }}>5) Appliquer une migration Supabase (⚠️ accord d'Eric d'abord)</h3>
          <ol style={{ paddingLeft: 18 }}>
            <li>Demande à Claude : « <i>quelles migrations sont en attente et lesquelles dois-je appliquer ?</i> » Il te donnera le ou les fichiers <code>.sql</code> exacts.</li>
            <li>Ouvre le fichier <code>.sql</code> dans le dossier <code>supabase/migrations/</code> (C-Secur) ou <code>supabase/migrations-investisseur/</code> (CERDIA) et <b>copie tout son contenu</b>.</li>
            <li>Va sur <code>supabase.com/dashboard</code> → choisis le <b>BON projet</b> (C-Secur = <code>nzjjgcccxlqhbtpitmpo</code>, CERDIA = <code>svwolnvknfmakgmjhoml</code>) → menu <b>SQL Editor</b> → <b>New query</b>.</li>
            <li><b>Colle le SQL</b> et clique <b>Run</b>. Les migrations sont idempotentes (`IF NOT EXISTS`) : pas grave si tu relances.</li>
            <li>Confirme à Claude « migration appliquée » pour qu'il mette la mémoire à jour.</li>
          </ol>
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 10, color: '#92400e', fontSize: 13 }}>
            ❗ Vérifie deux fois que tu es dans le BON projet Supabase avant de cliquer Run. Une migration C-Secur ne va PAS dans le projet CERDIA et inversement.
          </div>

          <h3 style={{ fontWeight: 700, fontSize: 16, marginTop: 14 }}>6) Déployer (⚠️ uniquement avec l'accord d'Eric)</h3>
          <Code>{`git add .\ngit commit -m "fix: courte description"\ngit push\n# Vercel redéploie automatiquement (surveiller vercel.com/dashboard)`}</Code>
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 10, color: '#7f1d1d', fontSize: 13 }}>
            🚫 Ne pousse jamais en prod sans qu'Eric ait dit « ok ». En cas de doute : commit en local, demande à Eric, ne push pas.
          </div>
        </div>
      )}
    </div>
  );
}
