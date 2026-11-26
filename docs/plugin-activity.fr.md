<a id="plugin-recent-activity"></a>

# Activité récente de la plugin

[中文](plugin-activity.zh-CN.md)

Mise en œuvre le 2026-09-30 et exportée publiquement `@smartdoca/plugin-sdk/platform`Utilisez un artefact SDK et un hôte contenant cette interface. La disponibilité de la source seule ne constitue pas une nouvelle publication npm.

<a id="storage-and-ownership"></a>

## Stockage et propriété

Les plugins se registrent via `activityServiceToken` (`activity.v1`). Ils possèdent des enregistrements de visites, des requêtes d’histoire, des autorisations commerciales en cours et une nettoyage de suppression, en utilisant une persistance gérée par l’hôte. Le service ne collecte que des sources ; il ne crée aucun miroir commercial ni aucun point d’accès spécial pour enregistrer les visites. Utilisez [Contrat de stockage géré actuel](plugin-horizontal-scaling.fr.md).

Les enregistrements intégrés restent en place `resource_visits` et `workspace_activity`Cette augmentation n’a modifié aucune table, n’a modifié l’histoire ni n’a introduit de double écriture. La page de découverte publique… `/workspace/recent?publicOnly=true` La logique de collection s’applique aux ressources intégrées. L’enregistrement d’une activité ne registre pas la découverte, les favoris, la recherche ou l’IA.

La suppression élimine les enregistrements en temps de exécution et met fin à l’ouverture/affichage de cette source. Les données stockées restent intactes. La réactivation des requêtes permet de récupérer les données du plugin actuel. L’installation ou la désactivation réelle s’effectue en suivant le cycle de vie basé sur le redémarrage du hôte.

<a id="registration"></a>

## Enregistrement

```ts
import {
  activityServiceToken,
  permissionsServiceToken,
  type ActivitySource,
} from "@smartdoca/plugin-sdk/platform";
```

Déclarer les deux tokens `injections.required`Un hôte sans `activity.v1` rejette une extension qui le nécessite ; les tables privées ou les endpoints anciens ne sont pas des alternatives. Les extensions existantes qui ne utilisent pas l’activité n’ont pas besoin d’une nouvelle inscription. `register(source)` renvoie un disposer ; l’injection ciblée le lie aux effets du plugin et le libère en cas de échec de démarrage ou d’initialisation.

Enregistrez une source par type de contenu, par exemple `example.mail.messages` et `example.mail.threads`:

| Champ | Exigence |
| --- | --- |
| `id` | ID de source unique préfixé par "plugin", au maximum 150 caractères |
| `pluginId` | Doit correspondre à l’identité de l’extension injectée |
| `schemaVersion` | Exactement `1`; les versions non supportées échouent lors de l’enregistrement |
| `resourceType` | Enregistré avec `permissions.v1`; les IDs d’élément identifient le ressource de ce type |
| `title` | `en` et `zh`Au maximum 100 caractères chacun, pour les étiquettes de filtres/sources |
| `icon` | `file`, `mail`, `calendar`, `message`, `task`, `book`, ou `folder` |
| `list(context, input)` | Page de visite lisible pour l’utilisateur actuel |
| `get(context, id)` | Record/title/path actuel avec autorisation réexaminée, ou null |

Les identifiants et les types de ressources commencent par une lettre minuscule et utilisent des segments alfanumériques séparés par des points ou des tirets. Chaque instance permet au maximum 64 sources de plugins et rejette les identifiants identiques. Les ressources commerciales sont illimitées, mais doivent être paginées.

Le contexte créé par l’hôte est `{principalId, signal}`Le principal provient de la session authentifiée plutôt que de l’utilisateur sélectionné par le navigateur. Un élément a cette forme :

```ts
{
  id: "message-123",                  // 唯一资源 ID，1–500 个可见 ASCII 字符
  title: "季度预算讨论",              // 原始内容标题，非空，最长 500 字符
  visitedAt: "2026-09-30T09:20:00.000Z",
  path: "/mail/inbox?message=message-123"
}
```

`id` Contient de 1 à 500 caractères ASCII visibles ; le titre est non vide et ne dépasse pas 500 caractères. `path` Commence par un slash suivi d’une lettre ou d’un chiffre, et ne contient aucun caractère d’origine, hash, backslash ou caractères de contrôle. Les adresses externes/relatives à un protocole sont interdites. Encoder les valeurs de requête. Les titres commerciaux conservent leur contenu original ; les noms de type utilisent `title.en/zh`.

<a id="pagination"></a>

## pagination

`list` prend `{until, after, limit}` et retourne `{items, hasMore}`:

