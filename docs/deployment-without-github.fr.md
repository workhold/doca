<a id="deploy-without-github-access"></a>

# Déployer sans accès à GitHub

[简体中文](deployment-without-github.zh-CN.md)

Le serveur d’entreprise n’a pas besoin de checkout source, de Git, de Node.js ou de pnpm. Installez d’abord Docker Engine, le plugin Docker Compose, Bash et OpenSSL, puis transférez les fichiers de déploiement, préparez l’image, lancez Doca et initialisez l’administrateur. Ce guide installe Doca 0.3.1 sur un serveur unique neuf avec SQLite et stockage de fichiers local. Les installations existantes doivent consulter… [exigences de libération](releases/0.3.1.fr.md) et préserver leurs bases de données, fichiers, configuration et clé maîtresse des identifiants.

<a id="fresh-installation-from-one-yaml"></a>

## Installation récente à partir d’un YAML

`node scripts/pack-deployment.mjs` également en sortie `doca-compose-vVERSION.yaml` et son checksum. Transférez le YAML, enregistrez-le sous `compose.yaml` Dans un répertoire de déploiement permanent, éditer `DOCA_ORIGIN` et votre génération `DOCA_CREDENTIAL_MASTER_KEY`, le protéger avec `chmod 600 compose.yaml`, puis exécuter `docker compose up -d`. Non `.env`Un fichier JSON ou un script d’administrateur externe est nécessaire. Utilisez l’image 0.3.1 correspondante ; les fichiers YAML autonomes et les checksums sont également attachés à la version de GitHub.

Après que la situation est saine, courir `docker compose exec doca bash docker/admin.sh bootstrap`; utiliser `reset-password` Pour réinitialiser le mot de passe. La saisie du mot de passe est cachée et ne figure pas dans le YAML. Cet exemple est uniquement destiné aux installations récentes de SQLite/local-storage. Les sites existants conservent leur nom de projet, leurs volumes et leurs clés. Les sauvegardes incluent le YAML protégé. Les exigences de reverse-proxy restent telles que définies ci-dessous.

<a id="_1-transfer-deployment-files"></a>
<a id="1-transfer-deployment-files"></a>

## 1. Transférer les fichiers de déploiement

Quelqu'un ayant accès au repository clone le main et génère le bundle de déploiement :

```sh
git clone --branch main --depth 1 https://github.com/workhold/doca.git
cd doca
node scripts/pack-deployment.mjs
```

Les noms des archives et les étiquettes d’image ci-dessous utilisent 0.3.1 comme exemple. Utilisez les noms de fichiers générés par le packager et l’image spécifiée dans le fichier Compose créé.

Transfert `doca-deploy-v0.3.1.tar.gz` et son `.sha256` Vérification via un service de fichiers d'entreprise, une URL de téléchargement interne ou un stockage amovible. Le packer ne lit que les fichiers de déploiement publics et ne contient aucun fichier local. `.env`données utilisateur, ou image de conteneur. La version de GitHub pour la étiquette correspondante inclut le bundle et le checksum.

Placer les deux fichiers dans le même dossier sur le serveur d'entreprise, vérifier et extraire :

```sh
sha256sum -c doca-deploy-v0.3.1.tar.gz.sha256
tar -xzf doca-deploy-v0.3.1.tar.gz
cd doca-deploy-v0.3.1
```

Sur macOS, utilisez `shasum -a 256 -c doca-deploy-v0.3.1.tar.gz.sha256`Exécutez les commandes de déploiement suivantes depuis ce dossier :

```text
doca-deploy-v0.3.1/
  compose.yaml
  docker.env.example
  README.zh-CN.md
  README.md
  LICENSE
  scripts/
    bootstrap-admin.sh
    reset-admin-password.sh
```

Le paquet conserve les variables d’environnement et les montages persistants, supprime les paramètres de build source, et utilise `pull_policy: missing`. L’image reconstruite contient le runtime PDF/canvases ; aucun JSON seccomp n’est transféré. Les installations existantes conservent leur projet Compose, leurs volumes, la configuration et la clé maîtresse. Ces changements nécessitent une image reconstruite ; les images anciennes publiées respectent toujours leurs exigences de déploiement originales.

<a id="copy-compose-and-env-manually"></a>

### Copier Compose et .env manuellement

Pour un transfert de texte, enregistrez cette configuration à un seul serveur. `compose.yaml` et utiliser l’hôte correspondant `scripts/` Si souhaité, ou l’commande intégrée d’administrateur d’images. Le bundle inclut des paramètres optionnels supplémentaires ; cet exemple utilise uniquement SQLite et le stockage local.

