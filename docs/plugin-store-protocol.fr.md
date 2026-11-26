<a id="doca-plugin-store-protocol-v1"></a>

# Protocole magasin plugin Doca v1

[中文](plugin-store-protocol.zh-CN.md)

Mise à jour le 2026-09-30, avec les champs obligatoires actuels et les notes de navigation ci-dessous. **Les implémentations de magasins distants utilisent ce protocole.** Cela remplace le projet précédent basé sur un catalogue complet et hébergé par le magasin ; ce projet ne constitue pas un contrat d’accès accepté.

Installation via ZIP/npm, archives partagées, restauration du démarrage multi-instances, pagination à distance, vérifications d’actualisation, détails et navigation Web/App sont implémentés dans le code source. Les stores externes et les plugins indépendants nécessitent encore les vérifications d’acceptation ci-dessous ; l’implémentation dans le code source ne garantit pas que tous les services externes sont actifs. Le SDK actuel est `0.1.9`Vérifier les exemples par rapport aux versions du hôte installé et aux exportations des paquets.

<a id="_1-responsibilities-and-deployment"></a>
<a id="1-responsibilities-and-deployment"></a>

## 1. Responsabilités et déploiement

- Le registre npm distribue des packages prêts à l’utilisation. Le store ne dispose pas d’un point d’accès pour télécharger en format ZIP ; il est nécessaire de vérifier les fichiers réels du package npm.
- Le magasin distant possède des métadonnées, des catégories, des sorties, des approbations/retraits, des statistiques de likes/download et des détails de texte riche.
- Doca possède l’autorisation d’administrateur, les transactions d’installation, la vérification d’intégrité, les archives partagées, les versions en cours d’exécution, les entrées Web/App et les layouts.
- Les likes et le login sur GitHub se font sur le site distant. Doca affiche les comptes et propose une nouvelle page en cliquant. Il ne collecte aucune information de connexion distante et ne met en œuvre aucune API de like, aucun appel de retour OAuth, ni aucune liaison avec l’accoutrement de compte.
- Les installations manuelles via npm et les installations locales en format ZIP/dossier restent supportées. Les packages situés en dehors du catalogue révisé sont étiquetés comme non révisés ; la distribution npm seule n’est pas une approbation officielle.

```dotenv
DOCA_PLUGIN_STORE_URL=https://store.smartdoca.cc
DOCA_PLUGIN_NPM_REGISTRY=https://registry.npmjs.org
DOCA_PLUGINS_DIR=/data/plugins
```

Les adresses de stockage/registrement sont des origines HTTP(S) sans identifiants, préfixes de chemin, requêtes ou fragments. Les valeurs vides utilisent les paramètres par défaut. Le login dans le registre privé n’est pas supporté dans la version 1. Le serveur Doca proxy stocke les requêtes sans cookie de navigateur, autorisation, identifiants d’utilisateur ou données commerciales ; le service distant n’a pas besoin de CORS de navigateur.

Le préfixe API est `/api/v1`Le JSON est en format UTF-8 et les réponses contiennent le champ protocolVersion:1. Les horaires sont en format UTC ISO 8601. Les comptes sont des entiers non négatifs ou null lorsqu’ils sont inconnus ; les valeurs inconnues ne doivent pas devenir zéro. Tous les endpoints sont publics, en lecture seule, et n’ont pas besoin d’un accès au système de stockage.

<a id="_2-public-types"></a>
<a id="2-public-types"></a>

## 2. Types publics

<a id="pluginsummary"></a>

### Résumé du plugin

```json
{
  "id": "example.mail",
  "name": "Mail",
  "summary": "Send and receive mail across multiple accounts.",
  "author": { "name": "Example", "url": "https://github.com/example" },
  "categoryId": "productivity",
  "icon": null,
  "detailPath": "/plugins/example.mail",
  "targets": ["web", "mobile"],
  "review": "approved",
  "official": false,
  "latestVersion": "1.2.0",
  "downloads": { "count": 1234, "period": "last30Days", "source": "npm", "asOf": "2026-09-30T00:00:00Z" },
  "likes": { "count": 42, "asOf": "2026-09-30T00:00:00Z" },
  "updatedAt": "2026-09-29T12:00:00Z"
}
```

