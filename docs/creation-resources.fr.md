<a id="plugin-templates-and-materials"></a>

# Modèles et matériaux de plugins

[中文](creation-resources.zh-CN.md)

Base contractuelle : SDK `0.1.9`, contrats `0.1.7`. La création de documents, les clients de plugins publics, les sélectionneurs d’hôtes et l’utilisation de l’IA utilisent les mêmes services de ressources. Vérifiez les exportations réelles des paquets et les versions de déploiement avant l’intégration. Les services et appareils externes nécessitent une acceptation distincte.

<a id="existing-data-handling"></a>

## Gestion des données existantes

Le modèle de ressource mis en œuvre supprime l’entrée de gestion du modèle pour l’administrateur. `/api/v1/templates` et `/api/v1/admin/templates`Le champ de création de templateId ancien, ainsi que les fonctionnalités CRUD de la table ancienne, restent inchangés. La table document_templates, ses index, ses définition et ses enregistrements restent identiques. Il n’y a pas de migration, de suppression, de conversion, de lecture/écriture double, ni d’enregistrement automatique de cette table en tant que fournisseur. Les champs anciens inconnus sont rejetés. Les documents existants conservent leur contenu et leurs ressources persistants. Une version précédente peut lire la table ancienne après un rollback ; les documents générés par le nouveau service utilisent toujours les modèles natifs actuels.

Le hôte ne installe aucun fournisseur de modèle ou de matériel par défaut. `doca.documents.create` C’est un consommateur de documents ; les consommateurs de courriels ou de publications appartiennent aux plugins d’entreprise. Les bases de données, les bibliothèques d’entreprise, les services distants et les enveloppeurs de dossiers nécessitent des plugins de ressources installés. Ce service ne met pas en œuvre lui-même un protocole de stockage de ressources distante, une administration de stockage de ressources ou des contenus officiels.

<a id="services-and-public-boundary"></a>

## Services et frontières publiques

Importation `templatesServiceToken` (`templates.v1`), `materialsServiceToken` (`materials.v2`), et les types fournisseur/consommateur `@smartdoca/plugin-sdk/creation-resources`Déclarer une plage actuelle minimale de SDK, par exemple `^0.1.9` et injecter par le biais de `injections.required`. Les contrats légers se trouvent dans plugin-contracts ; les services hôtes se trouvent dans le module creation-resources du core.

- Modèles : enregistrer / fournisseurs / étiquettes / recherche / récupérer / décrire / lire / registerConsumer / consommateurs / consommer.
- Matériaux : registre / fournisseurs / étiquettes / recherche / récupération / description / collection. Décrire / collection. Éléments / importation.
- S’inscrire sur le serveur de montage ; le dispositif retourné est automatiquement propriétaire du cycle de vie spécifié. Les IDs de contribution sont utilisés `${pluginId}.…`. Zéro fournisseurs est valide.
- Les services sont isolés par le champ de vie du runtime de la base de données ; les transactions héritent de ce champ. Arrêter/éliminer une source libère les contributions sans nettoyer les documents ou fichiers consommés.
- Les consommateurs déclarent les combinaisons exactes de versions de contrat/type de contenu, inputSchema et exécutent. Ils détiennent les permissions commerciales et les effets secondaires ; l'hôte vérifie la correspondance, les paramètres et l'état de l'account. Les plugins commerciaux autorisent l'envoi/ publication de courriels via leurs propres flux.

La version contract et la version contenu sont indépendantes, par exemple `{contract:{id:'doca.document.rich_text',version:1}, contentType:{id:'doca.native.rich_text',version:1}}`. Les consommateurs de documents supportent le rich_text, le markdown, la feuille de calcul, le canevas et la présentation. Tous les contrats sont de version v1 ; le contenu natif de la présentation est de version v2 et les autres sont de version v1. Les contrats et types de contenu personnalisés utilisent le nom de space de l’extension et un accord explicite entre les deux parties. Une extension seule ne suffit pas à établir la consommabilité.

<a id="provider-contract"></a>

## Contrat fournisseur

Les fournisseurs de modèles déclarent la version :1. Les fournisseurs de matériaux déclarent la version :2 ainsi que les collections. D’autres déclarations comprennent id/pluginId/title, les contrats et types de contenu/sort supportés, ainsi que les implémentations de tags/search/describe, en plus de la lecture de modèles ou l’importation de matériaux. Chaque appel reçoit le principal hôte, le requestId et le signal de annulation.

