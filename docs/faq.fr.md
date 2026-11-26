<a id="faq-and-troubleshooting"></a>

# Questions fréquentes et résolution de problèmes

[中文](faq.zh-CN.md)

<a id="is-there-a-default-administrator-password"></a>

## Y a-t-il un mot de passe administrateur par défaut ?

Non. Courir. `bash scripts/bootstrap-admin.sh` Après que le conteneur est en bonne santé. Les mots de passe doivent contenir au moins 12 caractères. Pour un compte existant, utilisez… `bash scripts/reset-admin-password.sh`L’initialisation n’est pas une réinitialisation de mot de passe.

<a id="why-does-the-browser-not-connect-to-port-39120"></a>

## Pourquoi le navigateur ne se connecte pas au port 39120 ?

Compose relie le port au serveur loopback. Utilisez l’origine HTTP(S) configurée. `DOCA_ORIGIN`, atteint via le proxy inverse configuré. Une URL IP serveur ne fonctionne que lorsque l’origine et la mapping de port correspondent explicitement à celle-ci. Vérifiez la mapping, le Host, le TLS lorsqu’il est utilisé, et le transfert WebSocket. Voir [déploiement](deployment.fr.md).

<a id="which-environment-example-should-i-use"></a>

## Quel exemple d’environnement devrais-je utiliser ?

Pour l’image Docker publiée, copier `docker.env.example`Pour le développement de la source, copier `.env.example`. Configurer `DOCA_ORIGIN`, `DOCA_FILE_STORE_ID`, `DOCA_FILE_STORES_JSON`, et la persistance requise `DOCA_CREDENTIAL_MASTER_KEY` Avant de commencer Compose. Remplacez la clé de exemple publique pour une installation nouvelle ; conservez la clé originale pour une base de données existante. Voir [configuration](configuration.fr.md).

<a id="why-do-i-get-421-403-or-a-disconnected-editor"></a>

## Pourquoi obtiens-je 421, 403, ou un éditeur déconnecté ?

421 signifie généralement que la requête de Host ne correspond pas à l’origine configurée. Les requêtes de mutation nécessitent que l’Origine soit identique ; une différence entraîne un retour 403. L’édition nécessite également une autorisation et une mise à jour WebSocket fonctionnelle. `/api/v1/ws`Vérifiez l’adresse du navigateur, la configuration du proxy, l’état de l’account et les permissions des ressources actuelles.

<a id="what-should-i-do-if-startup-rejects-the-database-baseline"></a>

## Que devrais-je faire si l’entreprise start-up rejette le niveau de base de la base de données ?

Arrêtez-vous et lisez-le. [contrat d’amélioration de la base de données](database-schema-evolution.fr.md) et correspondance [exigences de libération](releases/0.2.38.md). Les générations supportées reçoivent une réconciliation structurelle approuvée ; les générations non supportées subissent des modifications sémantiques et des différences nécessitant une vérification avant le démarrage, ce qui entraîne des modifications persistantes. Conservez l'ancien déploiement, la base de données, les fichiers et les secrets pour un rollback. Ne supprimez pas les tables, ne réinitialisez pas le volume, ni ne modifiez le marqueur de baseline pour forcer le démarrage.

<a id="how-do-i-inspect-startup-problems"></a>

## Comment examiner les problèmes de démarrage ?

```sh
docker compose config --quiet
docker compose ps
docker compose logs --tail=100 doca
curl -fsS -H 'Host: doca.example.com' http://127.0.0.1:39120/health
```

Exécutez ces commandes sur le serveur dans le checkout contenant `compose.yaml`Ne publiez pas de logs contenant des secrets. Pour le développement de la source, utilisez `http://127.0.0.1:39130` et la configuration de développement.

<a id="are-github-pages-and-the-doca-application-the-same-deployment"></a>

## Les GitHub Pages et l'application Doca sont-ils le même déploiement ?

GitHub Pages héberge ce site web de documentation statique. L’application Doca nécessite son conteneur/serveur, les bases de données, les fichiers persistants et un origine HTTP(S). Une mise à jour du site de documentation ne commence ni ne met à jour l’application Doca.

<a id="can-i-update-or-restart-without-deleting-my-files"></a>

## Puis-je mettre à jour ou redémarrer sans supprimer mes fichiers ?

Un ordinaire `docker compose restart` Conserve le volume persistant. Les modifications de configuration sont utilisées `docker compose up -d`Avant de changer les versions d’image, lisez les notes de sortie et faites une sauvegarde de chaque base de données, de chaque stockage de fichiers référencés et de chaque configuration protégée. Évitez `docker compose down -v`, qui supprime le volume.

<a id="why-is-a-plugin-or-an-external-service-unavailable"></a>

## Pourquoi une extension ou un service externe n'est pas disponible ?

Les packages de plugins doivent respecter le contrat actuel du SDK et du stockage. Redémarrez manuellement chaque instance après la mise à jour. Les plugins utilisant des identifiants chiffrés nécessitent la même clé maîtresse persistante dans chaque réplique. La disponibilité de l'IA, du SSO, de la recherche et du stockage en cloud dépend également des identifiants réels et de la connectivité réseau ; les tests de source ne vérifient pas l'acceptation du service en ligne. Voir [déploiement de plugin](plugin-deployment.fr.md).

Utilisez l’hôte réel configuré dans la commande health mentionnée ci-dessus. Un 421 indique un écart entre l’hôte et les paramètres configurés, y compris lors du test loopback. Aucun proxy n’est confié par défaut ; les limites d’IP du proxy partagé nécessitent une configuration rigoureuse. `DOCA_TRUST_PROXY`.

<a id="where-do-i-get-the-desktop-client"></a>

## Où puis-je obtenir le client de bureau ?

Télécharger les installateurs de Windows et de macOS [GitHub Releases](https://github.com/workhold/doca/releases)La build est non signée et non notariée : sur macOS, cliquez droit sur l’application et choisissez **Ouvrir** La première fois, Windows peut afficher un message de SmartScreen. Votre serveur doit être version 0.2.37 ou plus récente. Veuillez consulter… [Guide du client de bureau](desktop-client.fr.md).
