<a id="file-storage-and-uploads"></a>

# Stockage de fichiers et téléchargements

Le client de bureau Tauri utilise le stockage de l’hôte distant sélectionné. Toute tentative antérieure `local-v1` Le profil est conservé sans avoir à l’ouvrir ou le migrer. Voir [client de bureau](desktop-client.fr.md).

[中文](storage.zh-CN.md)

Ce module stocke les avatars, les couvertures de bibliothèque, les images de documents et les pièces jointes. Les pages éditeur et administrateur partagent la API d’upload. Le corps du document conserve un identifiant de ressource stable. Un adaptateur de ressources résout une URL autorisée. Les signatures CDN de durée courte ne sont pas stockées dans le document.

<a id="environment-configuration"></a>

## Configuration de l'environnement

Le stockage de fichiers est sélectionné comme requis `DOCA_FILE_STORE_ID` et `DOCA_FILE_STORES_JSON`. Les deux exemples d’environnement utilisent `/data/storage`, en accord avec le volume persistant du conteneur publié. Pour le développement de la source, copie `.env.example` et définir le répertoire racine local en un dossier absolu écriture sur votre machine. Compose utilise `docker.env.example`. La base de données enregistre des IDs de stockage stables et des références d'objets, mais pas des identifiants backend. La page d'administration est uniquement lecture seule.

```dotenv
DOCA_FILE_STORE_ID=local
DOCA_FILE_STORES_JSON='{"version":1,"stores":{"local":{"provider":"local","root":"/data/storage"}}}'
```

Utilisez un dossier persistant dédié, écrit uniquement par l’utilisateur du service et en dehors de l’arbre web statique. Plusieurs instances doivent partager le même serveur physique. Les sauvegardes couvrent la base de données, tous les stockage de fichiers référencés et la configuration de déploiement protégée. Un identifiant de stockage référencé doit rester configuré ; modifier son chemin physique ou son bucket ne déplace pas ses données.

Les déploiements actuels vont en harmonie avec les générations de bases de données supportées par rapport à la dernière spécification DDL. Les générations non supportées et les formats serveur gérés par la base de données retirés restent bloqués sans conversion automatique. Les déploiements existants doivent suivre… [contrat d’amélioration de la base de données](database-schema-evolution.fr.md) et [exigences de libération](releases/0.2.23.md), préservant leurs stocks, leurs rangées et la clé maîtresse des credences originales.

<a id="docker-uploads-fail-with-eacces"></a>

## Les téléchargements via Docker échouent avec EACCES

Si `/api/v1/assets` renvoie HTTP 500 et les logs du conteneur indiquent `EACCES: permission denied, mkdir '/app/data'`, vérifier le magasin local actif `root` dans `DOCA_FILE_STORES_JSON`L’image fonctionne bien. `node` avec `/app` Comme son répertoire de travail ; Compose monte son volume persistant à `/data`Une racine de développement telle que `./data/v1/storage` se résout à `/app/data/v1/storage`, en dehors de ce volume écriturable.

Pour une boutique qui n’a jamais contenu de fichiers téléchargés avec succès, définissez son racine en `/data/storage`En conservant le même ID de magasin et toutes les autres entrées de magasin. Appliquer le changement d’environnement en ré créant uniquement le conteneur d’application :

```sh
docker compose up -d --no-deps --force-recreate --pull never --no-build doca
```

Si le magasin contient déjà des fichiers, examinez et faites une sauvegarde du répertoire et de la base de données avant de modifier son répertoire racine. Définissez un plan qui préserve les données et les clés existantes à l’emplacement configuré, puis vérifiez une téléchargement existant et un nouvel enregistrement. Modifier la configuration ne déplace pas les fichiers. Ne supprimez pas le volume de données ni ne réinitialisez la base de données pour corriger une erreur de chemin ou de permissions.

<a id="namespaces-and-access"></a>

## Espaces de noms et accès

