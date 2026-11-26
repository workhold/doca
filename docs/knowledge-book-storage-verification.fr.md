<a id="knowledge-book-storage-verification-and-operations"></a>

# Vérification et opérations de stockage des livres de connaissances

[简体中文](knowledge-book-storage-verification.zh-CN.md)

Le plan complet a été explicitement approuvé le 2026-10-12. La mise en œuvre et la vérification isolée ont été terminées le 2026-10-13 ; cette vérification n’a pas converti de base de données utilisateur ni déployé en production. Voir… [plan de mise en œuvre](knowledge-book-payload-storage-plan.md).

<a id="automatic-startup-upgrade-in-0124"></a>

## Mise à jour automatique d’initialisation dans la version 0.1.24

Arrêter tous les hôtes anciens et faire une sauvegarde des données SQL, du stockage privé et de la configuration. À partir de 0.1.24, lors de la version 0.1.22 publiée. `doca-2026-10-09-history-storage-v1` Le système compare automatiquement l’ensemble du schéma avec le DDL actuel. Une fois le plan approuvé, la transaction de verrouillage du schéma corrige les ajouts déclarés et enregistre la génération cible. Chaque ligne de business et chaque pointeur de publication reste intact, y compris les résultats générés par SQL, les exécutions et les tâches humaines. Les données de stockage d’objets de version 0.1.23 restent exactes en termes de taille de données. Aucun commande manuelle n’est nécessaire, et aucune nettoyage supplémentaire, conversion automatique ou lecteur de runtime legacy n’est ajouté. Les résultats anciens qui restent peuvent nécessiter une manipulation manuelle avant de pouvoir être utilisés.

Toutes les modifications de structure/génération sont annulées en cas de échec. Les démarrages répétés/concurents conservent chaque ligne. Les générations inconnues, antérieures et interrompues s’arrêtent sans modifier les données ; les tables inconnues non liées nécessitent néanmoins une revue. Toutes les données doivent être conservées et les écritures après la mise à jour doivent être effectuées lors de toute restauration de sauvegarde. Tous les hôtes et instances web doivent être mis à jour ensemble.

Les commandes de maintenance existantes ci-dessous restent optionnelles si les résultats générés antérieurs doivent être conservés dans un format natif utilisable. Exécuter l’upgrade avant le premier démarrage ; l’alignement du schéma modifie la génération source. La vérification historique indiquée ci-dessous montre que c’est une conversion optionnelle, et non une adaptation automatique des données SQL JSON restantes.

Preuves d’alignement automatique : les fichiers réellement publiés dans la version 0.1.22 pour SQLite/PostgreSQL 17/18 conservent chaque ligne de 114 tables commerciales et tous les 20 corps SQL ; les nouveaux objets natifs restent lus après des démarrages répétés ou concurrents. PostgreSQL 17/18 a réussi à surmonter 91 cas de régression, y compris les rollback et le rejet strict des corps legacy. Voir [vérification](verification/book-schema-startup-2026-10-13/verification.json).

<a id="maintenance-commands"></a>

## Commandes de maintenance

Utilisez une nouvelle build d’hôte contenant ces modifications et l’environnement de déploiement existant. Disponible. `smartdoca/doca:0.1.22` C’est la source de conversion et ne contient pas la nouvelle commande. Arrêter chaque hôte et faire une sauvegarde de SQL (y compris SQLite WAL), des objets privés et de la configuration. Conserver la clé maître originale, stocker les IDs et la configuration du backend. Mettre à jour tous les hôtes et les builds web ensemble.

L’commande ouvre la base de données existante sans initialisation. Le mode par défaut effectue une vérification préliminaire en lecture seule. L’application est nécessaire. `--apply --hosts-stopped` Et une nouvelle route de manifeste de restauration. Les manifestes utilisent le mode 0600 et conservent la empreinte originale, les identités d’utilisateur, les tailles et les hachages, sans miroirs du corps.

```sh
pnpm knowledge-books:storage upgrade
pnpm knowledge-books:storage upgrade --apply --hosts-stopped --manifest /secure/book-upgrade.json
```

Seulement `doca-2026-10-09-history-storage-v1` Accepté. Les générations précédentes doivent d’abord terminer la conversion de leur histoire exactement supportée. Exécuter les tâches de livre, gérer les formats de fichiers inconnus, traiter les données corrompues et convertir les différences structurelles nécessitant une revue, sans écritures partielles. Résoudre la condition spécifique plutôt que d’annuler les tâches inconnues, inventer des champs historiques ou nettoyer le SQL.

Après une interruption, le démarrage normal rejette la génération de progression. Reprenez le même commande avec le même chemin de manifeste. Les bytes convertis doivent toujours correspondre à ce manifeste ; le remplacement ne peut pas ignorer les données modifiées. Une fois terminé, le démarrage ne accepte que `doca-2026-10-12-book-payload-storage-v1`Le rythme cardiaque indépendant résout les notifications en attente après le démarrage ; les tâches historiques terminées ne sont pas remplies à nouveau. Les résultats et erreurs historiques restent conservés.

