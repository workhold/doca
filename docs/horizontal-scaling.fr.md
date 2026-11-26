<a id="single-instance-and-horizontal-scaling"></a>

# Instance unique et scaling horizontal

[中文](horizontal-scaling.zh-CN.md)

Doca utilise un mode à instance unique sans infrastructure supplémentaire. SQLite, un dossier de téléchargement local et un bus en temps réel en cours d’exécution permettent de gérer une personne, une petite équipe ou une expérience pilote. Configurez PostgreSQL, le stockage de objets partagés et Redis uniquement lorsqu’il y a plus d’une réplique d’application en cours d’exécution. Les deux modes utilisent le même protocole de travail. Il n’y a pas de transfert de données intégré entre SQLite et PostgreSQL, ni de mécanisme de double écriture. Les mises à jour de base de données supportées suivent… [contrat d’amélioration de la base de données](database-schema-evolution.fr.md).

<a id="capability-matrix"></a>

## Matrice de capacité

| Capacité | Instance unique | De multiples répliques |
| --- | --- | --- |
| Base de données | SQLite ou PostgreSQL | PostgreSQL ; chaque réplique utilise le même base de données |
| Document collaboration et notifications | Diffusion et présence en cours d’exécution | Redis Pub/Sub et Redis presence |
| Login, téléchargement, et limites de taux pour les bots publics | Comptesurs en cours de processus | Comptes Redis |
| Fichiers | Dossier persistant local | Stockage compatible avec S3, ou un système de fichiers véritablement partagé par chaque réplique |
| CDN | Optionnel | Optionnel. Il ne fait que accélérer les lectures et ne remplace pas le stockage partagé. |
| Tâches en arrière-plan | Location de bases de données | Les mêmes contrats de location ; toute copie peut prétendre à un poste, et une échec peut être réessayé |
| Push mobile | Fichier de sortie de base de données | Même format de sortie et de location ; ne maintenez pas la file d’attente que dans un seul processus |
| Schéma | Le premier démarrage crée la ligne de base actuelle | Un exemple crée la ligne de base vide avant le premier déploiement |
| Santé | `/live` et `/ready` | `/ready` Vérifie également la base de données et Redis |

<a id="single-instance"></a>

## Instance unique

Quand `DOCA_REDIS_URL` Il n’est pas défini ; les événements en temps réel, la présence et les limites de taux restent dans le processus. Redis n’est pas nécessaire. `pnpm dev`, `pnpm start`Et un seul conteneur Compose crée la base de données actuelle sur une base de données vide, puis s’assure que les structures existantes supportées correspondent au DDL actuel.

Ne lancez pas deux répliques dans ce mode. Les WebSockets “sticky” sur un load balancer masquent le problème pendant un certain temps. Les notifications, la révocation des permissions, les utilisateurs en ligne et les limites globales restent cependant divisés.

<a id="minimum-multi-replica-configuration"></a>

## Configuration minimale multi-réplicas

Chaque réplique nécessite les mêmes paramètres :

```dotenv
DOCA_DATABASE=postgres
DOCA_DATABASE_URL=postgresql://user:password@postgres:5432/doca
DOCA_DATABASE_POOL_MAX=10
DOCA_REDIS_URL=redis://redis:6379
DOCA_REDIS_PREFIX=doca-production
DOCA_TRUST_PROXY=10.0.0.10/32
```

L’orchestrateur peut définir `DOCA_INSTANCE_ID` Au nom du pod ou du conteneur. Sinon, chaque processus génère un identifiant aléatoire. `DOCA_REDIS_PREFIX` Il faut séparer les environnements qui partagent un Redis. `DOCA_TRUST_PROXY` Liste uniquement les adresses proxy inversées ou les CIDR. Un éventail plus large permet aux clients de fabriquer des adresses IP et de contourner les limites d’audit et les limites de taux de trafic.

Ordre de libération :

