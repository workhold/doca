<a id="deploy-doca"></a>

# Déployer Doca

Le paquet de bureau Tauri inclut la frontend web et se connecte à un hôte déployé séparément via des routes d’autorisation de bureau. Il ne contient pas de hôte Node intégré. Chaque paquet pour OS/architecture est construit et vérifié indépendamment. Voir [client de bureau](desktop-client.fr.md).

[中文](deployment.zh-CN.md)

Un serveur peut exécuter l’image spécifiée par `compose.yaml` Sur le serveur principal. Un seul conteneur utilise SQLite et n’a pas besoin de PostgreSQL ou Redis. Utilisez-les uniquement lorsque vous exécutez plus d’une réplique d’application. Voir [instance unique et scaling horizontal](horizontal-scaling.fr.md).

<a id="requirements"></a>

## Exigences

- Le moteur Docker et l’extension Docker Compose.
- Une origine HTTP(S) accessible par les utilisateurs. Le HTTPS public nécessite DNS et un certificat TLS ; l’HTTP interne de confiance est également pris en charge.
- Un proxy inversé sur la même machine que le conteneur. Compose ne publie Doca que sur `127.0.0.1:39120`.

Le proxy doit transmettre les requêtes HTTP et le chemin WebSocket. `/api/v1/ws`. Conservez l’original `Host` en-tête.

<a id="files"></a>

## Fichiers

Cloner les fichiers de déploiement depuis le répertoire principal ou les transférer [Bundle de déploiement pour les serveurs sans accès GitHub](deployment-without-github.fr.md)Le serveur commercial n’a pas besoin d’un check-out de source. L’image reconstruite inclut `docker/admin.sh`: après le démarrage, exécuter `docker compose exec doca bash docker/admin.sh bootstrap`, ou utiliser `reset-password` Pour réinitialiser un administrateur existant. Les scripts d’enveloppe du hôte conservent leurs points d’entrée existants. Le nouveau renderer n’a pas besoin de JSON seccomp du hôte. Le packer émet également un fichier YAML de installation propre et autonome, avec des valeurs d’origine et de clé modifiables. Ces changements nécessitent une image reconstruite et ne peuvent pas être utilisés directement avec une image ancienne publiée non modifiée.

```sh
git clone --branch main --depth 1 https://github.com/workhold/doca.git
cd doca
cp docker.env.example .env
```

Édition `.env` avant le premier démarrage.

<a id="required-settings"></a>

## Paramètres requis

Le stockage de fichiers nécessite également `DOCA_FILE_STORE_ID` et `DOCA_FILE_STORES_JSON`, comme indiqué `docker.env.example`. Les chemins et les identifiants du backend sont lus depuis l'environnement ; la page d'administration est uniquement consultable. Voir [stockage de fichiers](storage.fr.md).

L’hôte actuel utilise la génération `doca-2026-10-12-book-payload-storage-v1`Le startup aligne automatiquement les bases de données 0.1.22 libérées. `doca-2026-10-09-history-storage-v1` Grâce à l’examen/reconciliation des DDL actuels, la nouvelle génération est enregistrée. Toutes les lignes anciennes restent, y compris les résultats du livre SQL ; aucune conversion, nettoyage ou adaptateur pour les anciens objets n’est ajouté. Les enregistrements de livres anciens résiduels peuvent nécessiter une manipulation manuelle. Les données des objets de version 0.1.23 existantes restent intactes. Voir [évolution de la structure de la base de données](database-schema-evolution.fr.md) et [exigences de sortie actuelle](releases/0.3.1.fr.md)La valeur de base exacte 0.1.13 `doca-2026-10-08-knowledge-books-v2` Il est encore nécessaire d’appliquer l’amélioration de l’histoire explicite ci-dessous. Il faut conserver les bases de données, les objets privés, la configuration et la clé maîtresse des credences originale.

`DOCA_ORIGIN` C’est l’origine des utilisateurs saisie dans le navigateur. Les protocoles HTTP et HTTPS sont acceptés, y compris en production. Utilisez uniquement l’origine sans sous-réseau, sans requête ou sans fragment ; la barre finale “/” est normalisée.

