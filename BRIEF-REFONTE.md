# Brief de refonte — Journal d'Eitan Carrington

Document de référence décrivant **entièrement** le site existant, destiné à une refonte
graphique/UX complète. Tout ce qui suit décrit l'état actuel en production.

---

## 1. Contexte & objectif

Site **RP (roleplay) GTA V** documentant la vie du personnage **Eitan Carrington**,
21 ans, dernier des Carrington, habitant de **Richman Lane, Los Santos**
(⚠️ orthographe exacte : « Richman Lane », jamais « Richmond »).

C'est un **dossier vivant** tenu par le joueur et ses proches : wiki des personnages,
journal de sessions, enquêtes, carte, mindmap des relations, quiz. Le ton est celui
d'un **journal intime / dossier d'enquête**, pas d'un site corporate.

**Audience** : la communauté du stream (viewers Twitch), les autres joueurs RP.
Trafic par pics (pendant/après les lives). Public majoritairement **francophone**
— toute l'interface est en français.

---

## 2. Stack technique (contraintes à respecter)

| Élément | Détail |
|---|---|
| Framework | **Next.js 16** (App Router, React 19, Server Components) |
| Styles | **Tailwind CSS v4** + un fichier `globals.css` avec variables CSS |
| Backend | **Supabase** (Postgres + Auth + RLS + Realtime + Edge Function) |
| Hébergement | **Vercel** (plan gratuit — la conso CPU/invocations compte) |
| Images | Upload via Edge Function → **ImgChest** (URLs externes) |
| Polices | `next/font/google` : **Inter**, **Fraunces**, **Caveat** |
| Autres libs | `reactflow` (mindmap), `leaflet` (carte), `lucide-react` |

**Conséquences pour la refonte :**
- Le thème est piloté par des **variables CSS** (`--background`, `--accent`, etc.)
  dupliquées pour `:root` (clair) et `[data-theme="dark"]`. Un toggle de thème
  existe et doit être conservé, avec un script anti-FOUC dans le `<head>`.
- Éviter les dépendances lourdes ou les effets coûteux en CPU serveur.
- ⚠️ **`backdrop-filter` casse le rendu de Leaflet** (bug déjà rencontré) : ne pas
  l'appliquer au conteneur de la carte.

---

## 3. Rôles & permissions

| Rôle | Droits |
|---|---|
| **Visiteur** (non connecté) | Lecture seule de tout le contenu public |
| **pending** | Compte créé, en attente de validation |
| **contributor** | Créer/modifier le contenu (wiki, journal, enquêtes, soucis, carte) |
| **admin** | Tout + gestion des rôles, chapitres, fiche d'Eitan, quiz |
| **Kirara** (admin nommé) | Seule à piloter le « mode hacking » et le refresh distant |

Deux comptes ont un statut spécial pour un chat privé : **Kirara** (alias `sc292`)
et **ridzer69** (alias `Eitan`).

---

## 4. Arborescence complète des pages

### Publiques / lecture
| Route | Rôle |
|---|---|
| `/` | **Accueil** — hero avec photo d'Eitan, bio, famille, traits, 3 stats cliquables, statut Twitch live + embed du stream si en direct |
| `/wiki` | **Liste des personnages** (NPCs) — grille de cartes (photo ronde, nom, occupation, statut, Twitch) + recherche/filtres |
| `/wiki/[id]` | **Fiche personnage** — 2 colonnes : sidebar (photo, statut, famille, quartier, occupation, numéro, Twitch, sommaire) + contenu (description Markdown, liens/relations, historique) |
| `/wiki/eitan` | **Fiche du personnage principal** (bio, background, traits) |
| `/journal` | **Journal** — sessions groupées par **chapitres** repliables, cartes « Jour N » avec date, résumé, épinglage |
| `/journal/[id]` | **Récit d'une session** — titre, date, résumé, lien VOD Twitch, contenu Markdown, personnages liés, historique |
| `/mindmap` | **Mindmap interactive** (reactflow) — nœuds personnages + Eitan au centre, 2 modes : « full » (tout le graphe, positions déplaçables et sauvegardables) et « explore » (focus sur un perso + voisins, filtres famille/type) |
| `/map` | **Carte de Los Santos** (leaflet) — fond de carte GTA V, marqueurs par catégorie (domicile/travail/important/danger/autre) avec icônes, filtres, sidebar de lieux, ajout par clic droit |
| `/relations` | **Liste des relations** entre personnages |
| `/enquetes` | **Enquêtes** — grille de cartes avec statut (ouverte / en cours / résolue / au point mort) |
| `/enquetes/[id]` | **Détail d'enquête** — description, indices (avec images), personnages liés et leur rôle |
| `/soucis` | **Soucis** — problèmes/arcs narratifs en cours, avec sévérité et statut |
| `/quizz` | **Quiz** — mini-jeu question par question (voir §6) |
| `/u/[id]` | **Profil contributeur** — avatar, bio, contributions |

