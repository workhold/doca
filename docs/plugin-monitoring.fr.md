<a id="monitoring-and-telemetry"></a>

# Surveillance et télémétrie

[简体中文](plugin-monitoring.zh-CN.md)

Mise en œuvre dans la source du SDK **0.1.11**. Importation `monitoringServiceToken` (`monitoring.v1`), `telemetryServiceToken` (`telemetry.v1`) et leurs types de `@smartdoca/plugin-sdk/monitoring`La vérification du SDK 0.1.11 npm est consignée dans la section de publication ci-dessous ; le déploiement en production reste distinct.

<a id="installation-and-access"></a>

## Installation et accès

Indiquer chaque service que vous utilisez `injections.required` et une gamme de SDK commençant à 0.1.11, par exemple `sdkRange: "^0.1.11"`Un service manquant ou une version ancienne de l’SDK échoue explicitement. Les nouveaux services ne disposent pas d’un adaptateur pour anciens hôtes. Les méthodes existantes… `events.v1`La structure de la base de données et les formats stockés conservent leur comportement précédent.

Les plugins serveur installés sont du code fiable, installés par un administrateur. Une injection de surveillance obligatoire permet au plugin serveur d'accéder aux informations opérationnelles du site pour la collecte en arrière-plan. L'injection ne donne pas à un utilisateur ordinaire accès à ces données. Les plugins doivent autoriser leurs propres routes, tâches et outils d'IA ; ils ne doivent jamais envoyer des logs globaux ou des données d'audit aux utilisateurs ordinaires ou aux prompts de modèle de manière automatique.

Injecter le monitoring pendant l'installation pour activer l'accès Web du plugin. `host.platform.monitoring` appelle la même méthode fixe définie `/api/v1/plugin-platform/<pluginId>/monitoring.<method>`Le hôte vérifie le champ de surveillance en temps réel et révise l’état de l’administrateur actif de l’accord de chaque appel navigateur. Une installation inexistante ou inactive est rejetée par le portail de plateforme existant. Aucun point d’accès de distribution de service générique ou de écriture de télémétrie via navigateur n’est fourni. La suppression annule le champ de surveillance ainsi que les services conservés. Les écritures de télémétrie sont liées à l’ID de l’installation.

```ts
import { definePlugin } from "@smartdoca/plugin-sdk";
import { monitoringServiceToken, telemetryServiceToken } from "@smartdoca/plugin-sdk/monitoring";
import { httpServiceToken } from "@smartdoca/plugin-sdk/platform";
import manifest from "../manifest.json" with { type: "json" };

export default () => definePlugin({
  manifest, // sdkRange: "^0.1.11"; package.json also declares doca.storage: "host"
  injections: { required: [monitoringServiceToken, telemetryServiceToken, httpServiceToken] },
  async uninstall() {},
  async mount(context) {
    const monitoring = context.inject(monitoringServiceToken);
    const telemetry = context.inject(telemetryServiceToken);
    telemetry.log(manifest.id, { level: "info", module: manifest.id, message: "Collector started" });
    await context.inject(httpServiceToken).register(manifest.id, [{
      method: "GET", path: "/metrics", admin: true,
      handle: request => monitoring.metrics({ scope: "cluster", windowSeconds: 60 }, { signal: request.signal }),
    }]);
  },
});
```

Le bundle Web peut lire `await host.platform.monitoring.stats({})` ou `await host.platform.monitoring.logs({cursor})`Il reçoit des DTOs tapés, y compris les informations sur la couverture et les lacunes. Les options de appel du SDK acceptent un AbortSignal ; les requêtes vérifient la annulation avant et après l’I/O, sans garantir l’annulation d’une requête de base de données déjà soumise.

<a id="read-methods"></a>

## Méthodes de lecture