Contraintes :

- id correspond à manifest.id et `^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$`, maximum 100 caractères.
- name/author.name : 1–160 caractères ; résumé : au maximum 300 ; tout en texte brut.
- author.url : URL HTTP(S), ou null pour les clics de l’utilisateur uniquement, sans récupération automatique de l’hôte.
- categoryId : 1–60 caractères correspondants `[a-z0-9-]+`Obtenez les catégories séparément, plutôt que de les déduire d’une page.
- icône : URL de données PNG ou null, maximum 24 KiB codé ; pas de SVG, de scripts ou de URLs d’images distantes.
- detailPath : même origine, absolu `/plugins/<id>`, combiné avec l’origine configurée. Rejeter les origines externes, les requêtes/fragmentations et les traversées. Les nouveaux fenêtres utilisent nopener, noreferrer.
- Cibles : un tableau web/mobile non vide et dédupliqué. Mobile signifie un App WebView contrôlé, et non du code natif dynamique.
- Revue : approuvée/suspendue. La liste est par défaut en état approuvé ; les détails peuvent être révélés comme suspendus.
- Officiel : booléen obligatoire, indépendant du examen de la sortie. L’identité officielle n’est affichée que pour les valeurs true, sans en déduire l’origine de l’installation. La présence de “official” manquante constitue une erreur de protocole.
- latestVersion : dernière version stable approuvée ou null ; cela ne détermine pas la possibilité d’installation ou d’upgrade sur un hôte particulier.
- Le nombre de téléchargements de packages sur npm au dernier 30 jours représente les téléchargements de packages, et non les utilisateurs/Doca ou les téléchargements spécifiques à une version.
- Les statistiques manquantes produisent toujours des objets avec un nombre de nulls/asOf. Les listes omettent le corps de texte riche, les tableaux d’versions historiques, les tarballs et la navigation complète.

<a id="release"></a>

### Lancement

```json
{
  "pluginId": "example.mail",
  "version": "1.2.0",
  "sdkRange": "^0.1.9",
  "dataVersion": "1",
  "targets": ["web", "mobile"],
  "mobileHostRange": "^1.0.0",
  "dependencies": [],
  "changelog": "Improve mail synchronization.",
  "review": "approved",
  "reviewedAt": "2026-09-29T12:00:00Z",
  "publishedAt": "2026-09-29T10:00:00Z",
  "npm": {
    "registry": "https://registry.npmjs.org",
    "name": "@example/doca-mail",
    "version": "1.2.0",
    "integrity": "sha512-BASE64_OF_SHA512_DIGEST",
    "size": 12345
  }
}
```

Le digest mentionné ci-dessus est un placeholder. L’intégrité réelle doit être une seule valeur SRI contenant un digest SHA-512 en format standard-base64 de 64 octets. npm.size représente la longueur exacte du fichier tgz, allant de 1 à 33 554 432 octets. npm.version, Release.version, package.json.version et manifest.version doivent être identiques.

La version utilise un format semver à trois parties, peut inclure des versions pré-lancement, exclut les métadonnées de build, et ne dépasse pas 100 caractères. sdkRange correspond exactement au manifest ; le SDK actuel est 0.1.9 et les plages supportées sont `*`, exact, `^`, et `~`. mobileHostRange est nécessaire pour les cibles mobiles et fait référence au protocole de hôte de plugin mobile (v1:1.0.0), indépendant du numéro de build de l’App Store et de la compatibilité SDK.

dataVersion correspond `[a-zA-Z0-9._-]{1,80}` Sans commande précise ; les mises à jour de v1 nécessitent une équivalence exacte. Les dépendances contiennent au maximum 100 éléments. `{id,range,optional?}` Les dépendances du plugin Doca sont séparées des dépendances npm. Les plugins dépendants manquants ne sont pas installés automatiquement.

