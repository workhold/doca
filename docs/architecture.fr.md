<a id="architecture-and-implementation-boundaries"></a>

# Limites de l’architecture et d’la mise en œuvre

[中文](architecture.zh-CN.md)

Baseline : hôte 0.2.23 / SDK 0.1.11, la documentation a été vérifiée par rapport à la source le 28 octobre 2026. Cela décrit l'assemblage et les limites mis en œuvre ; les services spécifiques au déploiement et le comportement du dispositif nécessitent une acceptation distincte. Commencer par [capacités et limites](features.fr.md).

<a id="application-and-modules"></a>

## Application et modules

Doca est un monolithe modulaire TypeScript. Le développement utilise React/Vite et Fastify sur des ports distincts derrière une même origine de navigateur. En production, l’application web et l’API construites sont servies via Fastify. Cordis gère les services en cours d’exécution et le cycle de vie ; le SDK public définit les limites des extensions.

```text
Browser: React + five document editors
  │ same-origin HTTP / WebSocket; host-authenticated sessions
Fastify: Host/Origin validation, routes, security, static files
  │
Host composition: accounts, documents, files, search, AI, knowledge
  │ trusted business plugins discovered in the installation directory
Core domain rules / Kysely database access
  │
SQLite single instance, or shared PostgreSQL + Redis + file backend
```

L'hôte par défaut contient texte enrichi, Markdown, feuilles de calcul, canevas, permissions de document, découverte, fichiers, abonnements source et livres de connaissances, authentification, examen de registration, audit de sécurité et faits de utilisation de l'IA brute. Notes rapides, messagerie, calendrier, adhésion, facturation, quotas professionnels et modération sont des questions commerciales indépendantes ; aucun tel fournisseur n'est installé par défaut. Modèles/materiels/éléments exposent des interfaces sans fournisseurs par défaut.

<a id="directories"></a>

## Directories

| Chemin | Responsabilité |
| --- | --- |
| `apps/server/src/main.ts` | Start-up, écoute, arrêt |
| `apps/server/src/bootstrap/config.ts` | Origine, base de données, proxy, configuration Redis |
| `apps/server/src/app/create-app.ts` | Routes HTTP, frontières de session et de sécurité |
| `apps/server/src/plugins/composition.ts` | Services intégrés et assemblage de plugins installés |
| `apps/server/src/routes` | Héberger des endpoints HTTP |
| `apps/server/src/services` | Realtime, recherche, IA et autres services d'application |
| `apps/web/src/app/app.tsx` | Routage du espace de travail et assemblage des fonctionnalités |
| `apps/web/src/features/documents/document-editor.tsx` | Envoi aux cinq paquets d'éditeur installés |
| `packages/core/src` | Règles de domaine, autorisation et transactions |
| `packages/db/src/create-schema.ts` | DDL cible actuelle pour la création fresh et la réconciliation des startups |
| `packages/plugin-sdk` | Interfaces serveur publique/Web/extension |
| `tests` | Unit isolée et vérifications d’intégration |

Le code web utilise des DTO HTTP plutôt que d’importer les données de la base de données ou les informations de mot de passe. Les plugins métier utilisent les services SDK publiés et ne importent jamais la source hôte ni ne créent de ponts de exécution globaux. Voir [architecture de plugin](plugin-architecture.fr.md) et [inventaire de mise en œuvre](plugin-sdk-contract.fr.md).

<a id="identity-and-security"></a>

## Identité et sécurité