L’entrée de recherche est : contract/contentType/query/tags/providerIds/sort/cursor/limit. Le query ne peut pas dépasser 1000 caractères. Les fournisseurs effectuent une correspondance par mots-clés, une filtrage par tous les tags, des vérifications de découvrabilité actuelles et l’ordre demandé, en renvoyant des métadonnées légères sans contenu. Le describe rechecke l’accès et la révision, et renvoie null pour les ressources cachées ou supprimées. Les tags doivent provenir uniquement de ressources que l’appelant peut découvrir.

Les cartes nécessitent une révision. `{providerId,id,revision}`, titre, résumé, tags, date d’actualisation, contrat, contentType, paramètres et licence. Une vue préliminaire du modèle est obligatoire ; la vue préliminaire du contenu, des utilisations et de la popularité sont optionnelles. Une vue préliminaire du modèle montre le style réel plutôt qu’un icône générique. Le sélecteur l’affiche sur la carte ; en cliquant, elle s’agrandit, puis une vue préliminaire native s’affiche si nécessaire. La vue préliminaire accepte uniquement des URL de données PNG/JPEG/WebP, avec un maximum de 180 000 caractères codés. Les fournisseurs distants récupèrent et valident les préviews plutôt que d’exposer des images distantes arbitraires directement aux navigateurs. Les paramètres utilisent le sous-ensemble ObjectConfigSchema du SDK, et non un schéma JSON arbitraire. L’hôte rejette les champs inconnus et valide les valeurs obligatoires, les types, les enums et les limites. L’interface utilisateur basique utilise des entrées simples ou JSON pour les paramètres complexes ; les plugins professionnels peuvent créer leur propre interface.

Les étiquettes ont des IDs stables et `{zh,en}` Titres. Les IDs partagés sont utilisés `doca.tag.…`, par exemple doca.tag.report/proposal ; les IDs privés utilisent le espace de noms plugin. L’hôte déduplique les IDs plutôt que les noms d’affichage. Utilisez des étiquettes public-tag cohérentes sans exposer des étiquettes invisibles.

<a id="sorting-and-pagination"></a>

## Tri et pagination

Chaque fournisseur prend en charge les versions mises à jour du nom, et peut indiquer l’utilisation ou la popularité. Parmi les fournisseurs, les versions mises à jour sont classées par ordre chronologique, et les noms sont classés par ordre alphabétique, avec providerId/id servant de critère de détermination pour les équivalences ; l’hôte fusionne les flux classés. Pour l’utilisation/popularité, il est nécessaire de choisir exactement un fournisseur. Ces chiffres ne représentent pas une popularité comparable entre différents fournisseurs ni l’utilisation globale sur l’hôte.

Les requêtes de interface utilisateur ont par défaut 24 éléments, avec un maximum de 48 ; chaque fournisseur ne peut récupérer au plus 24 éléments. Les données sont chargées après la sélection. Les modifications de mot-clé, de tag, de type, d’ordre ou de source font redémarrer la requête. L’hôte ne télécharge pas l’intégralité du catalogue pour une filtrage local.

Les curseurs hôte sont des états locaux d’instance opaque liés à l’utilisateur, à la requête normalisée et aux fournisseurs. Ils durent 15 minutes ; leur expiration, leur redémarrage ou les changements de fournisseur provoquent une réponse 410 et nécessitent une nouvelle requête, sans garantie de continuité entre instances. Limites : 500 curseurs non expirés, 100 fournisseurs, 10 000 éléments parcourus par fournisseur, et 100 récupérations par agrégation. Chaque appel au fournisseur dure 15 secondes et une recherche dure 30 secondes. Avant de retourner les candidats en cache, il faut décrire l’accès et la révision des recherches. Les curseurs/ressources répétés, l’ordre incorrect ou les erreurs de source entraînent des échecs ou une réponse “complete:false” plutôt qu’une réussite vide.

Ce protocole de navigation n’est pas un inventaire figé, un flux de synchronisation de suppression ou un journal de changements persistant. Les fournisseurs nécessitant ces fonctionnalités définissent des contrats distincts. L’hôte ne conserve pas de copies du catalogue des ressources, de tableaux d’utilisation ou de migrations d’amélioration des ressources.

<a id="reading-importing-and-applying-templates"></a>

## Lire, importer et appliquer des modèles

Le modèle de lecture accepte `{ref,parameters}` et retourne `{contract,contentType,content,assets}`, au maximum 768 KiB ; l’hôte ajoute la source. Une révision modifiée constitue un conflit et ne peut pas renvoyer de nouveaux contenus sous la révision précédente.

