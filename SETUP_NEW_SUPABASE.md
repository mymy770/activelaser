# 🚀 Guide : Créer une Nouvelle Base Supabase

## Pourquoi créer une nouvelle base ?

- ✅ Environnement isolé (pas de partage avec Jonathan)
- ✅ Contrôle total sur votre base de données
- ✅ Pas de risque d'affecter d'autres projets
- ✅ Base propre et dédiée à votre agenda

---

## 📋 Étapes pour créer votre nouvelle base Supabase

### 1. Créer un nouveau projet Supabase

1. Allez sur https://supabase.com/dashboard
2. Cliquez sur **"New Project"**
3. Remplissez les informations :
   - **Name** : `claude-agenda` (ou le nom que vous voulez)
   - **Database Password** : Choisissez un mot de passe fort (⚠️ **SAVEZ-LE !**)
   - **Region** : Choisissez la région la plus proche
   - **Pricing Plan** : Free tier est suffisant pour commencer
4. Cliquez sur **"Create new project"**
5. ⏳ Attendez 2-3 minutes que la base soit créée

### 2. Récupérer les clés API

Une fois le projet créé :

1. Allez dans **Settings** → **API**
2. Vous verrez :
   - **Project URL** : `https://xxxxx.supabase.co`
   - **anon public key** : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role key** : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (⚠️ **GARDEZ-LA SECRÈTE !**)

### 3. Mettre à jour les variables d'environnement

Créez ou modifiez le fichier `.env.local` dans le projet :

```bash
# Variables Supabase (NOUVELLE BASE)
NEXT_PUBLIC_SUPABASE_URL=https://VOTRE-PROJECT-ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-anon-key-ici

# Optionnel (pour migrations/scripts admin)
SUPABASE_SERVICE_ROLE_KEY=votre-service-role-key-ici
```

⚠️ **Important** : Remplacez `VOTRE-PROJECT-ID` et les clés par les vraies valeurs de votre nouveau projet.

### 4. Exécuter la migration SQL complète

1. Allez dans **SQL Editor** (menu de gauche)
2. Cliquez sur **"New query"**
3. Ouvrez le fichier : `supabase/migrations/000_initial_schema.sql`
4. **Copiez-collez tout le contenu** dans l'éditeur SQL
5. Cliquez sur **"Run"** (ou `Cmd/Ctrl + Enter`)

✅ Cela va créer **TOUTES** les tables nécessaires :
- `branches`
- `branch_settings`
- `event_rooms`
- `profiles`
- `user_branches`
- `bookings`
- `booking_slots`
- `contacts` (nouveau - CRM)
- `booking_contacts` (nouveau - CRM)

### 5. Vérifier que tout fonctionne

1. Redémarrez votre serveur de dev :
   ```bash
   npm run dev
   ```

2. Testez l'application :
   - L'application devrait se connecter à votre nouvelle base
   - Vous pouvez créer des branches, des réservations, etc.

---

## 🔄 Si vous aviez déjà des données à migrer

Si vous aviez des données dans l'ancienne base (même si vous dites que c'est vide), vous pouvez :

1. **Exporter les données** de l'ancienne base (via SQL Editor)
2. **Importer dans la nouvelle** base (via SQL Editor)

Mais comme vous dites que c'est vide, pas besoin ! 🎉

---

## ✅ Checklist

- [ ] Nouveau projet Supabase créé
- [ ] Clés API récupérées
- [ ] `.env.local` mis à jour avec les nouvelles clés
- [ ] Migration SQL `000_initial_schema.sql` exécutée
- [ ] Application redémarrée
- [ ] Test de connexion réussi

---

## 🆘 En cas de problème

Si vous avez des erreurs :

1. **Vérifiez les variables d'environnement** : `.env.local` est bien rempli ?
2. **Vérifiez que la migration SQL a bien été exécutée** : Allez dans "Table Editor" et vérifiez que les tables existent
3. **Vérifiez les logs** : Console du navigateur et terminal

---

## 📝 Notes importantes

- ⚠️ **Ne partagez JAMAIS** votre `SUPABASE_SERVICE_ROLE_KEY` publiquement
- ✅ La base est maintenant **100% à vous**
- ✅ Vous pouvez tester sans risquer d'affecter d'autres projets
- ✅ Toutes les nouvelles fonctionnalités CRM seront dans cette base

---

**Une fois que c'est fait, dites-moi et je continue avec les phases suivantes !** 🚀