L’examen de la sortie est approuvé/retiré. Le retrait empêche les nouvelles installations sans décharger automatiquement les versions en cours. Les versions plus récentes de npm ne peuvent pas apparaître dans les recommandations officielles sans approbation. L’examen s’applique. `(pluginId,npm.registry,npm.name,version,integrity,size)`La même version ne peut pas remplacer son paquet. Les auteurs, les statistiques et les informations de révision peuvent changer ; les déclarations de taille/b capacités du paquet sont immuables.

Le changelog est une chaîne de texte simple obligatoire sur les endpoints de liste de sorties et de sorties exactes, avec une limite maximale de 100 000 caractères. Un vide signifie qu’il n’y a pas de notes ; les sauts de ligne doivent être conservés sans exécuter de HTML.

<a id="_3-categories"></a>
<a id="3-categories"></a>

## 3. Catégories

`GET /api/v1/categories?locale=zh`

```json
{"protocolVersion":1,"items":[{"id":"productivity","name":"Productivity","count":12}]}
```

Au maximum 100 catégories. locale est zh/en, par défaut zh ; les traductions manquantes utilisent les étiquettes par défaut. count est le nombre total du catalogue visible approuvé ou null, indépendant des filtres de liste actuels.

<a id="_4-paginated-search-and-ordering"></a>
<a id="4-paginated-search-and-ordering"></a>

## 4. Recherche et tri par paginé

`GET /api/v1/plugins?q=mail&category=productivity&target=mobile&sort=downloads&limit=24&locale=zh`

| Paramètre | Règle |
| --- | --- |
| q | Optionnel ; maximum de 100 caractères réduit ; recherche par correspondance à distance sur nom, résumé, auteur, ID plugin et nom npm |
| catégorie | ID de catégorie optionnel ; omis signifie tous |
| cible | Optionnellement web/mobile ; omis signifie sans restrictions |
| classer | mise à jour (par défaut), téléchargements, likes, nom |
| limite | 1–48, par défaut 24 |
| curseur | curseur opacité optionnel, au maximum 2048 caractères |
| lieu | zh/en, par défaut zh |

```json
{
  "protocolVersion": 1,
  "items": [],
  "page": { "nextCursor": null, "total": 0, "snapshotAt": "2026-09-30T00:00:00Z" }
}
```

Les éléments sont dans PluginSummary&#91;&#93; dans la limite. total est le nombre de résultats correspondants ou null ; null nextCursor signifie la dernière page. "Load More" ajoute uniquement les résultats de la même requête. Changer la recherche/filtre/ordre efface le curseur ; annuler les anciennes requêtes ou ignorer les réponses tardives plutôt que de combiner les requêtes.

Les classements mis à jour sont triés par ordre décroissant : updatedAt ; les téléchargements sont triés par nombre des 30 derniers jours ; les likes sont triés par ordre décroissant ; le nom est trié par ordre croissant ; le nom localisé est également trié par ordre croissant. Tous utilisent l’id en ordre croissant comme critère de détermination stable en cas de conflit. Les statistiques inconnues suivent les valeurs connues.

Les curseurs lient les requêtes normalisées, l’ordre et le snapshot des résultats ; la continuité préserve le snapshotAt. Les snapshots durent au moins 15 minutes afin d’éviter les duplications ou les entrées manquantes en raison des changements statistiques. Lors de l’expiration, un code 410 cursor_expired est renvoyé et le processus se relance ; les paramètres incomplètes entraînent un code 400 cursor_mismatch. Doca ne doit pas télécharger l’intégralité du catalogue pour effectuer des recherches, tri ou pagination locales.

Une page ne dépasse pas 2 MiB, avec un timeout de 15 secondes. L’ETag est optionnel ; Doca envoie If-None-Match uniquement lorsqu’une réponse en cache correspond, et utilise cette cache pour les cas 304.

<a id="_5-details-and-read-only-rich-text"></a>
<a id="5-details-and-read-only-rich-text"></a>