Import de matériaux accepté `{ref,operationKey}`Le fournisseur vérifie à nouveau l’accès et utilise files.v1 pour importer ou sélectionner un fichier autorisé, puis retourne `{fileId}`Les importations à distance utilisent operationKey comme identifiant d’empêchement d’écriture de fichier et le protocole contentIdentity/upload-receipt. Les tentatives de récupération conservent le même identifiant ; les URLs temporaires ne constituent pas des références persistantes. L’hôte vérifie à nouveau les ACL actuels du fichier et renvoie fileId/nom/mime/taille/source.

Les ressources de modèle contiennent au maximum 100. `{key,ref}` Enregistrements indiquant les fournisseurs de matériel. Le contenu utilise des informations précises. `material:<key>` Strings ; Les images Markdown utilisent `](material:<key>)`. La création du document récupère/revient vérifier les ressources en dehors de la transaction d’écriture, car les plugins peuvent appeler d’autres services de base de données. À l’intérieur de la transaction, il vérifie que l’instance de registration est toujours valide, crée des attaches hôte/references de fichiers pour le nouveau document, remplace les placeholders par des IDs d’actif locaux, vérifie les permissions, les mentions, la taille et le format actuel, et initialise la persistance. En cas de échec, le nouveau document et ses references sont annulés. Les fichiers utilisateur importés par le fournisseur restent, sans suppression implicite, et conservent leur cycle de vie normal.

L’application de modèle ne initialise que de nouvelles ressources, sans effacer les documents ou modifier la collaboration. L’élimination d’un fournisseur ne supprime pas les ressources liées gérées par l’hôte ou les documents générés. La vue préliminaire native permet d’utiliser des modèles sans dépendances d’actifs ; les modèles dépendants utilisent des images préliminaires fournisseur sans importer implicitement des actifs.

`POST /api/v1/resources` accepte `template:{ref,parameters}`, exclusifs l’un de l’autre avec markdown/initialContent ; omettre le template pour la création vide. Les templates du consommateur de document consomment l’entrée : titre, avec une idée parentId/libraryId optionnelle (omis au niveau racine), retournant id/title/format. La création ordinaire conserve l’endpoint resource-create. Les consommateurs professionnels peuvent utiliser des lectures ou la consommation, et possèdent l’idempotence de business-operation.

<a id="browser-plugins-and-ai"></a>

## Naveur, plugins et IA

Appels internes à l’interface utilisateur authentifiés `POST /api/v1/creation-resources/{templates|materials}/{operation}`. Les plugins utilisent `host.platform.templates` / `host.platform.materials` Grâce à la liste de permis de la plateforme de plugins existante et à l’identité WebView ciblée. Il n’y a pas de déléguateur de services arbitraire ; host.request reste limité à l’API du plugin.

Le présentateur injecte React. `host.TemplatePicker` / `host.MaterialPicker` Comme FilePicker. TemplatePicker accepte close/contract/contentType?/select(selection,resource)/blank? ; son deuxième argument de callback est la carte complète avec la source. MaterialPicker accepte close/contentType?/select(file)/accept? et renvoie la source avec la sélection. Les pickers collectent la sélection/les paramètres ; les callbacks ou l'interface utilisateur métier effectuent la consommation. Les pickers de plugins utilisent leur propre canal public sans appeler l'ui.openView d'un autre plugin.

La création de document offre toujours une création vide, suivie de modèles de plugins correspondants, de filtres de source/keyword/tag/ordre, de "charger plus", de prévisualisation et de paramètres. La fermeture ne crée rien. La création vide reste disponible sans fournisseurs ou avec des fournisseurs échoués. Les dialogues de téléchargement/fichier proposent la bibliothèque de matériel et transmettent les matériaux sélectionnés au flux de téléchargement/insertion existant.

L’IA utilise creation_resource_providers / creation_resource_retrieve / creation_resource_search / creation_resource_tags / template_describe / template_read / material_import ; document_create accepte les modèles. La création de modèles nécessite l’approbation de l’IA, ainsi que le champ de ressources et les reçus. L’importation de matériel conserve l’approbation de création du fichier et renvoie un identifiant de fichier stable, indépendant des reçus de génération d’images ou de l’identifiant d’actif image_insert. Les modèles professionnels utilisent les outils correspondants du plugin. Le hôte ne met pas en œuvre un moteur de recherche ou un modèle sémantique ; la récupération appartient aux fournisseurs.

