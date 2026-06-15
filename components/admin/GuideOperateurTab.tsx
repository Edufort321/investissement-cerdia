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

      {/* Synchronisation Git (commun) */}
      <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 10, padding: 14, marginBottom: 18 }}>
        <div style={{ fontWeight: 700, color: '#3730a3', marginBottom: 6 }}>🔄 Toujours à jour via Git — JAMAIS de zip</div>
        <ul style={{ margin: 0, paddingLeft: 18, color: '#312e81', fontSize: 13, lineHeight: 1.7 }}>
          <li>Le code de référence vit sur <b>GitHub</b>, pas dans un fichier zip. On se synchronise avec <code>git pull</code> (récupérer la dernière version) et <code>git push</code> (envoyer ses modifs).</li>
          <li><b>Au début de chaque session</b>, on part de la dernière version : <code>cd</code> dans le dossier puis <code>git pull</code>. (Claude le fait aussi automatiquement avant de travailler.)</li>
          <li><b>Nouveau portable / pas d'environnement ?</b> Fais l'<b>Étape 0</b> (installer + s'authentifier à GitHub), puis <code>git clone</code> <b>une seule fois</b>. Ensuite <code>git pull</code>/<code>git push</code> marchent comme partout.</li>
          <li>Pour que <code>git push</code> (et donc Claude) puisse pousser sur <code>main</code>, l'<b>authentification GitHub</b> doit être faite : <code>gh auth login</code> (recommandé) ou le gestionnaire d'identifiants Windows à la 1re opération. Sans ça, le push est refusé.</li>
        </ul>
      </div>
      <Code>{`# Démarrer une session (déjà cloné) : RÉCUPÉRER la dernière version de GitHub\ncd C:\\C-Secur360        # ou  cd C:\\CERDIA\\investissement-cerdia-main\ngit pull\n\n# Si "git pull" coince (tu as des modifs locales en conflit) :\ngit stash        # met tes modifs locales de côté\ngit pull         # récupère la dernière version\n# git stash pop  # (pour reprendre tes modifs, sinon demande à Eric)\n\n# ⚠️ FORCER exactement la version GitHub (efface tes modifs locales NON commitées) :\n# git fetch origin && git reset --hard origin/main\n\n# Une seule fois, pour autoriser le push (nouveau portable) :\ngh auth login`}</Code>

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

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, marginBottom: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>🧭 Avant de commencer (notions de base)</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7 }}>
              <li><b>PowerShell</b> = la fenêtre noire où on tape des commandes. Pour l'ouvrir : touche <b>Windows</b> → tape « <b>PowerShell</b> » → <b>Entrée</b>.</li>
              <li>Tu <b>tapes ou colles</b> une ligne, puis <b>Entrée</b> pour l'exécuter. Pour <b>coller</b> : <b>clic droit</b> dans la fenêtre (ou Ctrl+V).</li>
              <li>Après avoir <b>installé</b> un outil (Node, Git, Claude), <b>ferme et rouvre</b> PowerShell pour qu'il soit reconnu.</li>
              <li><b>Tu ne peux RIEN casser en production</b> tant que tu ne fais pas <code>git push</code> ni appliquer une migration. Explore sans crainte.</li>
              <li>Bloqué ? <b>Copie-colle le message d'erreur à Claude</b> et demande « explique-moi », ou écris à Eric.</li>
            </ul>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, marginBottom: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>📖 Petit lexique</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7 }}>
              <li><b>Repo / dépôt</b> : le dossier du code (versionné par Git).</li>
              <li><b>Commit</b> : enregistrer une modif (en local seulement).</li>
              <li><b>Push</b> : envoyer sur GitHub → <b>déclenche le déploiement</b> en prod (Vercel).</li>
              <li><b>Migration</b> : un fichier SQL qui modifie la base de données (Supabase).</li>
              <li><b>RLS</b> : règles de sécurité (qui peut lire/écrire les données).</li>
              <li><b>Tenant</b> : un client/entreprise isolé dans la plateforme.</li>
            </ul>
          </div>

          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 12, marginBottom: 14 }}>
            <div style={{ fontWeight: 700, color: '#166534', marginBottom: 6 }}>🔑 Ce qu'Eric doit t'avoir donné (accès)</div>
            <ul style={{ margin: 0, paddingLeft: 18, color: '#14532d', fontSize: 13, lineHeight: 1.6 }}>
              <li>Un accès <b>Claude (Anthropic)</b> : soit un compte avec abonnement <b>Claude Pro/Max</b>, soit une <b>clé API</b> de la console Anthropic.</li>
              <li><b>Collaborateur GitHub</b> sur les 2 dépôts privés (c-secur360-ast et investissement-cerdia).</li>
              <li><b>Membre des 2 projets Supabase</b> (pour l'éditeur SQL).</li>
              <li>(optionnel) Accès <b>Vercel</b> pour surveiller les déploiements.</li>
            </ul>
          </div>

          <h3 style={{ fontWeight: 700, fontSize: 16 }}>0) Première installation & connexion à Claude (une seule fois)</h3>
          <p><b>a.</b> Installe les outils de base : <a href="https://nodejs.org" target="_blank" rel="noreferrer">Node.js (LTS)</a> (fournit <code>npm</code>) et <a href="https://git-scm.com" target="_blank" rel="noreferrer">Git</a>. (PowerShell est déjà sur Windows.)</p>
          <p><b>b.</b> Installe Claude Code :</p>
          <Code>{`npm install -g @anthropic-ai/claude-code`}</Code>
          <p><b>c.</b> Connecte Claude Code à Anthropic — lance simplement :</p>
          <Code>{`claude`}</Code>
          <p style={{ marginTop: 0 }}>Au tout premier lancement, Claude ouvre le <b>navigateur</b> pour t'authentifier : connecte-toi avec le <b>compte Claude (Anthropic)</b> fourni par Eric (abonnement Pro/Max), ou choisis « API key » et colle la clé de la console Anthropic. Suis les instructions à l'écran. Ensuite <code>claude</code> est prêt.</p>
          <p><b>d.</b> Première commande Git : à ton premier <code>git clone</code> ou <code>git push</code>, une fenêtre GitHub te demandera de te connecter (ou fais <code>gh auth login</code>). Comme les dépôts sont <b>privés</b>, il faut qu'Eric t'ait ajouté comme collaborateur.</p>
          <p><b>e.</b> Supabase : connecte-toi sur <code>supabase.com/dashboard</code> avec le compte invité par Eric (tu y appliqueras le SQL des migrations).</p>

          <h3 style={{ fontWeight: 700, fontSize: 16 }}>1) Vérifier que tout est installé</h3>
          <Code>{`git --version\nnode --version\nclaude --version`}</Code>

          <h3 style={{ fontWeight: 700, fontSize: 16 }}>2) Ouvrir le projet (dans PowerShell)</h3>
          <p><b>Première fois</b> (le dossier n'existe pas encore) — exemple C-Secur360 :</p>
          <Code>{`cd C:\\\ngit clone https://github.com/Edufort321/c-secur360-ast.git C-Secur360\ncd C:\\C-Secur360\nnpm install`}</Code>
          <p>Pour CERDIA (git crée le dossier C:\\CERDIA au besoin) :</p>
          <Code>{`cd C:\\\ngit clone https://github.com/Edufort321/investissement-cerdia.git C:\\CERDIA\\investissement-cerdia-main\ncd C:\\CERDIA\\investissement-cerdia-main\nnpm install`}</Code>
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

          <h3 style={{ fontWeight: 700, fontSize: 16, marginTop: 16 }}>🆘 En cas de pépin (problèmes fréquents)</h3>
          <ul style={{ paddingLeft: 18, fontSize: 13.5, lineHeight: 1.8 }}>
            <li><b>« git/node/claude n'est pas reconnu »</b> → l'outil n'est pas installé, OU tu n'as pas <b>fermé/rouvert</b> PowerShell après l'installation. Rouvre-le ; sinon réinstalle (étape 0).</li>
            <li><b>Erreur de permission (EACCES / accès refusé)</b> → rouvre PowerShell <b>« en tant qu'administrateur »</b> (clic droit sur PowerShell → Exécuter en administrateur).</li>
            <li><b>`git clone` demande un mot de passe / refuse</b> → les dépôts sont <b>privés</b> : Eric doit t'avoir ajouté comme collaborateur GitHub. Connecte-toi (fenêtre GitHub) ou fais <code>gh auth login</code>.</li>
            <li><b>`npm install` échoue</b> → vérifie ta connexion internet, puis réessaie ; en dernier recours supprime le dossier <code>node_modules</code> et relance <code>npm install</code>.</li>
            <li><b>`npm run dev` : « port 3000 déjà utilisé »</b> → une autre fenêtre tourne déjà ; ferme-la (Ctrl+C) ou ouvre l'app affichée (souvent http://localhost:3001).</li>
            <li><b>Claude demande de se reconnecter</b> → relance <code>claude</code> et refais l'authentification (étape 0c). Vérifie que l'abonnement/clé Anthropic est actif.</li>
            <li><b>Migration : « already exists » dans l'éditeur SQL</b> → c'est <b>OK</b>, la migration était déjà appliquée (elles sont idempotentes). Continue.</li>
            <li><b>N'importe quelle erreur incomprise</b> → <b>copie-colle le message complet à Claude</b> : « explique-moi cette erreur et comment la régler ». Si ça touche la prod/une migration : écris à Eric.</li>
          </ul>

          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: 12, marginTop: 8, fontSize: 13 }}>
            ✅ <b>Règle d'or</b> : tant que tu ne fais ni <code>git push</code> ni migration, tu ne risques rien. Explore, demande à Claude, et garde Eric dans la boucle pour la prod.
          </div>
        </div>
      )}
    </div>
  );
}