| Méthode | Faits et limites |
| --- | --- |
| `stats({})` | Nombre de bases de données partagées : documents non supprimés, bibliothèques et fichiers ; comptes tous/actifs ; bytes de fichiers logiques ; objets de stockage de fichiers enregistrés et leurs bytes. Les bytes de fichiers logiques peuvent compter les références au même objet. Les bytes des objets enregistrés représentent un inventaire, et non la capacité du système de fichiers/bucket ; les objets privés de plugin, les archives de sortie et les objets non enregistrés ne font pas partie de ce total. |
| `online({offset?,limit?})` | Des connexions en temps réel fraîches ; les personnes sont dédupliquées en fonction de l’ID utilisateur, du nombre de connexions, du nombre de documents actifs et d’une page d’ID utilisateur/document ID. Par défaut, 100, maximum 200. Le champ de référence est l’instance pour la présence locale et le cluster pour Redis. On ne consulte jamais l’ancienne alternative de heartbeat ; les échecs en temps réel sont inaccessibles. |
| `metrics({scope?,windowSeconds?})` | HTTP a terminé les requêtes, 4xx, 5xx, requêtes annulées, requêtes en cours, QPS, histogrammes de taux et de durée des erreurs 5xx ; groupes de modèle de routage et séries de métriques de plugin. Durée par défaut de 60 secondes, supportée de 1 à 300. Groupe de champ par défaut ; sans Redis configuré, le champ réel retourné est l’instance. |
| `logs({scope?,cursor?,limit?,level?,pluginId?,module?,requestId?,since?})` | Fichiers de logs opérationnels structurés avec tamponnement. Conserver la séquence de chaque époque et fusionner les têtes d’instances par temps ; le rétroaction du chrono ne dépasse jamais les entrées non traitées. Par défaut 100, maximum 200. Les filtres sont précis, le niveau n’est pas un seuil minimum. Cursor maximum 64 KiB. Sauvegarder toujours le curseur retourné, même sur des pages vides. |
| `audit({source,...})` | Audit de sécurité ou de ressources durable existant. Obligatoire `source: "security" \| "resource"`; action/actorId exact optionnel et userId/resourceId spécifique à la source, dates de début et de fin en ISO, curseur et limite. Les filtres non applicables à la source échouent. Les détails de sécurité sont masqués ; les détails illisibles/non objectifs sont `null` avec `detailsValid:false`Aucun record n’est réécrit. |
| `jobs({})` | Groupes de statut de base de données partagée, locations AI/projection expirées, et objets privés en attente de suppression. Les types de projection comprennent les tâches qui utilisent déjà cette file d’attente. Cela ne garantit pas que tous les plugins métier utilisent une file d’attente hôte. |
| `jobErrors({source,limit?})` | Derniers erreurs liées à l’IA/préparation des fichiers ; pas de prompts, de données ou de résultats. C’est un exemple de diagnostic récent, et non un archive complète des erreurs paginées. `nextCursor` est toujours nul. Les enregistrements de projection n’ont pas de timestamp fiable pour l’actualisation des erreurs, donc `updatedAt` est nul et l’ordre utilise available_at. |
| `aiUsage({...})` | Pages de snapshote du ledger partagé, identifiants exacts userId/modelId/state, dates ISO de début et de fin. IDs de appel/job/model, état, tokens évalués et métriques numériques du fournisseur original. L’utilisation inconnue est null ; aucune estimation n’est possible à partir des anciennes colonnes numériques SQL. Les entrées confirmées qui ne correspondent pas à la représentation actuelle sont `usageStatus:"invalid"`, conservés inchangés. Les secrets, les réponses brutes des fournisseurs et les snapshots du modèle sont omis. |
| `health({scope?})` | Version, instances, process RSS/heap/cumulative CPU/event-loop P95, probe de lecture de base de données et préparation en temps réel/cache. Les probes de stockage/recherche/AI réseau sont explicitement… `not-probed`Une lecture de santé ne convoque pas un modèle payant ni ne écrit un objet de test de stockage. |

