# Brief de refonte — *Journal d'Eitan Carrington*

Document de référence décrivant **entièrement** le site, destiné à une **refonte
graphique et UX totale**. Tout ce qui suit décrit l'état réel du code en production.

> À lire en entier avant de dessiner quoi que ce soit. La section 1 n'est pas du
> remplissage : c'est elle qui détermine si la refonte est réussie ou ratée.

---

## 1. Ce que ce site est vraiment

**Ce n'est pas un site.** C'est **un objet de fiction**.

Le site est censé être **le journal intime et le dossier personnel d'Eitan
Carrington**, un personnage de roleplay GTA V. Il est tenu par lui et par ses
proches. On y note ce qui s'est passé cette nuit-là, qui était présent, qui doit
de l'argent à qui, qui a disparu, qui est mort.

Quelqu'un qui arrive sur la page d'accueil doit avoir l'impression **d'ouvrir un
carnet posé sur une table**, pas de charger une application web.

### Les trois métaphores qui tiennent la direction artistique

| Métaphore | Ce que ça implique visuellement |
|---|---|
| **Le journal intime** | Écriture à la première personne, dates, ratures, annotations manuscrites en marge, papier, encre |
| **Le dossier d'enquête** | Numéros de pièce, intercalaires, tampons, filets, chemises cartonnées, photos d'identité agrafées, fiches signalétiques |
| **L'archive d'une famille** | Portraits encadrés, mentions « en mémoire », généalogie, objets de valeur usés par le temps |

### Le test à s'appliquer en permanence

Devant chaque écran dessiné, se demander : **est-ce que ça pourrait exister sur
papier ?** Si la réponse est « non, c'est un tableau de bord », c'est raté.

Corollaires concrets :

- **Le « je » avant le « vous ».** Les textes d'interface sont écrits depuis
  l'intérieur de la fiction. « Les gens que je croise » plutôt que « Liste des
  personnages ». Le site ne parle jamais de lui-même comme d'un site : pas de
  « Bienvenue sur », pas de « Découvrez », pas de « Notre communauté ».
- **Les noms de pages sont ceux d'un carnet.** Journal, Wiki, Enquêtes, Soucis,
  Carte. Jamais Dashboard, Feed ou Explore.
- **Rien n'est neutre.** Un statut de personnage n'est pas une donnée, c'est une
  nouvelle. « Décédé » doit se lire comme une mauvaise nouvelle, « En prison »
  comme un problème, « Parti » comme un vide.
- **Le vide fait partie du récit.** Une page sans contenu dit « rien de noté pour
  l'instant », pas « aucun résultat ».
- **C'est daté et situé.** Los Santos, Richman Lane, des jours numérotés. Le
  temps qui passe est un matériau de design.

### Détails de lore à ne jamais casser

- **Eitan Carrington**, 24 ans, dernier né de la famille Carrington.
- Habite **Richman Lane, Los Santos**. Orthographe exacte : *Richman*, jamais
  « Richmond ».
- Famille juive aisée. Mère **Blair Carrington**, frère **Elias Carrington**,
  demi-sœurs jumelles Dexie et Dixie.
- Il vit dans le quartier riche **sans se reconnaître** dans les codes de sa
  famille. Cette tension entre le luxe hérité et la vraie vie menée ailleurs est
  le cœur de la direction artistique. Le site doit avoir de la valeur et de la
  matière, tout en restant **abîmé, personnel, tenu à la main**. Ni vitrine de
  luxe, ni cyberpunk générique.
- Le site est **entièrement en français**, ton intime et tutoiement.

---

## 2. Qui regarde ce site, et quand

- **Les viewers Twitch** du stream, pendant et juste après les lives. Ils
  arrivent par pics, souvent **sur mobile, une main, le stream à côté**. Ils
  cherchent une information précise : c'est qui ce personnage, il s'est passé
  quoi hier.
- **Les autres joueurs RP**, qui viennent vérifier une relation, une date, un
  numéro de téléphone.
- **Les contributeurs**, un petit groupe de proches qui écrivent les récits de
  session, souvent **longs**, depuis un ordinateur.

