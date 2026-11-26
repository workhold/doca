<a id="platform-service-credentials"></a>

# Credences de service de plateforme

[中文](service-credentials.zh-CN.md)

Ouvrez Admin → Paramètres de plateforme → Credences de service. Le record de la plateforme gérée par l'hôte actuel couvre :

- Identité : noms des secrets clients SSO et origines HTTP(S) autorisées. Les fournisseurs d’identité désignent le nom des identifiants.
- Portail de vérification : point d’accès HTTP(S), secret bearer et canaux téléphone/email.
- Recherche de documents : clé API de Meilisearch et origines autorisées.

Les identifiants du backend et les clés de signature CloudFront sont configurés uniquement dans `DOCA_FILE_STORES_JSON`La page d’administration de stockage est uniquement lisible. Elle ne peut pas être modifiée sur ce registre de plateforme. [Identifiants du plugin](plugin-credentials.fr.md) Utilisez le service chiffré spécifique uniquement pour les serveurs et sa clé maîtresse de déploiement.

<a id="persistence-and-configuration-precedence"></a>

## Persistance et priorité de configuration

Les paramètres de la plateforme sont persistants sous `account_settings`, ID `service-credentials`Le code existant se base sur la configuration d’identité/messaging du environnement de exécution uniquement lorsque cette entrée n’est pas présente ; une entrée sauvegardée a alors la priorité. Modifier les variables d’environnement ne覆wouille pas les paramètres sauvegardés. Il s’agit d’une méthode d’initialisation existante, conservée et documentée ici sans aucun nouveau adaptateur ou migration. Une entrée sauvegardée contenant la forme de stockage retirée est explicitement rejetée par l’hôte actuel.

Les connexions à la base de données, l’origine du site, les ports d’écoute et le stockage des fichiers restent dans la configuration de démarrage. La base de données doit être connectée avant que les paramètres persistants puissent être lus. Le premier administrateur utilise toujours la commande de bootstrap explicite.

<a id="api-and-secret-handling"></a>

## API et gestion des secrets

`GET` / `PUT /api/v1/admin/service-credentials` Il est nécessaire d’avoir un administrateur système ; les mutations valident Origin. GET remplace les secrets configurés par null. Pour PUT, null conserve le secret existant, et une chaîne vide le supprime. Ne pas envoyer de chaîne de masquage fictive. Les vérifications de révision empêchent les écritures simultanées. L’audit stocke l’action plutôt que les valeurs des secrets ; les restrictions liées au protocole d’endpoint, à l’origine et au redirection restent inchangées.

Le serveur conserve les identifiants de tiers utilisables. Considérez la base de données et les sauvegardes comme une configuration sensible. Les secrets stockés ne sont pas restitués aux utilisateurs ordinaires, au public, aux logs d’erreurs ou aux réponses GET de l’administrateur. L’encryption des identifiants du plugin ne réencrypte pas automatiquement ces paramètres de plateforme.

Chaque processus de service vérifie la révision des paramètres avant les demandes API et met à jour les adaptateurs après une modification sans redémarrage. Le changement du secret de vérification annule les défis de vérification en attente. Les modifications des identifiants de stockage suivent le déploiement. [règles de stockage](storage.fr.md), y compris la conservation des IDs de stock stables et des octets référencés.