<a id="verification-scope"></a>

## Portée de vérification

Les vérifications isolées couvrent les fournisseurs nuls et la préservation des tables anciennes, le rejet des chemins anciens, l’initialisation dans cinq formats, le matériel ACL/bondage, la déduplication des étiquettes, la fusion/pagination, les échecs de fournisseur, les comptes inactifs, les conflits de révision, les paramètres/consommateurs, la propriété/dispensateur des plugins, l’isolation au runtime et l’identité HTTP. La construction du SDK et la consommation indépendante couvrent de nouveaux points d’entrée, les clients publics et les types d’interface utilisateur. Les stockages externes, les services d’entreprise et les appareils physiques nécessitent une intégration distincte.

<a id="multiple-providers-and-retrieval"></a>

## De nombreux fournisseurs et récupération

La révision mise en œuvre le 2026-10-02 remplace le champ query providerId par providerIds. Le vieux champ de requête singulier est rejeté par les services, les HTTP, les clients et les outils d’IA, sans adaptation ou conversion implicite. Références de ressources `{providerId,id,revision}` Sont inchangés. Les paramètres de modèle, les fichiers, les documents, les données commerciales et les document_templates ne sont pas migrés ni supprimés. Aucune persistance basée sur les préférences du fournisseur n’est introduite. Le rollback doit également annuler les clients de requêtes ; les curseurs locaux à l’instance nécessitent une nouvelle requête après redémarrage ou changement de fournisseur.

Chaque fournisseur est une source ayant un identifiant stable et un titre déclaré comme plugin ; la description bilingue optionnelle ne peut pas dépasser 1000 caractères par langue. Un plugin peut enregistrer plusieurs sources. Doca ne déduit pas l’implémentation de la source à partir des catégories de réseau/stock/génération. Lorsque `providerIds` est omis, tous les sources correspondants sont sélectionnés ; `&#91;&#93;` signifie aucun. Plusieurs identifiants sont combinés par OR, avec type/tags par AND. Les identifiants inconnus ou non chargés renvoient 404 sans élargir le champ de recherche. La découverte, la liste, les tags et la récupération partagent cette sélection ; les curseurs lient les identifiants triés et déduits. `usage/popular` nécessite un seul source explicite.

Listes et description de la réponse CreationResourceResult : la carte originale plus les éléments générés par l’hôte `source:{id,pluginId,title,description?}`. Les plugins ne peuvent pas falsifier la source. Les résultats de lecture/importation du hôte incluent également la source ; les contrats retournés par le fournisseur restent inchangés. Les métadonnées de la source reflètent l'enregistrement actuel et ne sont pas inscrites dans le contenu du ressource/document. L'interface utilisateur affiche les noms, les descriptions et les attributions des cartes de la source.

`templates.retrieve` / `materials.retrieve` accepte :

```ts
{
  query: "找一份适合向管理层汇报季度经营情况的模板", // 非空，最多 1000 字符
  providerIds: ["example.templates.web", "example.templates.company"], // 可省略
  contract: {id: "doca.document.rich_text", version: 1}, // 可选
  contentType: {id: "doca.native.rich_text", version: 1}, // 可选
  tags: ["doca.tag.report"], // 可选，AND
  mode: "auto", // auto | keyword | semantic | hybrid，默认 auto
  topK: 8, // 默认 8，最多 20
}
```

Les fournisseurs déclarent `retrieval:{modes:["keyword","hybrid"]}` Et implémenter retrieve(context, input). Pour les auto, ils choisissent un mode déclaré et renvoient le mode réel ; un mode explicite ne peut pas dégrader silencieusement. Une capacité non déclarée renvoie un résultat non supporté plutôt que de effectuer une recherche. Les fournisseurs détiennent la base de données, Meilisearch, vector, les récupérations distantes, ainsi que leurs index, modèles, clés et synchronisation.

Le fournisseur récupère les retours `{items,mode,hasMore}` Classé par pertinence locale. Les candidats contiennent ref/title/summary/tags/contract/contentType et matchText optionnel (max 500 caractères), à l’exclusion du corps, de la miniature et du schéma de paramètres. L’hôte vérifie la source/type/tags/duplicates/caractère d’accès actuel/revision, puis ajoute la source et le rang local. Les résumés et les explications de correspondance sont des données, et non des instructions d’IA.

