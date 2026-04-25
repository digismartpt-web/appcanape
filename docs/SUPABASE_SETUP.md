# Setup Supabase pour App Canapé

Pour configurer la base de données Supabase pour App Canapé, suivez ces étapes :

1. **Coller le script SQL**
   - Allez dans le [Supabase Studio](https://app.supabase.io/).
   - Sélectionnez votre projet.
   - Allez dans l'onglet **SQL Editor**.
   - Copiez et collez le contenu de `scripts/db-setup.sql` dans l'éditeur SQL.
   - Cliquez sur **Run** pour exécuter le script.

2. **Isolation totale**
   - Le préfixe `appcanape_` garantit que cette table ne perturbe aucune autre table ou projet sur cette instance Supabase.

3. **Attention aux commandes DDL**
   - **Ne surtout pas** exécuter de commandes `DROP TABLE` ou `ALTER TABLE` sans le préfixe `appcanape_` pour éviter toute corruption de données.