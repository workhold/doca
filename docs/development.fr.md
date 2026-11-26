<a id="development-deployment-and-checks"></a>

# Développement, déploiement et vérifications

[中文](development.zh-CN.md)

<a id="plan-a-change"></a>

## Planifier un changement

Utilisez le [processus de travail SDD en étapes](sdd.fr.md) pour de nouveaux travaux et le [module index](sdd-module-index.fr.md) Pour trouver la source, les contrats actuels et les vérifications. Les modifications complètes utilisent les enregistrements du Spec Kit ; le travail standard peut utiliser un seul spec ; les modifications légères utilisent l’enregistrement PR. Les décisions de compatibilité nécessitent toujours l’accord préalable séparé dans AGENTS.md. Exécuter `pnpm sdd:check` ainsi que les vérifications pertinentes pour le changement.

<a id="start-locally"></a>

## Commencer localement

Node.js 22.12 ou plus récent, ou Node.js 24 LTS, et pnpm 11.25.0. Les versions sont verrouillées. `pnpm-lock.yaml`. Le `better-sqlite3` La construction native est autorisée. `pnpm-workspace.yaml`.

```sh
pnpm install --frozen-lockfile
cp .env.example .env
# Set the storage root in .env to an absolute writable local directory.
pnpm dev
```

Ouvrez http://127.0.0.1:39130. L’API écoute sur 39120 et le serveur de développement le proxy sur la même origine. Ouvrir directement 39120, ou utiliser `localhost` au lieu de `127.0.0.1`, ne correspond pas à la configuration.

Copier `.env.example` Avant de commencer : les variables file-store sont nécessaires. Son répertoire de stockage est `/data/storage` Pour Docker : définissez ce répertoire racine comme un dossier absolu et écritable sur votre machine avant d’exécuter le programme depuis le source. Conservez l’origine locale et le chemin vers SQLite, et ne committez jamais les secrets.

`DOCA_CREDENTIAL_MASTER_KEY` Cela est également nécessaire, y compris le développement sans plugins. Pour une base de données neuve, remplacez la valeur d'exemple publique par `openssl rand -hex 32` Sortie. Conserver la même clé lors des redémarrages et en faire une sauvegarde séparée ; une base de données existante doit conserver sa clé originale.

<a id="pdf-rendering-for-source-development"></a>

## Réception de PDF pour le développement source

L’export en texte riche et en format Markdown en PDF utilise WeasyPrint 70.0 dans un processus Python temporaire. Installer Python 3.10+ et Pango, puis les dépendances prédéfinies :

```sh
python3 -m venv .local/pdf-renderer
.local/pdf-renderer/bin/pip install -r docker/pdf-requirements.txt
export DOCA_PDF_PYTHON="$PWD/.local/pdf-renderer/bin/python"
```

Sur macOS, installez Pango avec `brew install pango`; si la découverte de bibliothèques le nécessite, le définir `DYLD_FALLBACK_LIBRARY_PATH` à `$(brew --prefix)/lib`Debian/Ubuntu exigent `python3-venv`, `libpango-1.0-0`, `libpangoft2-1.0-0` et `libharfbuzz-subset0`Le Dockerfile installe ces dépendances. `DOCA_PDF_CHROMIUM` C’est obsolète et explicitement rejeté ; supprimez-le avant le démarrage. Il n’y a pas de fallback via le navigateur.

Les images de canvas IA utilisent l'exporter SVG du SDK Canvas installé dans un DOM Node isolé, avec une mesure de texte native, suivie de la rasterisation resvg et des polices CJK intégrées. Exécuter `pnpm build:canvas-render` Après les changements de dépendances. La lecture/importation de PDF utilise toujours PDF.js ; la conversion vers Office utilise toujours LibreOffice.