L’audit et la pagination d’utilisation sont par défaut à 100 et permettent 200 enregistrements. Le curseur définit une limite horaire supérieure, inclut l’empreinte de requête, et ordonne par created_at puis par ID ; les curseurs mal formés ou incomplètes échouent. Ces lectures sont des inventaires, et non des flux de changements. Pour une consommation de settlement IA durable, utilisez les données existantes. `events.v1` / `ai.usage.recorded`Une appelée antérieurement en attente peut être résolue après que la page de création a été lue. Toutes les interfaces d’audit et d’utilisation originales restent disponibles avec leur comportement d’origine.

<a id="request-metrics-and-custom-metrics"></a>

## Métriques de demande et métriques personnalisées

Les métriques HTTP comptent toutes les routes HTTP normales, y compris les requêtes d’administrateur, de plateforme ou de santé. Les échanges WebSocket sont exclus ; pour leurs connexions, on utilise la présence en temps réel. Les aborts sont comptés séparément des réponses complétées. Le taux d’erreurs est calculé comme 5xx/réponses complétées, et est nul pour une fenêtre vide. Le QPS additionne les taux de requêtes d’instance sur la fenêtre réelle couverte, avec une limite fixée au moment de l’initialisation. Les rapports de snapshots indiquent le temps de sampling et le moment de l’initialisation, afin que les utilisateurs puissent évaluer le retard de sampling.

Les durées utilisent des buckets exclusifs en millisecondes à 1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000 et illimités. P50/P95/P99 sont des estimations de limites supérieures des buckets, limitées à la valeur maximale observée ; les percentiles de cluster combinent les comptes de buckets plutôt que les percentiles d’instances moyennes. La distribution vide a des min/max/percentiles nuls. Les labels de routage utilisent des modèles de routage enregistrés, sans jamais utiliser des chaînes de requête ou des URLs dynamiques des ressources. Les 64 premiers groupes de routage/méthode sont conservés pour chaque époque de processus ; les groupes supplémentaires partagent… `[other-routes]`.

```ts
telemetry.record(manifest.id, {
  name: manifest.id + ".sync.completed", kind: "counter", value: 1,
  labels: { source: "mail" },
});
telemetry.record(manifest.id, {
  name: manifest.id + ".sync.duration_ms", kind: "histogram", value: 120,
});
```

Les noms de métrique commencent par l’ID du plugin qui les gère et un point. Les types sont : compteur (incréments non négatifs), indicateur (valeur finie la plus récente) et histogramme (observations non négatives, utilisant les mêmes buckets numériques). Les modifications des types et des clés de label sous un même nom échouent avec 409. Jusqu’à six labels, 100 caractères/valeur, 200 séries/plugin et 1 000 séries personnalisées/instance ; les nouvelles séries excessives échouent avec 429 et l’incrément est rejeté. Les labels similaires à des secrets et les débordements numériques échouent. Utilisez des catégories limitées plutôt que les IDs utilisateur/requête/document. Les séries personnalisées sont renvoyées par instance/époque ; le réinitialisation du compteur et l’agrégation de l’indicateur restent des décisions explicites du consommateur. Leurs valeurs sont cumulatives depuis le début/la plus récente, indépendantes de la fenêtre de roulement HTTP. Les auteurs de plugins peuvent exposer leurs propres faits de dépendance/job via des métriques personnalisées.

<a id="logs-retention-and-cluster-coverage"></a>

## Journaux, conservation et couverture du cluster

Les logs du hôte incluent les logs structurés de l’application Fastify lorsque le logging du hôte est activé, ainsi que les erreurs HTTP, les aborts et les requêtes qui durent au moins deux secondes, indépendamment du logging de stdout. Les lignes de requêtes réussies ordinaires sont représentées par des métriques. Les logs du plugin contiennent un pluginId lié au hôte, une epoch, un instanceId, une séquence, une heure de création et un requestId optionnel. Les clés sensibles, les corps de requête, les prompts, les payloads, les snapshots de modèle et les stacks d’erreurs sont supprimés ou redactés ; les URL userinfo/query/hash et les chaînes de credences communes sont effacées. Le logging de texte secret arbitraire ne peut être rendu sécurisé par la correspondance de motifs : les auteurs ne doivent jamais placer de secrets ou de corps de documents dans message/module/requestId/fields.