## 5. Détails et texte enrichi en lecture seule

`GET /api/v1/plugins/<id>?locale=zh`

```json
{
  "protocolVersion": 1,
  "plugin": { "id": "example.mail", "name": "See PluginSummary; return the complete object" },
  "description": {
    "format": "doca-slate",
    "version": 1,
    "nodes": [
      { "type": "heading", "level": 2, "children": [{"text":"Mail plugin"}] },
      { "type": "paragraph", "children": [{"text":"Supports multiple mail accounts.","bold":true}] }
    ]
  }
}
```

L’objet de plugin abrégé doit en réalité être un PluginSummary complet. Les versions sont paginées séparément. Le service distant modifie/persiste avec slatetsx et se convertit en le sous-ensemble de transport indiqué ci-dessous ; Doca le affiche en mode lecture seule, sans sauvegarde, modification ou chargement de plugins de éditeur distants. doca-slate ne accepte pas de nœuds internes slatetsx arbitraires.

<a id="rich-text-v1-nodes"></a>

### Nœuds de texte riche v1

- Texte: `{text:string,bold?:boolean,italic?:boolean,underline?:boolean,strikethrough?:boolean,code?:boolean}`.
- paragraphe: `{type:"paragraph",children:Inline[]}`.
- Sous-titre : structure de paragraphe avec niveaux entiers de 1 à 6.
- lien : en ligne `{type:"link",url:string,children:Text[]}`; Seulement https/http/mailto ; rejets de caractères de contrôle, JavaScript/URLs de données ; les fenêtres externes utilisent noopener, noreferrer.
- blockquote: `{type:"blockquote",children:Block[]}`.
- liste à puces/liste numérotée: `{type:...,children:ListItem[]}`; list-item: `{type:"list-item",children:Block[]}`.
- code-block: `{type:"code-block",language?:string,children:Text[]}`; afficher du texte simple sans exécution.
- image : `{type:"image",src:string,alt:string,children:[{text:""}]}`; URL de données PNG/JPEG/WebP, au maximum 1 MiB décodés par image (1 048 576 octets). Les URL SVG/remote sont rejetées pour éviter les demandes de adresse privée et le suivi. Doca 0.1.5 et versions antérieures conserve son limite d’affichage originale de 256 KiB ; les images plus grandes nécessitent un client mis à jour. Cette modification de limite ne implique ni migration ni conversion des données ; le retour en arrière du client restaure sa limite d’affichage précédente. Les détails totaux restent inférieurs à 2 MiB.
- diviseur : `{type:"divider",children:[{text:""}]}`.

Les nœuds non pris en charge conservent des enfants de texte sécurisés avec des informations de feedback partielle. Les formats/versions inconnues affichent un message explicite et un lien vers les détails distants, sans exécuter du HTML/JSX. Le HTML brut, les scripts, les iframes, les composants exécutables et les champs de gestion d’événements sont rejetés. Limites : 5000 nœuds, profondeur 16, 200000 caractères de texte, et 2 MiB de réponse totale. Le service distant convertit les tables/types non pris en charge en paragraphes/images. Les nouveaux types nécessitent des modifications coordonnées du protocole/renderer.

<a id="_6-releases-and-installation-checks"></a>
<a id="6-releases-and-installation-checks"></a>

## 6. Libérations et vérifications d’installation

`GET /api/v1/plugins/<id>/releases?limit=20&cursor=...`

Retour `{protocolVersion:1,items:Release[],page:{nextCursor,total,snapshotAt}}` Avec des règles de liste et une limite de 1–48. Tri descendant selon le semver, et référence aux versions stable approuvées ; optionnel : includePrerelease=true. Les versions retirées ne sont disponibles que par recherche exacte.

`GET /api/v1/plugins/<id>/releases/<version>`

Retour `{protocolVersion:1,release:Release}`L’installation récupère l’état exact de la revue/décomposition, plutôt que de se fier à des listes obsolètes. Les versions inconnues renvoient 404 ; les retraits sont indiqués clairement dans une réponse 200, et ne peuvent donc pas être installés.