### Authentification & édition
`/login`, `/signup`, `/u/edit`, `/wiki/new`, `/wiki/[id]/edit`, `/journal/new`,
`/journal/new-chapter`, `/journal/[id]/edit`, `/enquetes/new`, `/enquetes/[id]/edit`,
`/admin`, `/admin/character`.

---

## 5. Modèle de données (tables Supabase)

- **`profiles`** — id, email, display_name, role, avatar_url, bio
- **`character`** — le personnage principal : name, age, bio, background, photo_url,
  traits[], twitch_username, is_main
- **`npcs`** — les personnages : name, slug, photo_url, description, family,
  neighborhood, occupation, **status** (`alive`/`dead`/`missing`/`unknown`), tags[],
  twitch_username, phone_number, mindmap_note
- **`relations`** — source_npc_id (null = Eitan), target_npc_id, **type**
  (`family`/`friend`/`enemy`/`romance`/`business`/`contact`/`rival`/`mentor`/
  `colleague`/`other`), intensity, description
- **`chapters`** — number, title, subtitle
- **`days`** — sessions : date, day_number, title, summary, content (Markdown),
  vod_url, chapter_id, pinned
- **`day_npcs`** — liaison sessions ↔ personnages
- **`investigations`** + **`investigation_clues`** + **`investigation_npcs`**
- **`issues`** — soucis : title, description, status, severity
- **`map_markers`** (+ `map_marker_people`) — label, description, category, x, y
  (coordonnées GTA V natives), liens vers persos/enquêtes
- **`quiz_questions`** / **`quiz_attempts`** / vue `quiz_leaderboard`
- **`mindmap_layouts`** — positions des nœuds par utilisateur
- **`audit_log`** — historique des modifications (avec possibilité de revert)
- **`site_settings`** — `hacking_mode` (bool), `reload_nonce`
- **`chat_messages`** — chat privé Kirara ⇄ ridzer69

---

## 6. Fonctionnalités transverses (à préserver)

### Édition de contenu
- **Éditeur Markdown maison** avec aperçu côte à côte et **barre flottante de mise
  en forme** au style Notion (gras, italique, souligné, barré, code, spoiler, lien).
- Rendu Markdown façon **Discord** : titres, gras/italique/souligné/barré,
  citations (`>` et `>>>`), listes, code inline et blocs, `||spoilers||`, images, liens.
- **Upload d'images** par clic ou glisser-déposer (max 10 Mo → ImgChest).

### Twitch
- Chaque personnage peut avoir un pseudo Twitch → **pastille live** qui indique s'il
  streame **en catégorie GTA V**. Sur l'accueil, si Eitan est en live, **embed du stream**.
- ⚠️ Le statut est mis en cache **90 s** côté serveur (contrainte de coût Vercel).

### Divers
- **Lightbox images** : clic sur n'importe quelle image → aperçu plein écran style
  Discord avec zoom molette, pan, double-clic, `Échap`, `+`/`-`/`0`.
- **Thème clair/sombre** avec bascule et persistance.
- **Historique/audit** avec possibilité d'annuler une modification.
- **Fil d'activité** des contributions récentes.
- **SEO** : métadonnées Open Graph/Twitter par page, sitemap, robots.

### Traitement « in memoriam »
Les personnages **décédés** (`status = "dead"`) reçoivent partout (wiki liste, fiche,
mindmap) un **filtre noir & blanc** sur la photo + un **petit ruban noir de deuil**
en diagonale dans le coin, et la mention « · En mémoire · » sur leur fiche.

### Quiz (mini-jeu)
Machine à états : **intro** (bouton Commencer/Continuer, score perso) → **question**
(une seule à la fois, 4 réponses A/B/C/D, barre de progression) → **feedback**
(bonne réponse en vert / erreur en rouge + la bonne) → **fin** (score, verdict).
Ordre aléatoire, une seule tentative par question, **classement top 10** en sidebar
avec médailles 🥇🥈🥉 et la ligne du joueur s'il est hors top 10.
La validation de la réponse se fait **côté serveur** (anti-triche).

---

## 7. ⚡ Le « mode hacking SC292 » (élément clé du lore)

**Scénario RP** : un hacker nommé **SC292** traque Eitan suite au décès de
**Lune Suarez** (elle-même traquée). **Diego Suarez** (son frère) est aussi une cible.

**Kirara seule** peut activer/désactiver ce mode via un bouton flottant. L'état est
partagé en base et diffusé **en temps réel** : tous les visiteurs basculent
instantanément, sans recharger.

Quand il est actif, **le site tout entier se transforme** — direction artistique
**DedSec (Watch Dogs 2)** :
- Thème remplacé : noir violacé + **magenta `#ff0066`**, **cyan `#00f0ff`**, jaune
- Typo condensée/majuscules avec **split chromatique** (RGB shift) sur les titres
- **Séquence de boot terminal** plein écran (~6 s) : flux de lignes de code
  procédurales, phases d'intrusion, barre de progression, puis « ACCÈS ROOT OBTENU »
  et la liste des cibles
