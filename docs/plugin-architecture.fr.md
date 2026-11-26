<a id="plugin-architecture"></a>

# Architecture de plugin

[中文](plugin-architecture.zh-CN.md)

Le [Contrat SDK](plugin-sdk-contract.fr.md) definit la frontière entre les plugins de base et les plugins métier. [guide de développement](plugin-development.fr.md) Liste les interfaces qui existent actuellement.

`plugin-contracts` Definit le manifeste et le cycle de vie. `plugin-sdk` Fournit des injections, des événements, des contributions et des effets. `plugin-host` Vérifie les dépendances et lance les extensions, puis les désinstalle dans l'ordre inverse. La composition assemble les fichiers de base, les documents, la recherche et l'IA, puis charge les plugins métier depuis le dossier d'installation séparé.

Un plugin commercial communique avec l'hôte via les fichiers publics, les utilisateurs, les permissions, HTTP, les politiques, les événements et les services IA. L’inscription appartient à l’instance du plugin. Un plugin ne pénètre pas dans les types de base de données privées de l’hôte ni dans un pont à l’échelle de processus. Un plugin web fournit sa propre version, et le manifeste actif le charge.

Le hôte conserve l’authentification, l’autorisation, les fichiers, la collaboration documentaire, l’audit de sécurité, l’utilisation originale de l’IA et l’utilisation des tokens évalués par le modèle. La participation, les points, les prix, la modération du contenu et les e-mails ne sont pas des tables, des outils ou des pages essentielles. Un futur plugin e-mail possède son serveur, ses données et ses tests d’acceptation.

Un slot de arbre générique, davantage de services professionnels et un protocole de réservation de fonds sont toujours listés selon l’état de mise en œuvre dans le contrat. Une API proposée n’est pas une export que l’on peut appeler.

Tout état durable de la extension est géré par l'hôte. Les packages doivent déclarer `doca.storage: "host"`; les modèles/autorisation propres aux plugins, et non les pilotes, les chemins de stockage ou la configuration locale/remote. Les objets SQL gérés et privés sont exportés dans le SDK 0.1.7 ; les identifiants chiffrés uniquement pour le serveur sont exportés dans le SDK 0.1.9. Voir… [contrat de stockage](plugin-horizontal-scaling.fr.md).
