<a id="knowledge-book-generation-performance-and-batch-checkpoints"></a>

# Performance de génération de livres de connaissances et points de contrôle par lot

[简体中文](knowledge-book-generation-performance.zh-CN.md)

2026-10-19. L’utilisateur a explicitement approuvé la nouvelle table de point de contrôle et le format de persistance privé. La mise en œuvre a été validée avec des données isolées lors de cette exécution d’acceptation, qui n’a pas été déployée en production. L’exécution de production de 150 000 caractères sur huit heures rapportée n’était pas disponible localement ; ces tests ne déterminent pas les causes spécifiques ni ne prédisent la durée de la production.

<a id="execution-improvements"></a>

## Améliorations de l'exécution

Les tailles de rédaction planifiées déclarent des lots par rapport au budget de sortie du modèle avant une demande payante. Les allouements de caractères, la couverture exacte des déclarations, les réparations limitées et les échecs explicites restent en vigueur. La consolidation de revues indépendantes se fait avec la limite de deux travailleurs existante et préserve l’ordre ainsi que chaque constat négatif. Les observations individuelles n’ont pas besoin d’une nouvelle convocation de consolidation. L’acceptation de l’ensemble du livre et les points de contrôle de qualité requis restent en vigueur.

Auparavant, seuls les nœuds complets survivaient à un redémarrage du processus. Les demandes complètes et validées survivent désormais au sein d’un nœud inachevé, y compris les esquisses, l’attribution des réclamations, l’extraction, l’écriture, l’organisation et les revues de qualité. Les décisions de subdivision des hôtes complets sont sauvegardées afin qu’un parent de taille trop grande ne doive pas être demandé à nouveau. Les flux de modèle partiels ne sont jamais stockés.

<a id="approved-persistence-contract"></a>

## Contrat de persistance approuvé

- Ajouter un vide `knowledge_book_batch_checkpoints` table selon la dernière DDL et `schemaEvolution` dans l’état actuel `doca-2026-10-12-book-payload-storage-v1` Génération. Aucune ligne ancienne n’est convertie ou remplie. La réutilisation complète des nœuds historiques et les limites existantes du corps legacy restent inchangés.
- Utilisez un espace privé séparé `knowledge_book_batch_checkpoint_ref` Marqueur v1 et propriétaire du lot avec le codec d’objet immuable existant et journal d’upload. Les résultats importants restent en dehors de l’SQL. Les contraintes de référence des nœuds/exécutions/versions existantes et les formats de configuration/artefacts de v1 publiés restent inchangés.
- Attacher chaque requête à sa version originale de exécution/nœud, la configuration figée, les entrées du nœud, les versions/sommes de hachage et les poids du contenu source, le candidat actuel, les paramètres du modèle non secrets, la version de l’algorithme et le champ exact de la requête. `scope_hash`, `plan_hash`, `input_hash` et `batch_key` Imposer l’identité. Ne copiez jamais les lots entre les exécutions.
- Seuls les résultats complets valides ou les décisions de subdivision de l’hôte complet doivent être conservés. Les verdicts négatifs et les diagnostics détaillés doivent être préservés. L’agrégation finale, la validation des diagrammes, l’autorisation des sources, les quotas et l’acceptation de la publication restent en vigueur.
- Vérifier à nouveau les permissions de source et le bail actif avant de lire, de produire et d’installer un résultat de manière transactionnelle. Les instances concurrentes installent une victoire immuable. La suppression ou la perte de permissions ou de bail pendant l’upload empêche l’installation.
- L’intérieur `evidenceInventory` Stocke les locateurs de source, les versions, les hachages, les poids et les références de permissions sans copies de titre ou de texte de la source. Le empreinte de modèle contient le fournisseur, le modèle, l’endpoint, le mode/version de l’API, les budgets d’entrée/sortie et la configuration de l’outil, à l’exclusion des clés API, des alias et des prix.
- La réparation du contenu via le flux explicite existant établit un nouveau champ de contenu et préserve les anciens points de contrôle sans les réutiliser. Une modification de modèle ou d’algorithme dans le même champ nécessite une nouvelle exécution. Les versions inconnues, la corruption, les résultats invalides ou les objets manquants empêchent la récupération ; ils ne déclenchent jamais silencieusement la régénération ou la conversion.

Ce sont de nouveaux points de contrôle privés, et non un adaptateur pour les anciens formats de résultat. Les lignes existantes sans points de contrôle par lot conservent leur comportement de nœud complet jusqu’à ce qu’un nœud inachevé exécute de nouvelles requêtes.

<a id="deployment-retention-and-recovery"></a>

## Déploiement, retenue et récupération

Faire une sauvegarde de la base de données et du stockage d’objets privés, conserver la clé maîtresse des identifiants originale, arrêter les exécuteurs, et mettre à jour tous les exécuteurs et collecteurs en même temps. La réconciliation du schéma ajoute les tables vides de manière transactionnelle et enregistre son empreinte sans aucune augmentation de charge de génération. Les exécuteurs ou collecteurs mi anciens et nouveaux ne sont pas supportés, car le code ancien ne peut pas protéger les références nouvelles.

`DOCA_BOOK_BATCH_CHECKPOINTS` s'applique par défaut `on`; seulement `on` et `off` Sont acceptés, et les valeurs invalides échouent au démarrage avant l’ouverture de la base de données. Redémarrez après avoir modifié cela. Sur le binaire actuel. `off` Les reruns récupèrent les nœuds incomplets tout en conservant toutes les lignes de point de contrôle et les pin de objets. Ils ne contournent pas les barrières de qualité ni ne modifient les données. Les échecs, les suppressions et les scopes inadaptés ne suppriment pas les checkpoints ; la suppression permanente du livre libère leurs références via le chemin de suppression explicite existant.

Le retour en arrière du stockage physique hors ligne refuse les points de contrôle existants avant la modification. La réduction de version des fichiers, la restauration des sauvegardes ou la conversion des points de contrôle nécessite un plan de préservation et de restauration approuvé séparément. Ne supprimez pas de lignes, d'objets ou de table pour contourner cette limite.

<a id="verification"></a>

## Vérification

Le pipeline de synthèse complet échoue lors de sa deuxième étape de écriture, remplace l’ensemble du système de exécution et reprend son fonctionnement : le nombre total de demandes d’écriture passe de deux à trois, et non à quatre, et toutes les 42 demandes sont acceptées et publiées. D’autres tests permettent de restaurer les plans/assignations de longue durée, les diagnostics négatifs et les décisions de subdivision. Un test réel de stockage de fichiers valide une seule étape et met fin au processus avec SIGKILL ; un nouveau processus et un nouveau bail restaurent la première étape, avec zéro appels du producteur, et exécutent uniquement l’étape manquante une fois.

Le produit réellement sorti `smartdoca/doca:0.2.3` Image créée avec des données isolées des matchs SQLite et PostgreSQL 17/18. La mise à jour conserve tous les hachages des 13 anciennes tables, les bytes du corps du node/run/release, les pointeurs de publication et la génération ; la nouvelle table commence vide. Voir [registre de vérification](verification/knowledge-book-checkpoints-2026-10-19/README.md) pour les commandes, les résultats et les limites.
