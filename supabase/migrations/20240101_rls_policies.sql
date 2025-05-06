-- Activer la Row Level Security pour les tables
ALTER TABLE tier_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tier_lists ENABLE ROW LEVEL SECURITY;

-- Politique pour que les utilisateurs puissent voir les tier lists et leurs éléments
CREATE POLICY "Les utilisateurs peuvent voir toutes les tier lists"
  ON tier_lists FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Les utilisateurs peuvent voir tous les éléments des tier lists"
  ON tier_list_items FOR SELECT
  TO authenticated, anon
  USING (true);

-- Politique pour que seuls les propriétaires peuvent modifier leurs tier lists
CREATE POLICY "Les propriétaires peuvent modifier leurs tier lists"
  ON tier_lists FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Politique pour que seuls les propriétaires peuvent supprimer leurs tier lists
CREATE POLICY "Les propriétaires peuvent supprimer leurs tier lists"
  ON tier_lists FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Politique pour que seuls les propriétaires peuvent ajouter des éléments à leurs tier lists
CREATE POLICY "Les propriétaires peuvent ajouter des éléments à leurs tier lists"
  ON tier_list_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tier_lists 
      WHERE id = tier_list_items.tier_list_id 
      AND user_id = auth.uid()
    )
  );

-- Politique pour que seuls les propriétaires peuvent modifier les éléments de leurs tier lists
CREATE POLICY "Les propriétaires peuvent modifier les éléments de leurs tier lists"
  ON tier_list_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tier_lists 
      WHERE id = tier_list_items.tier_list_id 
      AND user_id = auth.uid()
    )
  );

-- Politique pour que seuls les propriétaires peuvent supprimer les éléments de leurs tier lists
CREATE POLICY "Les propriétaires peuvent supprimer les éléments de leurs tier lists"
  ON tier_list_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tier_lists 
      WHERE id = tier_list_items.tier_list_id 
      AND user_id = auth.uid()
    )
  ); 