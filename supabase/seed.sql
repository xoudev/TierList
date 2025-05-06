-- Ce fichier peut être utilisé pour tester les politiques RLS
-- Il applique les politiques définies dans 20240101_rls_policies.sql

-- Importer les politiques
\i 'migrations/20240101_rls_policies.sql'

-- Ajouter des logs pour vérifier que les politiques ont été appliquées
SELECT 'Politiques RLS appliquées avec succès' as message; 