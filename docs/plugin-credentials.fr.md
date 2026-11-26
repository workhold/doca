<a id="host-managed-plugin-credentials"></a>

# Identifiants de plugin gérés par l'hôte

[中文](plugin-credentials.zh-CN.md)

Sortie : host 0.1.10 et SDK 0.1.9, incluant l’API de credences ajoutée précédemment dans le code source SDK 0.1.8. Le SDK 0.1.7 ne l’exporte pas. Les plugins de messagerie doivent le déclarer. `^0.1.9` et consommer le token du serveur public plutôt que d’importer la source d’hôte ou de persister les mots de passe eux-mêmes.

```ts
import { pluginCredentialToken } from '@smartdoca/plugin-sdk/storage';

// Declare pluginCredentialToken in injections.required.
const credentials = ctx.inject(pluginCredentialToken);
const created = await credentials.create({value: JSON.stringify({password: 'example'})});
// Store created.id in the plugin database with the business account and grants.
const metadata = await credentials.inspect(created.id); // No plaintext.
const stored = await credentials.get(created.id); // Server plaintext or null.
if (stored) {
  const refreshed = await credentials.update({
    id: stored.credential.id,
    expectedRevision: stored.credential.revision,
    value: JSON.stringify({accessToken: 'new', refreshToken: 'new-refresh'}),
  });
  await credentials.remove({id: refreshed.id, expectedRevision: refreshed.revision});
}
```

Les métadonnées sont `{id, revision, createdAt, updatedAt}`. Le hôte génère des identifiants ; les extensions ne peuvent pas fournir d’identifiants, de scopes, de noms de base de données ou de configuration serveur. `get` retourne `{credential: metadata, value: string} | null`; `inspect` renvoie les métadonnées ou null. Les valeurs sont des chaînes Unicode valides non vides, d’une taille maximale de 64 KiB en UTF-8. Les plugins serialisent explicitement les objets OAuth ; il n’y a pas de conversion de format implicite.

Les mises à jour et les suppressions nécessitent un entier positif. `expectedRevision`Seule une mise à jour simultanée réussit. Une révision obsolète est renvoyée. `conflict`Relecturer et appliquer les règles commerciales plutôt que de surécrire un token de mise à jour plus récent. L’élimination d’un enregistrement manquant est idempotente. Les entrées invalides retournent `invalid-input`; installations invalides, données corrompues, dysfonctionnement du service/bases de données, ou mise à jour d’un enregistrement manquant. `unavailable`Les erreurs comprennent le manque d’entrées, les problèmes de SQL, la configuration de la connexion ou les exceptions liées à la chiffrement.

L’encryption authentifiée AES-256-GCM lie les enregistrements les uns aux autres `plugin:<pluginId>`, génération de l’installation, UUID et révision. La base de données stocke des enregistrements chiffrés et chaque écriture utilise un nonce aléatoire nouveau. Les autres plugins ne peuvent pas lire, mettre à jour ou supprimer ces enregistrements. Le désactivation ou l’arrêt du service les préserve. Une désinstallation explicite supprime les identifiants de cette génération dans la transaction du registre et annule les anciens handles ; une réinstallation utilise une nouvelle génération. Effectuez toute annulation externe nécessitant du texte brut avant de terminer la désinstallation. Le SDK ne décide pas de l’autorisation des comptes professionnels : les plugins vérifient les permissions utilisateur/accord avant de lire et ne renvoient jamais du texte brut aux navigateurs, au contexte IA, aux logs ou aux APIs de configuration ordinaires.

Les opérations de credencial et les transactions commerciales de plugin sont effectuées séparément. Si la sauvegarde d'une référence commerciale après la création de la credencial échoue, il est possible de compenser en supprimant la credencial. Les plugins récupèrent les mises à jour OAuth externes, les commits de base de données et les réponses perdues conformément à leurs propres règles. Il n'y a pas de transaction interservices, de clé d'idempotence générale, de coordinateur de tâches ou de rotation automatique de clé. Voir… [exemple de stockage](../examples/plugin-storage/README.md). Les plugins s'exécutent dans un processus Node.js fiable ; les API scellées ne constituent pas une boîte noire du système d'exploitation.

<a id="deployment-environment"></a>

## Environnement de déploiement

`DOCA_CREDENTIAL_MASTER_KEY` Doit être 32 octets aléatoires codés en 64 caractères hexadécimaux ; générez-le avec `openssl rand -hex 32`. Définissez-le une seule fois, conservez-le après chaque redémarrage, et faites une sauvegarde séparée. La clé est nécessaire pour le démarrage de chaque hôte, même sans plugins ; une configuration manquante, vide ou mal formée empêche le démarrage. Les fichiers d’exemple contiennent une valeur de exemple publique uniquement à des fins illustratives ; remplacez-la pour une installation nouvelle, et conservez la clé originale pour un déploiement existant. La base de données conserve un empreinte de clé ; une clé invalide empêche le démarrage sans réencrypter les données. L’élimination du dernier plugin ne supprime pas cette identité de clé. Chaque processus partageant la base de données utilise la même clé.

Les opérateurs choisissent la base de données et le stockage de fichiers : SQLite ou fichiers locaux pour une instance ; configurez la base de données partagée et le stockage en cloud pour plusieurs instances. L’API du plugin ne sélectionne pas la topologie de déploiement. Vous pouvez composer les paramètres de la base de données, du pool, de la base de données Webhook, de Redis et de l’instance ; voir [docker.env.example](../docker.env.example).

Le stockage de fichiers est configuré uniquement par `DOCA_FILE_STORE_ID` et version stricte 1 `DOCA_FILE_STORES_JSON`y compris les identifiants S3/CDN. La page d’administration de stockage est en lecture seule ; les anciennes soumissions de configuration de stockage sont rejetées. Voir [dossier de mise en œuvre](unified-storage-implementation.md) Pour des exemples. La clé principale du plugin et les identifiants de connexion au stockage en nuage sont indépendants. La configuration existante de la plateforme d’identité, de messagerie et de recherche n’est pas convertie ni ré-encodée par cette mise à jour.

Le niveau de base de la base de données est `doca-2026-10-03-credentials-v2`. Conformément à la politique de version préalablement convenue, les bases de données hôtes de la version 0.1.9 et antérieure sont rejetées. Les anciennes bases de données, objets et déploiements doivent être conservés ; aucune réparation automatique de tableaux, migration, import ou réinitialisation n’est fournie. Il faut utiliser une nouvelle base de données vide. Le rollback utilise les données de déploiement/données originales et conserve les données du nouveau déploiement séparément. Le service de credentiel manquant de la SDK 0.1.7 ne doit pas être contourné en utilisant des fichiers locaux gérés par l’utilisateur.