Conséquences non négociables :

1. **Le mobile est le cas principal en lecture**, le desktop le cas principal en
   écriture. Les deux méritent le même sérieux.
2. **Le confort de lecture prime sur les effets.** Certains récits font plusieurs
   milliers de mots.
3. **Retrouver quelqu'un doit être instantané.** Aujourd'hui ça ne l'est pas,
   voir la section 9.

---

## 3. Contraintes techniques à respecter

| Élément | Détail |
|---|---|
| Framework | **Next.js 16**, App Router, React 19, Server Components par défaut |
| Styles | **Tailwind CSS v4** et un `globals.css` d'environ 1700 lignes piloté par variables CSS |
| Backend | **Supabase** : Postgres, Auth, RLS, Realtime, une Edge Function |
| Hébergement | **Vercel, plan gratuit**, donc la consommation CPU et le nombre d'invocations comptent |
| Images | Upload via Edge Function vers **ImgChest**, donc des URLs externes en balise `img` native, pas `next/image` |
| Polices | **Inter**, **Fraunces**, **Caveat**, plus **Oswald** et **JetBrains Mono** réservées au mode intrusion |
| Bibliothèques | `reactflow` pour la mindmap, `leaflet` pour la carte, `lucide-react`, `clsx`, `tailwind-merge` |

Points de vigilance issus de bugs déjà rencontrés :

- Le thème est piloté par des **variables CSS** définies deux fois, pour le clair
  et pour le sombre. Un **script anti-scintillement** dans l'en-tête applique le
  thème avant le premier rendu. À conserver.
- La propriété `color-scheme` doit rester déclarée sur les deux thèmes, sinon les
  **menus natifs des listes déroulantes** redeviennent illisibles.
- **`backdrop-filter` casse le rendu de Leaflet.** Ne jamais l'appliquer à un
  parent de la carte.
- Le statut Twitch est **mis en cache 90 secondes côté serveur**, pour le coût.
- Le conteneur principal est centré à une largeur maximale d'environ 1150 pixels,
  et la navigation bascule en menu burger **sous 1140 pixels**.

---

## 4. Rôles et permissions

| Rôle | Droits |
|---|---|
| **Visiteur** non connecté | Lecture de tout le contenu public |
| **pending** | Compte créé, en attente de validation par un admin |
| **contributor** | Créer et modifier le contenu : wiki, journal, enquêtes, soucis, carte |
| **admin** | Tout, plus la gestion des rôles, des chapitres, de la fiche d'Eitan et du quiz |
| **Kirara**, admin nommée | Seule à pouvoir déclencher le mode intrusion et le rechargement distant |

Deux comptes ont un statut narratif particulier pour le chat privé : **Kirara**,
alias `sc292`, et **ridzer69**, alias `Eitan`.

---

## 5. Inventaire complet des pages

### Pages de lecture