<a id="npm-download"></a>

### npm download

1. Vérifiez que Release.npm.registry correspond au registre configuré (par défaut, npmjs) ; le store ne peut pas choisir des origines arbitraires.
2. Obtenir les métadonnées de version exactes `GET /<encodeURIComponent(packageName)>/<encodeURIComponent(version)>`, sans résolution par tag/range la plus récente.
3. Vérifiez le nom/version et l’intégrité du fichier dist.integrity par rapport aux SRI approuvés, puis téléchargez dist.tarball.
4. Le tarball est un fichier HTTP(S) au niveau de l’origine du registre, sans identifiants ou fragments ; pas de redirection. Metadonnées : 2 MiB/15 secondes. Téléchargement : 32 MiB/120 secondes, taille exacte et validation SHA-512.
5. Extraire sécuritairement le fichier npmtgz sous un seul paquet/wrapper. Seules les fichiers/dossiers ordinaires sont acceptés ; les liens symboliques/hard, les dispositifs, les chemins absolus, les chemins de navigation ou les chemins doubles sont rejetés. Éviter les en-têtes d’extension POSIX pax x/g (utilisés pour mtime/xattr par les bibliothèques libarchive de npm/macOS) : ni leur extraction ni leur prise en compte des chemins de substitution ne sont autorisées. Valider le chemin ustar suivant. Imposer au maximum 10 000 entrées et 128 MiB de données étendues, avec des limites de streaming.
6. Vérifiez les métadonnées du paquet/manifest/review et publiez l’état complet de l’archive/target. Ne exécutez jamais les scripts du cycle de vie de npm, npm install ou les téléchargements pour les dépendances de runtime manquantes.

Le manuel npm utilise les mêmes vérifications avec les métadonnées exactes du registre configuré, sans revue officielle. Les pannes de stockage ne empêchent pas l’installation manuelle ; le démarrage du plugin installé n’a pas besoin de la disponibilité de npm/store.

<a id="_7-batch-update-checks"></a>
<a id="7-batch-update-checks"></a>

## 7. Vérifications d’actualisation par lot

`POST /api/v1/updates/check`

```json
{
  "protocolVersion": 1,
  "host": { "sdkVersion": "0.1.9", "mobileHostVersion": "1.0.0" },
  "plugins": [
    { "id": "example.mail", "version": "1.0.0", "dataVersion": "1", "npm": {"registry":"https://registry.npmjs.org","name":"@example/doca-mail"} }
  ]
}
```

Envoyez de 1 à 100 IDs de plugin distincts par lot, maximum 128 KiB. Seuls les métadonnées d’installation sont soumises, sans inclure les identifiants du site, les utilisateurs, la configuration, le contenu et les identifiants de connexion. Doca gère des lots plus importants. Les packages locaux sans origine npm peuvent omettre npm et vérifier les versions officielles du même ID, sans changer silencieusement la source d’installation.

```json
{
  "protocolVersion": 1,
  "checkedAt": "2026-09-30T00:00:00Z",
  "items": [
    {
      "id": "example.mail",
      "installedVersion": "1.0.0",
      "status": "update_available",
      "currentReview": "approved",
      "latestVersion": "1.2.0",
      "release": { "pluginId": "example.mail", "version": "Return the complete Release object" },
      "reason": null
    }
  ]
}
```

Répondez exactement un élément par demande, en utilisant installedVersion afin que les réponses obsolètes ne puissent pas correspondre à une version nouvellement installée.

| état | Signification |
| --- | --- |
| update_available | Version stable approuvée plus haute, compatible avec SDK/dataVersion/mobile host ; la version est complète |
| up_to_date | Aucune version stable approuvée plus haute ; release=null |
| incompatible | Des versions plus avancées existent sans un candidat compatible ; release=null ; raison=sdk/data_version/mobile_host |
| inconnu | Plugin inconnu ou source npm incomplète ; release=null ; raison=not_found/source_mismatch |