- Fond de **static/glitch** (bruit RGB + barres de déchirure)
- **Bandeau de brèche** défilant en haut
- **HUD de traçage** en bas à gauche : logs qui se tapent en continu + panneau des
  cibles (E. CARRINGTON `LOCALISÉ`, D. SUAREZ `RECHERCHÉ`, L. SUAREZ `DÉCÉDÉE`)
- **Bursts d'intrusion** rares (~5 min) : message glitché + crâne DedSec + secousse
  RGB de l'écran
- Sur les pages wiki/journal : **séquence d'accès au dossier** — le contenu est
  masqué, un panneau « SC292 // ACCÈS DOSSIER » déchiffre le nom du fichier avec une
  barre de progression, puis le contenu se révèle par balayage, suivi d'un tampon
  « DOSSIER COMPROMIS ». Bannières « CIBLE VERROUILLÉE » sur Eitan et Diego.
- **Chat privé** (bas droite) entre `Eitan` et `sc292`, disponible **uniquement**
  dans ce mode : temps réel, images/GIF, notifications (son + pulsation + notif desktop)

**Important pour la refonte** : ce mode est un **second thème complet** qui écrase le
premier. Il faut donc que la refonte prévoie **deux directions artistiques
cohérentes** — le thème normal et le thème « piraté » — et une bascule propre.

---

## 8. Design system actuel (point de départ, à repenser)

### Ambiance actuelle
**« Old money / gosse de riche »** — noir & or en sombre, ivoire champagne en clair.
Volonté affichée : quelque chose de **riche, avec du relief et de la matière**,
surtout pas plat, mais **sobre** (pas de néon criard).

### Palette
- **Clair** : fond ivoire `#f6f1e6`, texte `#1c1710`, accents or `#a67c2e` / `#c9a35e`
- **Sombre** : fond noir chaud `#0b0907`, texte `#f1e8d4`, or `#d4af37` / `#e8cd8a`
- Sémantique : danger, succès, warn

### Typographie
- **Fraunces** (serif éditorial) → titres
- **Inter** → texte courant
- **Caveat** (manuscrite) → annotations, « scribbles » en marge, légendes

### Composants & effets caractéristiques
- **Cartes en verre** (glassmorphism) avec **biseau embossé** (liseré clair en haut,
  ombre interne en bas), halo doré au survol, léger soulèvement
- **Champs de formulaire gravés** (ombre interne, effet creusé)
- **Texte en or brossé** avec reflet qui traverse (`.text-gradient`)
- **Filet ornemental** sous les titres avec un **losange serti** au centre (`.title-rule`)
- Texture : **trame de soie tissée** en diagonale + **grain de paillettes d'or**
- Fond : lumière dorée douce descendante + vignette qui dérive lentement
- **Annotations manuscrites** (`.scribble`) en accent, légèrement inclinées
- Scrollbar dégradée, onglets de nav avec soulignement lumineux

### Éléments spécifiques stylés
- **Nœuds de mindmap** : carte photo + nom + sous-titre + note éditable ; le nœud
  d'Eitan est un dégradé animé plus grand
- **Marqueurs de carte** : pastille ronde colorée par catégorie avec icône blanche
- **Logo de nav** : la photo d'Eitan (fallback : monogramme « E »)

---

## 9. Ce qu'il faut absolument conserver

1. **Toutes les routes et fonctionnalités** listées ci-dessus.
2. Les **deux thèmes** (clair/sombre) + le **mode hacking** comme troisième état.
3. L'**identité RP** : c'est un dossier personnel/enquête, pas un site vitrine. Le
   français, le ton intime, les annotations manuscrites font partie de l'ADN.
4. Le **traitement des personnages décédés** (hommage).
5. La **lisibilité** : beaucoup de texte long (récits de session, descriptions).
   Confort de lecture prioritaire sur les effets.
6. **Responsive** : beaucoup de viewers consultent depuis mobile pendant le stream.
7. **`prefers-reduced-motion`** respecté (le site a beaucoup d'animations).
8. **Sobriété en ressources** (hébergement gratuit) : pas d'effets qui exigent du
   rendu serveur supplémentaire.

## 10. Pistes de refonte souhaitées (libre)

- Repenser la hiérarchie visuelle des pages longues (journal, fiches wiki).
- Améliorer la navigation quand le contenu grossit (recherche globale, filtres).
- Renforcer la cohérence entre les pages « outil » (mindmap, carte, quiz) et les
  pages « lecture ».
- Trouver une direction artistique qui tienne à la fois le **luxe old-money** et
  la bascule **cyberpunk DedSec**, sans que l'une paraisse plaquée sur l'autre.
