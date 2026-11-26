<a id="content-providers-contentv1"></a>

# Provoqueurs de contenu : content.v1

[中文](plugin-content.zh-CN.md)

L’accès public est `@smartdoca/plugin-sdk/content`. Le hôte définit le contrat et les limites d’invocation ; les plugins implémentent le comportement métier. Les documents et fichiers intégrés sont enregistrés via la même interface. L’enregistrement d’une source ne rend pas automatiquement toutes les sources accessibles à l’IA.

<a id="contract"></a>

## Contrat

- `sources(context, purpose)` découvre les déclarations de source.
- Les sources exigent `list`, `read`, et `resolve`. Optionnel `search` Doit être parfaitement en accord avec la déclaration de capacité.
- `list(context, {config, cursor, limit})` retourne léger `{items,nextCursor,snapshot}`Chaque article inclut `ref:{sourceId,resourceId,blockId}`, `fingerprint`, et `title`, optionnellement `order`, `anchor`, et un court `excerpt`. Corps `text` est interdit.
- `read(context, {config,ref,fingerprint})` renvoie la liste des champs ainsi que le bloc sélectionné `text`, ou null lorsqu’il est actuellement illisible. Un empreinte de doigt modifiée entraîne un conflit et nécessite une re-enumération.
- `resolve(context,ref)` réautorise et renvoie `{path,fingerprint}` Ou null. Les chemins doivent se trouver à l’intérieur de l’application.
- `search(context, {config,cursor,limit,query})` Retourne la même liste légère. Les sources implémentent la recherche ; l’hôte ne effectue pas de scan de tout le corps.

Les appels de liste de services/lire/rechercher font également l’objet de… `sourceId` et `purpose`Les callbacks reçoivent la valeur réelle. `principalId`, `purpose`, et `signal`Chaque invocation vérifie le compte, la portée configurée et les permissions actuelles ; les identifiants d’utilisateur fournis par le corps de requête ne sont pas fiables. L’hôte vérifie le cycle de vie de l’utilisateur/la source avant et après les appels et applique un timeout de 20 secondes.

```ts
const content = context.inject(contentServiceToken);
content.register({
  id: "example.tasks.content", pluginId: "example.tasks", version: 1,
  title: { zh: "待办", en: "Tasks" }, contentTypes: ["task"],
  purposes: ["analysis", "knowledge"], capabilities: { search: false },
  configSchema: { type: "object", additionalProperties: false, properties: {} },
  list: listAuthorizedTaskBlocks,
  read: readAuthorizedTaskBlock,
  resolve: resolveAuthorizedTaskBlock,
});
```

Le plugin met en œuvre les trois callbacks. Il ne doit pas lire les tables privées de l'hôte ou la source, ni la base de données d'un autre plugin.

<a id="reconciliation"></a>

## Réconciliation

Les consommateurs stockent les références/empreintes digitales sous la configuration d’identité et de abonnement actuelle. Après une énumération complète, les blocs inchangés n’ont pas besoin d’analyse de lecture/IA, tandis que les blocs modifiés sont lus directement. Seule une traversée complète réussie permet la disparition des données. Les temps d’attente, les pages échouées, les snapshots modifiés et les permissions incertaines ne peuvent pas être considérés comme un ensemble vide ou comme des empreintes digitales déjà consommées.

`cursor=null` commence ; `nextCursor=null` Fin. Le snapshot d’une traversée doit rester cohérent. Les curseurs comptent les pages ; ils ne sont pas des positions de journal incrémental durables. Rejeter les anciens curseurs lorsque le contenu, le champ d’application ou les permissions rendent l’intégrité invalide. Séparer `listChanges`/`readChanges` ne sont pas nécessaires.

Limites : 100 éléments par page, 2 millions de caractères dans le corps par bloc, 100 000 blocs dans un inventaire complet. Le hôte valide les références, les duplications, les curseurs et les annulations. Les outils d’analyse limitent le texte totalement modifié et échouent explicitement en cas de surcharge, plutôt que de le couper et de prétendre à la complétude.

Les sources intégrées utilisent l’adressage de contenu de paragraphe. Insérer un paragraphe avant un paragraphe inchangé ne modifie pas son identité. L’édition d’un corps supprime le bloc ancien et crée un nouveau. Ce ne sont pas des identifiants de nœud stables natifs de l’éditeur. Les règles de bloc dupliqué, de contexte de titre et de découpage de longs paragraphes se trouvent dans… [enregistrement d’empreintes digitales](content-fingerprint-reconciliation.md).

<a id="host-apis-and-consumers"></a>

## Hôte des APIs et consommateurs

HTTP : `GET /api/v1/content/sources?purpose=analysis`; POST `/api/v1/content/list`, `/read`, `/resolve`, `/search`L’identité provient de la session hôte, et les réponses ne utilisent pas de stockage.

La recherche globale ne prend en compte que les sources déclarant une recherche. Les filtres de documents/bibliothèque qui ne s'appliquent pas aux domaines d'activité des extensions excluent ces résultats d'extension. Cliquer permet de réactiver l'accès.

Les bibliothèques natives conservent l’enregistrement du source. `knowledge_subscriptions` et `knowledge_source_groups.config`Ils ne créent pas de postes de curateur, d’entrées dérivées ou de miroirs de empreintes de consommation. POST `/api/v1/knowledge/libraries/:id/content-subscriptions` prend `{sourceId,config,title}` Et nécessite la connaissance du but. Seul le contributeur peut modifier le champ d’application du fournisseur.

Les livres de connaissances recueillent indépendamment des inventaires autorisés complets au moment de l'exécution et sont révalidés avant la publication. Les preuves sont conservées `contentRef`Version de source, hash de contenu et extraits de citation exacts. L’accès dérivé cesse lorsque le fournisseur, la binding, le contributeur ou la permission de la source originale devient indisponible ; les données conservées ne permettent pas d’accès. Il n’existe pas de stock complet supplémentaire du corps du fournisseur.

Le sélecteur de source propose des formulaires de schéma de base ; une configuration complexe imbriquée nécessite la page dédiée au plugin. `PUT /api/v1/knowledge/libraries/:id/content-source-groups/:groupId` Prend les paramètres de création. Seul le principal abonné peut changer le champ d’application. Les modifications affectent les lectures ultérieures de la source.

`knowledge.sources.v1` n’est pas adapté automatiquement `content.v1`; les plugins professionnels respectent la norme publique. Les livres de connaissances utilisent une nouvelle base de données ; aucune conversion historique ni adaptateur de protocole ancien n’est fourni.