| Route | Contenu réel aujourd'hui |
|---|---|
| `/` | **Accueil.** Une ligne de dossier « n° EC-021 · Richman Lane, Los Santos », le nom en très grand, une accroche d'une ligne, trois compteurs cliquables pour les personnages, les jours passés et les enquêtes, un portrait encadré légendé « Cliché n° 004 » avec pastille Twitch, la liste des traits, puis deux blocs côte à côte, Biographie et Famille & origines. Si Eitan est en direct, **le lecteur Twitch s'insère** au milieu de la page. |
| `/wiki` | **Les personnages.** Une légende des pastilles live, une carte mise en avant pour Eitan, puis une grille de quatre colonnes séparées par des filets : portrait carré, nom, occupation, statut coloré, pseudo Twitch. **Aucune recherche ni filtre.** |
| `/wiki/[id]` | **Fiche personnage.** Deux colonnes. À gauche le portrait, le statut, la famille, le quartier, l'occupation, le téléphone, Twitch et un sommaire. À droite la description en Markdown, les relations, et l'historique des modifications. |
| `/wiki/eitan` | **Fiche du personnage principal**, traitée à part du reste du wiki. |
| `/journal` | **Le journal.** Les sessions groupées par **chapitres repliables**, du plus récent au plus ancien. Chaque entrée est un « Jour N » avec sa date, son titre et son résumé, et peut être **épinglée**. |
| `/journal/[id]` | **Récit d'une session.** Titre, date, résumé, lien vers la VOD Twitch, contenu Markdown long, personnages présents, historique. |
| `/mindmap` | **Carte des relations**, en reactflow. Eitan au centre, les personnages autour. Deux modes : **Vue complète**, tout le graphe avec des nœuds déplaçables dont les positions sont sauvegardées par utilisateur, et **Exploration**, un personnage au centre avec ses voisins, filtres par famille et par type de lien. |
| `/map` | **Carte de Los Santos**, en Leaflet sur le fond GTA V. Marqueurs par catégorie : domicile, travail, important, danger, autre. Filtres, panneau latéral des lieux, ajout par clic droit, liens vers les personnages et les enquêtes. |
| `/relations` | **Liste des relations** entre personnages, éditable en ligne. |
| `/enquetes` | **Enquêtes** en grille, avec leur statut : ouverte, en cours, résolue, au point mort. |
| `/enquetes/[id]` | **Détail d'une enquête** : description, indices avec images, personnages impliqués et leur rôle. |
| `/soucis` | **Soucis.** Les problèmes et arcs en cours, avec une sévérité de mineur à critique et un statut actif, résolu ou en pause. |
| `/quizz` | **Quiz** sur le lore. Enchaînement intro, question, correction, bilan. Une question à la fois, quatre réponses, barre de progression, **validation côté serveur** contre la triche, une seule tentative par question, **classement des dix meilleurs** avec médailles. |
| `/u/[id]` | **Profil d'un contributeur** : avatar, bio, contributions. |

### Pages d'authentification et d'édition

`/login`, `/signup`, `/u/edit`, `/wiki/new`, `/wiki/[id]/edit`, `/journal/new`,
`/journal/new-chapter`, `/journal/[id]/edit`, `/enquetes/new`,
`/enquetes/[id]/edit`, `/admin`, `/admin/character`.

La navigation principale expose huit entrées : **Eitan, Wiki, Journal, Mindmap,
Carte, Enquêtes, Soucis, Quizz**, plus l'accès Admin et le profil.

---

## 6. Modèle de données

- **`profiles`** : id, email, display_name, role, avatar_url, bio
- **`character`** : le personnage principal, avec name, age, bio, background,
  photo_url, traits, twitch_username, is_main
- **`npcs`** : name, slug, photo_url, description, age, family, neighborhood,
  occupation, **status**, tags, twitch_username, phone_number, mindmap_note
- **`relations`** : source_npc_id, nul pour Eitan, target_npc_id, **type**,
  intensity, description
- **`chapters`** : number, title, subtitle
- **`days`**, les sessions : date, day_number, title, summary, content en
  Markdown, vod_url, chapter_id, pinned
- **`day_npcs`** : liaison entre une session et les personnages présents
- **`investigations`**, **`investigation_clues`**, **`investigation_npcs`**
- **`issues`** : title, description, status, severity
- **`map_markers`** et **`map_marker_people`** : label, description, category,
  et des coordonnées en unités GTA V natives
- **`quiz_questions`**, **`quiz_attempts`**, et la vue **`quiz_leaderboard`**
- **`mindmap_layouts`** : les positions des nœuds, par utilisateur
- **`audit_log`** : l'historique des modifications, avec annulation possible
- **`site_settings`** : le mode intrusion et un jeton de rechargement
- **`chat_messages`** : le chat privé

### Les deux énumérations qui portent du récit

**Statut d'un personnage**, six valeurs. Chacune mérite un traitement visuel
distinct : ce sont des nouvelles avant d'être des étiquettes.

| Valeur | Libellé | Traitement actuel |
|---|---|---|
| `alive` | En vie | vert sobre |
| `dead` | Décédé | **noir et blanc, plus le deuil décrit en section 7** |
| `missing` | Disparu | rouge |
| `gone` | Parti | gris neutre |
| `jailed` | En prison | ambre |
| `unknown` | Inconnu | gris neutre |