Rétroaction actuelle rejette les contenus non vides `knowledge_book_batch_checkpoints` Avant la modification : leurs références nécessitent un plan de conservation/recuperation approuvé séparément. Ne supprimez pas les points de contrôle ni évitez la génération/contrôle de la structure. Voir [retention et récupération du point de contrôle](knowledge-book-generation-performance.fr.md#deployment-retention-and-recovery). Le trajet historique décrit ci-dessous remonte avant les points de contrôle par lot et ne vérifie pas les abaissages arbitraires de version de 0.1.22 à la version actuelle.

Arrêter tous les hôtes une fois de plus pour un rollback valide, et conserver un nouveau manifeste de sauvegarde et de restauration. Lire chaque objet en pré-check et vérifier ses bytes originaux. Le rollback restaure également les écritures post-upgrade et conserve les objets cloud ainsi que les matériaux de restauration.

```sh
pnpm knowledge-books:storage rollback
pnpm knowledge-books:storage rollback --apply --hosts-stopped --manifest /secure/book-rollback.json
```

Le rollback interrompu reprend son état initial. Une fois tout le JSON restauré et vérifié, seules les quatre tables d’extension de stockage sont supprimées, et la empreinte de données et la génération ancienne sont enregistrées. Cible : l’hôte précédent 0.1.22. Le rollback complet de la base de données s’effectue avant tout le rollback optionnel de l’histoire des documents plus anciens. Les pages SQLite libérées ne réduisent pas automatiquement le fichier ; aucun VACUUM n’est effectué.

<a id="isolated-evidence"></a>

## Preuves isolées

L’image source réelle était `smartdoca/doca:0.1.22`, ID de l’image `sha256:a5316eb01bf25b0d89801139de85d34a35528be376699c4981ab8a09fd14f04c`Son véritable exécutant a généré des tâches synthétiques publiées, échouées et en attente de publication. Aucune base de données de production ou document utilisateur n’a été accédée.

Chaque fichier SQLite/PostgreSQL 17/PostgreSQL 18 contenait 20 objets originaux non vides. Une mise à niveau explicite, deux démarrages ordinaires et un retour en arrière explicite ont vérifié tous les 20 séquences de données JSON et hachages originaux, préservant les états, les erreurs, la configuration et les tâches humaines. Les enregistrements se trouvent `docs/verification/knowledge-book-storage-plan-2026-10-12/actual-roundtrip*.json`.

| Métrique | SQLite | PostgreSQL 17/18 |
| --- | ---: | ---: |
| Bytes du corps SQL original | 3,698,834 | 3,698,834 |
| Nouvelles bytes de référence SQL | 7,170 | 7,170 |
| Bytes JSON des métadonnées sérialisés | 403,190 | 404,294 |
| Objets uniques | 266 | 266 |
| Racines / références | 8 / 20 | 8 / 20 |
| Bytes d’objet comprimé enregistrés | 94,508 | 94,499 / 94,478 |

Les métadonnées décrivent les objets, les références, les opérations et les liens de dépendance ; elles ne sont pas des données physiques liées aux pages/indexes/WAL ou aux sauvegardes. Ce texte synthétique est très répétitif et ne permet pas d’établir des économies réelles.

Les cas de régression couvrent des segments limités, les écarts/Unicode, le partage entre livres et l’isolation entre livres, les uploads concurrents, les interruptions/récupérations, la corruption, le rejet de formats inconnus sans DDL partiel, le rollback des écritures plus récentes, les résumés uniquement en SQL, la révocation des permissions de cache, le nettoyage des uploads tardifs. La matrice CI PostgreSQL inclut également des tests de livres de connaissances et de payload.

Preuves provenant du navigateur `lazy-candidate.json` Aucun lecteur de corps impatient, une lecture lors de l’expansion, réutilisation lors de la réouverture, retrait du corps après annulation, et aucun erreur de navigateur. La stabilité de Mermaid est enregistrée séparément. `docs/verification/knowledge-book-reliability-2026-10-12/preview-result.json`.

<a id="operational-boundaries"></a>

## Limites opérationnelles

La configuration locale privée du hôte S3 est réutilisée sans URLs publiques ni identifiants propres au module. Les bases de données SQL et les objets sont sauvegardés en tant qu’ensemble cohérent. Les objets manquants ou corrompus échouent explicitement, tout en conservant les références ; les corps vides ne remplacent jamais le contenu indisponible.

Le nettoyage supprime uniquement les objets inaccessibles. Le réservoir de déchets conserve les références ; le nettoyage permanent les libère. Les dépendances liées à la téléchargement en temps réel sont protégées, et les téléchargements échoués ou tardifs conservent des clés durables pour les réessayages. Les journaux terminés ne conservent que les téléchargements physiques concurrents qui échouent, tandis que les dépendances installées restent dans les objets/arêtes. Aucun TTL historique n’est ajouté.

Vérifications finales : le ensemble de tests pertinent pour SQLite avec 126 cas a été réussi, suivi par l’ensemble de tests pour les livres/payloads avec 60 cas après les vérifications finales des endpoints et des permissions. Les 68 ensembles de tests pertinents pour PostgreSQL 17/18 ont également été réussis, et les 11 ensembles de tests pour les payloads ont été réussis avec les deux moteurs. Les vérifications de type, la construction web, les liens de documentation et les vérifications du espace blanc ont été réussies. Voir `docs/verification/knowledge-book-storage-plan-2026-10-12/verification.json`Le monitoring du rythme cardiaque et le nettoyage des objets utilisent des horodatages indépendants, de sorte que les requêtes cloud ne occupent pas le temps de réconciliation du rythme cardiaque.