L’évaluation actuelle est approuvée/retirée/inconnue. Veuillez informer séparément pour les versions installées retirées sans suppression/ désactivation automatique. Doca vérifie à nouveau les plugins dépendants locaux lors de l’installation ; les recommandations distantes ne peuvent pas garantir le graphe de dépendances local.

Choisissez la version la plus compatible, plutôt que de tester uniquement la dernière version. latestVersion est la version stable et approuvée la plus élevée, et peut dépasser release.version. Doca vérifie indépendamment la version, le SDK, la structure de données et les dépendances ; les recommandations distantes ne sont pas autorisées.

Vérifier l’ouverture de la vue Installé/Upgradable, autoriser une mise à jour manuelle, et utiliser une cache d’au plus 15 minutes. L’installation annule les résultats de ce plugin. En cas d’échec, afficher "échec/inconnu" plutôt que de prétendre que tout est à jour. Ne proposer pas d’upgrades lors de l’uninstallation. Comparer les versions cibles globales ; afficher séparément l’état des versions en cours de démarrage/redémarrage. Les packages npm hors catalogue peuvent vérifier les versions du registre, mais restent non vérifiés sans installation automatique.

Réponses par lot : 2 MiB/15 secondes. Les éléments inconnus partiels utilisent les états de l’élément ; les erreurs de réseau/limite de vitesse/format utilisent des erreurs HTTP sans résultats normaux fabriqués.

<a id="_8-packages-and-navigation"></a>
<a id="8-packages-and-navigation"></a>

## 8. Packages et navigation

Le fichier npm tgz contient le package/package.json ; le ZIP local contient directement le package.json sans wrapper.

```json
{
  "name": "@example/doca-mail",
  "version": "1.2.0",
  "type": "module",
  "files": ["manifest.json", "dist", "web"],
  "doca": {
    "dataVersion": "1",
    "storage": "host",
    "manifest": "./manifest.json",
    "server": "./dist/server.js",
    "web": {"directory":"./web","entry":"./index.js"},
    "mobileHostRange": "^1.0.0",
    "navigation": [{
      "id": "example.mail.inbox",
      "title": {"zh":"邮箱","en":"Mail"},
      "icon": "mail",
      "webPath": "/plugins/example.mail/inbox",
      "mobile": true,
      "allowedSlots": ["web.left","web.top","web.topRight","web.right","web.user","web.home","web.more","mobile.drawer","mobile.bottom","mobile.topRight","mobile.account","mobile.home","mobile.more"],
      "defaults": ["web.left","mobile.drawer"],
      "order": 60,
      "adminOnly": false
    }]
  }
}
```

Précompiler et bundleer toutes les dépendances en temps de exécution ; aucun alias de source hôte, aucun pont global, ni arbres de symlinks avec pnpm. `doca.storage: "host"` C’est obligatoire. Les valeurs manquantes ou autres sont rejetées avant l’importation du code lors de l’installation via ZIP/npm/store, l’importation de dossiers ou la restauration du démarrage, sans paramètres par défaut ou adaptateurs. Le serveur exporte par défaut une factory ; le Web utilise par défaut host=>bundle en utilisant React injecté. Toute persistance utilise les services du host ; les plugins ne peuvent pas choisir la persistance locale ou distante, créer des bases de données ou maintenir des dossiers persistants. Les plugins installés mettent en œuvre le nettoyage commercial de l’uninstallation sans supprimer les chemins du host ; en cas d’échec, l’installation est conservée. Voir… [contrat de stockage](plugin-horizontal-scaling.fr.md) pour les capacités gérées et la coordination de nettoyage.

Les IDs de navigation du package.json statique utilisent le nom de domaine, et webPath reste sous. `/plugins/<plugin-id>/`Enregistrez également la page correspondante dans le bundle Web. Au maximum 30 entrées. allowedSlots/defaults sont dédupliqués et defaults est un sous-ensemble. Aucun slot mobile sans déclaration mobile ; le mobile nécessite une page Web et mobileHostRange.