Chaque instance conserve au maximum 2 000 enregistrements et 2 MiB de données de journal sérialisées. Le comptage par byte augmente le marqueur de séquence et le nombre de données supprimées. Un curseur sauvegardé derrière ce marqueur indique une distance explicite de suppression, y compris le nombre de données perdues. Les instances ont une nouvelle époque lors du redémarrage, même si l’instanceId est réutilisé. Une époque précédente manquante indique une distance d’inaccessibilité de l’instance ; les représentations de cache invalides sont marquées comme indisponibles, conservées jusqu’à échéance, et ne sont jamais adaptées ou renvoyées comme contenu.

Avec Redis configuré, les hôtes publient des snapshots de version 1 toutes les cinq secondes dans un espace distinct `monitoring:v1` Espace de noms clé. Les instances ou snapshots anciens de plus de 15 secondes sont obsolètes et exclues des totales de métriques actuelles, tandis que les logs conservés peuvent encore être supprimés. Les snapshots et les enregistrements des instances connues expirent après une heure ; les instances obsolètes, manquantes ou corrompues… `complete:false`Un cluster read met à jour l’instance répondante et lit les autres snapshots. Jusqu’à 128 époques conservées et 16 MiB/snapshot ; des inventaires plus importants échouent explicitement. Les erreurs de Redis ne réduisent pas la demande de cluster configuré à des données locales. Le domaine local reste une option de diagnostic explicite. Ce cache est éphémère et ne garantit pas une livraison durable ou la découverte d’une flotte de versions mixtes : les hôtes sans le nouveau publieur ne font pas partie de son inventaire.

Le suivi des plugins stocke des agrégats historiques, des enregistrements de logs, des curseurs, des marqueurs de lacunes et l’état des alertes via un stockage géré par l’hôte. Les logs sont dédupliqués par identifiant, les enregistrements sont commis avec leur curseur dans une seule transaction plugin, et les lacunes sont reconnues/rapportées comme telles. Le sampling ne reconstitue pas une fenêtre de requête perdue. L’hôte conserve les audits de sécurité et les faits originaux d’utilisation de l’IA ; les plugins ne peuvent pas les supprimer via ce SDK.

<a id="upgrade-rollback-and-verification"></a>

## Mise à niveau, retour en arrière et vérification

Cette mise à jour ne modifie aucune table de base de données hôte, aucune base de données de référence, aucun format d’audit, aucun format de livrable IA ou la structure de données des plugins existants. Les alternatives online-heartbeat et AI historiques restent attachées à leurs chemins originaux. Les nouveaux faits de exécution commencent à l’initialisation du processus mis à jour ; les données historiques de stdout ne sont pas importées. Les nouveaux plugins nécessitent le SDK 0.1.11 et échouent sur les hôtes anciens. Un rollback du code préserve les données persistantes existantes et les enregistrements historiques des plugins ; désactiver les plugins nécessitant de nouveaux services avant de démarrer un hôte ancien. La cache de surveillance peut expirer sans affecter les données officielles.

Les tests utilisent des bases de données/documents isolées et un espace de noms Redis unique. L’acceptation couvre la fusion de requêtes/histogrammes, la déduplication des utilisateurs, les filtres/pagines/corps de curseur, la suppression des secrets, le refus pour les utilisateurs ordinaires et les administrateurs révoqués, l’application de règles de nom de space/version/cycle de vie, les caches obsolètes/manquantes/invalides et les époques de redémarrage, ainsi que la construction du SDK et un consommateur indépendant de JavaScript/declarations. La publication sur npm, un plugin de surveillance de production et le déploiement de production sont des livraisons distinctes.

<a id="sdk-publication--2026-10-13"></a>

## Publication du SDK — 2026-10-13

`@smartdoca/plugin-sdk@0.1.11` Il est publié sur npm. Le consommateur de dépendances du registre importe tous les 16 points d’entrée publics et vérifie les tokens de surveillance/telemetry ainsi que la version exacte du SDK. Cela ne constitue pas un plugin de surveillance de production ni une acceptation sur appareil natif.
