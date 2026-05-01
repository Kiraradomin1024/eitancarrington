# Eitan Carrington — Dossier RP

Site web pour le personnage RP **Eitan Carrington** (GTA RP, quartier Richman Lane).
Présentation du perso, wiki des personnages liés, journal de jeu, mindmap interactive,
relations, enquêtes, soucis — avec un panel admin pour gérer les contributeurs.

Stack : **Next.js 16** + **TypeScript** + **Tailwind v4** + **Supabase** (Auth + Postgres + Storage) + **React Flow**.

---

## Mise en route

### 1. Créer un projet Supabase

1. Aller sur https://supabase.com/dashboard et créer un nouveau projet (gratuit suffit).
2. Une fois créé, ouvrir **Project Settings → API** et noter :
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. Variables d'environnement

```bash
cp .env.local.example .env.local
```

Remplir `.env.local` avec les valeurs ci-dessus. L'email de bootstrap admin
(`belcourtanastasia@gmail.com`) est déjà configuré — la première personne qui
s'inscrit avec cet email sera automatiquement admin.

### 3. Initialiser la base de données

Dans le dashboard Supabase :

1. Aller dans **SQL Editor**.
2. Ouvrir le fichier [`supabase/schema.sql`](./supabase/schema.sql) du projet.
3. Copier-coller tout son contenu dans l'éditeur, exécuter.

Cela crée toutes les tables, les triggers d'auto-création de profils,
les Row-Level Security policies, et insère la fiche d'Eitan.

### 4. Activer l'authentification email

Dans **Authentication → Providers**, vérifier que **Email** est activé.
Pour le dev, désactiver "Confirm email" si tu veux pouvoir te connecter
immédiatement sans recevoir de mail de confirmation.

### 5. Lancer le site

```bash
npm install   # déjà fait normalement
npm run dev
```

Ouvrir http://localhost:3000.

### 6. Créer ton compte admin

1. Cliquer sur **Connexion → S'inscrire**.
2. Utiliser l'email `belcourtanastasia@gmail.com`.
3. Tu seras automatiquement promu **admin** (configuré dans `handle_new_user()`).
4. Onglet **Admin** apparait dans la nav. Tu peux y promouvoir d'autres
   utilisateurs en `contributor` après leur inscription.

---

## Modèle de permissions

| Rôle           | Lecture | Écriture | Admin |
| -------------- | :-----: | :------: | :---: |
| Visiteur       | ✓       |          |       |
| `pending`      | ✓       |          |       |
| `contributor`  | ✓       | ✓        |       |
| `admin`        | ✓       | ✓        | ✓     |

- N'importe qui peut **lire** le dossier (pas besoin de compte).
- Une fois inscrit, l'utilisateur est en `pending` (lecture seule).
- L'admin peut le promouvoir en `contributor` depuis `/admin`.
- Les contributeurs peuvent ajouter / modifier persos, jours, relations,
  enquêtes, indices, soucis.
- Seul l'admin peut éditer la **fiche principale d'Eitan** et gérer les rôles.

Tout est protégé côté serveur par les **Row Level Security** policies de Supabase.

---

## Structure

```
src/
├── app/
│   ├── page.tsx               # Présentation Eitan
│   ├── wiki/                  # CRUD personnages
│   ├── journal/               # CRUD jours de RP
│   ├── relations/             # Liens Eitan ↔ persos
│   ├── mindmap/               # Vue React Flow
│   ├── enquetes/              # CRUD enquêtes + indices
│   ├── soucis/                # Issues / arcs narratifs
│   ├── admin/                 # Panel admin
│   ├── login, signup          # Auth
│   └── auth/signout           # Route logout
├── components/                # UI réutilisable
└── lib/
    ├── supabase/              # Clients (browser, server, middleware)
    ├── auth.ts                # Helpers de rôle
    ├── types.ts               # Types DB
    └── utils.ts
```

---

## Déploiement

Vercel marche out-of-the-box :

1. Pousser ce dossier sur GitHub.
2. Importer dans Vercel.
3. Ajouter les mêmes variables d'env.
4. Déployer.

Pas de config supplémentaire — Supabase est joignable depuis Vercel.

---

## Personnaliser le perso

Tu peux soit :
- **Via le site** (recommandé) : se connecter en admin → "Modifier la fiche"
  sur la page d'accueil.
- **Via SQL** : éditer la ligne `character` dans Supabase.