```yaml
services:
  doca:
    image: docker.io/smartdoca/doca:0.3.1
    pull_policy: missing
    restart: unless-stopped
    init: true
    stop_grace_period: 30s
    environment:
      NODE_ENV: production
      DOCA_ORIGIN: "${DOCA_ORIGIN:?Set DOCA_ORIGIN in .env}"
      DOCA_HOST: 0.0.0.0
      DOCA_PORT: "39120"
      DOCA_DATABASE: sqlite
      DOCA_SQLITE_PATH: /data/doca.db
      DOCA_BOOK_BATCH_CHECKPOINTS: "${DOCA_BOOK_BATCH_CHECKPOINTS-on}"
      DOCA_AI_SQLITE_PATH: /data/ai.db
      DOCA_DATA_DIR: /data
      DOCA_FILE_STORE_ID: "${DOCA_FILE_STORE_ID:?Set DOCA_FILE_STORE_ID in .env}"
      DOCA_FILE_STORES_JSON: "${DOCA_FILE_STORES_JSON:?Set DOCA_FILE_STORES_JSON in .env}"
      DOCA_CREDENTIAL_MASTER_KEY: "${DOCA_CREDENTIAL_MASTER_KEY:?Generate and set the key in .env}"
    ports:
      - "127.0.0.1:39120:39120"
    volumes:
      - doca_data:/data

volumes:
  doca_data:
```

Sauvegarde le suivant comme `.env`Définir l’origine réelle du navigateur, et remplir la clé principale générée dans l’étape suivante :

```dotenv
DOCA_ORIGIN=https://docs.example.com
DOCA_CREDENTIAL_MASTER_KEY=
DOCA_FILE_STORE_ID=local
DOCA_FILE_STORES_JSON='{"version":1,"stores":{"local":{"provider":"local","root":"/data/storage"}}}'
```

<a id="_2-configure-the-environment-and-proxy"></a>
<a id="2-configure-the-environment-and-proxy"></a>

## 2. Configurer l’environnement et le proxy

Pour le bundle, exécutez le suivant ; ignorez la copie si vous l’avez créé vous-même. `.env` manuellement :

```sh
cp docker.env.example .env
openssl rand -hex 32
chmod 600 .env
```

Écrire la valeur hexadécimale de 64 caractères générée `DOCA_CREDENTIAL_MASTER_KEY`, remplaçant l’exemple public. Définir `DOCA_ORIGIN` Les utilisateurs d’origine HTTP(S) seront ouverts. Générez la clé une fois, stockez-la de manière sécurisée et indépendante, et conservez-la entre les redémarrages. Conservez la racine de stockage local à `/data/storage`Ne mettez pas les identifiants d’administrateur. `.env`.

Compose ne s’attache qu’à `127.0.0.1:39120`Donc, configurez un proxy inversé sur le même serveur. Pour le HTTPS public, Caddy peut utiliser :

```caddyfile
docs.example.com {
    reverse_proxy 127.0.0.1:39120
}
```

Indiquer le point DNS vers le serveur et autoriser l'émission de certificats, ou utiliser des certificats d'entreprise existants. Pour un réseau interne de confiance sans accès à Internet, configurez `DOCA_ORIGIN=http://doca.internal`Configurer les entrées DNS internes ou des hôtes clients, et utiliser ce proxy HTTP sans émission de certificat public :

```caddyfile
http://doca.internal {
    reverse_proxy 127.0.0.1:39120
}
```

D’autres proxy doivent être préservés `Host` et transmettre les upgrades HTTP et WebSocket `/api/v1/ws`. L’environnement d’entreprise doit fournir à l’avance Docker, le proxy, ainsi que leurs paquets d’installation ; ceux-ci ne font pas partie du bundle de déploiement.

<a id="_3-prepare-the-image"></a>
<a id="3-prepare-the-image"></a>

## 3. Préparer l’image

<a id="docker-hub-is-reachable"></a>

### Docker Hub est accessible.

Si GitHub est bloqué mais que Docker Hub est accessible, téléchargez l’image prétravaillée :

```sh
docker compose pull doca
```

<a id="registries-are-also-unreachable"></a>

### Les registres sont également inaccessibles.

Le fournisseur prépare un archivage d’images sur une machine ayant accès au registre. Vérifiez d’abord l’architecture de la CPU cible. Cet exemple utilise Linux x86-64.`linux/amd64`); pour ARM64, utilisez `linux/arm64` Et étiquetez les fichiers livrés en conséquence :

```sh
docker pull --platform linux/amd64 docker.io/smartdoca/doca:0.3.1
docker image inspect docker.io/smartdoca/doca:0.3.1 --format '{{.Os}}/{{.Architecture}}'
docker save -o doca-image-v0.3.1-linux-amd64.tar docker.io/smartdoca/doca:0.3.1
sha256sum doca-image-v0.3.1-linux-amd64.tar > doca-image-v0.3.1-linux-amd64.tar.sha256
```