`playwright-core` C’est une dépendance de développement qui nécessite uniquement l’acceptation par le navigateur. Installer son navigateur. `pnpm exec playwright-core install chromium`, ou définir `DOCA_QA_BROWSER` pour `scripts/qa-document-pdf.mts`Exécutez ce script pour l’export/import isolé et les régression visuelles ; les artefacts sont traités. `artifacts/verification/document-pdf/` (override avec) `DOCA_QA_OUTPUT` sous `artifacts/`). Aucun document utilisateur n’est ouvert. Voir [échange de fichiers](editor-file-exchange-contract.fr.md#rendered-pdf-and-editable-import).

<a id="create-the-administrator"></a>

## Créer l’administrateur

Il n’y a pas de compte par défaut. Dans le répertoire du projet :

```sh
bash scripts/bootstrap-admin-local.sh
```

Le script transmet uniquement le nom d’utilisateur et le mot de passe à cette commande. La base de données stocke un hash.

Le déploiement de conteneurs est en cours [Déployer Doca](deployment.fr.md), y compris le proxy inversé `DOCA_ORIGIN`, le premier administrateur, et réinitialisation du mot de passe.

<a id="reset-an-administrator-password"></a>

## Réinitialiser le mot de passe de l’administrateur

Si l’administrateur dispose encore d’un numéro de téléphone ou d’une adresse e-mail vérifiés, utilisez le code sur la page de connexion. Sinon, utilisez la commande de récupération locale sur l’ordinateur de déploiement. Elle ne prend en charge qu’un administrateur existant. Elle ne crée pas de nouvel administrateur et n’est pas exposée via HTTP.

```zsh
read "DOCA_RESET_ADMIN_LOGIN?Administrator login: "
read -s "DOCA_RESET_ADMIN_PASSWORD?New password (at least 12 characters): "
export DOCA_RESET_ADMIN_LOGIN DOCA_RESET_ADMIN_PASSWORD
pnpm admin:reset-password
unset DOCA_RESET_ADMIN_LOGIN DOCA_RESET_ADMIN_PASSWORD
```

L’commande vérifie que l’utilisateur est un administrateur activé, met à jour le mot de passe et annule toutes les sessions. PostgreSQL a besoin de… `DOCA_DATABASE_URL` Dans le même environnement. SQLite utilise `DOCA_SQLITE_PATH`Ne écrivez pas le secret de récupération. `.env`, historique du shell, ou l’image.

<a id="configuration"></a>

## Configuration

| Variable | Par défaut | Objectif |
| --- | --- | --- |
| DOCA_ORIGIN | http://127.0.0.1:39130 | Seule l’origine du navigateur HTTP(S) est supportée en production. |
| DOCA_HOST | 127.0.0.1 | Adresse d’attachement |
| DOCA_PORT | 39120 | API et port du serveur publié |
| DOCA_WEB_PORT | 39130 | Port web de Dev |
| DOCA_DATABASE | sqlite | sqlite ou postgres |
| DOCA_SQLITE_PATH | ./data/v1/doca.db | Le fichier de base de données actuel |
| DOCA_DATABASE_URL | aucun | URL de PostgreSQL pour la base de données configurée |
| DOCA_BOOK_BATCH_CHECKPOINTS | sur | Seulement on/off ; l’état off est en mode désactivé, ce qui empêche la restauration en batch et préserve les points de contrôle et les objets stockés. |
| NODE_ENV | effacer | La production sert à utiliser les assets existants et désactive le développement. |
| DOCA_ASSET_BASE | vide | Préfixe HTTP(S) pour les ressources construites. Vide pour les services. `/assets` localement |

<a id="static-asset-urls"></a>

## URLs des ressources statiques

La production d’HTML provient toujours de Doca, et l’API utilise la même origine. `DOCA_ASSET_BASE` seulement réécrit `/assets/...` URLs à l’intérieur de l’HTML.

Lorsqu’il n’est pas défini, le conteneur fournit du JS, du CSS et d’autres fichiers de build. `/assets`Lorsque c’est activé, ces adresses URL HTML utilisent le préfixe, par exemple `https://cdn.example.com/doca/0.1.10/assets/index-abc.js`Le préfixe est une URL HTTP(S) sans informations d’utilisateur, sans requête ou sans hash. Utilisez HTTPS pour un site public ou HTTP sur un réseau interne fiable. `/assets` reste dans le conteneur. Les polices et les images mentionnés dans le CSS avec une pathée racine reviennent toujours à Doca.

Une étiquette officielle comme `v1.2.3` Cela fait en sorte que GitHub Actions compile l’application web et crée une version publique. L’attachement est… `doca-web-assets-v1.2.3.tar.gz`. Gardez-le `assets` dossier après déballage, et configurez `DOCA_ASSET_BASE` vers un préfixe HTTP(S) qui le contient. Une étiquette de pré-lancement comme `v1.2.3-rc.1` ne crée pas une sortie. Un push à `main` Non, pas non plus. Ne utilisez pas. `github.com/.../releases/download` comme `DOCA_ASSET_BASE`Cette URL redirige et ne transmet pas de en-têtes de type cross-origin pour les modules ES. Placez l’élément décompacté. `assets` Dossier dans un CDN ou un stockage d’objets qui permet les lectures de scripts entre origines différentes.

<a id="production-process"></a>

## Processus de production

```sh
pnpm check
NODE_ENV=production DOCA_ORIGIN=https://docs.example.com pnpm start
```

`check` Gère le typecheck, les tests et la construction web. `start` Sert l’application web construite et l’API sans Vite. Remplacer le nom de l’exemple, terminer le TLS dans un proxy inversé, conserver Host et Origin, et faire le forward. `DOCA_PORT`.

Le serveur ne fait pas confiance aux valeurs arbitraires `X-Forwarded-*` En-têtes. Aucun proxy, y compris le loopback, n’est confié par défaut. Définir `DOCA_TRUST_PROXY` Seulement pour les adresses IP/CIDR réelles du proxy. Les limites de taux d’authentification utilisent l’adresse IP de la connexion, de sorte que les utilisateurs derrière un seul proxy peuvent partager une quota. Un proxy de production doit être configuré comme confiance. Ne l’activez pas. `trustProxy` pour Internet public.

<a id="ai-job-logs"></a>

## Journaux de tâches d’IA

Le conteneur de production écrit les journaux d’accès Fastify et les erreurs des tâches d’IA en arrière-plan dans le stdout :

```sh
docker compose ps
docker compose logs -f --tail=200 doca
```

Pour éviter les échecs de l’IA :

```sh
docker compose logs --since=30m doca | grep -E "AI job failed|AI 工作流|模型|图片"
```

Avec Docker seul, remplacer `doca` avec le nom du conteneur. Sur Kubernetes, lire le stdout du pod avec `kubectl logs`L’API de session de navigateur renvoie `jobs[].id`, `jobs[].status`, et `jobs[].error`Associez ce ID de poste à celui. `AI job failed`Les logs enregistrent une classe d’erreur modifiée. Ils ne affichent pas les clés du modèle ni le prompt complet.

C’est une base de développement fonctionnelle, mais pas une version terminée prête à être adoptée en production. La récupération des comptes est mise en place et nécessite des passerelles de vérification configurées pour la récupération basée sur les contacts. Le rôle de fournisseur d’OIDC reste indisponible ; la surveillance de l’infrastructure cible et l’ajustement des requêtes complexes nécessitent une acceptation distincte. Le public [service de surveillance](plugin-monitoring.fr.md) est mis en œuvre. Des adaptateurs d’OIDC externe et de connexion sociale existent. Les identifiants en temps réel sont disponibles. [authentification](authentication.fr.md)Les limites se trouvent là. [architecture](architecture.fr.md).

<a id="data-protection"></a>

## Protection des données

- Des bases de données vides sont créées à partir du cible actuelle ; les bases de données existantes supportées reçoivent des ajouts révisés au démarrage. Le chemin par défaut de SQLite est `data/v1/doca.db`.
- Les fichiers statiques ne sont que `apps/web/dist`. `.archive`, `data`, et `.env` ne sont pas publiques.
- Le startup réconcilie la structure installée avec l’objectif actuel. Si la revue ou la validation échoue, le serveur ne écoute pas et la transaction d’upgrade est annulée. Faites une sauvegarde et testez la restauration avant le déploiement en production.
- Une sauvegarde SQLite hors ligne arrête tous les écritures, puis copie l’ensemble du répertoire. Une sauvegarde en ligne utilise l’API de sauvegarde. Copier le fichier principal et ignorer les WAL ne constitue pas une sauvegarde.
- PostgreSQL utilise ses propres méthodes de sauvegarde et de restauration. La récupération en cas de catastrophe est l’affaire de l’opérateur.
- SIGINT et SIGTERM fermentent HTTP, Vite et la base de données. En production, un gestionnaire de processus est utilisé pour redémarrer.

<a id="database-changes"></a>

## Changements de base de données

Lisez et suivez [contrat d’amélioration de la base de données](database-schema-evolution.fr.md) Avant de modifier la structure de base ou les formats persistants. C’est la norme du projet en cours : les créations et mises à jour récentes utilisent la dernière DDL. `schemaEvolution` Déclare les ajouts acceptés, et les ajouts ordinaires conservent la génération compatible. Les valeurs de champ historiques et les changements sémantiques/destructeurs nécessitent un plan concret de conservation, validation et restauration accepté. [AGENTS.md](../AGENTS.md).

Les modifications du base de données nécessitent une isolation de SQLite et une régression du schéma ancien de PostgreSQL 17/18, y compris la conservation des lignes, les paramètres par défaut, le démarrage et la vérification répétés/concurents sans écritures partielles. L’acceptation de la version est également une mise à jour d’une base de données créée avec la version ancienne affectée et officiellement publiée. La matrice CI de PostgreSQL `.github/workflows/database-upgrade.yml`Cela complète l’ensemble par défaut. Mettez à jour le contrat et les notes d’amélioration pour intégrer tout changement convenu en termes de comportement ou de support.

<a id="checks"></a>

## Vérifications

Le travail de collaboration commence `skills/doca-collaboration/SKILL.md`. `AGENTS.md` les moments où cela s’applique. Le langage de l’interface est `docs/i18n.md`.

`docs/collaboration-sdk-contract.md` C’est la source du contrat. Publier la compétence permet de mettre à jour. `references/contract.md`Une API proposée dans le contrat n’est pas une export que le paquet actuel possède déjà. Après une mise à jour du paquet, installez le nouveau artefact, vérifiez les exports et le schéma, et assurez-vous que l’acceptation de sauvegarde est confirmée. Reconnectez-vous, récupérez les données existantes et les sélections en temps réel. Changer le numéro de version ne suffit pas.

```sh
pnpm typecheck
pnpm test
pnpm build
```

`tests/cloud.test.ts` Il utilise une base de données SQLite temporaire et des comptes temporaires, puis supprime ce dossier. Il ne touche pas à la base de données des utilisateurs réels.

La couverture inclut l’isolation privée, y compris les administrateurs, la lecture publique, l’héritage et les ancêtres cachés, les conflits de version, le transfert de propriété, les cycles de arbre, le réinitialisation des subventions lors du déplacement, la restauration par lot, la copie indépendante, les permissions de commentaire, les réactions idempotentes, l’isolation des notifications, l’hôte et l’origine, l’enregistrement et l’inactivation, l’annulation de session, la persistance du redémarrage, ainsi que les routes OpenAPI.

Le login, l’accueil, l’ouverture d’un document via la recherche, la consultation des archives et les statistiques administratives ont été vérifiés dans un navigateur local. Les navigateurs spécifiques aux cas et les vérifications isolées de PostgreSQL 17/18 sont enregistrées. [registres de vérification](verification/README.md)Une couverture complète par le navigateur, une infrastructure cible PostgreSQL, l’accessibilité au clavier, les limites de taux de proxy, la charge et l’acceptation des opérations longues sont encore nécessaires. Le passage à SQLite ne les remplace pas.
