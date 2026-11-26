<a id="docker-document-renderers"></a>

# Récupérateurs de documents Docker

[简体中文](docker-rendering.zh-CN.md)

L’image reconstruite génère des PDFs de texte riche/Markdown avec WeasyPrint 70.0 et crée des PNGs de canvas AI avec Node, Canvas natif et resvg. Il ne contient aucun runtime Chromium ou Playwright, et n’a besoin d’aucune configuration de seccomp JSON, de mémoire partagée supplémentaire du navigateur ou de configuration de domaine utilisateur du navigateur. Il faut construire la nouvelle image avant d’utiliser le fichier Compose modifié ; les images publiées précédemment ne bénéficient pas automatiquement de ce rendeur.

La lecture de PDF, le texte et les images par page, ainsi que l’importation modifiable, utilisent toujours PDF.js. LibreOffice Writer, Calc, Impress et Math conservent la conversion visuelle. `.docx`, `.xlsx` et `.pptx`Les polices CJK et Liberation restent en place. Vérifiez les formules, les diagrammes, les images intégrées, les tableaux longs et la pagination CJK à travers des exportations réelles ; un contrôle de santé ne peut pas garantir la fidélité visuelle.

Les postes en PDF utilisent l’environnement Python fixé. `DOCA_PDF_PYTHON=/opt/doca-pdf/bin/python`. Seules les ressources de données intégrées sont autorisées ; les lectures de réseau et de fichiers d’hôte sont refusées. Les images ou polices illisibles ou corrompues échouent au lieu de produire un PDF incomplet. La limite de 32 MiB d’entrée, la concurrence à deux tâches, le délai de 60 secondes et le vérification de permission après rendu restent inchangés. Les tâches Canvas conservent l’exporter SDK, les assets autorisés, la sélection/croisement, les avertissements, la file d’attente et la possibilité de annulation. Les deux rendeurs fonctionnent dans des processus temporaires qui sont arrêtés lors de l’annulation ou du délai.

`DOCA_PDF_CHROMIUM` est explicitement rejeté, sans aucun fallback pour le navigateur. Les documents existants, les bases de données, les pièces jointes, les clés et les volumes restent intacts. Les lecteurs historiques du SDK conservent leurs chemins existants sans conversion de données stockées. Le rollback restaure le code précédent, les verrous de dépendances, l’image et la configuration de déploiement, tout en préservant les écritures ultérieures. L’ancien `docker/chromium-seccomp.*` Les fichiers restent uniquement pour l’étude de l’origine et la comparaison avec l’ancien renderer ; les nouveaux bundles de déploiement les omettent.

<a id="image-size-and-update-downloads"></a>

## Taille de l’image et mises à jour des téléchargements

Supprimer le navigateur libère de l’espace, tandis que Python/Pango/resvg ajoutent des dépendances. LibreOffice, les polices, les dépendances de l’application et les ressources web restent. Comparez les couches comprimées de versions/architectures équivalentes ; l’utilisation locale multi-architecture de Docker Desktop n’est pas une estimation de téléchargement.

Les ressources web, les dépendances communes et les éditeurs conservent des couches, des chemins et des permissions distincts. Voir [vérification de couche](verification/image-web-layers-2026-10-23.md).

<a id="container-verification"></a>

## Vérification des conteneurs

```sh
DOCA_RELEASE_QA_IMAGE=your-rebuilt-image node scripts/qa-release-render-image.mjs arm64
```

Utilisez `amd64` Pour x86-64. Cet exercice implique une sortie PDF réelle, des pixels de canvas et une conversion Office dans un conteneur disposable non root, sans réseau et avec un root en lecture seule, sans documents utilisateur. La politique de sécurité par défaut de Docker est suffisante. Vérifiez séparément l'hôte de production réel ; une architecture ne garantit pas le résultat de l'autre.

<a id="optional-sam-runtime"></a>

## Exécution de temps SAM optionnelle

Les images Doca par défaut ne comprennent pas un environnement de traitement SAM2/PyTorch utilisable, le travail de segmentation ou les poids du modèle. La lecture de fichiers PDF/Office n’a pas besoin de SAM. Activer le segmentation est une installation contrôlée par l’administrateur, et non un tâche d’IA qui nécessite une téléchargement.

Utilisez une image personnalisée fiable basée sur la version Doca approuvée pour ajouter les interpréteurs et bibliothèques système nécessaires à votre runtime préconstruit. Pour un runtime Bookworm Python 3.11 CPU, le fichier Dockerfile dédié à la déploiement peut contenir :

```dockerfile
ARG DOCA_IMAGE
FROM ${DOCA_IMAGE}
USER root
RUN apt-get update \
    && apt-get install --yes --no-install-recommends python3 python3-venv libgomp1 \
    && rm -rf /var/lib/apt/lists/*
USER node
```

