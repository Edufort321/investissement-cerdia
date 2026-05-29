-- Migration 205 : DIAGNOSTIC (non destructif) des doublons de parts — C3
-- =====================================================================
-- Le trigger actuel (migration 113, auto_create_investor_shares) est idempotent
-- par transaction_id : il ne reinsere pas si une ligne investor_investments existe
-- deja pour la transaction. Le mecanisme de doublon est donc ferme depuis la 113.
-- Cette migration NE SUPPRIME RIEN — elle RAPPORTE d'eventuels doublons residuels
-- (crees avant la 113) sous forme de resultats SELECT.
--
-- A executer dans le SQL Editor Supabase, requete par requete (ou tout d'un coup ;
-- la derniere grille de resultat sera affichee). Chaque requete est etiquetee.
-- Si la requete 1 renvoie des lignes -> il y a des doublons : creer une migration
-- 206 de cleanup ciblee. Si elle est vide -> aucun doublon, rien a faire.
-- =====================================================================

-- 1) DOUBLONS : plusieurs lignes investor_investments pour un meme transaction_id.
--    Resultat VIDE = aucun doublon (etat sain).
SELECT
  'DOUBLON_PAR_TRANSACTION' AS diagnostic,
  transaction_id,
  COUNT(*)                  AS nb_lignes,
  SUM(number_of_shares)     AS parts_cumulees
FROM investor_investments
WHERE transaction_id IS NOT NULL
GROUP BY transaction_id
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- 2) Lignes de parts SANS transaction_id (reinvestissements de dividendes, etc.).
--    Normal pour les dividendes reinvestis — informatif seulement.
SELECT
  'PARTS_SANS_TRANSACTION' AS diagnostic,
  COUNT(*)                 AS nb_lignes,
  SUM(number_of_shares)    AS parts_cumulees
FROM investor_investments
WHERE transaction_id IS NULL;

-- 3) Parts cumulees par investisseur (controle visuel — compare a number_of_shares attendu).
SELECT
  'PARTS_PAR_INVESTISSEUR' AS diagnostic,
  ii.investor_id,
  COALESCE(i.first_name || ' ' || i.last_name, '?') AS nom,
  COUNT(*)              AS nb_lignes,
  SUM(ii.number_of_shares) AS parts_actives
FROM investor_investments ii
LEFT JOIN investors i ON i.id = ii.investor_id
WHERE ii.status = 'active'
GROUP BY ii.investor_id, i.first_name, i.last_name
ORDER BY SUM(ii.number_of_shares) DESC;