```text
DOCA_ORIGIN=https://docs.example.com
```

L'exemple Docker fournit déjà les valeurs nécessaires pour le stockage de fichiers. Pour un serveur unique neuf, modifiez l’origine et générez une clé. `openssl rand -hex 32`, et remplacer l’échantillon public `DOCA_CREDENTIAL_MASTER_KEY`. La clé est nécessaire même sans extensions ; les déploiements existants doivent conserver leur clé originale. Conservez les valeurs stockées dans le fichier ; PostgreSQL et Redis sont conditionnés. Voir [configuration](configuration.fr.md) Pour les paramètres par défaut, les champs S3 et les stockages séparés Webhook/AI.

<a id="start"></a>

## Commencer

0.1.26 : modification de l’espace de stockage du plugin en un [base de données commerciale partagée](plugin-database-isolation.fr.md), séparé du noyau. À la version 0.1.25, tous les plugins externes sont normalement désinstallés avant d’arrêter toutes les instances. Les données, identifiants et objets professionnels privés sont éliminés sans migration ; les données de base et les fichiers ordinaires restent. Supprimer les paramètres obsolètes par plugin, configurer une seule base de données/compte PostgreSQL une fois (SQLite est automatique), puis réinstaller et réconfigurer les plugins. Voir [Exigences d’amélioration de la version 0.1.26](releases/0.1.26.md).

Arrêtez tous les anciens hôtes et faites une sauvegarde de la base de données avant de mettre à jour. Le schéma 0.1.22 publié s’ajuste automatiquement lors du démarrage, tout en conservant toutes les lignes de données existantes. Aucun commande manuelle de book n’est nécessaire. Les résultats du book SQL conservés ne sont pas adaptés au format d’objet natif ; il est nécessaire de gérer les enregistrements restants manuellement si nécessaire. Pour les conserver en tant que résultats utilisables, exécutez l’option existante. [conversion sans perte](knowledge-book-storage-verification.fr.md) Avant le premier démarrage. Les générations précédentes doivent d’abord terminer l’upgrade de historique indiqué ci-dessous. Mettre à jour tous les hôtes et les instances web en même temps.

<a id="upgrade-from-0113"></a>

### Mise à niveau de la version 0.1.13

Arrêter toutes les instances Doca et faire une sauvegarde des bases de données (y compris SQLite WAL), du stockage des fichiers et de la configuration. Conserver la version originale. `DOCA_CREDENTIAL_MASTER_KEY`. Utilisez les fichiers de déploiement actuels et l’image correspondante. Téléchargez-les et exécutez un conteneur de maintenance hors ligne avec l’environnement de déploiement existant :

```sh
docker compose stop
docker compose pull
docker compose run --rm --no-deps doca node --import tsx apps/server/src/bootstrap/history-storage.ts upgrade --apply
```

