<a id="editor-collaboration-contract"></a>

# Contrat de collaboration avec l'éditeur

[中文](collaboration-sdk-contract.zh-CN.md)

Applique à texte enrichi, Markdown, feuilles de calcul, canevas, diapositives et futurs types de documents. Créé le 2026-09-11 ; les mises en œuvre suivantes conservent leurs propres dates et versions. Utilisez-le [matrice actuelle de l'éditeur](editor-integration.fr.md) pour les packages installés.

La plateforme possède une connexion, une autorisation, une stockage d'increment, une confirmation de commit, un réseau de connexion et une session en ligne. Chaque composant possède son propre modèle de données et sa propre rendu. Le comportement partagé ne signifie pas convertir une feuille de calcul en une structure de texte enrichi.

Le protocole de service actuel est également décrit. [collaboration et recherche](collaboration.fr.md)Ce document est le prochain contrat partagé. Un champ ici n’est pas automatiquement une API publiée.

<a id="_1-layers-and-versions"></a>
<a id="1-layers-and-versions"></a>

## 1. Couches et versions

| Layer ou champ | Dutte partagées | Différence de composant |
| --- | --- | --- |
| Transport | WebSocket de même origine, une enveloppe unique, authentification serveur | Aucun |
| Enregistrer | Incrément local, envoi hors base de données, commit de la base de données, ACK | Aucun |
| format / codec / schemaVersion | Identifie le type et si la structure est compatible. | Nœud texte enrichi CRDT ; commandes de ligne, de colonne et de cellule stable sur feuille de calcul |
| epochId | Une lignée de CRDT. Elle ne change que lorsqu’une reconstruction incompatible se produit. | Une feuille de calcul nécessite également une base de fichier immuable liée à l'époque |
| seq | Nombre monotonique de commits valides dans l’époque actuelle | Aucun |
| point de contrôleSeq | La séquence de commit couvrant un point de contrôle complet Yjs est déjà prête. | Ne supprimez pas les commandes logiques dont la composante a encore besoin de rejouer. |
| resource.version | Verrouillage optimiste pour les métadonnées commerciales | N’ai pas l’habitude de fusionner Yjs |
| ID de version de l’histoire | Un aperçu d’entreprise que l’utilisateur voit ou qui est annulé | Toute mise à jour du réseau n’est pas nécessaire. |
| vecteur d’état | Résumé de la différence de synchronisation | Pas une confirmation complète de sauvegarde, surtout pour la confirmation de suppression. |

Chaque format utilise epochId comme ligne de succession. Un point de contrôle Yjs périodique ne modifie pas l’epoch. Une feuille de calcul utilise la session actuelle Yjs et la séquence de points de contrôle.

<a id="_2-platform-and-component"></a>
<a id="2-platform-and-component"></a>

## 2. Plateforme et composants

La plateforme dispose d’une session en temps réel par page : socket, ACL, file d’attente d’incrément, ACK, reconnexion, snapshots commerciales, commentaires, notifications et permissions d’actifs. Un composant ne ouvre pas de deux sauvegardes automatiques HTTP ou socket.

Un composant crée le Y.Doc et l’éditeur une fois par session de document. Les modifications locales sont mappées sur Yjs. Les transactions distantes sont projetées sur la vue. Il expose la disponibilité, les erreurs, l’état du format, la sélection et les ancres. La modification des propriétés, des valeurs readonly, des curseurs, de la taille ou de l’indication de sauvegarde ne doit pas réécrire le document partagé.

Le serveur peut cacher les différences de format derrière une extension de codec : initialisation, validation d’une fusion, construction de la projection commerciale, import et export, et récupération du historique. La salle générique, les permissions et le chemin de stockage ne comprennent pas une barre d’outils ou un DOM de cellule.

<a id="_3-messages-and-lifecycle"></a>
<a id="3-messages-and-lifecycle"></a>

## 3. Messages et cycle de vie

Enveloppe suggérée : protocolVersion 1, type, id, room (UUID du ressource), et epochId. La première connexion peut omettre epochId. Une fois que le serveur le renvoie, les écritures ultérieures doivent le inclure. L’identité, la sessionId, le nom et la couleur sont définis par le serveur.

1. join envoie le codec pris en charge et schemaVersion, l’époque connue, ainsi que le vecteur.
2. La réponse de synchronisation renvoie l’epochId, le codec, la version de schéma, la séquence, la séquence point de contrôle, le rang, l’actualisation et le vecteur. Une feuille de calcul renvoie également la base immuable associée à cette réponse.
3. La vue n’est prête que après vérification de la ligne de base, après que Yjs soit mis à jour et après que la projection soit effectuée. Ne montrez pas un document vide éditable, puis ne le remplacez pas.
4. L’update contient l’id, la salle, l’epochId et les bytes Yjs (en format base64 selon le canal JSON actuel). Seul l’incrément du contenu local réel est envoyé.
5. ACK utilise le même ID et epochId, ainsi que la séquence après la validation, éventuellement avec des métadonnées modifiées et métadonnées commerciales. Il est envoyé après la validation de la transaction.
6. Une mise à jour valide est diffusée vers les autres sessions qui ont encore les droits nécessaires. L’application d’une mise à jour à distance ne doit pas entraîner de écriture locale.
7. Le `sync-request` et le `sync-response` ne remplissent que la différence. Ce ne sont pas un ACK. Ils ne doivent pas vider la file d’attente non reconnue ou télécharger inconditionnellement après chaque rattrapage.
8. Quitter et déconnecter pour annuler la sélection de cette session. Les erreurs d’autorisation, d’époque et de schéma sont distinctes. Ce ne sont pas toutes des tentatives de réseau ordinaires.

Une tentative de répétition de la même écriture non reconnue conserve les bytes originaux et l’identifiant du message. La fusion Yjs est idempotente. Une livraison double ne augmente ni le numéro de séquence, ni les audits, ni les notifications, ni l’historique. Doca déduplique avec éditeur et reçus Markdown clésisés par resourceId, epochId et messageId. Le même identifiant avec un payload différent est rejeté.

<a id="_4-save-state"></a>
<a id="4-save-state"></a>

## 4. Sauvegarder l’état

L’état de connexion varie entre chargement, synchronisation, prêt, et désconnexion ou erreur en cas de failure. L’état de sauvegarde est distinct : propre, sale, en cours de sauvegarde, erreur.

- Seule une transaction de contenu local entre dans la boîte de sortie. L’initialisation, la sélection, la défilement, le focus, la taille, le nombre en ligne, le heartbeat, la relecture à distance et l’interrupteur de lecture seule ne provoquent pas une mise à jour du contenu.
- « Sauvegarder sur le cloud » nécessite un vide de la boîte de sortie et une synchronisation terminée. « Sauvegarder » nécessite une écriture en attente d’une confirmation.
- La file d’attente est transmise en série. Seul un ACK correspondant à l’ID de tête peut faire sortir un élément de la file. Un ACK inconnu, tardif ou dupliqué ne doit pas empêcher les entrées ultérieures de être traitées.
- Le déconnexion conserve les bytes et l’id. La reconnexion rattrape les données provenant du serveur distant, puis réessaye les increments non reconnus.
- Un événement offline du client annule immédiatement la connexion en temps réel et suspend les tentatives de reconnexion. L’événement en ligne se reconnexte et effectue la opération habituelle de rejoindre le document.
- L’avertissement hors ligne apparaît pour une réplique modifiable lorsque le navigateur est hors ligne ou que la connexion de collaboration échoue. La connexion en ligne initiale et la synchronisation du document maintiennent l’avertissement caché. Après une disconnexion, l’avertissement disparaît lorsque le document se synchronise complètement.
- Ne traitez pas `encodeStateAsUpdate(doc, vector).length` Tellement sale. Le même état peut encore retourner un ensemble de suppression historique. Une longueur supérieure à 2 n’est pas une nouvelle écriture.
- Une inadéquation d’époque fait suspendre la file d’attente ancienne. L’exportation ou une copie de restauration séparée est autorisée. Les mises à jour antérieures ne sont pas imposées au nouveau document.
- Les adaptateurs hôte actuels conservent les points de contrôle originaux et les IDs de messages en attente. `offline-replica.ts`L’édition hors ligne nécessite une copie autorisée et une sauvegarde locale réussie. Le bundle de bureau et la version web téléchargée peuvent être lancés à partir de la liste de documents locale.

Les deux hôtes utilisent `apps/web/src/features/documents/update-outbox.ts`La file d’attente ne dépend pas du type de document. Elle conserve l’incrément réel de la transaction locale. Une réponse de synchronisation ne déclenche pas une upload inconditionnelle.

<a id="_5-suggested-component-api"></a>
<a id="5-suggested-component-api"></a>

## 5. API des composants suggérés

Chaque composant fournit des méthodes connect, setReadOnly, dispose, onSelectionChange, renderRemoteSelections, clearRemoteSelections et onError, avec des codes d'erreur distincts. Le texte enrichi propose également un état de formatage : marques, type de bloc, alinéa, canUndo et canRedo. Les barres d'outils fixes et flottantes partagent cet état. Ne devinez pas le formatage à partir du DOM.

Les origines des transactions sont locales, distantes ou bootstrap. Seulement les transactions locales sont écrites par l’utilisateur. Ne répétez pas les commandes lors de l’application d’une transaction distante, et créez un nouveau identifiant d’opération.

<a id="_6-live-selections"></a>
<a id="6-live-selections"></a>

## 6. Sélections en direct

L’union de sélection est du texte (ancrage relatif et focus), des cellules (sheetId, plage de ligne et de colonne fermée à zéro, et édition), ou null.

L’identifiant de session est lié à chaque connexion. Le nombre de sessions en ligne évite les doublons liés à l’identifiant utilisateur. Les dessins excluent la session actuelle et incluent les autres pages de la même compte. L’option « édition » activée signifie que l’utilisateur tape. Une sélection qui n’est pas en train de taper est considérée comme fausse. Les modifications et les débuts ou fins d’édition déclenchent un événement. Les valeurs de cellule, les formules et les touches de clavier ne sont pas transmises. La publication est limitée à 100–150 ms et évite les doublons. Elle ne modifie pas la base de données, ne met pas à jour une version ou n’affecte pas l’annulation. Les deux modes d’édition publient la sélection de cette session. L’édition sans distraction masque les curseurs et les sélections des autres sessions dans la vue du document actuel. Quand on quitte l’éditeur, qu’on quitte le document, qu’on se déconnecte ou qu’on annule, la sélection est effacée. Le serveur vérifie les ACL à chaque message. Changer de fichiers dans le navigateur conserve la position de dernière modification d’une session encore en ligne. Les feuilles de calcul dessinent une bordure colorée et une étiquette de nom uniquement sur la feuille actuelle. Les coordonnées numériques sont temporaires et peuvent être temporairement invalides pendant l’insertion de lignes et de colonnes. Un ancrage de commentaire à durée longue utilise des identifiants de ligne et de colonne stables.

L’éditeur de feuille de calcul publie, reçoit et met en évidence la présence via son état de sélection et l’API en temps réel. Si cette capacité est intégrée dans un package de feuille de calcul distinct, conservez cette union de sélection et son cycle de vie. Le hôte ne devrait pas dépendre indéfiniment des détails de la facette.

<a id="_7-snapshots-rollback-and-region-comments"></a>
<a id="7-snapshots-rollback-and-region-comments"></a>

## 7. Snapshots, rollback et commentaires de région

Un point de contrôle Yjs stocke l’encodage CRDT original. Ne reconstruisez pas à partir d’une projection JSON et ne perdez pas l’identité. Une feuille de calcul stocke une base immuable ainsi que les commandes dans la même époque. Ne prenez pas la dernière fichier de travail comme base et ne rejouez pas les anciennes commandes dessus.

Un point de contrôle périodique maintient l’époque. L’histoire utilisateur est créée à des points significatifs. Un enregistrement d’histoire conserve son propre format, codec, époque, baseline et dépendances des ressources. Ne interprétez pas une version ancienne avec le baseline actuel. Le rollback privilégie un changement nouveau dans l’époque actuelle et conserve l’histoire avant le rollback. Si un composant ne peut que se reconstruire, il doit changer explicitement d’époque, gérer les écritures non reconnues et ensuite charger la nouvelle ligne de vie.

Les enregistrements de base capturent des snapshots des écritures réussies indépendamment de la participation. Les snapshots automatiques, manuels, d’IA et de pré-rollback partagent la persistance et la frontière de la transaction. Une écriture échouée est rétroactive. La politique de conservation du hôte convenue préserve les 20 dernières snapshots complètes dans la base de données, et pour chaque groupe complet de dix snapshots plus anciens, on conserve le plus récent en tant que point de restauration privé sous fichier. Seule une téléchargement immuable vérifié permet de enregistrer atomiquement son index et de retirer ce groupe de la base de données ; les neuf autres points sont délibérément éliminés. Les groupes incomplets et les échecs de stockage conservent les originaux de la base de données. L’utilisateur reçoit une liste de snapshots paginée ordinaire avec des IDs inchangés et sans champs de localisation de stockage. Les bytes des snapshots, les métadonnées de restauration indépendantes et les attaches restent inchangés ; les checkpoints en temps réel et les increments de collaboration non découverts ne sont pas échantillonnés. Une politique commerciale ne peut ajouter une suppression implicite en dehors de cette politique de conservation convenue. Les capacités de rétroaction existantes restent spécifiques au format. Voir [opérations de stockage](storage.fr.md#history-storage-and-offline-upgrade).

L’auteur, le corps, les réponses et la résolution sont stockés dans la base de données de la plateforme. Le composant fournit les fonctions captureAnchor, resolveAnchor, renderAnchors et onAnchorClick. Le texte enrichi utilise une position de texte relative. Une feuille de calcul doit utiliser une plage de ligne et de colonne stable qui se transforme avec les ajouts et les suppressions. Un ancrage entièrement supprimé ou résolu n’est pas mis en évidence.

Le paquet et le hôte de feuille de calcul actuels implémentent les commentaires de région avec des identités de ligne/colonne stables, la capture/ résolution/revélation des APIs, la rendu des marqueurs, la validation de l'époque et le traitement des cibles supprimées. L'insertion de lignes/colonnes, la tri et les modifications de feuille sont couverts par des tests isolés. `tests/editor-sessions.test.ts`, `tests/sheet-axis-sizes.test.ts` et `tests/sheet-collection.test.ts`Ce protocole permanent est indépendant de la présence temporaire des cellules.

<a id="_8-shared-acceptance"></a>
<a id="8-shared-acceptance"></a>

## 8. Acceptation partagée

1. Ouvrir les données existantes, attendre 60 secondes, sélectionner, naviguer et redimensionner. Aucun nouveau contenu ni historique de commit.
2. A est modifié, B reçoit, B ne fait pas écho à un commit, et les projections correspondent.
3. Deux pages d’un même compte ont des couleurs et des noms différents. Les sélections de texte et l’état d’édition des cellules sont exacts. Le mode « lecture seule » ne publie ni ne affiche rien.
4. ACK perdu, duplicata et retardé, plus écriture pendant la reconnexion, aucun données perdues et les données sauvegardées ne sont pas affichées à l’avance.
5. La synchronisation répétée après une suppression pure ne télécharge pas à nouveau l’ensemble supprimé.
6. Une base de données, une époque ou un schéma inadapté est rejeté. Une initialisation répétée ne crée pas de nouveaux contenus.
7. Insérer et supprimer les lignes et colonnes d’une feuille de calcul, modifier les cellules, appliquer des formules, fusionner, trier et filtrer, ainsi que annuler les actions sont acceptés un par un. Une opération non supportée est déclarée ou désactivée. Ne prétendez pas que tout converge.
8. Après redémarrage, l’augmentation du point de contrôle correspond à la projection en ligne, y compris après la compactation des logs.
9. La révocation, l’inactivation, l’accès anonyme, une pièce étrangère, une identité falsifiée et une sélection hors de portée sont isolées lors de l’édition.
10. Les barres d’outils fixes et flottantes ont le même format. Une mise à jour du état de sauvegarde ne reconstruit pas l’éditeur ni ne perd le focus.

<a id="_9-what-is-implemented"></a>
<a id="9-what-is-implemented"></a>

## 9. Qu’est-ce qui est mis en œuvre

Le hôte actuel intègre texte enrichi, Markdown, feuille de calcul, canevas et diapositives avec une file d’attente de commit partagée et fiable et des ACKs durables. La synchronisation inactive ne reproduit pas le contenu ; les sélections et les noms utilisent des adaptateurs de format. Tous les cinq formats permettent de lire l’historique ; la restauration par le gestionnaire n’est supportée qu’pour le texte enrichi et le Markdown. Les préviews de feuille de calcul, de canevas et de présentation sont affichées. `canRestore:false`Cela ne constitue pas une API unifiée de rollback des composants pour tous les formats.

La plateforme implémente des vérifications d’époque, des contrôles de protocole, des reçus de commit et des métadonnées de restauration de l’histoire. Sans Redis, les broadcast et la présence sont un seul processus. Avec Redis, les mises à jour des documents, les mises à jour du serveur, l’annulation des permissions, les notifications et la présence se font entre les instances. Le commit de la base de données reste la frontière ACK et la source de vérité des documents. Après le réseau de Redis se reconnecte, le serveur envoie à nouveau l’état autoritaire aux salles actives de cette instance. Pub/Sub n’est pas un journal durable, et une panne de Redis ne se résout pas silencieusement par retour au bus local.

Les API de sélection formelle et le retour en arrière unifié entre différents formats restent des tâches partagées entre le composant et la plateforme. Le hôte est responsable de l’initialisation des documents hors ligne ainsi que de sa file d’attente persistante. Les capacités du composant nécessitent encore la vérification des exportations du paquet installé.

Liste de documents autorisés hors ligne pour le domicile **Modifications récentes**Un document se rattache au dossier après une ouverture en temps réel dans le nouveau client, lorsque sa réplique locale correspondante est disponible. Le bureau utilise son frontend intégré. Le workspace Web met en cache automatiquement les ressources de build de même origine après l’inscription. Une réplique éditable affiche un message d’édition hors ligne lorsque le client détecte une perte de connexion. La reconnexion valide l’accès et la trace avant d’envoyer les modifications en attente via le chemin durable ACK existant. Un document fermé reprend la synchronisation lorsqu’il est rouvert. Voir [documents hors ligne et récupération](access-offline-events.md#离线文档入口).

<a id="plugin-elements-increment--2026-10-02"></a>

## Les éléments du plugin augmentent — 2026-10-02

Le hôte implémente maintenant le registre d'éléments Web optionnel SDK 0.1.6. Le texte enrichi stocke un enveloppe JSON opaque via un élément permanent. `custom:plugin-element` Codec intégré utilisant le schéma riche existant 3. La feuille de calcul stocke du JSON opaque dans le format natif `ICellData.custom.docaElement` Utiliser le schéma existant 6 et le chemin de commande de gamme publique. Aucun changement n’est apporté au transport, à la version du protocole, à l’époque, à l’identité du point de contrôle, aux réceptions ACK ou à la sortie fiable. Il n’y a pas de deuxième sauvegarde automatique en JSON ni de base de données de contenu propriétaire par l’entreprise.

Les types inconnus et les versions exactes de feuille de calcul affichent un placeholder non supporté et conservent leur JSON initialement limité. Aucun adaptateur, migration, conversion ou suppression n’est fourni. Les lecteurs de référence internes existants restent inchangés. L’insertion, la configuration et la suppression natifs participent au clavier, à l’annulation et à la collaboration. Les formulaires de configuration vérifient à nouveau une plage riche en temps réel ou un ancrage de cellule unique sur une feuille de calcul stable, et échouent sur un objet supprimé ou modifié simultanément. Les timers de canevas sont uniquement consultables, au maximum une fois par seconde, et programmés uniquement après que la cellule temporelle visible a été dessinée ; les pages cachées s’arrêtent. Les changements de rendu, de sélection ou de statut inactif ne doivent pas augmenter la séquence de contenu ou l’histoire.

Les acceptations automatisées isolées couvrent la persistance native et le rechargement, les en-têtes de données inconnus et opaques, les opérations de suppression/annulation/collection de feuilles de calcul, l’insertion de lignes de feuille/ancrage/copie/suppression/annulation, le rejouement des ACK dupliqués, la convergence de deux réplicas sans écho distant, le refus de lecture seule et le rollback des en-têtes de données trop volumineux. Les tests ne modifient pas les documents utilisateur. Cette amélioration ne garantit pas le support universel des blocs, ni toutes les opérations de feuille de calcul, l’export sans perte entre formats, les files en ligne sans connexion permanente ou l’acceptation native du dispositif. Les champs et limites précises des éléments se trouvent dans la source du répertoire. `docs/plugin-editor-elements.md`.

<a id="markdown-bootstrap-correction--2026-10-03"></a>

## Correction de Markdown Bootstrap — 2026-10-03

L'hôte restaure le point de contrôle autoritaire dans une réplique vide avant d'appeler la fabrique de session Markdown expédiée. Il ne marque plus plus de métadonnées locales dans une réplique chargée : les horloges CRDT non soumises ont fait que la première mise à jour de texte dépendait de éléments absents du serveur. Les snapshots d’état de session conservent les mêmes objets doc/text/awareness/undo. Aucun changement d’adaptateur de schéma, d’époque ou de format persistant ; les modifications en attente existantes sont conservées et ne sont pas converties ou effacées silencieusement. L’acceptation de la régression inclut la restauration durable de la première modification, sans echo remote/bootstrap et avec des gestionnaires d’état stables ; la vérification par le navigateur couvre la saisie, les mises à jour entre instances, le rechargement et les vérifications en mode inactif sur les documents isolés.

<a id="rich-text-diagram-anchors--2026-10-10"></a>

## Ancres de diagrammes de texte riche — 2026-10-10

Avec l’installation `@smartdoca/slate` 0.4.13 : Le hôte capture les diagrammes de flux et les cartes mentales natifs en utilisant l’ancrage de bloc entier existant.`kind:"block"`, stable `blockId`, et le présent `epochId`). Les citations de serveur proviennent des étiquettes des nœuds autorisés ou du sujet racine. Les commentaires et les références IA ciblent l’ensemble du diagramme, restent valables après les modifications de style native et les restauration des points de contrôle, et cessent de résoudre après la suppression d’un bloc. Les IDs de nœuds/arêtes du diagramme ne sont pas des ancres de commentaires sub-diagrammes permanents. La capture, la sélection, les surlignages et les références IA sont en lecture seule par rapport au contenu du document ; ils utilisent la sortie actuelle et le transport sans changements de schéma ou de lignage. Aucune conversion de document stocké ou de commentaire historique n’est introduite.

<a id="published-spreadsheet-package-integration--2026-10-10"></a>

## Intégration du package de feuille de calcul publié — 2026-10-10

Le hôte 0.1.18 verrouille l’artefact du registre. `@smartdoca/sheet` 0.2.0-rc.19. L’action de la barre d’outils de validation des données est distincte de Insert → Liste déroulante. Les déclarations publiques et les points d’entrée Yjs/model/XLSX sont identiques en termes de données à rc.18 ; l’hôte continue d’utiliser les extensions de menu, les ressources, les ancres stables et les API de collaboration fournies. L’hôte synchronise les éléments fournis `session.setReadOnly` API et met à jour l’snapshot des capacités avant de peindre après changement de mode, sans reconstruire le workbook ou Y.Doc. L’insertion d’élément plugin utilise maintenant `SPREADSHEET_MENU_PATHS.toolbarEnd` via les extensions de menu natives. Il s’agit d’une intégration UI/package sans codec, schéma, epoch, outbox, conversion de données persistantes ou nouvelles comportements de compatibilité. Les lecteurs d’historique existants et les commandes explicites de maintenance de base hôte restent inchangés. Les regressions de package et de hôte utilisent des feuilles de calcul isolées ; le succès de la construction ne garantit pas l’acceptation de toutes les opérations de feuille de calcul.

<a id="cached-document-startup--2026-10-12"></a>

## Démarrage du document en cache — 2026-10-12

La modification de hôte approuvée par l’utilisateur ajoute les métadonnées d’affichage de version exacte-1. `doca.document-startup.v1` Pour l’utilisateur connecté actuel et ses douze documents les plus récemment chargés. Il contient des champs de bootstrap publics, des métadonnées des documents et des métadonnées de la bibliothèque contenant, sans identifiants, commentaires, subventions ou deuxième projection de contenu. Il ne modifie ni ne convertit les checkpoints Yjs existants, les bases immuables, les époques, les protocoles schéma/codec, les IDs de message ou les ACKs durables. Les anciens hôtes n’ont pas de métadonnées de démarrage : une instance en cours est nécessaire pour les créer. Les formats de démarrage inconnus ou corrompus ne sont ni utilisés, ni convertis, ni effacés ; le rollback laisse le contenu et le travail en attente intacts.

Une mise à jour en cache initialise le shell et restaure la réplique originale avant que les requêtes de découverte des extensions, de bootstrap ou de détail ne soient terminées. L’utilisateur a explicitement choisi de permettre l’édition hors ligne selon les permissions précédentes. La validation en temps réel et les tentatives de récupération se déroulent en arrière-plan ; une panne de réseau temporaire préserve le même éditeur. La reconnexion fusionne les modifications distantes et reprend les bytes/IDs originaux en attente, et seules les confirmations ACK du serveur correspondant les suppriment. Les changements de déconnexion/compte et le refus explicite de session/ressource masquent les métadonnées affichées pertinentes sans supprimer le contenu durable ou les éditions en attente. Les lignées incomplètes continuent de s’arrêter sous les vérifications exactes du protocole existant.

Cela nécessite des métadonnées en cache, une sauvegarde réussie par le navigateur et des ressources statiques de l’application disponibles ; ce n’est pas un démarrage complet hors ligne de PWA. Les commentaires, les uploads et les changements de permissions restent des actions en ligne. Les paramètres par défaut de la réplique existante du hôte et les lecteurs historiques ne changent pas, sans un nouveau adaptateur de format ancien. L’acceptation isolée est enregistrée par `tests/document-startup-cache.test.ts` et `scripts/qa-document-startup.mts`La restauration de la cache de base ne garantit pas la convergence de toutes les opérations dans chaque format. Voir [la frontière entre stockage et récupération](access-offline-events.md#页面缓存先展示--2026-10-12).

<a id="published-slate-and-canvas-integration--2026-10-13"></a>

## Intégration Slate et Canvas publiée — 2026-10-13

Le hôte 0.1.23 verrouille les artefacts du registre. `@smartdoca/slate` 0.4.14 et `@smartdoca/canvas` 0.4.3. Le codec Slate/Yjs/headless, les bytes de conversion et les cartes d’entrée publiques restent inchangés ; le modèle Canvas/IO et les cartes d’entrée publiques restent inchangés. Le patch DOCX est lié au nouveau artefact Slate. Les sessions hôte stable, les callbacks de ressources, les permissions, la présence, les ancres, les points de contrôle originaux, les époques et les IDs d’mise à jour en attente conservent leur propriété existante. Le paquet régénère les préviews de diagrammes obsolètes dans l’état de vue sans écriture de contenu.

L’utilisateur a explicitement choisi de ne pas faire de promesse de compatibilité avec les anciens diagrammes de flux. Aucun adaptateur de nœud ancien, conversion automatique, remplissage des champs historiques ou suppression des données n’est introduit. Nouvelles formes, géométrie d’arrêtes remplies, manuelle `routeMode`/`vertices` Et les ancres d’endpoint utilisent le modèle natif fourni ; la validation et la guidance de l’IA acceptent/preservent ces champs. Un éditeur antérieur peut ne pas afficher correctement de nouveaux champs. Conserver les déploiements précédents et la sauvegarde avant l’upgrade ; le rollback de la base de données hôte est effectué séparément, conformément à la procédure d’archivage approuvée du livre de connaissances. Les lecteurs historiques existants et les aides à la normalisation restent sur leurs chemins établis et ne sont pas redessinés par cette mise à jour du package.

Les régressions de l’hôte isolé couvrent la validation du champ natif, les ACK durables/duplicats, le rejouage distant sans écho, l’annulation/redondance, la restauration du point de contrôle, l’enregistrement du singleton du moteur canevas et les itinéraires DOCX. La vérification par navigateur et les contrôles de sortie finale sont enregistrés dans l’attache de vérification 0.1.23 ; les tests de modèle ne vérifient pas chaque geste de diagramme nouveau ou chaque opération canvass.

Le Canvas 0.4.3 contient également une règle de vue approuvée par l’utilisateur : les hauteurs de lignes de texte numériques allant de 0,8 à 3 sont affichées comme multiplicateurs de taille de police ; les autres valeurs numériques restent en pixels. Le chargement, la sélection, la redimensionnement et l’inactivité ne réécrivent pas le modèle. L’édition de texte ordinaire conserve le champ numérique original ; une modification explicite de la hauteur de ligne stocke la valeur propre en pourcentage. Aucune migration d’hôte, remplissage ou suppression des données stockées n’est ajoutée. La acceptation du navigateur vérifie que 1,5 en 32 px correspond à 48 px, les octets numériques originaux après les modifications de texte, aucune écriture en mode inactif, convergence avec les pairs et rechargement. La réception précédente de l’interface utilisateur n’est pas garantie lors du rollback.

<a id="slate-and-spreadsheet-package-upgrade--2026-10-14"></a>

## Mise à jour du pack Slate et feuille de calcul — 2026-10-14

Le processus de paiement actuel verrouille les fichiers réels du registre. `@smartdoca/slate` 0.4.15 et `@smartdoca/sheet` 0.2.1. Les cartes d’entrée publiques et les dépendances restent inchangées. Les bytes du codec Slate/Yjs/headless/conversion restent inchangés ; le patch de style DOCX existant est lié à 0.4.15. La validation des nœuds AI accepte des nombres finis. `angle` Valeurs en degrés et le manuel d’édition conservent ce champ. L’interaction avec l’image native sélectionne au premier clic et affiche une vue préliminaire au suivant ; cliquer ailleurs réinitialise la sélection.

L’utilisateur a explicitement approuvé la hauteur de ligne par défaut de 18 px et la largeur de colonne par défaut de 72 px pour les feuilles de calcul contenant des données CRDT, y compris celles créées avant cette mise à jour, ainsi que pour les feuilles de récupération virtuelles vides. Les feuilles de référence immuables conservent leurs champs de taille originale, y compris les omissions ; les tailles explicites par axe restent des modifications natives. Les feuilles hôte nouvellement créées utilisent les mêmes dimensions 18/72. Il s’agit d’une décision de projection/affichage par défaut : les graines existantes, les bases de données, les points de contrôle, les époques, les commentaires et les IDs de mise à jour en attente ne sont pas réécrits, convertis ou supprimés. Le schéma 6 et le rejet exact du protocole restent inchangés. La récupération virtuelle de la dernière feuille existante, les lecteurs d’histoire et les aides à la normalisation restent sur leurs chemins établis et ne sont pas redessinés.

L’utilisateur conserve l’absence précédemment convenue de la promesse de compatibilité avec les anciens diagrammes de flux. Aucun adaptateur de nœud ancien ou remplissage de champs n’est ajouté. La nouvelle rotation utilise le modèle natif fourni ; l’éditeur précédent peut ignorer les angles, et les feuilles de calcul précédentes peuvent afficher des paramètres par défaut différents. Conserver les artefacts du registre précédent, les pin de dépendance, les patch et les fichiers de verrouillage pour le retour en arrière du paquet, et mettre à jour le serveur et le Web ensemble. Le retour en arrière de la base de données hôte reste soumis aux procédures de stockage approuvées séparément.

La vérification utilise un fichier immuable généré par le paquet réel rc.19, des bases de données hôte isolées et des documents de navigateur. Elle couvre la préservation des données originales, les dimensions approuvées, la validation de la rotation/ACK/replay/undo/restore, les ancres stables, les protections en mode lecture seule, les itinéraires de fichiers et l’inactivité/ sélection sans écritures. Les résultats de l’audit et de la vérification du paquet sont enregistrés. `docs/verification/editor-package-upgrade-2026-10-14/report.json`; le record d’amélioration de la source est [la note de sortie en attente](releases/pending-editor-package-upgrade.md). Cela ne garantit pas tous les gestes de diagramme, toutes les opérations de feuille de calcul ou l’acceptation par les appareils natifs.

<a id="spreadsheet-hyperlink-patch--2026-10-15"></a>

## Patch hyperlien feuille de calcul — 2026-10-15

Host 0.1.25 pinne l’artefact réel du registre `@smartdoca/sheet` 0.2.2. Par rapport à 0.2.1, les points de contrôle publics d’entrée, les contrats et déclarations de dépendance restent inchangés ; le JavaScript de runtime Yjs/model/XLSX est identique en tous points (seulement certains mappages de sources diffèrent). Les dialogues hyperliens annulent maintenant correctement et restaurent le projet original, et les commandes d’annulation de liens natifs passent par la capacité existante de liens intégrés et la protection en lecture seule. L’hôte continue d’utiliser son éditeur/session stable, les callbacks d’assets, les mutations natives et l’outbox durable. Cette correction ne modifie aucune encodage de schéma 6, aucune ligne de base immuable, aucun epoch, aucun point de contrôle ou l’identité d’une mise à jour en attente, et ne introduit aucune conversion de données ni aucun adaptateur de compatibilité. Le pin et le fichier de verrouillage du paquet précédent sont conservés pour le rollback. Les audits et les vérifications isolées sont enregistrés. `docs/verification/sheet-package-upgrade-2026-10-15/`.

<a id="native-editor-upgrade--2026-10-16"></a>

## Mise à niveau de l'éditeur natif — 2026-10-16

Host 0.1.27 pinne les artefacts réels de npm `@smartdoca/slate` 0.4.18 et `@smartdoca/sheet` 0.2.3. Les points d’entrée et les contrats de dépendance restent inchangés. Les bytes du codec Slate/Yjs/headless/conversion correspondent à 0.4.15 ; le patch DOCX inchangé est lié à 0.4.18. L’hôte accepte les formes de diagrammes supplémentaires natives, les styles de nœuds et d’arêtes, ainsi que les options optionnelles. `canvasSettings`Les commandes de l’IA valident et conservent ces champs. L’édition graphique native inclut le nouveau espace de travail, l’expansion automatique du papier, le sauvegarde Ctrl/Cmd+S pour les versions de rédaction concentrée, et une barre d’outils de sélection flottante corrigée.

L’utilisateur a explicitement approuvé les paramètres par défaut natifs de 19,8/79,2 pour les feuilles de calcul et le comportement des graphiques. Les nouveaux documents hôte, les feuilles de calcul ajoutées avec CRDT (y compris les feuilles de calcul historiques ajoutées) et les feuilles de récupération virtuelles utilisent des lignes de 19,8 pixels et des colonnes de 79,2 pixels. Les champs de référence immuables originaux, y compris les paramètres omis, restent inchangés ; les dimensions explicites par axe restent également intactes. Aucun référentiel, séquence, point de contrôle, époque, séquence, identité de message en attente ou données de cellule n’est converti. Les champs de diagramme existants restent intacts lors de l’ouverture ; les paramètres par défaut natifs pour les paramètres du canevas absents affectent la vue, et seule une sauvegarde explicite du graphique écrit les champs/paramètres natifs du graphique. La régénération de prise en avant est uniquement pour la vue. Le schéma de texte riche 3, le schéma de calcul 6 et les sémantiques du ACK/outbox durables restent inchangés. Les lecteurs et normaliseurs historiques existants sont conservés sans redessin.

Conserver les dépendances originales, le fichier de verrouillage, le patch et le déploiement pour un rollback. Les éditeurs précédents peuvent afficher des dimensions/style par défaut différents ou ignorer les champs récemment sauvegardés ; aucune garantie de compatibilité avec le historique de flux n’est introduite. Conserver toutes les écritures nouvelles lors du récupération ; restaurer les anciens backups entraînerait l’effacement des modifications ultérieures. Une vérification isolée, y compris une base de données 0.1.26 réellement publiée, est enregistrée. `docs/verification/editor-package-upgrade-2026-10-16/`.

<a id="mind-map-workspace-upgrade--2026-10-16"></a>

## Carte mentale sur l'amélioration du workspace — 2026-10-16

Host 0.1.29 pinne l’artefact npm réel `@smartdoca/slate` 0.4.20, incluant les correctifs concernant l’interaction entre diagrammes et médias de 0.4.19. Les points d’entrée publics, les dépendances et les déclarations de composants/handles hôte restent inchangés. Les dimensions du codec, de Yjs, du mode sans interface et du runtime de conversion correspondent à celles de 0.4.18 ; le correctif DOCX identique est associé à 0.4.20. La guidance en IA préserve la carte mentale native complète, y compris `structure`, `theme`, `background`, nœud `fontSize`/`bold` et `style:"underline"`.

L’utilisateur a explicitement approuvé les nouvelles paramètres de affichage du mind-map natif pour les documents existants. Ouvrir une carte ancienne ou réinitialiser sa version-6 prévisualisation ne modifie que l’état de la vue ; cela ne réécrit pas les nœuds originaux, les points de contrôle, les époques ou les identités de mises à jour en attente. Ouvrir et fermer l’espace de travail sans sauvegarde ne produit aucune mise à jour de contenu. Une sauvegarde explicite valide le document natif et la prévisualisation dérivée via l’outbox Slate/Yjs existant et le ACK durable. Aucune migration, remplissage de champs ou adaptateur de style ancien n’est introduite. Les lecteurs historiques existants et les outils de normalisation restent sur leurs chemins établis sans redessin. Le schéma 3 et les vérifications de protocole exactes restent inchangés ; il n’y a aucun changement en SQL.

Conserver le déploiement 0.1.28, l’artefact de paquet original, le pin de dépendance, le patch et le fichier de verrouillage pour le rollback. Les éditeurs antérieurs peuvent ignorer les nouveaux styles/paramètres ou afficher des paramètres par défaut différents. Conserver les modifications ultérieures lors du récupération ; restaurer un disque de sauvegarde avant l’upgrade efface les modifications ultérieures. Les tests utilisent des documents/sources de données synthétiques isolées ; la vérification et les limites sont enregistrées. `docs/verification/slate-workspace-upgrade-2026-10-16/`.

<a id="three-editor-upgrade--2026-10-17"></a>

## Trois mises à niveau de l'éditeur — 2026-10-17

Doca fixe maintenant les artefacts réels du registre. `@smartdoca/slate` 0.4.22 et `@smartdoca/slides` 0.3.0-alpha.3. Le canvas utilise l’immutable `vendor/smartdoca-canvas-0.5.0-75e637df1a75.tgz`Le arbre de build de la bibliothèque 0.5.0 du registre a perturbé les modules de registration de l’éditeur interne Slate/plain-text. Les marques de réparation du code source de AidCanvas considèrent ces deux modules comme des effets secondaires ; l’hôte consomme l’artefact reconstruit. Cet artefact et la réparation du code source n’ont pas été publiés sur npm.

Slate ajoute cinq pages de préset de couleur élément et sélectionne l’ensemble du label de diagramme dès le début de l’édition. Les bytes Codec/Yjs/headless correspondent à 0.4.20. Le patch DOCX inchangé est rétabli à 0.4.22. Le canvas reste `aidcanvas-yjs` Schéma 1. Les callbacks d’image et d’attachement stockent des identifiants d’assets stables, transmettent les progrès réels et les annulations, et ouvrent les préviews autorisées appartenant au hôte, y compris les surfaces d’histoire, de recyclage et d’audit en mode lecture seule. Le serveur valide les nouvelles références de médias intégrés en fonction des assets du document actuel. La présence temporaire du canvas transmet les positions de texte relatives validées et les pointeurs de coordonnées de scène avec l’identité et la couleur appartenant au serveur ; elle prend en charge les messages uniquement basés sur des pointeurs et ne réutilise jamais les ancres de commentaires permanents.

Les diapositives nécessitent une révision du codec 6. Le client et le serveur négocient maintenant ensemble. `eppt-yjs-v6` avec schéma de document 2/protocol 1. L’utilisateur a choisi explicitement **Seuls les documents nouveaux**: existant `eppt-yjs-v5` Les documents et les anciens clients sont rejetés, ce qui laisse intacts les points de contrôle originaux, les fichiers de journal d’actualisation, les époques, l’historique et les identités des messages en attente. Aucune lecture de codeur ancien, aucune relabeling de métadonnées, aucune conversion automatique, aucune migration ni aucun changement de structure SQL n’est introduit. L’hôte accepte le format de texte natif actuel et les champs de table, et les commandes de table IA permettent de fusionner/splitter, de modifier les styles, de redimensionner, de effacer, de coller et de supprimer les axes en batch via le contrôleur natif. Les cellules de table conservent un texte simple avec une mise en forme de cellule entière.

Mettre à jour le serveur et le Web ensemble. Conserver la déploiement précédente, les pins de paquet, les patch, le fichier de verrouillage et les artefacts. Le retour au code ancien ne garantit pas la lisibilité des nouvelles écritures ; il est nécessaire de conserver les données ultérieures avant la restauration. Aucune base de données utilisateur n’a été modifiée et aucune déploiement n’a été effectué. L’acceptation isolée, les hachages, les captures d’écran et les limites sont enregistrés. `docs/verification/three-editor-upgrade-2026-10-17/`.

<a id="canvas-052-registry-integration--2026-10-17"></a>

## Intégration du registre Canvas 0.5.2 — 2026-10-17

Doca 0.1.31 pinne le contenu publié `@smartdoca/canvas` Artéfact du registre 0.5.2. Cet artefact remplace le tarball temporaire 0.5.0 mentionné ci-dessus, qui a été retiré de la chaîne de dépendances/référentiel de compilation et conservé dans le snapshot de source précédent pour la restauration. Les exportations publiques, les dépendances et les signatures de déclaration correspondent à cet artefact ; la seule différence de déclaration concerne un commentaire de planification de tableau. Le runtime du modèle est identique en tous points. Aucune conversion de lecture historique, aucune remplissure de champ, aucun changement de codec/schema, ni remplacement de point de contrôle/note de sortie n’est introduit.

Le paquet corrige les problèmes de composition chinoise continue, le suivi de la barre d’outils lors du déplacement/zoom, ainsi que l’augmentation des lignes de tableau basée sur le contenu. La géométrie des lignes et les modifications du texte utilisent la même transaction d’annulation collaborative native. Le hôte continue son modèle stable, avec des callbacks de ressources/présence authentifiées et une file d’attente ACK durable. La vérification de la source, du navigateur, des images et de la publication est enregistrée. `docs/verification/release-0.1.31/`Les preuves de la version 0.5.0 antérieure restent des preuves datées, et non la preuve de chaque opération de la version 0.5.2.

<a id="canvas-inline-integration-and-slate-upgrade--2026-10-18"></a>

## Intégration en ligne avec Canvas et mises à jour de Slate — 2026-10-18

Doca 0.1.32 intègre le Slate 0.4.23 publié ainsi que l’artefact de registre publié. `@smartdoca/canvas` 0.5.4, qui inclut Canvas 0.5.3. Les déclarations publiques de Slate, les bytes de codec/Yjs/headless/conversion correspondent à 0.4.22 ; le patch DOCX identique est réutilisé. Le propriétaire a approuvé les paramètres actuels de visualisation des cartes mentales Leafer pour les cartes existantes. L’ouverture/fermeture et la réinitialisation de la vue restent uniquement pour visualisation ; le sauvegarde explicite utilise le système de arborescence natif.

Canevas `richTextExtensions` maintenant prend en charge `inline:true`, optionnel `suggestions:{trigger,search(query,{signal})}` et `matchPaste`/`paste(text,{signal})`Les nœuds en ligne stockent `{type:'inline',inline:{id,type,label,data},children:[{text:''}]}` Dans le schéma-1, des paragraphes riches et un marqueur U+FFFC dans le texte natif. Le package inclut la sélection, les plages d’insertion en temps réel, le déboucinement, les touches de menu, le clippage/effacement/reversement atomique, la rendu des étiquettes/export et un JSON opaque inconnu. Doca fournit les vérifications de dossiers/ACL, les cartes utilisateur, des UUID de référence stables, la recherche du titre du document de même origine, les notifications et l’indexation des références. Les recherches en attente/coller, l’interface utilisateur et les URLs résolues restent dans l’état de visualisation. Les cibles fermées/effacées/en lecture seule ne peuvent pas accepter d’insertion tardive. La mise en forme et les métadonnées intégrées conservent les semantics LWW de champ entier existantes.

Les surfaces d’activité et de lecture seule/historique/éliminé/audit fournissent une stabilité `onAttachmentPreview` appels de callback vers le visionneur autorisé partagé ; les images restent `onResourcePreview`, et les URLs de téléchargement restent autorisées par l’hôte. Aucun nouveau transport, sauvegarde automatique, schéma/codec, DDL, migration, remplissage, adaptateur historique ou réécriture de epoch/point de contrôle/outbox n’est introduit. Le propriétaire n’a pas approuvé de garantie de rendu pour des clients anciens pour les nouveaux métadonnées intégrées. Il est conservé les données existantes et ultérieures, ainsi que le déploiement 0.1.31, les pins, les patch et le fichier de verrouillage pour la restauration. La vérification est enregistrée `docs/verification/release-0.1.32/` et les tests du navigateur natif Canvas ; aucun document utilisateur ou base de données n’est utilisé.


<a id="canvas-055-host-integration--2026-10-18"></a>

## Intégration avec le hôte Canvas 0.5.5 — 2026-10-18

Doca 0.2.1 installe le npm officiel `@smartdoca/canvas` 0.5.5. Cette version supprime l’action code-block du menu de paragraphe riche et les paramètres CSS inline/suggestion sous le nœud canevas. Les exports publics, les dépendances, les déclarations, le modèle et le codec restent inchangés par rapport à 0.5.4. L’host continue les callbacks inline et de ressources existants ; cette intégration ne modifie ni l’adaptateur, ni la conversion de format persistant, ni la réécriture de l’historique, ni aucun comportement de compatibilité nouveau. Les changements de titre/emoji et de tag d’accès ne concernent que la présentation de l’host. Les hachages des paquets publiés et les vérifications isolées de navigateur/image sont enregistrés. `docs/verification/release-0.2.1/`.

<a id="canvas-056-and-sheet-024-integration--2026-10-20"></a>

## Intégration entre Canvas 0.5.6 et Sheet 0.2.4 — 2026-10-20

Les pinces de paiement actuelles fixent les artefacts officiels de npm `@smartdoca/canvas` 0.5.6 et `@smartdoca/sheet` 0.2.4. Les cartes points d’entrée publics et les déclarations orientées vers l’hôte restent inchangés. Les octets du modèle Canvas et les octets du modèle Sheet/Yjs/XLSX correspondent aux artefacts précédents. Le modèle Canvas a modifié les déclarations de rendu privées et les références du bundle d’I/O ; Sheet ajoute explicitement… `@univerjs/drawing-ui` et `@univerjs/sheets-filter` Dans la version 0.25.1 déjà verrouillée. Aucunes importations de source hôte ou de deuxième canal de sauvegarde n’ont été introduites.

Le propriétaire a explicitement approuvé les règles de visualisation Canvas pour les diagrammes existants : un nom `frame`/`diagram-node` enveloppe avec un `diagram-body`, sans un rôle de conteneur ou de type de conflit explicite, est reconnu comme un diagramme ; son enveloppe de remplissage/épaisseur et son élément généré du duplicate `Frame` Les étiquettes sont supprimées et la géométrie du corps/text suit le wrapper. Les conteneurs explicites natifs et les chemins personnalisés non nommés conservent leur rôle/outline. Les ancres d’ancrage des extrémités des ellipses/diamants existantes suivent l’outline actuel ; les quatre indices de port de milieu de chemin originaux restent stables tandis que huit nouveaux ports sont ajoutés. L’ouverture, la sélection, les changements de vue et la fermeture ne doivent pas réécrire le modèle/point de contrôle original. Les opérations explicites de réduction de taille/édition utilisent la pile de transaction collaborative et d’annulation native. Aucune conversion en batch, remplissage de champs, DDL, adaptateur de schéma/codec, remplacement d’epoch/point de contrôle ou réinitialisation de messages en attente n’est autorisée. Le canvas reste `aidcanvas-yjs` schéma 1 ; Feuille reste `exlsx-cell-registers` Schéma 6, avec rejet exact du schéma actuel.

Les images de canvas sélectionnent d’abord et affichent une vue préliminaire à la prochaine clic. La copie dans le clavier PNG utilise le système d’exploitation. `resolveDownloadUrl` Autorisation, y compris les vues en lecture seule ; les adaptateurs de prise de vue/effacement conservent leurs flags d’accès existants, et le serveur continue à rejeter l’accès aux actifs d’audit non supportés. La feuille utilise le rendeur de filtre natif fourni et la géométrie/présentation des images en temps réel intégrée ; la rendu des images ne répare pas les données du document reçu. Les UUID des actifs, les vérifications ACL, la présence temporaire, les ancrages permanents, les ACKs durables et les mises à jour originales conservent leur propriété existante.

Les lecteurs historiques existants, la restauration du feuille de travail virtuelle, les outils de normalisation et les paramètres par défaut approuvés restent sur leurs chemins établis ; ils ont été audités mais ne sont pas révisés ou étendus ici. Conserver les artefacts du registre Canvas 0.5.5 / Sheet 0.2.3, les pin de paquets et les fichiers de verrouillage de la version source. `589a3589820770d218bea418fe7c93cd10583f95`; les identités des artefacts sont enregistrées `docs/verification/editor-packages-2026-10-20/package-audit.json`. Mettre à jour le serveur et le Web en même temps. Conserver les écritures ultérieures avant le rollback ; l'interface utilisateur antérieure ne garantit pas que les interactions du diagramme seront reproduites de manière identique. Aucune base de données utilisateur ou document n'est utilisée pour la vérification, et aucune déploiement n'est effectué. Voir [vérification d’intégration](verification/editor-packages-2026-10-20/README.md) pour les cas et limites passés.

<a id="canvas-058-and-sheet-025-integration--2026-10-21"></a>

## Intégration entre Canvas 0.5.8 et Sheet 0.2.5 — 2026-10-21

Doca insère l’official npm `@smartdoca/canvas` 0.5.8 et `@smartdoca/sheet` 0.2.5 artefacts. Par rapport à Canvas 0.5.6 / Sheet 0.2.4, les déclarations publiques, les cartes d’entrée et les dépendances restent inchangées. Le modèle Canvas et le modèle Sheet/XLSX, ainsi que les données de exécution, restent inchangés. La session Yjs de Sheet restaure les filtres natifs avant de recalculer les mises à jour combinées de cellules et de filtres, et met à jour les critères sans changer après la restauration ou la tri ; cela modifie la projection, mais pas l’encodage schema-6 ou les bases immuables.

Canvas inclut les améliorations de style de 0.5.7, les correctifs de wheel, mention et redo, les contrôles de vue intégrés, ainsi que la traduction du corps native unbound-connector de 0.5.8. Les choix de grille/arrière-plan restent dans l’état de la vue. Les gestes d’édition natifs utilisent le modèle existant, l’annulation, l’host outbox et les ACKs durables. Canvas reste `aidcanvas-yjs` schéma 1 ; Feuille reste `exlsx-cell-registers` Schéma 6. Un adaptateur API sans hôte, un nouveau comportement de compatibilité, la conversion des données stockées, la valeur par défaut pour les champs historiques, ainsi que la réécriture des DDL ou des points de contrôle/messages en attente sont introduits. Les lecteurs historiques existants, la restauration des feuilles de travail virtuelles, les outils de normalisation et les règles d’affichage approuvées précédemment restent sur leurs chemins établis sans redessin.

La vérification utilise des documents et bases de données synthétiques isolés. Les identités des artefacts publiés, les comparaisons en temps réel, les vérifications et limites réussies sont enregistrées. [la vérification d'intégration](verification/editor-packages-2026-10-21/README.md). Conserver les broches précédentes, le fichier de verrouillage, la configuration du espace de travail et les artefacts de la révision source `31fca12f48a54f1c2ce3caeec6a0d976e164ac4e` Pour le rollback du package ; reconstruire le serveur et le Web ensemble et conserver les écritures ultérieures. Aucun document utilisateur ou base de données ou déploiement n’est utilisé.

<a id="issue-tracker-integration-and-personal-canvas-preferences--2026-10-22"></a>

## Intégration du tracker de problèmes et préférences personnelles sur Canvas — 2026-10-22

Le dernier niveau de base officiel npm vérifié est Slate0.4.24, Markdown0.4.4, Sheet0.2.9, Canvas0.5.13 et Slides0.3.0-alpha.4 ; le point de contrôle actuel teste temporairement le candidat 0.5.14C1file décrit ci-dessous. Les audits comparent les archives réelles et les fichiers installés, et non uniquement les APIs de source. Les codecs/schemas existants, les niveaux de base immuables, les époques, les points de contrôle, les mises à jour du document original en attente et la propriété durable des ACK sont conservés. Le modèle/IO/preferences/declarations/exports de Canvas0.5.13 correspondent à 0.5.12 ; sa déclaration interne d’aide à la clavier ne ajoute aucune API publique SDK. Sheet 0.2.9 inclut des correctifs pour l’élimination du clicboard et de la validation des listes déroulantes, tandis que les bytes de runtime du modèle/Yjs/XLSX restent identiques à 0.2.7. Les callbacks de la galerie résolvent l’état d’affichage autorisé sans soumettre les brouillons de l’éditeur. Les lecteurs historiques approuvés existants, les règles de normalisation et d’affichage restent inchangés ; aucune conversion de données anciennes, aucun adaptateur de schéma, aucune migration ou aucun DDL n’est introduit.

L’utilisateur a explicitement approuvé les préférences de navigateur de Canvas concernant l’origine du site web, l’accoutrement et le document. Les enregistrements indépendants de la version 1 sont validés par les validateurs purement publiés et passent par les propriétés contrôlées de visualisation et de création. Les enregistrements manquants conservent leur comportement actuel ; les enregistrements inconnus ou corrompus sont préservés sans être ni consommés ni modifiés. En cas de panne de stockage, seule la choix explicite de vue actuelle est conservé. Les mises à jour des préférences, la navigation du menu et le déplacement de la mini-carte ne entraînent ni annulation ni collaboration ; les paramètres de création affectent uniquement les éléments interactifs futurs, jamais le contenu existant, les insertions API/AI, les importations ou les projections distantes. La cache de session en mémoire vive existante n’est pas convertie en enregistrement de préférence. Le rollback désactive la consommation et laisse les enregistrements ainsi que le contenu ultérieur intacts.

Le hôte possède toujours un modèle/session et un transport. Le candidat 0.5.14C1file installé temporairement passe les tests natives 17/preferences7 sur les fichiers exacts 155, mais l’acceptation officielle/finale du compilé reste distincte. Les réparations ciblées maintiennent les interactions explicites entre objets/outils distinctes de la complétion automatique, sans affaiblir la propriété de l’entrée/contrôle externe. Les mises à jour des packages ne comportent ni sauvegarde automatique, ni migration, ni reconstruction de base, ni remplacement d’epoch/message-ID. Les preuves isolées du site web et les limites restantes sont suivies. [Vérification du tracker de problèmes](verification/issue-tracker-2026-10-21/README.md)Conservez les artefacts, les manifestes et les fichiers de verrouillage précédents, puis reconstruisez le serveur et le Web ensemble pour effectuer un retour en arrière du package ; ne restaurez jamais une base de données ancienne après des modifications ultérieures.

<a id="native-input-and-authorized-append-boundaries--2026-10-22"></a>

## Entrée native et limites d’ajout autorisées — 2026-10-22

Le éditeur natif doit vérifier la propriété de l’événement avant de traiter une sélection conservée. Les entrées de commentaire ou d’IA de l’hôte conservent leur clavier, leur clipperdocument et leur comportement de composition sans écriture de documents. Canvas 0.5.12 corrige le chemin natif ; l’hôte conserve les brouillons de commentaire grâce aux modifications adjacentes d’IA/maquetage et charge les marqueurs permanents autorisés indépendamment du tiroir. Il n’y a pas de nouvel ancrage, de codec, de modèle, de commande ou de format de présence. L’archive officielle correspond au candidat C3 de clavier/commentaires testé ; les reçus complets d’interaction de l’ancienne version 0.5.11 conservent leur champ d’application exact.

La note rapide pour navigateur en texte riche/Markdown approuvée ajoute explicitement le texte brut fourni à un objet d’ajout existant et autorisé choisi explicitement. Elle utilise l’horodatage natif existant, le processus de transaction de contenu ainsi que le chemin de réception/delivrance. La réponse perdue réessaye l’ID de ticket/requête et le contenu fourni ; la répétition acceptée ne fait pas doublement ajouter ou ne augmente pas la séquence. La sélection de cible, les tickets de cinq minutes d’entrée et de traitement local sont temporaires, sans file d’attente de brouillon persistant ou promesse de récupération entre processus. Le document original et les modifications ultérieures restent intacts ; les cibles non supportées échouent sans conversion. Voir [le contrat de note rapide](browser-quick-note.md) et ses reçus MV3 isolés de deux pages.

<a id="approved-ai-pending-send-storage--2026-10-22"></a>

## Stockage de données en attente d’approbation par l’IA — 2026-10-22

C’est la file d’envoi de l’IA hôte, distincte de l’outbox de collaboration documentaire. L’utilisateur a approuvé deux fois le plan de conservation/retour en arrière concret. Les nouveaux messages prêts à être envoyés utilisent IndexedDB indépendant. `doca-ai-pending` Version 1, stocker `entries`, déclenché par `[docaOrigin,userId,connectionId,messageId]`, avec une extension explicite de l’identité du profil/revue. Les transitions conditionnelles ne se terminent qu’après la validation de la transaction de lecture-écriture ; les verrous Web sérialisent la livraison réseau, et non les écritures de stockage. Les tombstones de source acceptés/retirés restent inchangés. Les versions/enregistrements inconnus et les stockages refusés ou échoués sont conservés, sans utilisation de localStorage ou de fallback uniquement en mémoire.

La pile de localStorage de la version 0.2.7 reste en mode lecteur et ne se rejouit pas automatiquement. Chaque élément reconnu nécessite une continuation ou un retrait explicites avec les paramètres actuels ; les données complètes conservent les identifiants originaux et les hachages sources, et les tâches acceptées se régularisent sans reenvoi. Avant l’upgrade ou le rollback, arrêtez l’envoi et fermez toutes les pages/extensions existantes : les émetteurs anciens et nouveaux mélangés ne sont pas supportés, car les émetteurs anciens ne peuvent pas voir les tombstones nouveaux. Le rollback arrête l’émetteur nouveau et conserve les deux stores, les tombstones et les données ultérieures ; il ne copie pas à nouveau ni ne redémarre automatiquement l’envoi ancien. Aucune table serveur, historique de chat/document, permissions ou point de contrôle éditeur n’est convertie. Les règles exactes, les preuves de deux pages/redémarrage/échec/legacy sont conservées. [le enregistrement de file approuvé](verification/issue-tracker-2026-10-21/ai-pending-idb.md).

<a id="approved-spreadsheet-dimensions-and-personal-zoom--2026-10-23"></a>

## Dimensions de feuille de calcul approuvées et zoom personnel — 2026-10-23

Le propriétaire a explicitement approuvé une hauteur de ligne par défaut de 21,78 CSS-pixel et une largeur de colonne par défaut de 87,12 CSS-pixel, soit une augmentation de dix pour cent. Les feuilles de travail nouvelles utilisent ces valeurs. Les feuilles de travail historiques ajoutées et les feuilles de travail de récupération virtuelle sans dimensions par défaut stockées utilisent également les nouvelles valeurs d’affichage. Les paramètres par défaut explicites, les modifications des lignes/colonnes, les bytes de base originaux, les graines de feuille de travail, les points de contrôle, les époques et les mises à jour en attente sont conservés ; aucune remise à niveau des champs historiques, aucune conversion des données persistantes ou aucun changement de schéma n’est autorisé. Le retour au package précédent restaure ses anciennes valeurs d’affichage des champs manquants tout en conservant les modifications ultérieures. Le réglage manuel existant des lignes/colonnes reste collaboratif et réversible.

Le pied de page reste par défaut à 100 %. Le hôte ne stocke que les choix explicites de zoom natif dans des enregistrements indépendants du navigateur version-1, ciblés par l’origine, l’utilisateur et le document. Il s’agit d’une ratio d’affichage à l’échelle du document entier, y compris les changements de feuille de travail, et non une modification de taille de ligne/colonne. L’ouverture sans enregistrement ne crée aucun enregistrement. Les versions inconnues, les enregistrements mal formés et les champs non reconnus sont conservés et ne sont pas effacés ; le stockage échoué ne conserve que le choix explicite dans la vue montée. Les vues anonymes ne conservent aucun enregistrement. Le rollback arrête la lecture/écriture des nouveaux enregistrements et laisse tous les contenus, y compris ceux ultérieurs, intacts.

Le paquet possède une rendu zoom natif et des callbacks ; l’hôte possède le stockage du navigateur et l’identité. Lors de l’application de la préférence, le déplacement du pied de page, l’utilisation des flèches plus/minus, le changement de feuilles de travail, les modifications en lecture seule, la redimensionnement et la projection à distance ne doivent pas entraver l’undo du document, l’outbox, les mises à jour du contenu ou l’historique. Le zoom personnel ne doit pas se propager dans les snapshots exportés ou les fichiers XLSX. Cette politique constitue une limite convenue, et non une preuve que un paquet installé exporte les propriétés requises ; l’intégration doit vérifier l’artefact publié ainsi que les reçus isolés de deux pages/navigateur.

<a id="approved-spreadsheet-filter-expansion--2026-10-23"></a>

## Élargissement du filtre de feuille de calcul approuvé — 2026-10-23

Le propriétaire a explicitement approuvé la conservation d’une plage de filtre stockée lorsque l’application est activée, en étendant cette plage vers le bas jusqu’à la dernière ligne de contenu dans les colonnes existantes, et en incluant automatiquement les enregistrements contigus qui s’ajoutent immédiatement en dessous. Les en-têtes, les limites des colonnes et les critères sélectionnés restent inchangés. Les styles, le contenu des autres colonnes et les critères de suppression ne modifient pas la plage. L’expansion native de la plage doit être effectuée en une seule transaction partagée, avec suppression de l’étape correspondante ; la projection et la restauration distantes doivent appliquer la plage créée avant de dériver les lignes cachées, sans effet local.

Le fichier officiel 0.2.12 met en œuvre cette politique en utilisant les registres de cellules schema-6 et de fonctionnalités stables existants. Il ne introduit aucun nouveau schéma éditeur, aucune API publique, aucun adaptateur historique, aucune conversion de données stockées, aucun DDL, aucune remplacement de base/époque ou aucune réécriture de mise à jour en attente. Les lecteurs historiques et les paramètres par défaut approuvés précédemment restent inchangés. Les intervalles courts existants ne sont réparés qu’avec une confirmation explicite, et jamais en ouvrant un document. Le rollback conserve les intervalles natifs sauvegardés ainsi que tout contenu ultérieur ; les paquets précédents peuvent lire ces intervalles, mais ne peuvent pas autoriser durablement d’extensions implicites ultérieures.

Doca 0.2.11 insère la fiche officielle npm 0.2.12. L’acceptation des paquets et des hôtes isolés reste distincte de la déploiement en production. Voir [vérification de filtre](verification/sheet-filter-range-2026-10-23.md).

<a id="runtime-boundary-for-comment-backgrounds--2026-10-28"></a>

## Limite de temps pour les fond d’commentaires — 2026-10-28

Fiche 0.2.14 `commentHighlightAnchor` et Slides 0.3.0-alpha.5 `activeCommentId` Ce sont des propriétés de vue contrôlées par l’hôte. L’hôte ne fournit que le commentaire actuel autorisé cliqué explicitement. L’ouverture de la boîte, les clics de navigation et les marqueurs de contenu natifs ne activent pas le fond du commentaire. En cliquant ailleurs, la résolution ou la fermeture de la boîte le supprime ; le changement de commentaire le remplace et une nouvelle ouverture ne le restaure pas. Les SDK utilisent la résolution d’ancrage existante/la géométrie actuelle pour les fonds non interactifs sans écrire de modèles, d’ancrages permanents, de transactions, d’annulation, de présence, d’outboxes ou de stockage. La visibilité de table-port dans Canvas 0.5.16 fait également partie de l’état de vue. Cette modification de limite ne modifie ni le format d’ancrage ni la politique de résolution des cibles supprimées existantes ; les schémas inconnus échouent toujours lors de la négociation exacte, sans lecteur ou conversion pour le format ancien.
