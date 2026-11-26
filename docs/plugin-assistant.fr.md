<a id="launch-the-ai-assistant-from-a-plugin"></a>

# Lancer l'assistant IA via une extension

[中文](plugin-assistant.zh-CN.md)

Le SDK source 0.1.7 a été introduit. `PluginWebHost.ai.open(input)`. Web ouvre l’assistant personnel complet ; un plugin d’application WebView ouvre la conversation native. La vérification de la source ne confirme ni la publication sur npm, ni une mise à jour de l’application. Il s’agit d’une API de lancement client ; l’exécution en arrière-plan du serveur suit un contrat distinct.

```ts
import type { PluginAssistantOpenInput } from "@smartdoca/plugin-sdk/web";

const input: PluginAssistantOpenInput = {
  prompt: "Summarize this email and list action items",
  context: mail.plainText,
  documentIds: [document.id],
  attachmentFileIds: [attachment.fileId],
};
const { sessionId } = await host.ai.open(input);
```

| Paramètre | Comportement et limites |
| --- | --- |
| `prompt` | Texte d’entrée initial modifiable |
| `context` | Texte brut ajouté après `prompt`Maximum combiné de 20 000 caractères, en tant que message utilisateur plutôt qu’une instruction système |
| `documentIds` | Au maximum 20 UUIDs distincts de documents hôte ; l’hôte lit les titres/formats actuellement autorisés et affiche les puces de référence. |
| `attachmentFileIds` | Au maximum 8 UUIDs distincts de fichiers hôte, chaque UUID ne dépassant pas 20 MiB et le total ne dépassant pas 25 MiB ; copiés via des APIs autorisées dans les attachés IA. |
| `sessionId` | Un UUID de conversation existant appartenant à l’utilisateur actuel ; l’omission crée une nouvelle conversation ; les conversations archivées doivent d’abord être restauration. |
| `modelId` | Un modèle disponible ; l’omission utilise le modèle de conversation, la définition par défaut de l’utilisateur, puis la définition par défaut du site. |
| `autoSend` | Remplir par défaut ; explicite `true` envoie un message et exige un contenu non vide `prompt` ou `context` |

`host.ai.open()` On peut ouvrir une conversation vide. Cela retourne `Promise<{sessionId: string; jobId?: string}>`. `jobId` Cela n’existe que lorsque l’envoi immédiat soumet un travail ; cela ne signifie pas que le modèle est terminé. Les lances simultanées et doubles dans un même client sont rejetées. Chaque appel nouveau réussi constitue une lance séparée et ne répète pas automatiquement le message.

```ts
const { sessionId, jobId } = await host.ai.open({
  prompt: "Draft a reply",
  context: mail.plainText,
  autoSend: true,
});
```

Références, fichiers, conversations, modèles et envoi utilisent toutes l’autorisation de l’hôte actuel. L’identité provient de la session. Les entrées ne peuvent pas être fournies. `userId`, tokens ou prompts de système. Les champs inconnus, les IDs dupliqués, les UUID invalides et les entrées excessives sont rejetés. Les plugins doivent s'assurer que leur contenu commercial peut être transmis à cet utilisateur et à l’IA. Le lancement ne dilate pas les permissions de ressources ni ne contourne les politiques d’exécution du modèle, les approbations des outils ou l’enregistrement de l’utilisation.

Les permissions refusées, les modèles indisponibles, les conversations archivées ou entre utilisateurs, les limites d’attachements, les erreurs de réseau et le changement d’accès rejettent la promesse. Les attachements en cours de parsing peuvent être préremplis ; un envoi immédiat signale une erreur explicite. Le plugin peut réessayer plus tard ou ouvrir une conversation préremplie. En cas d’échec, aucune donnée utilisateur n’est supprimée ; les attachements créés ou les conversations vides respectent les règles de conservation existantes de l’hôte.

Les préremplis existent uniquement dans la mémoire du processus UI actuel et sont perdus lors du redémarrage ou de la fermeture de l’application. Les URLs contiennent uniquement l’identifiant de conversation et un identifiant de lancement unique interne de l’application, sans paramètres de contenu ou d’attachement. Natif `assistant.open` Utilise le nom de espace de noms plugin et les identifiants de compte fixés. L’élimination du plugin ou le changement de compte annule les demandes en attente ; les identifiants ne pénètrent jamais dans le WebView. Les références et les pièces jointes peuvent être supprimées avant envoi sur le Web et l’App.

Cette mise à jour n’a introduit aucun schéma de base de données, lecteur de format ancien, migration ou adaptateur pour ancien hôte. Les conversations existantes conservent le format normal de l’hôte ; la restauration de la source ne nécessite aucune conversion ou suppression. Un hôte ne disposant pas de cette méthode, ou un conteneur natif ne disposant pas… `assistant.open`, ne peut pas fournir cette capacité. Déployez les artefacts correspondants ; la publication indépendante via npm et l’acceptation par le dispositif nécessitent une vérification distincte.