Transférer l’image `.tar` et le checksum ensemble. D’après leur répertoire sur le serveur d’entreprise :

```sh
sha256sum -c doca-image-v0.3.1-linux-amd64.tar.sha256
docker load -i doca-image-v0.3.1-linux-amd64.tar
docker image inspect docker.io/smartdoca/doca:0.3.1 --format '{{.Os}}/{{.Architecture}}'
```

Confirmer que l’étiquette chargée est correcte `smartdoca/doca:0.3.1` Et si l’architecture correspond au cible, alors retourner au dossier de déploiement. Un registre interne est une autre option de livraison : le fournisseur met à jour la même image de version, et l’équipe métier modifie Compose. `image` À l’adresse de registre interne avant de tirer. Conservez le bundle, l’image et les scripts d’initialisation sur la même version.

<a id="_4-start-and-initialize-the-database"></a>
<a id="4-start-and-initialize-the-database"></a>

## 4. Démarrer et initialiser la base de données

Après avoir téléchargé ou chargé l’image, exécutez depuis le dossier de déploiement :

```sh
docker compose config --quiet
docker compose up -d --pull never --no-build
docker compose ps
```

`--pull never --no-build` Utilise l’image locale et échoue si celle-ci est manquante, sans tenter de télécharger en ligne ou de construire à partir de la source. La première démarrage crée le schéma de base de données actuel et les dossiers de données de fichiers/IA dans un espace vide. `doca_data` Volume. Aucune installation manuelle de SQL ou de base de données n’est nécessaire. Une base de données existante et ancienne ne est pas mise à jour automatiquement.

Attendez. `docker compose ps` pour montrer `healthy`Un contrôle manuel doit utiliser l’Host. `.env`, y compris tout port non standard :

```sh
curl -fsS -H 'Host: docs.example.com' http://127.0.0.1:39120/health
```

Attendez `{"status":"ok","version":"0.3.1"}`Pour l’exemple interne, utilisez `Host: doca.internal`Les demandes de loopback invalides échouent à la validation du hôte. Examinez les échecs de démarrage. `docker compose logs --tail=100 doca`.

<a id="_5-initialize-the-administrator"></a>
<a id="5-initialize-the-administrator"></a>

## 5. Initialiser l’administrateur

Après que le service est en bonne santé, exécutez-le dans le même dossier de déploiement :

```sh
bash scripts/bootstrap-admin.sh
```

Entrez un identifiant, une mot de passe d'au moins 12 caractères, et confirmez-le ; la saisie du mot de passe est cachée. Le script lance un conteneur unique avec l'image préparée et le même volume persistant. Un compte est créé uniquement lorsqu’il n’y a pas d’administrateur, et la base de données stocke un hash de mot de passe. Il n’y a pas d’identifiant ou de mot de passe par défaut. Ouvrez la configuration. `DOCA_ORIGIN` et se connecter.

Pour réinitialiser la mot de passe de l’administrateur existant ultérieurement :

```sh
bash scripts/reset-admin-password.sh
```

Cela ne crée pas de compte. Si la base de données est verrouillée, exécutez. `docker compose stop`réinitialiser le mot de passe, puis `docker compose up -d --pull never --no-build`.

<a id="preserve-data-and-deliver-later-releases"></a>

## Préserver les données et livrer les versions ultérieures

Utilisez `docker compose restart` pour les redémarrages ordinaires. Conservez le dossier de déploiement et le nom du projet Compose afin que tout soit identique `doca_data` Le volume est utilisé ; changer l’un ou l’autre peut accidentellement déclencher la création d’un site vide distinct. Faire une sauvegarde de toutes les bases de données et des stockages de fichiers dans le volume persistant, ainsi que des données protégées. `.env` et clé maîtresse. `docker compose down -v` Supprime le volume et ne doit pas être utilisé pour une restauration ou une mise à niveau ordinaire.

Réexaminer [exigences de libération](releases/0.3.1.fr.md) Avant l’upgrade, fournissez un bundle et une image correspondants. Ce guide initialise des sites neufs et ne convertit pas les données existantes. Le login par mot de passe et les services de documents locaux n’ont pas besoin d’accès GitHub ; les services externes configurés pour l’IA, le login externe, l’installation d’extension ou le stockage en cloud doivent néanmoins être accessibles. Vérifiez séparément la rédaction des documents sur l’hôte cible : la santé de l’application seule ne garantit pas la qualité de rédaction des PDF, du Canvas et de Office. Voir [Rénder de documents Docker](docker-rendering.fr.md).