1. Retourner une visite la plus récente par utilisateur/source/ressource, classée par ordre `visitedAt DESC, id ASC` Avec l’ordre des IDs binaires en ASCII.
2. Utiliser des chaînes ISO UTC avec des millisecondes, et seulement `visitedAt <= until`.
3. `after=null` commence. Sinon, demandez. `visitedAt < after.visitedAt`ou temps égal avec `id > after.id`La frontière reste utilisable après que son enregistrement a été supprimé.
4. `items.length <= limit`Le hôte demande actuellement au maximum 51. Les pages courtes sont autorisées. Les enregistrements restants nécessitent `hasMore=true` Et au moins un élément retourné ; les pages vides ne signifient pas qu’il est possible de réessayer plus tard.
5. Filtrer d’abord les visites des utilisateurs et les permissions actuelles. Le hôte vérifie également. `activity.read` Sur chaque élément, et obtenir davantage si nécessaire. Au maximum 20 lots et 1,5 secondes par source, y compris les vérifications de permission. Utiliser des index, respecter les annulations, et éviter la synchronisation complète à distance au sein des requêtes.
6. La liste ne met jamais à jour les visites. Les visites sont enregistrées uniquement après l’ouverture réussie du contenu commercial. Les appels et les candidats non consommés peuvent se répéter.

Le présentateur fusionne les pages de 50 en décroissant le temps de visite, en augmentant l’ID source, puis l’ID ressource. La source intégrée est `doca`, avec `kind:id` Clés de ressources. Les curseurs suivants opaques lient les utilisateurs/filtres et conservent le premier `until`, sources sélectionnées, et positions consommées.

La liste reflète les permissions actuelles, et non un snapshot de base de données figé. De nouvelles visites apparaissent lors du redémarrage ; la suppression, l’annulation ou les mises à jour des horaires de visite peuvent effacer des enregistrements de la chaîne de pagination. Utilisez des transactions gérées pour des lectures cohérentes de chaque page.

Échec, timeout, pagination/chemin invalide, ou manque de permissions : le service rejette l’intégralité de la page de cette source et conserve les autres sources. Les sources échouées sont ignorées pour les pages suivantes de cette traversion et apparaissent… `unavailableSources`; réessayages de mise à jour. Les sources nouvellement enregistrées nécessitent également une mise à jour.

<a id="example"></a>

## Exemple

Ceci `mount(context)` Exemple nécessite une extension implémentée par un plugin `mailStore`, a continué à utiliser les services gérés par l’hôte actuel ; `mailStore` Ce n’est pas une export de SDK.

```ts
const pluginId = "example.mail";

context.inject(permissionsServiceToken).register({
  pluginId,
  resourceType: "message",
  async authorize(principalId, messageId, action) {
    if (action !== "activity.read") return false;
    return mailStore.canRead(principalId, messageId);
  },
});

const source: ActivitySource = {
  id: `${pluginId}.messages`,
  pluginId,
  schemaVersion: 1,
  resourceType: "message",
  title: { en: "Mail", zh: "邮件" },
  icon: "mail",
  async list({ principalId, signal }, { until, after, limit }) {
    // 业务实现：按用户、当前权限、until、after 过滤，再依协议排序。
    // 可读取 limit + 1 条以判断 hasMore；只返回前 limit 条。
    return mailStore.listRecent(principalId, { until, after, limit, signal });
  },
  async get({ principalId, signal }, id) {
    // 必须确认这个用户有该访问记录，资源仍存在且当前仍可读。
    return mailStore.getRecent(principalId, id, { signal });
  },
};
context.inject(activityServiceToken).register(source);
```

Ajouter `activity.read` Pour utiliser une inscription de permission existante plutôt que de réinscrire le même type de plugin/ressource deux fois. Une fois que l’API open-mail authentifiée d’un plugin lit avec succès le contenu, mettez à jour sa table de visite avec l’ID de l’utilisateur de la session. Lors de la suppression, nettoyez cette table ou filtrez les éléments supprimés via des joins ; le hôte ne peut pas nettoyer les enregistrements qui ne lui appartiennent pas.

<a id="host-entry-points-and-authorization"></a>

## Points d’entrée de l’hôte et autorisation

- `GET /api/v1/workspace/activity`: liste mixte authentifiée ; accepte les éléments intégrés `kind`, extension `source`, et `cursor`. `kind` et `source` Sont exclusifs l’un de l’autre. Retourne `items`, `nextCursor`, `sources`, `unavailableSources`.
- Les éléments de plugin ont `kind=plugin`, `sourceId`, `sourceTitle`, et `icon`Les clés UI incluent l’ID source.
- `href` indique `/api/v1/workspace/activity/open?source=...&id=...`Le présentateur vérifie à nouveau le compte/source.`activity.read`, invoque `get` Pour le chemin actuel, il est réautorisé, puis redirigé. Le échec est un 404 ; il ne redirige pas en utilisant une capture d’écran historique.
- Pages cibles et APIs commerciales autorisées indépendamment. Les activités ne permettent aucun accès à des pièces jointes ou à des documents associés.

<a id="acceptance-and-rollback"></a>

## Acceptation et rollback

`tests/plugin-activity.test.ts` et `tests/workspace-home.test.ts` Utiliser des bases de données/des dossiers d’installation isolés. Ils couvrent l’ordre à temps égal, la traversée, la continuation de pages courtes, la suppression, l’accès croisé par plusieurs utilisateurs, l’annulation, l’désinscription, les échecs/échecs de temps, les redirections dangereuses, les curseurs invalides, l’injection de paquets réels et l’ouverture HTTP.

Cette fonctionnalité n’a entraîné aucun changement durable dans la table. L’historique des plugins reste lors du restauration d’un hôte ; un plugin nécessitant `activity.v1` Refuse un hôte qui ne le possède pas. Ne supprimez pas les données commerciales pour effectuer un rollback.