Le présentateur génère des chemins d’objets sous `host/`; les fichiers ordinaires créés par le plugin utilisent `plugins/<pluginId>/`. Les objets de plugin privés et les ZIPs d'installation immuables utilisent des chemins de génération/objet distincts `host/plugin-releases/<sha256>.zip`Les noms de fichiers utilisateur ne déterminent pas les chemins physiques. Les identifiants de fichiers/dossiers stables et l’autorisation de l’hôte restent en vigueur. `GET /api/v1/assets/:id/content` Vérifie l’accès ; le service statique ne peut pas le contourner. Voir [la mise en œuvre exacte de l’stockage](unified-storage-implementation.md).

<a id="s3-and-cdn"></a>

## S3 et CDN

Un magasin avec `provider:"s3"` exige `bucket`, `region`, `forcePathStyle` et `credentials:{accessKeyId,secretAccessKey,sessionToken?}` Dans l’environnement JSON. Optionnel `endpoint` Il s’agit d’une origine racine HTTP(S) sans identifiants, sans sous-répertoire, sans requête ou sans fragment. HTTP est destiné à un point d’accès configuré explicitement sur un réseau interne fiable ; l’application ne résolve pas le DNS pour classer une destination comme privée. L’opérateur contrôle ces destinations et les échanges réseau ; aucun identifiant ou point d’accès n’est configuré via l’interface d’administration. Le bucket reste privé ; seules les opérations de lecture/écriture/effacement nécessaires pour les préfixes hôte et plugin sont autorisées. La validation de la configuration ne prouve pas une connectivité réelle.

Pour RustFS sur un réseau de conteneurs partagé, créez un bucket privé et configurez son écouteur de la API S3 (port par défaut `9000`, port de console `9001`) avec l’adressage de type chemin. Match `region` à `RUSTFS_REGION`, qui est par défaut `us-east-1`:

```dotenv
DOCA_FILE_STORE_ID=cloud
DOCA_FILE_STORES_JSON='{"version":1,"stores":{"cloud":{"provider":"s3","bucket":"doca-files","region":"us-east-1","endpoint":"http://rustfs:9000","forcePathStyle":true,"credentials":{"accessKeyId":"replace-me","secretAccessKey":"replace-me"}}}}'
```