**Type de relation**, dix valeurs : famille, ami, ennemi, romance, affaires,
contact, rival, mentor, collègue, autre.

---

## 7. Fonctionnalités transverses à préserver

### Écriture
- **Éditeur Markdown maison**, avec aperçu côte à côte et une **barre flottante
  de mise en forme** qui apparaît au survol de la sélection : gras, italique,
  souligné, barré, code, spoiler, lien.
- **Rendu à la manière de Discord** : titres, styles, citations simples et
  multilignes, listes, code en ligne et en bloc, spoilers, images, liens.
- **Envoi d'images** au clic ou par glisser-déposer, dix mégaoctets maximum.

### Twitch
- Chaque personnage peut porter un pseudo Twitch. Une **pastille live** indique
  s'il est en train de streamer, et précisément **en catégorie GTA V**.
- Sur l'accueil, si Eitan est en direct, **son stream s'affiche dans la page**.

### Le traitement « en mémoire », à ne surtout pas perdre
Les personnages **décédés** reçoivent partout, dans la liste du wiki, sur leur
fiche et dans la mindmap, un **filtre noir et blanc** sur le portrait et un
**petit ruban de deuil** en diagonale dans un coin. Leur fiche porte la mention
« · En mémoire · ».

C'est le détail le plus important du site sur le plan émotionnel. Dans la
refonte il doit rester **discret et digne**, jamais décoratif. Les cinq autres
statuts méritent un soin comparable, mais plus léger.

### Divers
- **Visionneuse d'images** sur tous les visuels : plein écran, zoom à la molette,
  déplacement, double-clic, raccourcis clavier.
- **Thème clair et sombre** avec bascule persistante.
- **Historique et audit** des modifications, avec annulation.
- **Fil d'activité** des contributions récentes.
- **Référencement** : métadonnées Open Graph et Twitter par page, plan du site,
  fichier robots.

---

## 8. Le mode intrusion SC292, seconde direction artistique

**Scénario RP** : un hacker nommé **SC292** traque Eitan après la mort de **Lune
Suarez**. **Diego Suarez**, le frère de Lune, est lui aussi une cible.

**Kirara seule** peut activer ce mode. L'état est stocké en base et diffusé **en
temps réel**, donc tous les visiteurs basculent instantanément, sans recharger.

Quand il est actif, **le site entier se transforme**, dans une direction
artistique de type DedSec, la faction de *Watch Dogs 2* :

- Palette remplacée : noir violacé, **magenta**, **cyan**, jaune
- Typographie condensée en capitales, avec **décalage chromatique** sur les titres
- **Séquence de démarrage terminal** en plein écran, environ six secondes : flux
  de code, phases d'intrusion, barre de progression, accès root obtenu, liste des
  cibles
- Fond de parasites et barres de déchirure, **bandeau de brèche** défilant
- **Interface de traçage** en bas à gauche : un journal qui se tape en continu et
  un panneau des cibles, Eitan localisé, Diego recherché, Lune décédée
- **Surgissements d'intrusion** rares, environ toutes les cinq minutes
- Sur les fiches et les récits, une **séquence d'accès au dossier** : le contenu
  est masqué, un panneau déchiffre le nom du fichier, puis le contenu se révèle
  par balayage, suivi d'un tampon « dossier compromis »
- **Chat privé** en bas à droite entre Eitan et sc292, disponible uniquement dans
  ce mode : temps réel, images, son, notification sur le bureau

**Ce que ça impose à la refonte** : il faut concevoir **deux directions
artistiques complètes**, pas une seule plus un filtre. Et surtout **une charnière
crédible entre les deux**. Aujourd'hui le mode intrusion paraît plaqué. L'idéal
serait que le thème normal contienne déjà, discrètement, ce que l'intrusion vient
déchirer. C'est le même dossier, mais quelqu'un d'autre est en train de le lire.

---

## 9. La direction artistique actuelle, et pourquoi elle bouge

### État actuel : dossier éditorial, noir et or

Angles droits, aucun arrondi, grilles séparées par des filets d'un pixel,
Fraunces en graisse légère pour les titres, micro-labels en capitales très
espacées, grain de papier très fin en surimpression, aucun effet de verre.