Les slots actuels incluent également web.admin et web.leftMore. web.leftMore nécessite une déclaration explicite ; web.more reste en haut à droite. Voir [Extensions UI](plugin-extensions.fr.md)web.right est une barre d’outils d’entrée plutôt que l’intégration automatique de pages arbitraires en tant que panneaux latéraux. Les entrées ouvrent des pages ; les commandes, les visualisations ou les présentations de panneaux ont un contrat public distinct.

Les administrateurs configurent la visibilité, la position, l’ordre et le regroupement des plugins dans Doca. Le layout n’est pas une configuration de magasin distant ; les plugins déclarent des paramètres par défaut et ne prennent en charge que cela. L’excédent de capacité utilise le bouton « More ». Les plugins désactivés disparaissent de la navigation en cours. La navigation cachée ne retire pas l’accès au chemin ou à l’API ; le hôte et les plugins autorisent chaque requête.

Les vérifications de révision comparent les cibles aux déclarations réelles web/mobile, sdkRange, dataVersion, dépendances et identité/version du paquet. Doca répète la vérification. Le lancement exclut la navigation complète ; le paquet est la source de la capacité.

L’application doit d’abord fournir une version contenant l’hôte de plugin mobile. Les pages conformes suivantes s’chargent via des WebViews contrôlés sans télécharger ou exécuter de modules React Native. Le login utilise des billets uniques de l’hôte, et jamais des tokens de porteur d’application de durée longue dans les scripts du plugin. Le champ de navigation/appel de l’hôte suit les directives de développement.

<a id="_9-errors-cache-and-withdrawal"></a>
<a id="9-errors-cache-and-withdrawal"></a>

## 9. Erreurs, cache et retrait

```json
{"protocolVersion":1,"error":{"code":"not_found","message":"Plugin not found"}}
```

Erreurs HTTP : 400 invalid_request/cursor_mismatch ; 404 not_found ; 410 cursor_expired ; 429 rate_limited avec Retry-After seconds ; 503 unavailable. Le message est du texte simple, pas une clé logique. Ne retournez pas de HTML de connexion, de redirections ou de traces d’erreur. En cas de échec, la gestion locale est conservée et une tentative de répétition est possible ; l’installation ne peut pas se dérouler sans validation.

Les détails/revues exactes du cache doivent durer au maximum 60 secondes. L’installation doit valider à nouveau les versions exactes sans utiliser le cache hors ligne. L’approbation n’est pas une garantie absolue de sécurité : les plugins serveur s’exécutent dans un processus fiable, et non dans un environnement de sandbox.

L’examen interne, la publication par l’auteur, le login sur GitHub et les commentaires similaires sont propriétés de Store. Ordre de publication : publier le package npm → obtenir les bytes réels immuables → examiner/analyser les capacités de scan → publier la version approuvée → mettre à jour le résumé et l’index de recherche.

<a id="_10-multiple-instances-and-activation"></a>
<a id="10-multiple-instances-and-activation"></a>

## 10. Multiples instances et activation

L’installation stocke les archives complètes et l’état cible global dans la base de données partagée ; les instances utilisent des dossiers de plugin écriture privée. Le démarrage vérifie/restaure les fichiers et rejette les paquets partiels sans accéder à npm/store. Les archives partagées manquantes ou corrompues échouent explicitement.

L’installation, l’upgrade, l’activation, la désactivation ou l’désinstallation nécessitent que chaque instance soit redémarrée. Le système de gestion indique la version en cours d’exécution de l’instance répondante, sans prétendre à une activation à l’échelle du cluster. Compose utilise `docker compose restart doca`Kubernetes/operators redémarrent les instances progressivement et évacuent le trafic ancien pour les API incompatibles.