Utilisez un nom d’hôte ou une adresse interne accessible depuis le conteneur Doca. Les origines du site, des assets et du CDN acceptent également HTTP(S). Voir… [Documentation RustFS S3](https://docs.rustfs.com/zh/administration/protocols/s3)Cet exemple concerne une installation nouvelle ; modifier l’endpoint d’un magasin existant ne déplace pas ses objets.

Optionnel `cdn:{domain,keyPairId,privateKey}` Utilise le protocole de URL signée CloudFront. Configurez un origine S3 privé avec OAC et un groupe de clés de confiance nécessitant des URLs signées ; le CDN doit conserver les clés d’objet, le type de contenu et la disposition complètes. L’environnement contient l’origine de distribution HTTP(S) et la clé de signature PEM. Après vérification des dernières ACL, l’hôte génère une URL valable pendant 60 secondes. La révocation empêche la création de nouveaux liens ; un lien existant peut rester utilisable jusqu’à son expiration. Les bytes téléchargés ne peuvent pas être récupérés.

Sans un CDN, l’hôte proxy les fichiers du cloud privé. Les secrets de stockage ne sont jamais renvoyés au navigateur. Un autre protocole de signature du CDN nécessite un adaptateur ; aucun fallback de URL publique permanent n’est fourni. Veillez à configurer chaque identifiant de magasin référencé et à préserver l’accès à ses données lors des rotations des identifiants. La rotation n’est pas une migration de données.

<a id="browser-image-caching-and-the-file-cdn"></a>

## Cachement d’images dans le navigateur et le CDN de fichiers

Les documents/commentaires, les images d’assistant et les avatars/covers proxy par hôte utilisent la version stable. `/api/v1/assets/:id/content` URL. Les réponses d’images intégrées réussies, y compris les miniatures, envoient :

```http
Cache-Control: private, max-age=3600, must-revalidate
Vary: Cookie, Authorization
ETag: W/"object-and-variant-identity-digest"
```

Le navigateur peut réutiliser sa copie locale pendant une heure. Une fois défectueuse, `If-None-Match` la valide à nouveau : l’hôte vérifie l’accès actuel avant de le renvoyer `304` Sans données d’image. Les versions originales et les thumbnails ont des ETags distincts. Les clés d’objet sont immuables ; pour remplacer une image, il est nécessaire d’utiliser un nouveau fichier. Les modifications de cookies/autorisation entraînent l’obtention d’une réponse stockée différente lors du changement d’utilisateur. La radiation n’est pas vérifiée lors de la vérification de la fraîcheur ; les données téléchargées ne peuvent pas être récupérées. Les navigateurs peuvent supprimer les entrées et forcer un rechargement/Utilisation des outils de développement. **Désactiver la cache** on peut les contourner. Cela utilise le stockage en cache HTTP sans une copie supplémentaire via IndexedDB ou Service Worker. Voir [Cache HTTP MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching) pour révalidation contre `no-store`.

Attachements AI sans image, `download=1`Les préviews inutiles et les erreurs persistent `no-store`Une demande non autorisée ne peut pas obtenir quelque chose. `304` Avec un ETag connu. Les images de document possèdent un resourceId et restent sous le proxy du hôte, même lorsque un CDN de fichiers S3 est configuré. Les images assistantes restent également sous le proxy du hôte. Les cartes de images générées et les images assistantes intégrées demandent une miniature WebP de 480 pixels ; en les cliquant, on accède à l’image originale, et les téléchargements conservent les bytes originaux. Lorsque le travail asynchrone de génération de la miniature est en attente ou indisponible, l’image intégrée peut afficher l’image originale.

Les redirections de fichiers signés sur CDN restent en place `no-store` Ainsi, le navigateur ne réutilise pas une signature expirée de 60 secondes. Les en-têtes de réponse de fichier finaux appartiennent au CDN ou à l’origine S3 ; les en-têtes de redirection ne sont pas transférés. Les nouveaux objets S3 utilisent actuellement `Cache-Control: private, max-age=60`Cette modification ne réécrit pas les objets existants.

Pour le comportement de fichier privé de CloudFront, conservez l’origine S3/OAC privée, le groupe de clés de confiance et la fenêtre de signature de 60 secondes. Définissez **Politique des en-têtes de réponse → En-têtes personnalisés** à `Cache-Control: private, max-age=60, must-revalidate` avec **Overrider** Pour standardiser les réponses des navigateurs pour les objets existants et nouveaux. Utiliser **Cache désactivé** À moins que le stockage en cache côté bord ne soit planifié séparément ; une politique personnalisée doit avoir un TTL minimal de 0. Un TTL minimal positif peut annuler la règle de l’origine. `private/no-store`Les politiques de en-têtes de réponse affectent les réponses destinées aux navigateurs, indépendamment du TTL de l’edge. Consultez la documentation AWS pour plus d’informations. [politiques des en-têtes de réponse](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/modifying-response-headers.html), [TTLs de politique de cache](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cache-key-understand-cache-policy.html) et [URLs signées](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-signed-urls.html)Ne appliquez jamais un cache public durable au site ou `/api/*`.

Changer les paramètres de requête de signature crée une URL de navigateur différente ; l’ajout des en-têtes seul ne garantit pas la réutilisation entre différentes signatures. Les URLs de images de documents stables évitent cette limitation. Les visites du cache Edge et les visites du cache du navigateur sont des mesures distinctes.

Pour accepter, éteignez les DevTools **Désactiver la cache**Revisiter un document et examiner les accès à la mémoire/au cache disque. Vérifier que les lectures conditionnelles renvoient un corps vide. `304`, puis vérifiez le déconnexion, le refus de permission, les miniatures, la téléchargement et l’aperçu des déchets. Examinez la réponse finale du CDN ainsi que le redirection. Évitez de conserver les cookies et les URLs signées dans les logs publics :

```sh
curl -I -H 'Cookie: doca_session=<session>' https://doca.example.com/api/v1/assets/<asset-id>/content
curl -I -H 'Cookie: doca_session=<session>' -H 'If-None-Match: W/"<first-response-digest>"' https://doca.example.com/api/v1/assets/<asset-id>/content
curl -I 'https://files.example.com/<object-key>?<valid-signature-parameters>'
```

Les fichiers JS/CSS publics haché doivent avoir une politique annuelle distincte. [déploiement : fichiers statiques](deployment.fr.md#static-assets).

<a id="history-storage-and-offline-upgrade"></a>

## Stockage de l’histoire et mise à niveau hors ligne

La base de données conserve les 20 dernières snapshots complètes d’entreprise. Chaque groupe complet de dix snapshots anciens conserve son snapshot le plus récent dans le stockage de fichiers configuré (stockage en nuage lorsque S3 est configuré). Un snapshot correspond à un fichier JSON gzip qui conserve son checkpoint et les métadonnées de récupération indépendantes, avec un petit index de base de données. Seulement les uploads immuables et le succès de la lecture SHA-256 permettent une mise à jour atomique de l’index et l’élimination des dix lignes de la base de données ; les neuf autres snapshots sont délibérément supprimés et ne peuvent pas être restaurés. Les groupes incomplets et les erreurs de stockage conservent les versions originales de la base de données. Une liste paginée ordinaire combine les deux sources sans révéler les types de stockage, les clés d’objet ou les URLs signées.

Les points de contrôle en temps réel, les augmentations et les attaches de collaboration révélées ne sont pas échantillonnés. Le réservoir de déchets conserve l’histoire ; les files d’attente d’effacement permanent explicite des ressources archivent la récupération après une heure et une vérification de référence. Aucun ancien recovery_json n’est décodé dans un nouveau schéma ni rempli à partir de la base de données actuelle. Les métadonnées de récupération manquantes et les versions de récupération inconnues continuent de rejeter les préviews. Les fichiers nécessitent l’enveloppe v1, un hash correspondant, une décompression limitée et un accord d’indexation. Les tâches durables en arrière-plan réessayent les échecs sans bloquer les commits de contenu.

La génération actuelle est `doca-2026-10-12-book-payload-storage-v1`La étape de maintenance historique suivante s’applique uniquement aux modèles exacts `doca-2026-10-08-knowledge-books-v2` bases de données (version 0.1.13) : elle enregistre d’abord `doca-2026-10-09-history-storage-v1`, après quoi le service de démarrage actuel peut effectuer l’alignement structurel approuvé. Arrêter chaque hôte, faire une sauvegarde de la base de données, du stockage de fichiers et de la configuration, conserver la clé maîtresse, puis exécuter :

```sh
pnpm history:upgrade                 # Show requirements; no mutation
pnpm history:upgrade --apply         # Add structure, update baseline and queue work; no immediate sampling
```

Ne reconstruisez pas la base de données au lieu de mettre à jour. Une transaction de mise à jour échouée conserve la base de données originale. Le retour en arrière direct ne prend en compte que... `doca-2026-10-09-history-storage-v1` ou son marqueur dédié pour les retours interrompus, et non la génération actuelle de contenu de base de données. Pour une base de données de génération actuelle, vérifiez d’abord. [restauration du stockage de livres](knowledge-book-storage-verification.fr.md); les références aux points de contrôle stockés peuvent bloquer ce rollback antérieur. Ne modifiez pas le nom de la base de données pour contourner la validation. Pour une base de données de génération d’histoire éligible, arrêtez chaque instance avant d’importer les points conservés :

```sh
pnpm history:rollback --apply --manifest /backup/history-cloud-references.json
```

Le manifeste doit être un fichier nouveau et est écrit avec mode 0600. Le rollback sauvegarde les références cloud, valide et importe les points conservés, puis revient à la base précédente ; les fichiers cloud restent intacts. Un rollback interrompu utilise un marqueur dédié qui empêche le démarrage de l’hôte, évitant ainsi que les points importés ne soient rééchantillonnés. Corrigez le problème de stockage et exécutez à nouveau le rollback avec une nouvelle path du manifeste. Les points échantillonnés nécessitent une sauvegarde complète de la base de données avant échantillonnage. La restauration destinée aux utilisateurs applique toujours l’époque actuelle, les permissions et les vérifications expectedSeq ; la restauration en texte enrichi et Markdown, tandis que les autres formats restent uniquement en version préliminaire.

<a id="checks-and-permissions"></a>

## Vérifications et autorisations

- Les avatars et les couvertures ne dépassent pas 5 MB. Les formats PNG, JPEG, WebP et GIF sont reconnus à partir de la tête de fichier et décodés. La limite est de 25 millions de pixels. Les métadonnées sont supprimées et l’image est stockée en WebP. Les avatars sont coupés en carré, avec un maximum de 512 px. Les couvertures ont une largeur maximale de 1600 px. Un GIF conserve la première image.
- Les fichiers attachés en format document/AI ne doivent pas dépasser 20 MiB et doivent conserver les bytes d’origine ; les images raster reconnues sont validées avec une limite de 25 millions de pixels. Les chemins des images d’avatar/cover/comment normalisent les images en format WebP avec des limites spécifiques à chaque usage. Les fichiers utilisateurs ordinaires utilisent une API de téléchargement en streaming distincte avec une limite de 2 GiB. Les fichiers SVG et HTML ne sont pas intégrés en tant qu’images exécutables. Les fichiers ordinaires sont fournis en tant qu’attaches. `nosniff` Et un sandbox. Il n’y a pas de scan de virus.
- Au maximum 4 téléchargements en parallèle, et 60 tentatives par utilisateur pendant 10 minutes. L’API vérifie également les enregistrements de téléchargement récents. Un proxy inverse doit appliquer ses propres limites de taille du corps de données, de connexion et de stockage. Il n’y a pas encore de quota de disque par utilisateur.
- Un projet de couverture est lisible uniquement par le déposateur. Une fois lié, les utilisateurs connectés au site peuvent le voir. Les utilisateurs anonymes ne peuvent pas. Une couverture suit les ACL de la bibliothèque. Une couverture non liée est lisible uniquement par le déposateur. Une pièce jointe suit les ACL du document. Un administrateur système n’a pas de droits de lecture supplémentaires. Une couverture nécessite un administrateur. Une pièce jointe nécessite un éditeur.
- L’objet est écrit en premier. Ensuite, la transaction vérifie à nouveau les permissions utilisateur et de ressource, puis enregistre l’actif. Si l’enregistrement échoue, l’objet non commencé est supprimé si possible. Les modifications de couverture utilisent la version de ressource. Les modifications d’avatar utilisent la version de profil.
- L’avatar terminé mais non lié, ainsi que les ébauches de couverture, sont conservées pour l’instant. La nettoyage des ébauches d’actifs, les quotas par utilisateur et le scan contre les virus ne sont pas effectués. Les uploads de fichiers utilisateurs ordinaires prennent en charge le support multipart S3 à partir de 32 MiB avec des parties de 8 MiB ; cela est séparé de l’endpoint d’actifs limités. Un crash peut laisser un objet non enregistré. Le nettoyage doit vérifier chaque référence à un actif. Ne supprimez pas un objet partagé simplement parce qu’un document a été supprimé.

<a id="verification"></a>

## Vérification

Les tests automatisés couvrent les uploads locaux, les permissions privées, les vérifications d’images, les liens, les conflits, les IDs de stockage stable, les espaces de noms de plugin et l’intégrité de l’archive immuable. L’intégration isolée de PostgreSQL et les vérifications locales du navigateur à deux instances ont été réussies. Les appels du SDK S3 et les signatures du CDN ont été simulés ; les identifiants cloud réels n’ont pas été utilisés. Les uploads/download réels du bucket, l’application stricte de l’origine privée, l’expiration de la signature, la révocation, les échecs de réseau et la restauration des sauvegardes nécessitent encore l’acceptation spécifique au service. Voir [le rapport d’acceptation du navigateur](storage-browser-acceptance.md).
