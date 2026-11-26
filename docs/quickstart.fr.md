<a id="quick-start"></a>

# Démarrage rapide

[中文](quickstart.zh-CN.md)

Cet guide installe l’image spécifiée dans compose.yaml sur le serveur principal, SQLite et le stockage de fichiers locaux. Vous avez besoin de Git, de Docker Engine, du plugin Docker Compose et d’un domaine pointant vers le serveur. Un proxy inverse sur ce serveur peut fournir HTTPS ou un HTTP interne fiable. Vous n’avez pas besoin de Node.js ou de pnpm pour exécuter l’image.

C’est une installation nouvelle. Les déploiements existants doivent lire… [exigences de libération](releases/0.2.38.md) Premièrement : les modifications additives sont appliquées automatiquement dans la génération de compatibilité supportée ; les bases de données et les modifications sémantiques incompatibles nécessitent une gestion distincte. Il est possible de conserver les bases de données, les fichiers et les configurations existants.

Si le serveur ne peut pas se connecter à GitHub, transférez Compose, l’exemple d’environnement, la politique de sécurité et les scripts d’administrateur sans cloner la source. Voir [déployer sans accès à GitHub](deployment-without-github.fr.md) pour le Compose copiable et `.env` fichiers, livraison d’images hors ligne, et initialisation.

<a id="_1-clone-the-repository"></a>
<a id="1-clone-the-repository"></a>

## 1. Cloner le dépôt

Cloner le répertoire principal pour obtenir le fichier Compose actuel ainsi que les scripts administrateur ensemble :

```sh
git clone --branch main --depth 1 https://github.com/workhold/doca.git
cd doca
```

<a id="_2-configure-env"></a>
<a id="2-configure-env"></a>

## 2. Configurer .env

```sh
cp docker.env.example .env
```

Pour une installation nouvelle, générez d’abord une clé maîtresse de identifiants :

```sh
openssl rand -hex 32
```

Le résultat est 32 octets aléatoires codés en 64 caractères hexadécimaux. Modifier `.env`remplaçant le domaine d’exemple par votre propre origine HTTP(S) et `DOCA_CREDENTIAL_MASTER_KEY` Avec la valeur générée :

```dotenv
DOCA_ORIGIN=https://doca.example.com
DOCA_CREDENTIAL_MASTER_KEY=7a52d29ab6db9a08292b9585d0dc5551f4156c2d02953b4262611bc1ad82f9ab
DOCA_FILE_STORE_ID=local
DOCA_FILE_STORES_JSON='{"version":1,"stores":{"local":{"provider":"local","root":"/data/storage"}}}'
```

`DOCA_CREDENTIAL_MASTER_KEY` C’est nécessaire au démarrage même sans plugins ; une valeur manquante, vide ou mal formée empêche le démarrage. Les fichiers d’exemple contiennent un exemple public, correctement formaté ; remplacez-le par votre propre clé pour une installation nouvelle. Faites une sauvegarde sécurisée et distincte, et utilisez la même valeur entre les répliques et les redémarrages. Les déploiements existants doivent conserver leur clé originale ; ne la régénérez pas pour une mise à jour. Une clé de remplacement est rejetée par la vérification du fingerprint de base de données ; le chiffrement existant n’est pas converti automatiquement. Voir [identifiants gérés](plugin-credentials.fr.md).

Utilisez uniquement l’origine, sans sous-répertoire, requête ou fragment. Le slash final de la racine est normalisé. Gardez `/data/storage` à l’intérieur du volume persistant du conteneur. `docker.env.example` c’est pour Docker ; `.env.example` est pour [développement de sources](development.fr.md).

Configurer un proxy inverse sur le même serveur. Par exemple, avec Caddy :

```caddyfile
doca.example.com {
    reverse_proxy 127.0.0.1:39120
}
```

Caddy termine le TLS et transmet le trafic HTTP et WebSocket. Le DNS doit pointer vers ce serveur, et le proxy doit être capable d’obtenir son certificat. Les autres proxies doivent être conservés. `Host` et transmettre les upgrades WebSocket en avant `/api/v1/ws`. Voir [déploiement](deployment.fr.md).

<a id="_3-pull-the-image"></a>
<a id="3-pull-the-image"></a>

## 3. Tirer l’image

```sh
docker compose pull
```

Compose utilise l’image spécifiée par `compose.yaml` Cette étape télécharge l’image prétravaillée ; elle ne construit pas le code source.

<a id="_4-start-doca"></a>
<a id="4-start-doca"></a>

## 4. Commencer Doca

```sh
docker compose up -d
docker compose ps
```

Attendez que le conteneur devienne sain. La réponse de santé est :

```json
{"status":"ok","version":"<image version>"}
```

Si le start-up échoue, inspectez-le. `docker compose logs --tail=100 doca`Le port Compose est lié `127.0.0.1`L’accès via le navigateur utilise l’origine HTTP(S) configurée via le proxy.

<a id="_5-initialize-the-administrator-password"></a>
<a id="5-initialize-the-administrator-password"></a>

## 5. Initialiser le mot de passe administrateur

Dans le même dossier que `compose.yaml`, exécuter :

```sh
bash scripts/bootstrap-admin.sh
```

Entrez le nom d’utilisateur de l’administrateur, une mot de passe d’au moins 12 caractères, et de nouveau le mot de passe. Le script actuel demande des informations en chinois ; la saisie du mot de passe est cachée. Doca ne dispose pas d’un compte ou d’un mot de passe par défaut. Le script exécute un conteneur unique en relation avec la même base de données et stocke un hash de mot de passe. Si un administrateur existe déjà, l’initialisation s’arrête sans modifier ce compte.

Ouvrir `https://doca.example.com` Et signer en. Ne mettez pas le nom d’utilisateur ou le mot de passe administrateur. `.env`Pour récupérer un compte administrateur existant, utilisez [Réinitialisation de mot de passe](deployment.fr.md#change-a-password).

<a id="next-steps"></a>

## Prochaines étapes

- Lisez [Guide utilisateur](user-guide.fr.md) Pour créer des documents et des bibliothèques.
- Revue [authentification](authentication.fr.md) Avant d’ouvrir l’enregistrement ou de configurer le SSO.
- Lire [configuration](configuration.fr.md), [stockage de fichiers](storage.fr.md), et [opérations](deployment.fr.md) avant de changer de stockage ou de faire des sauvegardes.
- Utilisez [scalage horizontal](horizontal-scaling.fr.md) Seulement lors de l’utilisation de plusieurs répliques.

SQLite, les uploads, les extensions et la base de données IA utilisent `doca_data` Volume. Conservez-le entre les redémarrages et incluez tous les bases de données, les stockages référencés et les configurations protégées dans les sauvegardes. `docker compose down -v` Supprime ce volume et ne doit pas être utilisé pour une restauration ou une mise à niveau ordinaire.