Un déploiement comporte un système d’accès unique, sans tables d’organisation, de espace ou de locataire. L’inscription et les fournisseurs externes sont initialement désactivés ; aucun administrateur par défaut n’existe. Les mots de passe utilisent scrypt et sels aléatoires ; la base de données stocke les digests de session. Les sessions navigateur, QR-login et WebView ont une durée par défaut de 24 heures ; les sessions mobiles sans propriétaire ont une durée par défaut de 180 jours. Les deux durées peuvent être configurées. [paramètres de session](configuration.fr.md#login-lifetime)Les changements de mot de passe et l’inactivation des comptes annulent les sessions.

Chaque demande vérifie l’Host configuré. Les mutations vérifient également l’Origin de même origine. Les cookies du site sont HttpOnly, avec SameSite=Strict et Secure via HTTPS. Les adaptateurs d’authentification supportent les OIDC externes et les fournisseurs sociaux ; la vérification et la restauration sont implémentées, avec la nécessité de disposer de passerelles de vérification. L’approbation de la registration dispose d’un processus de revue dédié. Comme fournisseur d’OIDC, Doca ne propose pas SAML ni un logout couvrant tout le IdP. Voir [authentification](authentication.fr.md).

L’administration ne permet pas l’accès aux contenus privés. L’absence d’accès de lecture entraîne généralement une réponse 404 ; un lecteur autorisé qui ne prend aucune action reçoit une réponse 403. Les ACL, les autorisations héritées, les publications, les collections et le partage ont des règles distinctes. Les ancêtres cachés ne sont pas révélés. Voir [autorisations](permission-inheritance.fr.md) et [découverte](public-resource-discovery.fr.md).

<a id="persistence-and-collaboration"></a>

## Persistance et collaboration

Les métadonnées du document utilisent HTTP et vérifications de version. Les cinq formats d'éditeur utilisent un cycle de vie WebSocket unique avec des codecs Yjs spécifiques au format. Le serveur valide le contenu, vérifie à nouveau l'autorisation et valide avant d'accepter ; la version des métadonnées, la séquence du contenu, l'epoch, le schéma et les identifiants d'historique sont distincts. L'historique est disponible pour tous les formats, mais la restauration ne prend actuellement en charge que texte enrichi et Markdown. Voir [collaboration](collaboration.fr.md) et [histoire des documents](document-experience.fr.md).

SQLite, l’IA et les fichiers locaux s’intègrent dans une seule instance. PostgreSQL utilise une base de données Webhook distincte et un schéma d’IA. Plusieurs répliques nécessitent une base de données partagée, un backend de fichiers et Redis pour les événements, la présence et les limites. Sans Redis, ces implémentations sont locales au processus. Les échecs de Redis configurés ne se transforment pas silencieusement en fallback. Les tâches de base de données utilisent les leases/outboxes, et non seulement la mémoire du processus. Voir [configuration](configuration.fr.md) et [scalage horizontal](horizontal-scaling.fr.md).

Les objets conservent des IDs de stockage stables et des références d’objet. La configuration de l’environnement sélectionne les magasins physiques ; la page d’administration du stockage est en lecture seule. Les téléchargements privés vérifient à nouveau l’accès. Un CDN fournit des URLs autorisées expirées et ne remplace jamais le stockage. Les sauvegardes incluent tous les bases de données, le serveur de référence, l’archive de plugin et la configuration protégée. Voir [stockage de fichiers](storage.fr.md).

Les extensions installées utilisent des enregistrements de registre partagés et des archives immuables, ainsi qu’un cache écritable par instance restauré au démarrage. Un redémarrage manuel active les versions souhaitées. Un SQL privé géré, des objets et des identifiants sont implémentés ; la décharge de tâches, les espaces de travail temporaires et une isolation plus forte du processus restent des lacunes. La validation de la version exacte rejette les bases ou structures non supportées ; aucun adaptateur de migration ou de compatibilité n’est ajouté ici. Les données existantes doivent être conservées. Voir [exigences de libération](releases/0.2.23.md) et le [contrat d’amélioration de la base de données](database-schema-evolution.fr.md).

<a id="current-limits-and-acceptance"></a>

## Limites actuelles et acceptation

Les threads de commentaires et les notifications disposent de endpoints paginés dédiés ; les détails des documents ne constituent pas une export complète des commentaires. Des répliques locales persistantes et des boîtes de réception sont implémentées ; un shell d’application hors ligne complet n’est pas disponible. L’intégration native avec les appareils, les fournisseurs d’identité/IA en temps réel, les services S3/CDN de production et le redondance de l’infrastructure cible nécessitent une acceptation séparée. Les tests automatisés isolés démontrent leur portée prévue ; une build ne prouve pas que tous les services externes fonctionnent correctement.
