<a id="capabilities-and-limits"></a>

# Capacités et limites

[中文](features.zh-CN.md)

Cette page a été vérifiée par rapport à la source actuelle pour l’hôte **0.2.25** et SDK de plugin **0.1.11** Le 29 octobre 2026. Avant l’installation des plugins professionnels, l’hôte fournit les fonctionnalités de base suivantes. Chaque plugin indépendant décrit ses propres fonctionnalités, versions et résultats d’acceptation.

<a id="core-capabilities"></a>

## Compétences essentielles

| Capacité | Statut actuel et exigences | Guide |
| --- | --- | --- |
| Texte enrichi, Markdown, feuilles de calcul, diapositives, canevas | Tous les cinq éditeurs sont intégrés ; l'édition nécessite l'autorisation des ressources | [Documents et partage](document-experience.fr.md) |
| Collaboration et confirmation de sauvegarde | Tous les cinq formats utilisent le transport WebSocket de l’hôte et des réceptions durables ; les répliques nécessitent un PostgreSQL, Redis et un stockage de fichiers partagé. | [Collaboration](collaboration.fr.md) |
| Histoire, captures manuelles, restauration | L'histoire est disponible pour les cinq formats ; seule la restauration en texte enrichi/Markdown est possible, avec l'autorisation du manager, la séquence actuelle et un snapshot pouvant être restauration. | [Histoire des documents](document-experience.fr.md#history-and-restore) |
| Bibliothèques et permissions | Arbres, invitations, héritage, partage de liens, transfert, déplacement, copie indépendante et recyclage | [Autorisations](permission-inheritance.fr.md) |
| Découvertes, collections, activités récentes | Mise en œuvre ; la visibilité dans une liste et l’accès aux ressources sont vérifiés séparément. | [Découvertes et collections](public-resource-discovery.fr.md) |
| Fichiers et pièces jointes | Fichiers personnels, dossiers partagés, téléchargement/déchargement autorisé ; un stockage local ou S3 est nécessaire | [Stockage de fichiers](storage.fr.md) |
| Commentaires et notifications intégrées à l’application | Implémenté dans cinq formats, y compris les ancrages de ligne/colonne de feuille de calcul stables | [Commentaires et notifications](comments-and-community.fr.md) |
| Recherche de documents | Une recherche de base de données est disponible ; les index de texte complet et de vecteurs nécessitent Meilisearch et des modèles adaptés. | [API HTTP](api.fr.md#search) |
| Assistant IA personnel | Des sessions, des outils, des approbations et des enregistrements de utilisation bruts sont mis en place ; nécessite des modèles et des identifiants disponibles. | [Guide utilisateur](user-guide.fr.md) |
| Extension de navigateur | Installation de Chrome / Edge sans paquet, capture de pages et de sélections, profils de destination, et barre latérale AI partagée ; l’IA nécessite une configuration du modèle du site. | [Assistant de navigateur](browser-assistant.fr.md) |
| Services MCP | Les clients externes utilisent des outils et compétences autorisées via des services personnels ou des intégrations entre entreprises, avec un utilisateur cible précis ; les permissions de ressources restent valables. | [Services MCP](mcp.fr.md) |
| Client de bureau | Les applications Windows et macOS se connectent à votre propre hôte via l’autorisation du navigateur système ; fenêtres de workspace multi-fenêtres, plusieurs serveurs en même temps, restauration de la page par serveur ; l’hôte doit être en version 0.2.37 ou plus récente. | [Client de bureau](desktop-client.fr.md) |
| Livres de connaissances et abonnements de sources | Cœur : abonnements source, livres de connaissances immuables, workflows éditables, provenance et retour d’expérience humaine ; les anciens robots de curation et de Q&A ont été supprimés. | [Livres de connaissances](knowledge-books.fr.md) |
| Comptes locaux et connexion externe | Des mots de passe, des codes de vérification de contact, des procédures de récupération, des vérifications d’inscription, OIDC/OAuth et des adaptateurs sociaux sont implémentés ; les services externes nécessitent des identifiants réels. | [Authentification](authentication.fr.md) |
| Webhooks | Délivrance asynchrone, rétries et enregistrements sont implémentés ; nécessite un récepteur configuré | [Webhooks](webhooks.fr.md) |
| Installation du plugin et SDK public | Pacques préconstruites fiables, découverte des répertoires d’installation, activation après redémarrage ; les SQL gérés, les objets et les identifiants chiffrés sont implémentés. | [Déploiement de plugin](plugin-deployment.fr.md) |

<a id="independent-plugins-and-removed-features"></a>

## Plugins indépendants et fonctionnalités supprimées

- **Notes rapides** a été retiré de l'hôte. Il n'a pas `#/notes` page, `/api/v1/quick-notes` API, `quick_notes` table, ou `quick_note_compilations` table. Le ancien guide est conservé uniquement dans [enregistrements de recherche](research.fr.md); ses interfaces ne peuvent pas être utilisées avec l'hôte actuel. Ce dépôt ne fournit aucune version de plugin Quick-Notes ni aucune garantie concernant les fonctionnalités actuelles.
- Courrier, calendrier, abonnement, points, facturation, quotas professionnelles et modération du contenu appartiennent aux plugins professionnels indépendants. L’image par défaut ne installe aucune de ces fonctionnalités professionnelles. Le contrôle de la registration et l’audit de sécurité restent des fonctionnalités essentielles.
- Les modèles, les matériaux, les collections de matériaux et les éléments de document de plugin disposent d’interfaces hôte et de détecteurs, avec **provisionneurs par défaut zéro**Installer un fournisseur correspondant au SDK séparément. La page CRUD de gestion de modèle d'hôte n’est pas disponible. La création de documents vides reste possible sans fournisseur.
- [Exemples](../examples) Soutien au développement et acceptation isolée. L’image par défaut ne les installe pas, et leurs résultats ne valident pas les plugins commerciaux indépendants.

<a id="unavailable-or-requiring-separate-verification"></a>

## Indisponible ou nécessitant une vérification séparée

- Les éditeurs possèdent des répliques locales persistantes et des files d’attente d’actualisation non reconnues, nécessitant une réplique autorisée disponible et une sauvegarde réussie par le navigateur. Ce n’est pas une application complètement hors ligne ni une garantie de démarrage froid hors ligne. Doca en tant que fournisseur d’OIDC et SAML n’est pas disponible. Voir [collaboration](collaboration.fr.md).
- Les espaces de travail temporaires de la extension, la consommation de tâches commerciales à l’échelle du cluster, les requêtes SQL arbitraires et les transactions distribuées entre services ne sont pas disponibles. Les contrats du SDK cible ne permettent pas d’établir les export existants ; veuillez consulter. [état d’implémentation](plugin-sdk-contract.fr.md).
- Un conteneur WebView avec plugin natif possède un protocole de source. Les builds iOS/Android, le comportement du appareil et l’intégration indépendante des plugins nécessitent leur propre acceptation. L’installation sur le serveur ne télécharge ni ne exécute le JavaScript natif.
- L'IA réelle, le SSO, les passerelles de vérification, les Webhook, S3/CDN et autres services dépendent de la configuration du déploiement. Les tests de sortie historiques ont tous un champ d'application défini ; ils ne vérifient pas tous les services ou dispositifs externes.

<a id="evidence"></a>

## Preuves

L’audit couvre [composant de services](../apps/server/src/plugins/composition.ts), [pages de routes](../apps/web/src/app/app.tsx), [cinq éditeur dispatch](../apps/web/src/features/documents/document-editor.tsx), [histoire routes](../apps/server/src/routes/experience.ts), [itinéraires de compte](../apps/server/src/routes/accounts.ts), [schéma actuel](../packages/db/src/create-schema.ts), et [Exportations SDK](../packages/plugin-sdk/package.json). `bootstrap.capabilities` et `bootstrap.plugins` Identifier les capacités de l'hôte et les plugins chargés dans un déploiement ; le premier n’est pas une liste complète des fonctionnalités commerciales.