Construire avec un digest d’image approuvé, par exemple `docker build --build-arg DOCA_IMAGE=docker.io/smartdoca/doca@sha256:YOUR_APPROVED_DIGEST -t doca-sam-runtime:local .`Le digest est une information de sortie sélectionnée par l’administrateur ; l’exemple ne fournit pas de telle information. Préparez l’environnement Python. **à l’intérieur de cette image Linux et pour sa architecture**, en même temps `/opt/doca-segment` Chemin utilisé au moment de l'exécution. Ne copiez jamais un environnement virtuel macOS dans celui-ci. Sur Linux/amd64, le [instructions officielles pour la roue CPU](https://pytorch.org/get-started/previous-versions/#v251) Fournir PyTorch 2.5.1 et torchvision 0.20.1 ; les autres architectures nécessitent des versions disponibles vérifiées séparément, ainsi que des informations de profil correspondantes.

Le bundle de confiance doit contenir le worker de sortie exact, les dépendances installées en pin, une copie de runtime sans symlink du paquet officiel SAM2 en pin, un point de contrôle pré-provisionné, et un profil strict avec **chemins, versions et hachages de byte/tree du Linux réel**Voir le [Recette de préparation du profil Linux](ai-image-segmentation.md#linux-docker-profile) Et le contrat d’installation/ouvrier strict existant. Le administrateur du bundle doit avoir le droit d’accéder et de lire les fichiers, avec UID 1000 ; les fichiers/dossiers ne doivent pas être écrits par le groupe ou par d’autres. Les entrées de modèle ne peuvent pas choisir ou modifier ces chemins.

Créer `compose.segmentation.yaml` Avec Docker Compose 2.24.4 ou plus récent. `!reset` Empêche la construction de l’application du fichier de base de remplacer votre image de runtime de confiance construite séparément :

```yaml
services:
  doca:
    build: !reset null
    image: doca-sam-runtime:local
    pull_policy: never
    environment:
      DOCA_AI_IMAGE_SEGMENT_PROFILE: /opt/doca-segment/profile.json
    volumes:
      - type: bind
        source: /srv/doca-segment-linux
        target: /opt/doca-segment
        read_only: true
        bind:
          create_host_path: false
```

Cette monture est indépendante `/data`, documents téléchargés et pièces d’identité. Ne mettez pas les clés de modèle, l’état d’authentification QA ou les photos de famille dans le bundle de exécution. Définir la variable `.env` Seul, il ne transmet pas ce fichier de composition de base, ni ne fournit cette monture. Validez le profil installé dans un conteneur unique sans base de données d’application avant de l’activer ; une configuration mal formée entraîne un échec de démarrage, et les fichiers de exécution indisponibles ou inadaptés rendent l’outil indisponible. Utilisez toutes les modifications prévues lors de la ré création de l’application :

```sh
docker compose -f compose.yaml -f compose.segmentation.yaml config --quiet
docker compose -f compose.yaml -f compose.segmentation.yaml up -d
```

Un contrôle de temps de exécution/hash prouve l’identité de l’installation, mais ne concerne pas la qualité de la masque ou de l’image finale. Chaque candidat réel, masque et livraison nécessitent encore les vérifications visuelles actuelles ainsi que les autorisations et liens de source. Les mises à niveau de poids nécessitent un nouveau profil de temps de exécution vérifié et un redémarrage coordonné ; aucun profil ancien ou masque persistant n’est converti automatiquement.

<a id="build-privacy"></a>

## Construire la confidentialité

`.dockerignore` exclut `.cache`, `.local`, bases de données, fichiers d’environnement, tests et scripts provenant du contexte de construction de l’application. Conservez les bundles de runtime de déploiement, les points de contrôle, les artefacts de validation privés et les identifiants en dehors de ce contexte. L’exclusion ne supprime pas les fichiers locaux. Une construction d’image personnalisée SAM doit utiliser un contexte minimal distinct contenant uniquement ses fichiers de déploiement approuvés.


Le format Web comporte également des couches CAD, de polices et d’entrée indépendantes, ainsi que huit groupes de fichiers volumineux (d’au moins 512 KiB) et 16 groupes de code plus petits attribués à partir de noms de fichiers stables. Le renommé de hash de contenu Vite d’un bloc reste dans son groupe existant ; tous les chemins de déploiement, les bytes et les permissions restent inchangés. Un expérience OCI Web compilé réutilise 25 des 27 couches après une mise à jour/rename d’un bloc d’entrée, ajoutant 334 554 bytes compressés. Une reconstruction réelle de CSS Vite réutilise 13 des 27 couches et ajoute 4 489 097 bytes compressés (environ 77,2 % moins que les couches Web complètes précédentes). Ce sont des cas mesurés, et non une taille fixe pour chaque mise à jour ; les couches Web complètes ont une petite coût supplémentaire de en-tête. Voir… [preuves de la couche révisée](verification/image-web-layers-2026-10-23.md).