Les ressources web historiques peuvent être restaurées depuis les archives partagées sans impliquer une compatibilité avec les API commerciales entre versions. Les layouts de navigation publiés entrent en vigueur après le redémarrage du client sans redémarrage ; les changements de capacités de paquet nécessitent une mise à jour ou un redémarrage. L’uninstallation actuelle effectue le nettoyage commercial, efface les marqueurs de version de données en cas de succès et conserve les archives immuables. Le nettoyage des bases de données gérées et des objets privés ainsi que la sécurisation de la génération sont mis en œuvre. Le débordement des tâches commerciales à l’échelle du cluster reste en attente ; les plugins ne peuvent pas supprimer eux-mêmes les dossiers.

<a id="_11-integration-fixtures"></a>
<a id="11-integration-fixtures"></a>

## 11. Accessoires d’intégration

Fournir au moins :

1. Listes vides et de plus de deux pages, filtres de recherche/catégorie/plateforme, quatre sortes, curseurs expirés/incompatibles.
2. Résumés complets, statistiques inconnues, détails suspendus, texte enrichi valide, et dégradation du texte des nœuds inconnus.
3. pagination de sortie ; dernière mise à jour incompatible mais plus compatible ; toutes les mises à jour incompatibles ; version installée retirée ; paquet inconnu/incompatible.
4. Vérifié les bytes npm et les valeurs réelles de SRI/taille ; rejet des paquets remplacés, des incohérences entre digests/declarations, des redirections et de l’exploration d’extraction.
5. 429/503/outages ; la défaillance de stockage ne doit pas perturber les listes locales installées ou l’utilisation commerciale actuelle de l’application.
6. Installer sur une instance ; redémarrer une autre avec un dossier vide et npm/store hors ligne ; restaurer depuis l’archive partagée et réparer la cache locale corrompue.
7. Déclarations/navigation web/application ; aucune entrée dans l’application sans déclaration mobile ; rejeter les mises à niveau de données incompatibles.
8. Comme les clics ouvrent la page détaillée de même origine configurée, sans appeler une API de like ou activer Doca OAuth.

L’intégration de la messagerie peut commencer avec les éléments originaux. [Guide d'intégration de plugin e-mail v1](plugin-mail-integration-v1.md), conservé comme matériel de recherche.

Voir [développement de plugin](plugin-development.fr.md) et [Limites du SDK](plugin-sdk-contract.fr.md)Pour les APIs hôtes, utilisez les types exprimés réellement ; pour le stockage distant, utilisez ce protocole de communication. Ne déduisez pas les méthodes proposées pour les hôtes.

<a id="cross-repository-acceptance"></a>

## Acceptation entre répositориums

Courir `pnpm exec tsx scripts/verify-plugin-store-contract.ts ../doca-plugin-store`Il exerce les routes réelles du magasin avec une base de données en mémoire pour les catégories (y compris les comptes nuls), la recherche, les cibles, la pagination, les détails, les sorties, les mises à jour et l’expiration du curseur, sans toucher aux bases de données commerciales ou à la publication npm.

/categories est une liste de catégories, et non un multi-tagging arbitraire ; chaque plugin possède un categoryId. Les comptes de catégories couvrent tous les plugins publiés indépendamment de la recherche ; page.total représente le snapshot de la requête. Les téléchargements/likes inconnus affichent un trait, zéro affiche 0.

L’examen valide la même navigation statique que l’hôte : titre bilingue (1–80 caractères chacun), icône, ordre, slots non vides autorisés, paramètres par défaut valides, et aucun champ inconnu. Le serveur est construit en JS/mjs/cjs ; l’entrée web est en JS ; le manifeste est un JSON statique. Ni l’examen ni l’installation ne exécutent les scripts d’installation de paquets.

<a id="official-identity-and-release-notes"></a>

### Identité officielle et notes de sortie

Les fichiers PluginSummary.official et Release.changelog sont obligatoires, comme indiqué ci-dessus. L’identité officielle est indépendante de l’examen de la version. Les notes de version sont affichées en texte simple avec des sauts de ligne ; les champs manquants sont des erreurs de protocole plutôt que des valeurs par défaut implicites.