| Thème | Fond | Texte | Accent |
|---|---|---|---|
| Clair | ivoire `#f6f1e6` | encre `#1c1710` | or `#a67c2e` |
| Sombre | noir chaud `#0b0907` | crème `#f1e8d4` | or `#d4af37` |

Typographie : **Fraunces** pour les titres, **Inter** pour le texte courant,
**Caveat** pour les annotations manuscrites en marge.

Signatures réutilisables : la ligne de surtitre en capitales dorées, la grille à
filets, le trait court sous les titres, les annotations manuscrites, le numéro de
dossier, les légendes de clichés.

### Ce qui ne va pas aujourd'hui

1. **Trop propre.** Le résultat est élégant mais lisse, plus proche d'un magazine
   que d'un carnet tenu à la main. La matière manque : papier froissé, encre
   irrégulière, trombones, ratures.
2. **Les pages outil et les pages lecture ne se parlent pas.** La mindmap, la
   carte et le quiz ressemblent à des applications posées dans un magazine.
3. **Pas de recherche.** Avec des dizaines de personnages, la grille du wiki
   devient impraticable. C'est le manque fonctionnel le plus urgent.
4. **La hiérarchie des pages longues est faible.** Un récit de trois mille mots
   est un mur de texte.
5. **Le mode intrusion paraît collé** par-dessus, sans lien plastique avec le
   reste.
6. **Les six statuts de personnage** n'ont pas un traitement à la hauteur de leur
   sens narratif, sauf le décès.

---

## 10. Ce qui est intouchable

1. **Toutes les routes et toutes les fonctionnalités** listées plus haut.
2. Les **deux thèmes** clair et sombre, plus le **mode intrusion** en troisième
   état.
3. L'**identité RP** : le français, le ton intime, la métaphore du journal, les
   annotations manuscrites. C'est l'ADN, pas de la décoration.
4. Le **traitement des personnages décédés**.
5. La **lisibilité des textes longs**, prioritaire sur tout effet.
6. Le **responsive**, pensé pour le mobile d'abord en lecture.
7. Le respect de **`prefers-reduced-motion`** : le site est très animé.
8. La **sobriété en ressources**, hébergement gratuit oblige.

---

## 11. Chantiers ouverts pour la refonte

Par ordre d'impact décroissant :

1. **Donner de la matière.** Trouver le vocabulaire plastique du carnet tenu à la
   main sans tomber dans l'imitation kitsch : papier, encre, agrafes,
   intercalaires, tampons, marges annotées.
2. **Une recherche globale**, présente partout, qui retrouve un personnage, un
   jour, une enquête ou un lieu en quelques lettres.
3. **Repenser la lecture d'un récit long** : rythme, sommaire, repères de date,
   personnages présents en marge, largeur de colonne, respiration.
4. **Unifier les pages outil et les pages lecture.** La mindmap devrait
   ressembler à un schéma tracé dans le carnet, la carte à une carte pliée et
   annotée à la main.
5. **Donner un traitement narratif aux six statuts** et aux dix types de
   relation, au même niveau de soin que le deuil actuel.
6. **Articuler les deux directions artistiques**, pour que la bascule en mode
   intrusion soit la déchirure du même objet, et pas un autre site.
7. **Soigner les états vides et les états de chargement.** Ils font partie du
   récit : ce sont les pages blanches du carnet.

---

## 12. Checklist de recette

- [ ] Les trois états visuels tiennent : clair, sombre, intrusion.
- [ ] Aucun texte d'interface ne sort de la fiction.
- [ ] Un récit de trois mille mots se lit confortablement sur un téléphone.
- [ ] On retrouve un personnage par son nom en moins de cinq secondes.
- [ ] Les personnages décédés sont traités avec retenue, partout.
- [ ] Les listes déroulantes natives sont lisibles dans les deux thèmes.
- [ ] `prefers-reduced-motion` coupe bien les animations.
- [ ] La carte Leaflet s'affiche correctement, sans `backdrop-filter` parent.
- [ ] Aucune régression sur les routes ni sur les permissions.