Seulement `doca-2026-10-08-knowledge-books-v2` Cela est accepté ; l’commande ne crée ni ne réinitialise jamais la base de données. La transaction ajoute des tables d’archivage de l’histoire et des tâches, tout en conservant tous les bytes de l’snapshot original. Après le démarrage du nouveau hôte, les 20 dernières snapshots complètes restent dans la base de données. Pour chaque groupe de 10 snapshots anciens, seule la plus récente est conservée dans le stockage de fichiers ; les neuf autres sont supprimés après la vérification écriture/lire et ne peuvent pas être restaurés depuis l’application. En cas de panne de stockage, tout le groupe original est conservé. L’histoire est affichée sous forme d’une seule liste ; les groupes incomplets restent dans la base de données. Voir [stockage de l’histoire et rollback](storage.fr.md#history-storage-and-offline-upgrade).

Le commande enregistre d’abord `doca-2026-10-09-history-storage-v1`; le startup actuel applique ensuite l’alignement structurel approuvé `doca-2026-10-12-book-payload-storage-v1`Le commande de rollback de l’histoire directe ne prend en charge que la génération de stockage d’histoire ou son marqueur de rollback interrompu ; par conséquent, elle ne peut pas annuler une base de données déjà alignée par l’hôte actuel. Voir [limites de maintenance de l’histoire](storage.fr.md#history-storage-and-offline-upgrade) et [restauration du stockage de livres](knowledge-book-storage-verification.fr.md) Avant tout rollback. Conserver les écritures ultérieures et les bytes du fichier conservés ; l’histoire échantillonnée nécessite une sauvegarde pré-upgrade. Ne pointez jamais une image ancienne directement vers une base de données plus récente.

```sh
docker compose pull
docker compose up -d
```

`docker compose up -d` extrait l’image spécifiée par `compose.yaml`. Ajouter `--build` Seulement lorsque vous souhaitez une image créée à partir de ce checkout.

Vérifiez le conteneur :

```sh
docker compose ps
curl -fsS -H 'Host: docs.example.com' http://127.0.0.1:39120/health
```

Remplacer `docs.example.com` Avec l’hôte dans l’origine configuré, y compris son port si ce n’est pas standard. Le probe de conteneur intégré fournit déjà cet hôte ; attendez. `docker compose ps` pour montrer `healthy`Un boucle de retour nu est rejeté avec 421.

Un processus sain se rétablit `status: "ok"` et la version image réelle `version`.

La génération de documents nécessite également des vérifications de déploiement : cette opération ajoute LibreOffice et Chromium en environnement virtuel, tandis que la option SAM nécessite un runtime Linux fiable distinct. Voir [Récupérateurs de documents Docker](docker-rendering.fr.md) Pour l’disponibilité des composants, on trouve la politique seccomp de Chromium incluse et le fonctionnement explicite du SAM mount. Un serveur en bon état ne suffit pas à vérifier ces outils.

SQLite, les fichiers téléchargés et la base de données IA sont stockés dans `doca_data` Volume. La base de données doit être vide au premier démarrage. Une base de données non vide doit utiliser une génération de compatibilité supportée ; les modifications ajoutées examinées sont réconciliées automatiquement, tandis que les différences destructives ou sémantiques sont signalées pour examen. Ne supprimez pas une base de données qui contient déjà des utilisateurs.

<a id="reverse-proxy"></a>

## Proxy inversé

Terminer le TLS dans Caddy ou Nginx sur le même hôte et renvoyer vers `127.0.0.1:39120`.

```caddyfile
docs.example.com {
	reverse_proxy 127.0.0.1:39120
}
```

Les proxys Caddy effectuent les upgrades WebSocket par défaut. Un serveur Nginx est nécessaire. `Upgrade` et `Connection` en-têtes `/api/v1/ws`.

`DOCA_TRUST_PROXY` Il est vide par défaut : aucune en-tête reenvoyée n’est considérée comme fiable, y compris les connexions depuis le loopback. Pour conserver les adresses IP des clients à des fins d’audit et de limites, configurez uniquement l’IP/CIDR du proxy que l’application voit réellement. Un pont Docker peut faire en sorte qu’un proxy hôte apparaisse comme le portail du pont, plutôt que… `127.0.0.1`; inspectez le réseau de déploiement avant de choisir cette valeur. Sans cela, les utilisateurs proxy pourraient partager la quota d’IP du proxy.

Si un load balancer sur un autre machine se connecte à cet hôte, publiez le port du conteneur sur l’interface privée plutôt que seulement sur le loopback, et définissez `DOCA_TRUST_PROXY` Dans la plage d’adresses IP de ce load balancer. Ne faites pas confiance à Internet public.

Pour un site HTTP interne de confiance, définir `DOCA_ORIGIN=http://doca.internal` Et servez cette adresse via un proxy inversé HTTP. Vous pouvez également publier le port du conteneur sur une interface privée choisie et inclure ce port dans l’Origin. La mapping fournie par Compose ne s’applique qu’à la boucle回环. Aucune modification en mode de développement n’est nécessaire ; maintenez le mode de production. Le support HTTP ne modifie pas la validation de Host ou d’Origin.

<a id="create-the-administrator"></a>

## Créer l’administrateur

Il n’y a pas de compte ou mot de passe par défaut. Une fois le conteneur en état de fonctionnement, exécutez ceci dans le dossier qui contient `compose.yaml`:

```sh
bash scripts/bootstrap-admin.sh
```

Le script demande le nom d’utilisateur et le mot de passe. Le mot de passe doit comporter au moins 12 caractères. Il est transmis uniquement à cette commande de conteneur. La base de données stocke un hash. Si un administrateur existe déjà, la commande s’arrête et ne modifie pas le mot de passe actuel.

<a id="change-a-password"></a>

## Changer le mot de passe

Un utilisateur connecté ouvre `#/account` et choisit **Changer le mot de passe**La nouvelle mot de passe doit comporter au moins 12 caractères. Une fois enregistrée, toute session utilisant cet compte est fermée.

Lorsque l’administrateur ne peut se connecter, réinitialisez l’utilisateur existant depuis le dossier de déploiement :

```sh
bash scripts/reset-admin-password.sh
```

Cela ne crée pas de compte et n’est pas disponible via HTTP. Si le fichier de base de données est verrouillé, exécutez… `docker compose stop`réinitialiser le mot de passe, puis `docker compose up -d`Ne écrivez pas le nom d’utilisateur ou le mot de passe. `.env`.

<a id="static-assets"></a>

## Assets statiques

La page HTML et l’API restent en place `DOCA_ORIGIN`. `DOCA_ASSET_BASE` changements uniquement `/assets/...` URLs à l’intérieur de cet HTML.

Le serveur négocie Brotli (`br`), gzip, ou en octets originaux utilisant `Accept-Encoding` et envoie `Vary: Accept-Encoding`Les URLs et les fichiers compilés restent inchangés, y compris les répertoires de compilation existants. Les URLs des ressources HTML sont réécrits avant la compression. Le serveur utilise une cache limitée de 32 MiB par processus pour les ressources statiques publiques codées ; il ne ajoute pas de copies compressées aux images, ni ne compresse les réponses des API/fichiers privés via cette méthode. Les proxys/CDN doivent préserver la négociation de l’encodage. `Vary`ou gérer eux-mêmes la compression. Cela affecte les transferts via le navigateur ; Docker utilise sa propre compression et cache de couche d’image.

Le bâti `/cad/` Les fichiers worker et les WASM utilisent la même négociation d’encodage et conservent `no-cache` Parce que leurs noms ne sont pas hashed. Les chemins en dehors des fichiers CAD déclarés restent indisponibles.

Laisser cela sans modification pour servir JavaScript, CSS et les autres fichiers compilés du conteneur. `/assets`Lorsque vous le configurez, utilisez un préfixe HTTP(S) sans userinfo, query, hash ou barre finale.

```text
DOCA_ASSET_BASE=https://cdn.example.com/doca/0.1.11
```

Une page qui faisait référence `/assets/index-abc.js` puis charge :

```text
https://cdn.example.com/doca/0.1.11/assets/index-abc.js
```

Publier tout `apps/web/dist/assets` dossier avec ce préfixe et gardez-le `assets` Segment de chemin. Les noms des fichiers contiennent un hash de contenu et doivent correspondre au HTML contenu dans la même image. Les demandes API restent en place `DOCA_ORIGIN`.

Une étiquette officielle comme `v1.2.3` construit l’application web et l’attache `doca-web-assets-v1.2.3.tar.gz` vers la publication sur GitHub. Extraire-le, garder-le `assets` dossier, et placez ce dossier sur un CDN qui envoie des en-têtes cross-origin pour les modules ES. Ne utilisez pas un `github.com/.../releases/download` URL comme `DOCA_ASSET_BASE`Un coup de pouce `main`, ou une étiquette de pré-lancement telle qu’une `v1.2.3-rc.1`, ne crée pas cette sortie.

Le conteneur conserve son propre contenu `/assets` Fichiers. Les polices et les images référencées dans les feuilles de style ayant une path racine sont toujours chargées depuis Doca.

`index.html` est envoyé avec `Cache-Control: no-cache`Ainsi, une nouvelle visite après une mise à jour permet d’accéder à la nouvelle page. Les fichiers haché sont sous `/assets/` sont envoyés avec `Cache-Control: public, max-age=31536000, immutable`Leurs noms changent lorsque le contenu change, donc une cache d’un an ne conserve pas un script ancien après que le nouveau HTML a été chargé. Un CDN en avant… `DOCA_ASSET_BASE` Il a besoin du même cache long pour ces fichiers hashés.

<a id="configure-static-cdn-response-headers"></a>

### Configurer les en-têtes de réponse du CDN statique

`DOCA_ASSET_BASE` Changer les URLs ; il ne configure pas le CDN. Définir les objets de build S3 téléchargés. `Cache-Control: public, max-age=31536000, immutable` et préserver le Content-Type (`text/javascript` pour JS, `text/css` Pour couvrir les objets existants sans modifier les métadonnées, attachez un CloudFront. **Politique des en-têtes de réponse** seulement pour le statique `*/assets/*` Comportement : ajouter Cache-Control en bas **En-têtes personnalisés** avec **Overrider**Les modules ES de différentes origines nécessitent également cela. `Access-Control-Allow-Origin: https://doca.example.com`; ces fichiers de construction publics peuvent être utilisés `*` Sans identifiants. Ne collez pas cette politique à HTML, aux API ou aux fichiers privés.

Définir le fichier hash statique **Politique de cache** Individuellement : TTL minimal 0, TTL par défaut/maximal 31536000 secondes. La politique des en-têtes de réponse modifie les en-têtes du navigateur, et non le TTL de l’edge ; voir [Politiques de en-têtes de réponse AWS](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/modifying-response-headers.html)Publier de nouveaux noms de fichiers et conserver les versions antérieures pour des chargement ultérieurs sur des pages déjà ouvertes.

Un CDN Nginx statique peut servir un dossier de sortie de la manière suivante, selon les normes. `mime.types` chargé par le serveur :

```nginx
location /doca/0.2.12/assets/ {
    alias /srv/doca/0.2.12/assets/;
    add_header Cache-Control "public, max-age=31536000, immutable";
    add_header Access-Control-Allow-Origin "https://doca.example.com";
}
```

Lors du proxying de Doca `/assets/`cacher l'en-tête d’origine existant `proxy_hide_header Cache-Control;` avant d’ajouter son remplacement. L’exemple omet `always` Ainsi, les fichiers manquants ne reçoivent pas une cache 404 d’une année. Vérifiez la réponse finale du CDN.

```sh
curl -I https://cdn.example.com/doca/0.2.12/assets/<actual-hashed-JS-filename>.js
```

Vérifiez les paramètres Cache-Control, Content-Type et CORS. Le HTML reste sur Doca avec revalidation. Pour les images de document et les fichiers protégés, utilisez [Stockage : cachement d’images dans le navigateur et CDN de fichiers](storage.fr.md#browser-image-caching-and-the-file-cdn).

<a id="knowledge-book-payload-conversion"></a>

## Conversion du contenu de livrable de connaissances-en livre

0.1.25 aligne les anciennes générations supportées via une comparaison de schéma ordinaire, en conservant tous les données commerciales sans nettoyage automatique des livres ou des adaptateurs de corps en temps réel. Les objets de génération cible existants restent inchangés. Les existants [procédure optionnelle sans perte](knowledge-book-storage-verification.fr.md) Il doit être exécuté avant le premier démarrage, afin que les anciens résultats SQL restent utilisables. Les conversions interrompues nécessitent toujours leur manifeste original. Conserver tous les données et les écritures ultérieures lors de la restauration des sauvegardes ; mettre à jour chaque hôte et chaque build web ensemble.
