<a id="realtime-collaboration-and-saving"></a>

# Collaboration en temps réel et sauvegarde

[中文](collaboration.zh-CN.md)

Cette page décrit le comportement de l’hôte 0.2.23. Les APIs des composants cibles et les tâches restantes se trouvent dans… [contrat de collaboration](collaboration-sdk-contract.fr.md); les anciens enregistrements de processus unique et de paquets temporaires sont en [recherche](research.fr.md).

<a id="integrated-formats"></a>

## Formats intégrés

Texte enrichi, Markdown, feuilles de calcul, canevas et diapositives sont intégrés. Le hôte installe des publics `@smartdoca/slate`, `@smartdoca/markdown`, `@smartdoca/sheet`, `@smartdoca/canvas`, et `@smartdoca/slides` Pacages, définis via package.json et le lockfile. Aucun dossier de source privé ou ancien tarball de vendor n’est nécessaire.

Les cinq éléments partagent le transport, l’autorisation et une file d’attente locale en attente de mise à jour, tout en conservant leur propre modèle, codec, schéma, époque et vue. Les composants restaurent les points de contrôle/baselines autoritaires avant de se monter. Les modifications de locale, en lecture seule, de sélection et de état de sauvegarde ne reconstruisent pas le document. Les feuilles de calcul conservent leur baseline immuable et les données de protocole plutôt que d’utiliser un modèle de texte riche.

<a id="connection-and-messages"></a>

## Connexion et messages

WebSocket utilise `/api/v1/ws`Les navigateurs mettent à jour les cookies de session sur le même origine ; les proxys transmettent les requêtes Upgrade/Connection. Les ressources publiques permettent des connexions en mode lecture seule dans leur champ de visibilité. Chaque frappe utilise la connexion du hôte pour accéder au contenu, aux notifications et à l’état de présence.

Les Yjs bytes utilisent le format Base64 dans les enveloppes JSON. Les messages réels et la validation du format sont définis par… [portail](../apps/server/src/services/realtime/gateway.ts) et [vérifications de protocole](../packages/core/src/modules/collaboration/protocol.ts):

| Message | Objectif actuel |
| --- | --- |
| prêt / rejoindre | Connexion prête, rejoignez et négociez le codec/schema/protocolVersion |
| sync-request / sync-response | Différences autoritaires, epochId, seq, format baseline et accès ; une réponse de synchronisation n’est pas un ACK de sauvegarde |
| mise à jour / ack | Envoyer les modifications locales ; confirmer le message correspondant après la mise à jour du base de données |
| présence / curseur / curseurs | Présence de l’utilisateur et sélections temporaires par session |
| document.changed / notifications.changed | Invalider le contenu/détail ou les lectures de notifications persistantes |
| quitter / erreur | Erreurs de permission de départ ou de retour, de protocole et de connexion |

Une fois l’époque connue, les éditions doivent contenir le protocole, le codec/schema et l’époque correspondants. L’identité, l’ID de connexion, le nom et la couleur proviennent du serveur. Les écritures et les émissions révèlent à nouveau l’accès actuel, sans jamais utiliser l’identité revendiquée par le client.

<a id="save-reconnect-and-history"></a>

## Sauvegarder, se reconnecter et historique

Seuls les transactions de contenu local réel sont incluses. `update-outbox.ts`L’initialisation, l’application distante, la présence, le déroulement et la réduction de taille ne soumettent pas le contenu. Les modifications en attente conservent les bytes originaux et les IDs de message. Un ACK correspondant supprime son mise à jour ; les réponses de synchronisation et les ACKs inconnus ne vident jamais la file d’attente.

Le serveur valide et persiste le contenu ainsi que les projections dérivées dans une transaction, puis le confirme et diffuse les résultats. Les réceptions sont dédupliquées en fonction du ressource, de l’epoch et de l’ID de message ; le même ID avec des bytes différents est rejeté. Les points de contrôle conservent l’identité des CRDT ; les enregistrements d’histoire indépendants conservent leur propre format, leur lignage et leurs assets. Voir [histoire et restauration](document-experience.fr.md#history-and-restore).

Les adaptateurs d’hôte actuels conservent les points de contrôle originaux de Yjs, les bases de données et les messages non reconnus dans IndexedDB avant de les envoyer. La reconnexion récupère l’état autoritaire et réessaie les IDs et les bytes originaux. Seuls les ACKs durables correspondants les suppriment. Un document signé en cache restaure ses métadonnées de page et sa réplique avant la découverte du serveur, et permet l’édition hors ligne selon les dernières permissions connues. Une interruption temporaire maintient le éditeur en fonctionnement. Une déni explicite de session ou de ressource cache les métadonnées et conserve le travail en attente. Le bundle de bureau ou la frontend Web téléchargée précédemment peut afficher la liste des documents hors ligne pendant une interruption. Voir [documents hors ligne et récupération](access-offline-events.md#离线文档入口).

<a id="presence-and-comments"></a>

## Présence et commentaires

Les comptes d’utilisateurs ont été dédupliqués ; les sélections d’édition appartiennent aux connexions, y compris aux onglets distincts d’un compte. La présence est temporaire et ne génère aucune écriture de contenu ou de historique. Le texte enrichi, le Markdown, les feuilles de calcul, le canevas et les diapositives utilisent leurs propres adaptateurs intégrés. Les visualisations en lecture seule ne publient pas les sélections d’édition.

Les ancres de commentaire permanentes sont distinctes : les ancres de texte riche, les plages Markdown, les identités stables des lignes/colonnes de feuille de calcul et les régions d’éléments canevas/slides utilisent des validations spécifiques au format. Les commentaires de feuille de calcul suivent les enregistrements stables malgré les modifications structurelles supportées ; les sélections temporaires dans A1 ne constituent pas leur ancrage persistant. Voir [commentaires et notifications](comments-and-community.fr.md).

<a id="one-instance-and-replicas"></a>

## Un instance et des répliques

Sans Redis, la diffusion, la présence et les limites restent dans le processus. Avec Redis, les modifications de contenu, l’annulation des permissions, les notifications et la présence se transmettent entre les instances. Le contenu du base de données partagée reste autoritaire ; Redis Pub/Sub n’est pas un journal durable. En cas de panne de Redis configuré, le système ne se tourne jamais silencieusement vers le bus local.

Les répliques nécessitent également un PostgreSQL partagé, un stockage de fichiers et des versions de plugins souhaitées cohérentes, avec des caches d’installation indépendants. Voir [scalage horizontal](horizontal-scaling.fr.md)À pleine charge, les matrices de panne de réseau et les dispositifs réels nécessitent l’acceptation du environnement cible ; les tests automatisés utilisent des données isolées.
