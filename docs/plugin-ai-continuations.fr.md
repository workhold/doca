<a id="background-task-continuation"></a>

# Continuation de la tâche en arrière-plan

Source actuelle du SDK **0.2.0**, capacité du serveur `ai.continuations.v2`, exporté depuis `@smartdoca/plugin-sdk/ai`. La publication et le déploiement npm ne sont pas implicites. Cela est commun à tous les plugins serveur installés ; les livres de connaissances utilisent le même mécanisme d’hébergement.

Proclamer `aiContinuationsServiceToken` comme une injection obligatoire `sdkRange: "^0.2.0"`Un hôte sans cette capacité rejette l’initialisation. Il n’y a pas d’adaptateur via les versions retirées des services IA ou de l’enregistrement automatique des tâches commerciales historiques.

Les contextes d'outils MCP n'ont pas `sessionId`; utiliser `jobId` pour la corrélation des tâches. Leurs `wait` Les appels peuvent retourner des snapshots autorisés, mais ne déclenchent pas de chat interne ou de continuation de modèle. Le client externe reste responsable des appels ultérieurs.

Les plugins possèdent des emplois professionnels, une autorisation actuelle, des résultats durables, des identifiants de fonctionnement stables et une livraison de notifications/outbox. Conserver ces informations via un stockage géré par l'hôte public. L'hôte possède l'identité assistante, les tickets de réservation persistant, les annulations, la continuité du modèle et les limites techniques. Un réveil ne autorise aucune action professionnelle ni ne valide aucune tâche humaine.

1. Enregistrer une source pendant le montage. Celle-ci `id` doit commencer par `<pluginId>.` et son `pluginId` Doit correspondre à l’identité d’installation. Le registre est supprimé automatiquement lors de la vente.
2. `read(context, {operationId})` Vérifie à nouveau les autorisations commerciales actuelles et renvoie une capture d’image de version 1, ou null pour les travaux refusés/inaccessibles. Il reçoit l’identité du hôte lue récemment et un signal d’abort ; ne renvoie aucun secret. L’ID de l’opération identifie un travail durable, et non un principal fourni par l’utilisateur.
3. Dans une outil IA enregistrée en cours d'exécution, appeler `wait(pluginId, context, {sourceId, operationId})` Avec le contexte exact fourni par l’hôte. Les contextes copiés, falsifiés ou conservés sont rejetés. Commencez le travail commercial de manière idempotente avant d’attendre. L’outil renvoie la facture.
4. Enregistrer le résultat avant d'appeler `wake(pluginId, {sourceId, operationId})`. Les notifications répétées ne permettent de récupérer qu’un seul point de contrôle stocké. Une notification avant le stationnement est sûre : la réconciliation périodique et la restauration du démarrage lisent à nouveau la source durable.

Un aperçu a `version: 1`, `state`, `revision`, `summary` et JSON optionnel `result`Les États `running`, `waiting_input`, `completed`, `failed`, `cancelled`. Changer `revision` Lorsque le résultat applicable ou la décision humaine change. Les battements de cœur ne réveillent pas le modèle. Une transition vers une entrée humaine le réveille une fois ; l’assistant peut expliquer la tâche en attente et continue d’attendre une autre décision. Les snapshots terminaux reprennent la tâche originale avec les faits de résultat. Les résultats des tâches terminales doivent rester stables ; une nouvelle exécution commerciale nécessite un nouveau ID d’opération.

L’hôte ne sauve que les échanges d’outil complets. Pendant l’attente, il libère la place d’exécution, conserve la tâche/point de contrôle original et ne fait pas d’essais de récupération anormaux. Les lectures sont réautorisées lors de l’inscription, de la notification et de l’exécution. La permission annulée, les utilisateurs désactivés, les sources supprimées et les enregistrements invalides empêchent la poursuite avec une erreur visible et conservent le point de contrôle. Le désabonnement de l’assistant retire sa capacité de reprendre ; le désabonnement de la tâche commerciale est une action distincte de plugin.

Limites : 20 dépendances par tour d’assistant, identifiants de source de 120 caractères, identifiants d’opération/revisions de 200 caractères, résumés de 2 000 caractères, snapshot serialisé de 24 000 caractères et délai de 20 secondes pour la lecture de la source. La conciliation utilise des pages de clés et des lectures parallèles limitées ; une source lente ne occupe pas les slots d’exécution normaux du modèle. La conciliation d’initialisation attend que la composition des plugins soit terminée.

<a id="integration-example"></a>

## Exemple d’intégration

Le `jobs` L'objet ci-dessous est le répertoire propre du plugin, soutenu par `storage.sql.v1`, **pas une exportation de SDK**. `startOnce` il doit utiliser une clé d’idempotence pour l’entreprise durable ; `readAuthorized` Vérifie les permissions des ressources en temps réel et renvoie la capture actuelle. La notification du travailleur suit sa transaction commerciale planifiée.

```ts
import { aiServiceToken, aiContinuationsServiceToken } from "@smartdoca/plugin-sdk/ai";

// Inside mount(context):
const pluginId = "example.reports";
const sourceId = `${pluginId}.jobs`;
const ai = context.inject(aiServiceToken);
const continuations = context.inject(aiContinuationsServiceToken);
continuations.registerSource({
  id: sourceId, pluginId,
  read: (request, { operationId }) => jobs.readAuthorized(request, operationId),
});
ai.registerTool({
  id: `${pluginId}.generate`, description: "Generate a report",
  inputSchema: { type: "object", properties: { reportId: { type: "string" } }, required: ["reportId"], additionalProperties: false },
  async execute(input, request) {
    const operationId = await jobs.startOnce(request, input.reportId);
    return continuations.wait(pluginId, request, { sourceId, operationId });
  },
});

// In the plugin worker, after its durable result commit:
await continuations.wake(pluginId, { sourceId, operationId });
```

<a id="persistence-and-rollback"></a>

## Persistance et rollback

Seuls les attendus récemment explicités écrivent une version 1 stricte de point de contrôle. Les existants `ai_jobs` La contrainte de l’État reste inchangée : les dépendances attendent, utilisent leur état de stationnement et sont exposées `awaiting_dependency` Dans l’API/UI. Il n’y a pas de migration de schéma, de fonctionnement à deux écritures, de conversion des tickets anciens déduits, de conversion des champs manquants ou de réveil des tâches historiques. Les tickets nouveaux mal formés sont rejetés et conservés pour diagnostic.

Le rollback arrête les nouvelles inscriptions/écritures et conserve les points de contrôle, les résultats d’activité et les enregistrements d’audit. Un hôte plus ancien ne reprend pas ce nouveau protocole ; ne le lancez pas sur des serveurs actifs de version 1 sans d’abord annuler ces services assistants ou arrêter les travailleurs et restaurer un hôte correspondant. Aucun réinitialisation de données n’est inclus dans le rollback.

Le progrès du Knowledge-book utilise les données de vérification existantes, avec des comptes-rendus compacts pour les comptes de nœuds, de lots, de modèles et de répétitions. Aucun corps de modèle n’est copié dans ces logs. La boîte de déroulement met à jour l’état, le signal d’activité, l’erreur actuelle et les 200 événements enregistrés les plus récents. Les événements historiques ne sont pas fabriqués ; les événements antérieurs sont conservés dans le stockage.
