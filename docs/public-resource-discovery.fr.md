<a id="public-resources-discovery-and-collections"></a>

# Ressources publiques, découvertes et collections

[中文](public-resource-discovery.zh-CN.md)

<a id="administrator-policy"></a>

## Politique de l’administrateur

Dans les paramètres de permissions et de visibilité, pour les permissions de contenu et la découverte publique, l’administrateur définit les documents, les bibliothèques et les dossiers séparément :

| Mode | Catégorie des découvertes | Recherche de texte complet avant la collecte | Recherche personnelle après la collecte |
| --- | --- | --- | --- |
| Lien uniquement | Caché | Exclu | Inclus |
| Discoverable, pouvant être recherché après la collecte | Montré, requête de titre | Exclu | Inclus |
| Site accessible et pouvant être recherché sur tout le site | Montré, requête de titre | Inclus | Inclus |

La politique ne modifie que la manière de distribuer les ressources qui sont déjà publiques. Elle ne publie pas de ressources privées. Si les trois types de ressources sont uniquement liens, l’entrée publique ainsi que les onglets « Visité » et « Collecté » restent actifs, tandis que l’onglet « Discover » est caché. L’API ne renvoie pas de ressources qui ne peuvent pas être découvertes.

Jusqu’à ce qu’une nouvelle politique soit enregistrée, les paramètres de distribution anciens conservent leur signification précédente. L’enregistrement écrit trois données indépendantes. `publicModes`L’histoire des visites est conservée.

<a id="personal-scope"></a>

## Portée personnelle

Une visite crée un registre de visite et ne collecte pas les ressources. Automatique ancien `source=opened` Les lignes ne sont pas éligibles à la recherche de collecte et ne figurent pas dans la liste de la collecte. Les subventions directes, les invitations acceptées et la propriété suivent toujours leurs propres règles.

Tous les trois types de ressources utilisent `resource_collections`, unique par utilisateur, type de ressource et ID de ressource. Le catalogue public ne cache pas les ressources publiques que vous possédez ou auxquelles vous avez déjà accès. La collecte les ajoute à la liste. Elles ne sont pas filtrées par le donation précédente.

Les candidats recherchés sont la combinaison du champ de recherche précédent, des favoris et de la liste de collections. Les résultats sont vérifiés à nouveau en fonction de l’accès actuel. L’effacement d’une collection ne modifie que la ligne correspondante de la liste ; cela ne change ni l’appartenance ni les invitations. Une ressource qui était déjà recherchable reste recherchable.

Le schéma actuel crée une table de collection vide ; le démarrage ne copie pas les entrées historiques dans celle-ci. Les lignes de collection existantes restent intactes. Les liens automatiques, les invitations ou les enregistrements de visite ne sont pas considérés comme des collections.

La recherche peut s’appliquer à toutes les ressources pouvant être recherchées, à mon champ de recherche et au texte public à l’échelle de l’ensemble du site. Le texte à l’échelle de l’ensemble du site comprend uniquement les ressources que l’administrateur a autorisées à être recherchées sur tout le site. Les requêtes de titre dans le catalogue de découverte ne impliquent pas de recherche de contenu ou de recherche vectorielle. La recherche de fichiers et la récupération de fichiers par l’IA vérifient également la collection de conteneurs et la politique de recherche publique.

<a id="containers"></a>

## Conteneurs

La collecte d’une bibliothèque ou d’un dossier inclut des contenus existants et des contenus ajoutés ultérieurement. La requête décide cela de manière dynamique. Elle ne copie pas une ligne de membre pour chaque enfant.

Une bibliothèque publique définit la portée de lecture de ses pages. Une page qui désactive l’héritage des collaborateurs ne peut pas non plus empêcher la lecture publique. La page peut encore configurer l’édition, les commentaires et la gestion des droits. Les recherches par point et les listes SQL utilisent la même règle de lecture publique. Une page située dans une bibliothèque utilise la politique de découverte et de recherche de la bibliothèque. Un document indépendant utilise la politique du document.

La publication du dossier est stockée. `folder_publications`Les utilisateurs connectés peuvent lire les contenus actuels et futurs. Ils ne reçoivent pas de gestion. La gestion des fichiers et le téléchargement nécessitent actuellement un accès connecté. Il n’y a pas d’accès aux fichiers anonymes. Une fois la publication désactivée, l’accès dépend de l’adhésion actuelle. La collection elle-même ne donne pas d’accès.

Le panneau de permissions de page indique que la bibliothèque publique est une source. Le panneau de partage de dossier indique que l’échelle publique inclut les contenus actuels et futurs. En se déplaçant dans un conteneur public, les contenus sont publiés avec ce conteneur. En se déplaçant ailleurs, les contenus utilisent la nouvelle localisation.

<a id="discovery-ui"></a>

## Interface de découverte

La page des ressources publiques comprend les visites, les découvertes et les collectes, filtrées par document, bibliothèque et dossier. Les visites incluent les ressources publiques qui ne contiennent que des liens et que l’utilisateur a ouvert et peut encore accéder. L’historique des visites ne donne pas droit à une recherche. Les listes professionnelles n’ont plus un raccourci pour les ressources publiques.

Chez moi `/home` Résumé des visites récentes dans les documents, les bibliothèques, les dossiers et les fichiers, ainsi que les tickets en attente et les décisions liées aux bibliothèques. Les documents ont été déplacés. `/documents` Et conserver les visites récentes, appartenant à moi, la collaboration, les favoris et mes collections. La vue « Tout » par défaut pour les bibliothèques combine propriété, collaboration, favoris et collections. Elle ne affiche pas automatiquement le catalogue public à l’échelle du site. Les dossiers partagés n’ont pas de favoris. Ils offrent tout : partagé par moi, partagé avec moi et collectés.

Les listes publiques permettent de collecter et d’annuler les enregistrements. Le menu du document comprend des options pour collecter, annuler et supprimer, et l’utilisateur peut supprimer les enregistrements. Les favoris et les icônes pin restent comme raccourcis. La page de détail du ressource ne ajoute pas de nouvelle entrée pour la collecte.

Home statistics utilisent des données que l’utilisateur actuel peut accéder. Les tickets réutilisent les étapes d’approbation et d’acceptation unique. Les décisions de la bibliothèque réutilisent le permis de maintenance et la calibration en attente. Une fois traitées, elles quittent le système. Une panne de source est affichée séparément et n’est pas présentée comme des éléments en attente nuls. La première version utilise des sources intégrées. Il n’existe pas encore de SDK home avec plugin externe.

Les documents et les bibliothèques utilisent `resource_visits`Les fichiers et les dossiers sont utilisés `workspace_activity`Les visites récentes sont de nouveau autorisées, puis regroupées et classées par temps. Ouvrir une vue préliminaire d’un fichier compte comme une visite. Une liste en miniature, non.

La première phase inclut la recherche de titres, l’ordre selon l’heure de mise à jour, la pagination stable, la collecte des données et l’élimination par lot. Une bibliothèque est représentée comme un conteneur ; ses pages ne sont pas flattées en liste. Les requêtes utilisent le catalogue de la base de données. Il n’y a pas de nouvelles dépendances à Meilisearch, ni de flux de recommandations.

<a id="verification"></a>

## Vérification

`tests/public-discovery.test.ts` Utilise une base de données isolée pour la distribution par type, les visites qui ne collectent pas, les contenus de conteneurs nouveaux, les annulations, le catalogue par rapport au texte complet, la gestion des dossiers, la pagination et les vérifications de la configuration HTTP. Les tests d'héritage des permissions suivent la règle de lecture du conteneur public.
