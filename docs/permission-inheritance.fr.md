<a id="document-and-library-permission-inheritance"></a>

# Héritage des permissions de documents et de bibliothèques

[中文](permission-inheritance.zh-CN.md)

Cette page décrit le modèle de permission actuel. Les subventions personnelles se trouvent ici. `grants`; les groupes vivent séparément `resource_group_grants` Et sont évaluées en fonction de l’appartenance à un groupe actif, sans créer de lignes personnelles. Les définitions des liens publics se trouvent ici. `share_links`; les événements de suspension de liens se déroulent en temps réel `share_link_revocations`. Voir [groupes d'utilisateurs](user-groups.fr.md) Pour les invitations de groupe, le champ d’application du répertoire, la propriété et le nettoyage.

Chaque groupe possède une frontière indépendante pour les subventions ou héritages. Les blocs personnels ne suppriment pas les sources de groupe ; un groupe local handicapé empêche l’héritage de ce groupe. Les gestionnaires de groupe de la bibliothèque conservent le niveau de gestion existant sur les documents contenus. La suppression de l’adhésion, ou la dissolution, annule immédiatement cette source. La transmission de la propriété préserve les subventions du groupe, y compris l’accès que l’ancien propriétaire continue de recevoir via le groupe.

<a id="public-reading"></a>

## Lire publiquement

Une bibliothèque publique (`public` ou `authenticated`) définit le champ de lecture de chaque page. Une page ne peut annuler cette base de données par sa propre visibilité ou en désactivant l’héritage avec les collaborateurs. La modification, les commentaires et la gestion des droits sont toujours calculés en fonction de la page et de l’héritage. Une fois la bibliothèque devenue non publique, les pages utilisent leurs propres paramètres et ceux de leurs ancêtres. Les requêtes de liste et les recherches de ressources unique suivent la même règle.

Les règles de découverte, de recherche et de collecte qui varient en fonction du type de ressource se trouvent dans [ressources publiques, découverte et collections](public-resource-discovery.fr.md).

<a id="one-grant-table"></a>

## Une table de subventions

`grants` Stocke une ligne pour chaque ressource, utilisateur et source de grâce :

- `direct`: une invitation ou une subvention depuis la page de gestion. Au maximum une par utilisateur pour un ressource.
- `link`: une subvention reçue via un lien de partage, identifiée par l’ID de partage.
- `parent_override`Ce nœud annule ou bloque le résultat parent hérité.

Chaque ligne stocke le rôle, indépendamment du fait qu’il inclue des descendants, l’ID de source, et `active` ou `disabled`La page de gestion regroupe les sources par utilisateur et montre les permissions finales. Les détails des sources s’appliquent à une ligne spécifique. La suppression d’une autorisation directe peut rendre l’utilisateur désactivé. `parent_override` Ainsi, la permission ne revient pas à son état initial. Le suppression de cette override restaure l’héritage parent. La révocation d’un lien supprime uniquement cette source de partage.

Le rôle et l’option « inclure les descendants » sont séparés. Le consentement d’un descendant est déterminé en suivant l’arbre généalogique. Ne pas prendre le maximum de chaque champ et inventer une autorisation qui n’existe pas.

<a id="collaborators-and-inheritance"></a>

## Collaborateurs et héritage

La bibliothèque est la racine du arbre des permissions de document. Un document de bibliothèque hérite de son document parent, ou de la bibliothèque si elle n’a pas de parent. Un document personnel n’hérite de rien, et utilise ses propres permissions.

Pour un utilisateur nommé, aller vers la décision explicite la plus proche. Une autorisation sur le nœud actuel annule une autorisation située au-dessus. Une autorisation désactivée `parent_override` Bloque l’autorisation parent. L’héritage se poursuit uniquement lorsque ce nœud n’a pas de décision. `include_descendants` Décide si une subvention est transmise aux descendants. Une décision de « ce nœud uniquement » empêche la subvention du même utilisateur de passer plus haut. Un descendant peut néanmoins recevoir sa propre subvention.

Les permissions publiques et les permissions pour utilisateurs nommés sont calculées séparément, puis la permission la plus élevée est utilisée. L’élimination d’un collaborateur ne place pas cet utilisateur sur la liste de blocage des ressources publiques. L’accès public anonyme est au maximum celui d’un lecteur.

<a id="permission-settings"></a>

## Paramètres d’autorisation

`permission_overrides` C’est un ensemble de champs que ce nœud annule explicitement : le champ public, le rôle public, les demandes d’accès, la découverte publique, l’histoire des lecteurs, et l’interrupteur principal pour le partage de liens. Les champs qui ne sont pas annulés sont déterminés par les ancêtres. Le rétablissement de l’héritage efface ces bits.

Désactiver l'héritage ne copie pas les paramètres du parent. Les overrides existants restent. D'autres champs utilisent les valeurs par défaut de ce nœud. Reactiver l'héritage résout les champs qui n'ont pas été overrideés. Les liens de partage concrets, les invitations et les tickets ne sont ni copiés ni hérités. Seul le switch de lien principal peut être hérité.

Récupérer un lien écrit un `link` Accorder avec l’ID de partage. Changer, désactiver ou éteindre un lien permet de contrôler les récupérations ultérieures. Les grants déjà accordés sont ajustés ou annulés via la source membre.

Les liens de documents et de bibliothèques peuvent permettre à le lecteur, le commentateur, l’éditeur ou le gestionnaire d’accéder. Seuls les propriétaires peuvent créer, modifier ou annuler les liens de gestionnaire.

<a id="approval-notifications-and-immediate-effect"></a>

## Approbation, notifications et effet immédiat

Le rôle demandé sur un ticket d’accès ne peut pas être modifié. L’approbation peut choisir le rôle et le champ d’application qui sont réellement accordés. Seul le propriétaire du ressource peut approuver une demande de gestion, et seul le propriétaire peut accorder la gestion.

Le billet est restreint. `resource.grant` Dans une seule transaction. Il vérifie à nouveau le ressource, le gestionnaire et le requérant, puis écrit le rôle, le champ d’application, le résultat et l’événement. La transaction de base de données et les conditions de statut donnent à la ticket un résultat final.

Les recherches et les listes utilisent la même décision de proximité, le champ de portée et les surécritures de champ. L’héritage ne copie pas les permissions en masse. Après un changement de permission, les salles en ligne affectées sont mis à jour. Perdre l’accès de lecture ferme immédiatement la connexion. Les écritures sont vérifiées pour chaque opération.

<a id="verification"></a>

## Vérification

Les tests isolés couvrent l'héritage multi-niveaux, la réduction de niveau, le blocage, les enfants futurs, l'attribution de champ, l'activation ou désactivation de l'héritage, les surécritures de champ, la base publique, l'annulation d'une source de lien, l'acceptation d'une invitation, les résultats d'approbation et l'annulation de WebSocket.

Les administrateurs peuvent [transmettre les ressources](admin-resource-handover.fr.md) Des comptes handicapés après examen de la propriété et des subventions conservées. Cette inventaire expose les métadonnées de gestion sans accorder d’accès aux documents privés.

<a id="shared-permission-components"></a>

## Composants de permission partagée

Le module Web `apps/web/src/shared/components/permission-grant-row.tsx` et ses lignes de subvention propres, sélection de rôle, entrée source, champ de descendants et bulles de confirmation. Documents, bibliothèques et livres de connaissances utilisent `PermissionDialog`Les dossiers partagés et les autorisations de groupe utilisent également la même méthode. `PermissionGrantRow`Les appelants fournissent des identités, des options de rôle autorisées, un état de lecture seule/occupé et des callbacks de persistance. Le composant gère le layout, la copie, le focus de la clavier et la confirmation. `permissionRoleChoices` Centralise les catégories de rôles de hôte-ressources et de dossiers partagés ; les adaptateurs de permissions personnalisés continuent de fournir leurs rôles pris en charge.

Chaque ligne utilise deux lignes : l’identité et les actions ci-dessus, les métadonnées/avatars des membres et la portée des descendants en dessous. Les préviews des membres de groupe utilisent `UserBadge` Pour les triggers uniquement en avatar et les cartes de profil ; « More » ouvre un popover d’avatar. La propriété du popover suit celle du trigger. `aria-controls`Ainsi, l’interaction avec une carte portail maintient le panneau de permissions ouvert.

Les entrées source-détail utilisent également `PermissionGrantRow`L’étiquette de source reste à gauche, avec les contrôles de permission et de suppression à droite. Les limites de source à lecture seule restent inchangées. `PermissionEffectiveAccess` Met en évidence le rôle efficace de la couleur bleu vif lorsque l’accès de groupe dépasse l’accès personnel, et identifie la source de groupe dans l’étiquette.

Les callbacks de mutation renvoient soit un succès, soit un échec : en cas d’échec, la confirmation reste ouverte, et seule la réussite la ferme. Le suppression d’une source et le effacement d’une override d’héritage ont des confirmations différentes ; le effacement d’une override reprend l’évaluation du parent et ne doit pas être considéré comme une simple annulation de l’accès. La propriété côté serveur, les niveaux de gestion, le consentement à l’invitation et les vérifications de portée restent valides.
