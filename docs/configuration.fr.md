<a id="configuration"></a>

# Configuration

Le client de bureau Tauri intègre la frontend web et se connecte à un hôte distant configuré séparément. Il ne fournit pas d’hôte local professionnel et ne modifie pas la configuration de déploiement de l’hôte distant. Voir [client de bureau](desktop-client.fr.md).

[中文](configuration.zh-CN.md)

Choisir `docker.env.example` pour Compose et `.env.example` Pour le développement de la source, copiez-le ensuite dans le répertoire racine du repository. `.env`Ils utilisent des origines et des chemins de base de données différents ; tous deux montrent `/data/storage` Pour le volume de fichiers persistant du conteneur. Pour le développement source, changez le répertoire racine de stockage en un dossier absolu écriture sur votre machine. Ne changez pas les origines ni ne soumettez les secrets.

<a id="required-compose-settings"></a>

## Paramètres de composition requis

| Variable | Exigence | Exemple de serveur unique |
| --- | --- | --- |
| `DOCA_ORIGIN` | Doit être définie explicitement comme origine HTTP(S) | `https://doca.example.com` |
| `DOCA_FILE_STORE_ID` | Doit être non vide ; doit identifier un magasin dans le JSON | `local` |
| `DOCA_FILE_STORES_JSON` | Doit être non vide ; configuration valide de version 1 avec backend physique | Voir ci-dessous |
| `DOCA_CREDENTIAL_MASTER_KEY` | Requis à chaque démarrage ; exactement 64 caractères hexadécimaux (32 octets) | Générer avec `openssl rand -hex 32` |

```dotenv
DOCA_ORIGIN=https://doca.example.com
DOCA_FILE_STORE_ID=local
DOCA_FILE_STORES_JSON='{"version":1,"stores":{"local":{"provider":"local","root":"/data/storage"}}}'
```

Pour une installation avec un nouveau serveur unique, **Changer l’origine publique et remplacer la clé de credencial d’exemple publique** avec la sortie `openssl rand -hex 32`; les valeurs nécessaires dans le fichier de stockage sont déjà fournies. PostgreSQL, Redis, les clés de modèle et les identifiants SSO sont conditionnels. Les déploiements existants doivent conserver leur clé maître originale.