1. Commencez à créer une instance en utilisant une base de données vide, afin qu’elle établisse la base de données de référence. Ne permettez pas à plusieurs répliques de initialiser une base de données vide en même temps.
2. Démarrer les autres répliques avec la même version et configuration. Les modifications structurelles approuvées sont réconciliées sous le verrou du schéma ; les différences non supportées ou nécessitant une revue arrêtent le démarrage sans écritures partielles.
3. Le load balancer utilise `/ready` pour le trafic et `/live` Pour la santé du processus. Les mises à jour WebSocket et un débit normal doivent être autorisés.
4. Préparer le drainage et permettre la fermeture des connexions HTTP/WebSocket pendant la période de grâce de arrêt. Respecter les exigences de sortie pour l'ordre de arrêt/start ; une déploiement progressif ne garantit pas la compatibilité entre les différentes versions d'hôte.

Une fois Redis configuré, il est indispensable. Une connexion qui échoue lors de la démarrage, une panne ultérieure ou un test de prêt qui échoue ne se rétablit pas silencieusement vers le bus local. Cela évite que le cluster ne soit divisé en plusieurs instances indépendantes qui semblent toujours en bon état.

<a id="consistency"></a>

## Consistance

Une mise à jour de collaboration est stockée dans une transaction PostgreSQL et confirmée, puis Redis en informe les autres répliques. Redis n’est pas le journal des documents. Les événements dupliqués sont supprimés par le protocole. Une perte temporaire est réparée depuis la base de données après reconnexion. La présence expire, donc une instance crashée disparaît.

Recognition de fichiers, extraction de texte, workflows de gestion de connaissances et de livres, et utilisation de services mobiles – tout cela repose sur des tâches et des locations de base de données. Une clé d’occurrence garantit que plusieurs répliques qui scannent ensemble ne créent qu’une seule occurrence commerciale. Les handlers doivent être idempotent, car une autre réplique peut réessayer après l’expiration d’une location.

<a id="capacity"></a>

## Capacité

- Le nombre total de connexions à la base de données est d’environ réplicas × `DOCA_DATABASE_POOL_MAX`Restez en dessous du limite de PostgreSQL ou de pooler, et laissez de la place pour les opérations et les tâches en arrière-plan.
- Le disque local ne peut pas stocker les uploads pour plusieurs hôtes. Un CDN ne stocke que les lectures. Les objets restent dans S3 ou sur un système de fichiers partagé. Le stockage est nommé en fonction d’un nom existant. `storage_profile` doit rester disponible.
- Meilisearch, S3 et les passerelles de messagerie doivent montrer à chaque réplique la même configuration et les mêmes données. Les identifiants sont stockés dans la base de données partagée. L’accès réseau, les listes d’autorisation et les clés restent la responsabilité du déploiement.
- La base de données partagée enregistre les versions souhaitées des extensions et renvoie des fichiers ZIP immuables dans le stockage partagé. Chaque réplique a besoin de son propre dossier d’installation/cache écrit (`DOCA_PLUGINS_DIR`); le startup valide et restaure le système à partir de l’archive. Les opérations deviennent effectives après un redémarrage manuel de chaque réplique. Assurez que les versions en cours d’exécution soient cohérentes ; voir [déploiement de plugin](plugin-deployment.fr.md).
- Redis devrait utiliser l’authentification, TLS ou un réseau privé, une limite de mémoire, et des alertes. La base de données et le stockage d’objets nécessitent encore leurs propres sauvegardes. En perdant Redis, il ne faut pas perdre le texte du document, mais cela entraîne l’arrêt de la livraison en temps réel, de la présence et des limites globales.
- `/ready` Seulement prouve que cette réplique peut atteindre la base de données et le cluster en temps réel. Elle ne remplace pas les vérifications end-to-end concernant la collaboration, le stockage d’objets, la recherche et les messages.

<a id="still-needs-an-external-rehearsal"></a>

## Il faut encore un répétition externe.

Le code couvre les mises à jour des documents, les curseurs, la présence, les limites partagées, ainsi que les locations de bases de données ou les outboxes entre deux instances d’application. Avant la mise en production, préparez les tests pour PostgreSQL, Redis géré, S3, le débordement de WebSocket et les mises à jour en continu sur l’infrastructure cible. Introduisez des échecs : pausez Redis, éteignez la réplique exécutant une tâche, retirez l’accès pendant une modification, présentez une base de données incomplète, et épuisent le stockage d’objets.
