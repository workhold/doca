<a id="native-plugin-cache-and-attachments"></a>

# Cache et pièces jointes natives de la extension

[中文](plugin-native.zh-CN.md)

Dans le conteneur de plugin natif, `host.ai.open` utilise `assistant.open` Ouvrir l’assistant personnel natif. Les paramètres et les erreurs suivent. [contrat de lancement](plugin-assistant.fr.md)Les prompts et le contexte ne font pas partie des URLs de navigation ; les identifiants de compte ne font pas partie de WebView. Les requêtes préremplies sont stockées en mémoire sous l’identifiant de lancement unique d’un compte.

Les types public proviennent de `@smartdoca/plugin-sdk/native`, exposé à travers `PluginWebHost.native`. Cette propriété est null sur le Web. Le conteneur de plugin d’application fournit :

- `storage.get(key)` / `set(key, value)` / `remove(key)` / `clear()`: chaîne de données cache, au maximum 2 millions de caractères par valeur et 20 millions par extension.
- `attachments.save({path,name,mime})` / `share(...)`: `path` est relatif à l'API du plugin, par exemple `/mailboxes/123/attachments/456?download=true`.

L’hôte natif lie le nom de space de cache au identifiant de l’utilisateur vérifié en ligne et à l’identifiant du plugin. Les plugins ne peuvent pas choisir une autre identité. Les données se trouvent dans le dossier persistant de l’application, survivent aux redémarrages et sont effacées pour le serveur correspondant lors du déconnexion ou de la suppression de l’utilisateur. Les écritures sont serialisées ; une nouvelle capture d’écran est terminée avant de remplacer la précédente. Le WebView reste temporaire et isolé ; les cookies de connexion ne constituent pas un mécanisme de cache persistant.

L’hôte natif vérifie l’identité connectée en ligne avant d’installer une extension. Le code existant des extensions IndexedDB n’est pas migré ou adopté automatiquement ; les extensions utilisent explicitement… `native.storage`Les démarrages froids complètement hors ligne ne sont pas pris en charge. La suppression de l’application ou la nettoyage de l’espace de stockage du système peuvent effacer la cache.

Les téléchargements d’attaches utilisent une transmission interne authentifiée par l’hôte. Les redirections vers des origines externes sont interdites, et le token de session natif ne est jamais fourni à la WebView. Les attaches ne dépassent pas 32 MiB. Les fichiers temporaires sont nettoyés après sauvegarde ou partage.

Android Save utilise le sélecteur de dossiers du système et renvoie `completed` ou `canceled`iOS Save and Share présente la feuille de partage du système et revient. `presented`L’API du système ne rapporte pas de manière fiable les résultats de sauvegarde/annulation finales, donc `presented` ne permet pas une sauvegarde réussie.

La suppression de page ou le changement d’accoutrement annule les demandes natives actives. La liaison de compte de messagerie se fait sur le Web ; il n’y a pas de flux OAuth natif.

Les vérifications de type et les tests de protocole/chargement sur l’appareil ont réussi dans la mise en œuvre enregistrée. La persistance de la cache, le partage du système et le sauvegarde nécessitent encore l’acceptation des appareils iOS/Android.