Utilisez une origine HTTP(S) sans identifiants, sous-paths, requête ou fragment. Le slash final au début de la URL est normalisé. Le environnement de production accepte à la fois HTTP et HTTPS. Le proxy conserve les paramètres configurés. `Host`; une demande adressée uniquement à `127.0.0.1` échoue au test de l’hôte. Voir [vérifications de santé](deployment.fr.md#start).

<a id="defaults-depend-on-the-entry-point"></a>

## Les échecs dépendent du point d’entrée

| Point d’entrée | Origine | Base de données / fichiers | Clé principale des credences |
| --- | --- | --- | --- |
| Repositori Compose | Requis en `.env` | SQLite `/data/doca.db`; l’ID de fichier/JSON requis `.env`; `doca_data` monté `/data` | Obligatoire ; utilisez la clé de déploiement persistante |
| Image publiée sans Compose | Doit indiquer l’origine HTTP(S) | L’image indique explicitement les paramètres par défaut pour SQLite et le stockage local. `/data`; monter en permanence `/data` toi-même | Obligatoire ; utilisez la clé de déploiement persistante |
| Développement de sources | `http://127.0.0.1:39130` | SQLite `./data/v1/doca.db`; l’ID de fichier/JSON est requis, fourni par `.env.example` | Requis ; remplacer la clé d’exemple publique |

Le parser de fichier-de-storage ne possède pas de paramètre par défaut implicite ; les valeurs par défaut pour les images sont des valeurs d’environnement explicites dans le Dockerfile. Le stockage local nécessite un répertoire racine persistant et écrit. S3 nécessite... `bucket`, `region`, booléen `forcePathStyle`, et explicite `credentials:{accessKeyId,secretAccessKey,sessionToken?}`Un point de terminaison optionnel doit être une origine racine HTTP(S) sans identifiants, sous-répertoire, requête ou fragment. Les points de terminaison HTTP explicites permettent l’utilisation d’un stockage de objets internes fiable, comme RustFS ; l’opérateur contrôle l’accès réseau, et les origines de site, d’actifs et de CDN acceptent également HTTP(S). Les identifiants de shell AWS ne remplacent pas ces champs JSON. Voir [stockage de fichiers](storage.fr.md) Pour un exemple de configuration RustFS.

Les IDs de magasin et les emplacements physiques doivent rester disponibles après l’enregistrement des objets. L’ID de magasin actuel configuré doit correspondre à l’ID actif enregistré ; modifier l’ID, le chemin ou le bucket ne déplace pas les données. Ne modifiez pas ces valeurs en tant que raccourci de migration.

<a id="conditional-settings-and-optional-backends"></a>

## Paramètres conditionnels et serveurs optionnels

| Variables | Lorsque nécessaire / par défaut |
| --- | --- |
| `DOCA_DATABASE=postgres`, `DOCA_DATABASE_URL` | La sélection de PostgreSQL nécessite son URL ; la base de données par défaut est SQLite |
| `DOCA_DATABASE_POOL_MAX` | Connexions de base de données principales par processus ; par défaut 10 |
| `DOCA_WEBHOOK_DATABASE_URL` | Base de données de livraison explicite PostgreSQL optionnelle ; sinon dérivée comme décrit ci-dessous |
| `DOCA_REDIS_URL` | Requis pour les événements entre instances, la présence et les limites de taux ; l’absence de définition utilise des implémentations locales au niveau du processus. |
| `DOCA_REDIS_PREFIX`, `DOCA_INSTANCE_ID` | Le préfixe est par défaut `doca`; l’ID de l’instance est par défaut un ID de processus aléatoire |
| `DOCA_TRUST_PROXY` | IPs/CIDRs de proxy de confiance séparés par des virgules ; **Aucun proxy n’est confié par défaut.**, y compris le loopback |
| `DOCA_PLUGINS_DIR` | Dossier d’installation/cache écriture possible ; Compose par défaut `/data/plugins` |
| `DOCA_PDF_PYTHON` | Exécutable Python avec des dépendances WeasyPrint fixées pour l’export en PDF ; par défaut `python3`, `/opt/doca-pdf/bin/python` dans Docker. Obsolète `DOCA_PDF_CHROMIUM` est rejeté |
| `DOCA_PLUGIN_STORE_URL` | Origine HTTP(S); valeur par défaut `https://store.smartdoca.cc` |
| `DOCA_PLUGIN_NPM_REGISTRY` | Registre des packages préconstruits ; par défaut `https://registry.npmjs.org` |
| `DOCA_ASSET_BASE` | Préfixe optionnel de construction ; vide. `/assets` de Doca |
| `DOCA_AI_IMAGE_MAX_ATTEMPTS_PER_PAGE` | Soumettre des demandes d’images payées par page source ; par défaut 5 lorsque la valeur est non définie. Une valeur entière décimale positive et valide est nécessaire ; 0, des valeurs vides ou mal formées entraînent un échec du démarrage. |
| `DOCA_AI_IMAGE_SEGMENT_PROFILE` | Chemin absolu optionnel vers un profil SAM2 local de version 1 fiable et strict ; l’absence de valeur désactive la segmentation. Une configuration explicite mal formée entraîne un échec de l’initialisation ; un runtime vérifié indisponible ne permet pas l’utilisation de l’outil. Voir [segmentation locale](ai-image-segmentation.md) |

Les limites de demandes d’images sont fixées au moment du démarrage du serveur. Par exemple, définissez-les. `DOCA_AI_IMAGE_MAX_ATTEMPTS_PER_PAGE=10` dans la source ou Composer `.env` Et redémarrer le serveur ou réinventer le conteneur. Toutes les répliques doivent utiliser la même limite. La répétition, la reprise, les modifications des instructions ou le réenregistrement d’un lot ne effacent pas les tentatives accumulées. Les demandes soumises en attente ou incertaines sont comptées ; les exportations de référence et la recomposition locale ne le sont pas. Les images existantes, les enregistrements de demande et l’utilisation restent intacts. La réduction de la limite rejette toutes les demandes payées ultérieures, y compris la réutilisation d’un reçu de tentative payée dont l’ordre dépasse maintenant la limite ; elle ne saute jamais ni ne convertit ces enregistrements. La version 3 du lot et la version 1 de la tentative payée restent inchangées ; les formats de lot plus anciens sont toujours rejetés sans migration.

Une clé principale manquante, vide ou corrompue empêche le démarrage, y compris les déploiements sans extensions. Le runtime ne dispose pas de clé par défaut. La valeur publique dans les fichiers d’exemple doit être remplacée pour une installation nouvelle. Générez-en une une fois `openssl rand -hex 32`, sauvegardez-le séparément, et utilisez la même clé pour chaque réplique/redémarrage. Voir [identifiants gérés](plugin-credentials.fr.md).

La livraison via webhook utilise toujours une base de données séparée. SQLite crée `webhooks.db` à côté de la base de données principale. PostgreSQL est par défaut `<main_database>_webhooks`Un base de données manquante déclenche une tentative de création. Si l’utilisateur ne dispose pas des privilèges nécessaires pour créer une base de données, créez cette base de données dédiée en amont et accordez l’accès, ou définissez `DOCA_WEBHOOK_DATABASE_URL` vers une base de données dédiée et accessible. Le magasin d’IA utilise `ai.db` dans Compose et le `doca_ai` Schéma dans la base de données PostgreSQL principale ; les permissions PostgreSQL doivent permettre son initialisation. Ces stockages nécessitent des sauvegardes même lorsqu’aucun modèle d’IA externe n’est configuré.

De multiples répliques nécessitent un stockage partagé de PostgreSQL, Redis et de fichiers. Changer une variable ne transfère pas les données existantes. Lire [scalage horizontal](horizontal-scaling.fr.md) et [exigences de libération](releases/0.2.24.md).

<a id="passing-environment-variables-through-compose"></a>

## Transmettre les variables d’environnement via Compose

`.env` Fournitures : compose l’interpolation ; elle ne transmet pas automatiquement chaque variable au conteneur. Seules les configurations déclarées… `compose.yaml` Rejoindre le service. L’adresse de binding du conteneur, le port, les chemins SQLite/AI et le dossier de données sont définis dans le fichier actuel. Modifiez son environnement, les mappages de port et les montages persistants en même temps lors de la personnalisation de ces valeurs.

D'autres variables d'environnement doivent être transmises explicitement dans l'environnement du service Compose et configurées dans le dossier de déploiement. `.env`.

<a id="administrator-settings-and-applying-changes"></a>

## Paramètres de l'administrateur et application des modifications

Le système Logo est géré par **Site & services → Informations sur le site → Logo du système**Les administrateurs peuvent visualiser et sauvegarder une image PNG/JPEG/WebP de jusqu’à 5 MB, ou restaurer l’icône par défaut. Elle apparaît dans les icônes de navigation, de connexion et des onglets non liés aux documents ; les onglets de documents conservent leurs propres icônes. L’image PNG normalisée est stockée. `settings.site_logo`, en utilisant la même révision que les autres paramètres du site. Le statut historique NULL conserve l’icône par défaut. Voir [Exigences d’amélioration de la version 0.2.24](releases/0.2.24.md) avant de mettre à jour une installation existante.

Inscription, fournisseurs d’identité, passerelles de vérification, recherche, modèles d’IA et abonnements webhook utilisent leurs pages d’administration. Les identifiants du backend de fichiers restent dans l’environnement ; la page de stockage est uniquement consultable. Les identifiants de service de plateforme et les identifiants chiffrés du plugin sont des services distincts ; voir [credences de service](service-credentials.fr.md).

`docker compose config --quiet` Vérifie l’interpolation sans afficher les secrets résolus. Il ne vérifie pas le JSON de l’application, ne se connecte pas aux bases de données, ni ne vérifie l’efficacité des identifiants cloud. Redémarrer. `docker compose up -d`Vérifier les journaux et l’état du système, puis exécuter les services configurés. Voir [déploiement](deployment.fr.md) et [développement](development.fr.md).

<a id="login-lifetime"></a>

## Durée de vie du login

`DOCA_SESSION_TTL_SECONDS` Contrôler le navigateur, les sessions de login par QR et WebView, y compris l’expiration de la base de données et les cookies de session. `Max-Age`. Le paramètre par défaut est `86400` secondes (24 heures). `DOCA_MOBILE_SESSION_TTL_SECONDS` Contrôle les sessions mobiles de porteurs et leur processus de renouvellement existant ; le paramètre par défaut est `15552000` secondes (180 jours). Les deux acceptent des nombres entiers décimaux de 1 à 2147483647. Les valeurs vides, nulles, négatives ou mal formées empêchent le démarrage. Compose passe explicitement les deux variables.

```dotenv
DOCA_SESSION_TTL_SECONDS=86400
DOCA_MOBILE_SESSION_TTL_SECONDS=15552000
```

Redémarrer pour appliquer les modifications de déploiement. Les sessions navigateur déjà créées conservent leur durée de validité stockée ; les nouveaux accès utilisent la nouvelle durée de vie, et les renouvellements mobiles utilisent la durée de vie mobile configurée. Aucune ligne de session ou format persistant n’est converti. Les cookies de session et de flux d’authentification sont utilisés. `Secure` Sur HTTPS, tandis que HTTP continue `HttpOnly` et la politique SameSite existante. Les sites HTTP utilisent `ws` pour les connexions en temps réel.

L’adaptateur de navigateur HTTP approuvé fournit un UUID v4. `crypto.getRandomValues` quand `crypto.randomUUID` Manque, et fournit uniquement SHA-256 `crypto.subtle.digest` à travers les ancrages `@noble/hashes` quand `crypto.subtle` manque. Les implémentations natives restent en usage lorsqu’elles sont présentes. Le digest correspond aux bytes natifs ; les IDs existants, les sommes de contrôle de feuille de calcul et les formats de document ne sont pas convertis. Cela ne permet pas d’utiliser d’autres opérations WebCrypto.

Les boutons de copie de texte utilisent un outil partagé. Il utilise le clavier de copie natif si disponible ; sinon, l’adaptateur HTTP approuvé effectue une copie via un champ de texte temporaire. `document.execCommand("copy")`Restaure le focus et la sélection, et rapporte les échecs. Il ne lit jamais la cléboard système ni ne considère une copie échouée comme réussie.