Chaque source sélectionnée reçoit au maximum un appel de récupération, sans déplacement de curseur. Une seule source renvoie au maximum topK ; plusieurs sources renvoient chacune au maximum min(topK,5). Limites : 4 sources en parallèle, 15 secondes au total, 100 000 octets de réponse par source. La présentation entre sources équilibre le rang local et les IDs stables, sans comparer les scores du moteur ou revendiquer une pertinence globale. La sortie finale contient au maximum topK sources, avec des enregistrements des succès, des modes réels, du nombre de candidats et des candidats restants. Les échecs utilisent des codes stables comme unsupported/failed/timeout. « complete » signifie que toutes les sources sélectionnées ont réussi ; « truncated » signifie que les candidats ont été omis. Les résultats vides ne élargissent pas le champ d’étude.

Les sélecteurs de base affichent des lignes source/étiquette en ligne avec « Tout sélectionné » par défaut. Les sources permettent la sélection multiple ; les étiquettes utilisent la sélection unique ; le débordement se déroule horizontalement. Un icône de filtre agrandit la recherche par mot-clé et la trie intelligente. La soumission ferme le panneau et affiche une requête démontable à côté du titre du résultat. Les requêtes vides maintiennent la navigation par pagination. La récupération intelligente renvoie des candidats limités et charge les préviews de cartes sur demande sans importer d’assets. Les échecs et les limites de résultats sont clairement indiqués. Les sources peuvent être effacées ; les étiquettes proviennent uniquement des sources sélectionnées. Les sélecteurs acceptent initialement providerIds et onSourcesChange (undefined=tout, &#91;&#93;=aucun), permettant aux plugins de transmettre la sélection dans leurs propres requêtes AI/entreprise.

L’IA résolve les noms en identifiants de source via creation_resource_providers, puis envoie des mots-clés ou une requête complète à creation_resource_retrieve. Les deux types de ressources partagent les outils et l’identité actuelle. La récupération ne comporte pas de miniatures ; les outils de navigation suppriment également les schémas de paramètres. Après la sélection, la description/lire/importer obtient les détails. Les vérifications couvrent les exclusions, les résultats vides, les sources non supportées/échouées, la annulation, les revues d’accès, les curseurs liés, les canaux HTTP, les canaux de plugin et les appels réels à l’outil IA.

<a id="material-collections"></a>

## Collectes de matériaux

La révision mise en œuvre le 2026-10-03 utilise `materials.v2` / MaterialsServiceV2. Les fournisseurs nécessitent la version 2 et les collections. Les anciens fichiers materials.v1, version 1, qui manquent de collections, ainsi que le curseur de matériel singulier ancien sont rejetés sans adaptateurs, paramètres par défaut, lectures doubles ou conversion. Les modèles restent modèles.v1. Les fichiers, le contenu des documents et les références de ressources restent inchangés. Aucune migration ou suppression de tables de matériel-hôte n’est introduite. Le rollback doit coordonner l’hôte, le SDK, les pickers et les outils AI, et redémarrer les requêtes locales de l’instance.

Les matériaux appartiennent à zéro ou plusieurs collections dans la même source via le référencement, sans copier de fichiers. Les collections/éléments ont des étiquettes distinctes sans héritage. Les fournisseurs possèdent les téléchargements en masse, la gestion des collections, les abonnements, l'autorisation et la persistance des données via des services SQL/objets/fichiers gérés par le public ; ils ne peuvent pas choisir de bases de données indépendantes ou éviter le chargement du répertoire d’installation. Les collections fusionnées entre sources différentes ne sont pas couvertes par ce protocole.

Les cartes de matériel/candidats de récupération nécessitent `collections: CreationResourceRef[]`; &#91;&#93; signifie aucun. Les fournisseurs renvoient uniquement des collections visibles pour l’utilisateur. Les métadonnées de la collection incluent ref/title/summary/tags/updatedAt/contracts/contentTypes ainsi que les préviews optionnelles/count/usage/popularity. count doit refléter les membres visibles, et non le nombre total d’inventaires. Les collections ne contiennent pas de contenu, de paramètres, de licence ou d’éléments intégrés. Les candidats de récupération omettent preview/updatedAt/usage/popularity et peuvent inclure matchText. L’hôte ajoute la source et, pour la récupération, le rang local.

`collections: null` Déclare explicitement les fournisseurs basés uniquement sur des éléments. Les fournisseurs de collections mettent en œuvre `{tags,search,describe,retrieval?,retrieve?}` Avec identité/signal. Le support de liste et de récupération de collections est indépendant ; la récupération de matériel ne peut remplacer cela. Les contrats de collection/types de contenu décrivent les types de membres consommables. Les filtres de type correspondent à n’importe quelle déclaration ; les tags utilisent AND, et les collectionRefs utilisent OR. Les changements de membre mettent à jour la révision de la collection et les références de collection de matériel. La description de collection impose l’accès/version ; l’hôte vérifie à nouveau avant/après les requêtes de membre et la continuité, ainsi que la membrerie/accès/revision du membre.

Exemple :

```ts
const page = await host.platform.materials.search({
  query: "夏日配色", providerIds: ["example.palette.library"],
  tags: ["doca.tag.color"],           // 只筛素材
  collectionTags: ["doca.tag.theme"], // 只筛素材集
  target: "all",                    // all（默认）| materials | collections
  limit: 24,                        // 各组独立上限，最多 48
  cursors: { materials: null, collections: null },
});
// { materials: {items,nextCursor,complete,failures}, collections: {...} }
const members = await host.platform.materials.collectionItems({
  ref: page.collections.items[0].ref, limit: 24, cursor: null,
  query: "红色", tags: ["doca.tag.color"],
}); // 单一素材分页，不内嵌后续成员
const related = await host.platform.materials.retrieve({
  query: "适合夏日海报的暖色背景", target: "materials",
  collectionRefs: [page.collections.items[0].ref], topK: 8,
});
```

La recherche/retraitement renvoie les groupes de matériaux et de collections fixes, chacun avec son propre état de completion/failures et de curseur/truncation, sans mélanger ou intégrer répétitivement les membres. Avec un seul cible, le autre groupe est vide/complet et sa recherche n’est pas appelée. Les curseurs ne peuvent pas traverser les groupes ; le cible peut continuer avec un seul. La limite/topK s’applique séparément à chaque groupe. Omittre collectionRefs sélectionne tous les matériaux, &#91;&#93; sélectionne aucun ; collectionRefs nécessite un cible:matériaux explicite. Les providerIds explicites ne peuvent pas exclure la source de la collection référencée (400) ; les sources inconnues renvoient 404. tags renvoie des résultats distincts. `{materials,collections}` Groups. collectionDescribe(ref) ne renvoie que les métadonnées ; collectionItems({ref,...}) renvoie une page de contenu en utilisant la requête de base/tags/contract/contentType/providerIds/sort/cursor/limit contract.

La récupération de données prend en compte les tags de source/type/item, les tags de collection, ainsi que les paramètres de requête/mode/topK/target/collectionRefs. Chaque groupe appelle une source une fois, au maximum 4 concurrents par groupe (8 pour les deux groupes ensemble), avec au maximum 20 résultats finaux par groupe. Les candidats à source unique mis à jour respectent également la limite de 100 000 octets. Le budget total est de 15 secondes, y compris les vérifications de la collection. Les récupérations de données pour des collections non supportées ne sont pas disponibles sans traçage de parcours. La pagination de recherche/membres prend 30 secondes. Chaque groupe dispose de sessions/budgets indépendants, sans exigences unifiées de pertinence entre différents types de données.

Le collecteur de matériel dispose de onglets « Matériaux »/« Collections ». À l’intérieur d’une collection, il affiche la source/nom, les pages membres, permet des requêtes par mot-clé/requêtes intelligentes, et permet également de retourner aux collections. La navigation/présentation ne fait pas importer les fichiers ; la sélection d’un élément déclenche l’importation. Les détails indiquent le nombre de membres d’une collection. La récupération par IA renvoie les deux groupes : les collections aident pour des thèmes cohérents, les éléments aident pour des demandes précises, sans nécessité de deux requêtes simultanées. Les commandes « material_collection_describe »/« material_collection_items » sont disponibles ; les éléments liés à une collection utilisent la récupération avec « collectionRefs » plutôt que de scanner tous les membres.

Les vérifications isolées couvrent plusieurs/ni membreships, curseurs/tags indépendants, exclusions de sources, filtrage de membres, accès à des collections/modifications de révision, déclarations invalides, revérifications de membreships, récupération limitée sans traçage, des dispositifs de répertoire, des outils IA, des canaux HTTP, ainsi que des artefacts SDK indépendants. Des cartes de collections vérifiées sur une page de navigateur isolée, la navigation de membres, des requêtes intelligentes de collections, et une navigation de retour sans modification des documents utilisateur.
