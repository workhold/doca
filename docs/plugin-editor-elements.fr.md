<a id="plugin-document-elements-sdk-016-source"></a>

# Éléments de document de plugin (source SDK 0.1.6)

Mise en œuvre le 2026-10-02 dans l’hôte source 0.1.8, le SDK 0.1.6, les contracts 0.1.6 et le Web registry 0.1.3. Cela enregistre les exportations de la source et l’acceptation isolée, mais pas la publication npm, l’installation de production ou l’acceptation sur appareil natif. La politique de stockage convenue est celle de support des versions exactes : les types et versions inconnus affichent un placeholder d’erreur et conservent leur JSON original. Aucun adaptateur, conversion automatique, migration ou réinitialisation des données n’est introduit. Les lecteurs de références documentaires internes existants restent inchangés.

<a id="public-registration"></a>

## Enregistrement public

Importation `PluginElementContribution`, `PluginElementPayload`, `createPluginElementPayload`, `pluginElementState`, `isPluginElementPayload` et `validatePluginElementPayload` depuis `@smartdoca/plugin-sdk/editor-elements`. Retour optionnel `elements` du bundle normal d’extension Web installé. L’hôte enregistre chaque contribution. `WebPluginRegistry.elements` Sous le nom de space de nom de plugin propriétaire, et il est désinstallé avec le bundle. Les identifiants doubles et les déclarations invalides entraînent l'échec de l'enregistrement et font revenir en arrière les enregistrements du bundle.

```ts
import type { PluginElementContribution } from "@smartdoca/plugin-sdk/editor-elements";

// Return this contribution from the injected Web plugin factory.
const element: PluginElementContribution = {
  id: "example.elements.countdown", pluginId: "example.elements",
  title: { zh: "倒计时", en: "Countdown" }, dataVersion: 1,
  formats: ["rich_text", "spreadsheet"],
  validate: data => typeof data.targetAt === "string" &&
    Number.isFinite(Date.parse(data.targetAt)),
  text: data => `Countdown: ${data.targetAt}`,
  renderEditor: context => /* injected React configuration form */ null,
  render: (payload, context) => /* injected React inline view */ null,
  renderCell: context => { /* draw within context.rect using context.canvas */ },
  refreshIntervalMs: 1000,
};
```

Cette déclaration illustre les signatures exportées ; [l’exemple indépendant](../examples/plugin-elements/README.md) inclut des formulaires fonctionnels, des renderers et des fichiers d’installation. Les extensions utilisent React injecté et packent leurs propres dépendances. Elles ne doivent pas importer les chemins de source de l’hôte ni utiliser des ponts éditeur globaux.

Chaque contribution nécessite une localisation spécifique. `title`, un entier positif `dataVersion`, au moins un format supporté `validate`, `text` et `renderEditor`. `rich_text` exige `render`; `spreadsheet` exige `renderCell`. Optionnel `onCellClick` reçoit le payload et le contexte public. Optionnel `refreshIntervalMs` C’est un entier compris entre 1000 et 60000, et se contente de mettre à jour la vue du canvas.

Le contexte contient `documentId`, `format`, `locale` (`zh` ou `en`), `readOnly` et une `AbortSignal`Le contexte de formation fournit également des clones. `initialData` ou null, `submit(data)` et `cancel()`. Le contexte de canevas fournit un clone `payload`, le canevas et le rectangle de cellule coupée. La configuration est soumise via l’hôte ; les extensions ne reçoivent aucun handle éditeur modifiable, aucun canal de persistance privé ou indépendant. Les erreurs de rendu produisent un placeholder localisé. Les extensions gèrent leurs propres échecs d’événements/asynchrones et annulent le travail lorsque le signal s’arrête.

<a id="stored-content"></a>

## Contenu stocké

```json
{
  "version": 1,
  "pluginId": "example.elements",
  "type": "example.elements.countdown",
  "dataVersion": 1,
  "data": { "label": "Launch", "targetAt": "2026-10-04T00:00:00.000Z" },
  "text": "Launch · 2026-10-04T00:00:00.000Z"
}
```

`version` c’est la version en enveloppe ; `dataVersion` C’est la version de données exacte de la contribution. `data` Contient une configuration en JSON simple. `text` C’est une projection statique limitée pour les consommateurs basés sur du texte. Ne persévérez pas avec les fonctions de rendu, les identifiants, les URLs temporaires, les valeurs en cours de déploiement ou les timers. Les contenu de payload opaques doivent être des objets JSON simples, d’une taille maximale de 32 KiB en UTF-8, avec une profondeur de 20 et 4096 nœuds. Les clés inoffensives et les valeurs non finies ou non en format JSON sont rejetées avant leur persistance.

Le reconnaisseur d'enveloppe actuel ne prend en compte que les six champs déclarés. Une enveloppe inconnue, structurellement valide mais non installée/désactivée, un type inconnu, un format non supporté ou une version incompatible génère un placeholder non supporté. Un fournisseur actuel qui rejette la configuration crée un placeholder invalide. Aucune de ces situations ne modifie ou ne supprime les données. L’hôte ne fait pas appel au renderer ou à l’éditeur de configuration d’un fournisseur incompatible. Les utilisateurs peuvent supprimer explicitement un élément non supporté via l’édition native et l’annulation de cette suppression. Réactiver le fournisseur exact permet de réafficher la configuration conservée.

<a id="native-editor-integration"></a>

## Intégration avec l'éditeur natif

- Le texte enrichi utilise une extension atomique inline permanente. `custom:plugin-element`, et son codec partagé. Son codec stocke l’intégralité du contenu opaque même sans plugins d’entreprise chargés. L’insertion capture une séquence Slate en direct, et l’édition localise le nœud par ID. L’insertion/configuration/removal utilise des opérations natives et un undo natif. Cette version prend en charge les atomes en ligne ; les agencements de blocs arbitraires ne sont pas exportés.
- La feuille de calcul utilise le public `cellRenderers` extension de canvas et `custom.docaElement` sur natif `ICellData`. La cellule `v` C’est la projection de texte statique. Les commits d’insertion/configuration conservent le style de cellule actuel et définissent le wrapage de texte natif sur CLIP afin que la projection ne dépasse pas les cellules voisines. L’insertion remplace la valeur/formule/texte enrichi/données personnalisées de la cellule sélectionnée, comme indiqué explicitement dans le dialogue. Il n’y a pas d’objets flottants ou de positions intégrées dans le texte de la cellule. Une ancrage stable sur une seule cellule s’applique aux modifications de ligne/colonne tant que le formulaire est ouvert ; une cellule supprimée ou modifiée simultanément ne peut pas être soumise. Les commandes de sélection de plage natives permettent de copier, supprimer, annuler et collaboration.
- Clôture du dialogue, changement du contexte éditeur ou quittement du mode d’édition annule la session. La soumission vérifie à nouveau l’offre active, l’handle, l’état de lecture seule et la cible. Les modifications du rendu/du registre ne remontent pas l’éditeur de document. La mise à jour de la vue extension ne génère pas une écriture de document.

Le schéma riche 3 existant et le schéma feuille de calcul 6 conservent leurs points de contrôle natifs et la collaboration fiable dans l’outbox. Il n’y a pas de deuxième sauvegarde automatique en JSON, de transport, de voie de rejoueur Yjs ou de base de données de plugin commercial pour le contenu des éléments. Les points de contrôle natifs et le clippable de même modèle préservent les données ; les limitations existantes liées à la conversion texte/Markdown/Office persistent. Les exportations atomiques riches se dégradent en étiquettes avec l’avertissement de conversion existant ; les consommateurs de feuille de calcul peuvent lire la valeur statique de la cellule. L’exportation de texte brut ne constitue pas une sauvegarde sans perte du plugin-élément.

<a id="lifecycle-installation-and-rollback"></a>

## Cycle de vie, installation et rollback

Aucun fournisseur d’éléments n’est installé par défaut. Découvrez les plugins uniquement via le mécanisme de dossier d’installation/ZIP existant. Le manifeste d’exemple actuel nécessite le SDK. `^0.1.7`Publier/installer un SDK et un hôte contenant cette mise à jour avant son utilisation en production indépendante. La société de fabrication de serveurs ne possède aucune données commerciales, et l’uninstallation ne supprime pas le contenu des documents.

Désactiver/effacer une extension ne fait pas réinscrire les renderers, mais ne modifie pas les éléments persistants. Réinstaller un fournisseur de correspondance exacte ne nécessite aucune conversion de données. Le retour en arrière vers un hôte plus ancien qui ne dispose pas du codec natif permanent n’est pas supporté pour la modification de ces documents ; il est conseillé de conserver les sauvegardes de base de données/point de contrôle et d’utiliser l’hôte implémentant pour y accéder. Aucune réécriture de downgrade ni nettoyage destructif n’est fournie.

<a id="acceptance"></a>

## Acceptation

Les tests isolés en `tests/plugin-editor-elements.test.ts` Couver la gestion de la propriété du registre, la destruction/rollback, les versions strictes et les limites JSON, un clavier de copie/effacement/annulation atomique riche et des itinéraires CRDT opaques, une persistance native, le rejouage d’ACK et le comportement sans écho de deux répliques, des ancres stables/insertion de ligne/copie/effacement/annulation/rechargement/convergence, une autorisation en lecture seule et une rejet de chargeur trop grand atomique. Ils créent des bases de données et des documents isolés. Le script de vérification du SDK vérifie également un consommateur de déclaration JavaScript et NodeNext indépendant au style packé, sans chemins d’hôte.

L’acceptation par le navigateur utilise une base de données isolée et une installation temporaire de l’exemple de comptage de temps/actualités indépendant. Les conteneurs natifs réels et les extensions tiers nécessitent leur propre acceptation. Les éléments de bloc généraux, l’export sans perte de format et les commandes de mutation arbitraires publiques pour l’éditeur restent des travaux futurs.

Les opérations de navigateur vérifiées incluent des fonctionnalités comme l’insertion, la configuration, l’annulation, la redémarrage, le rechargement et l’affichage en mode lecture seule ; la configuration des feuilles, l’insertion, l’annulation, la redémarrage et le rechargement ; ainsi que des placeholders de type inconnu avec une configuration permettant uniquement leur suppression. Le clip de projection de la feuille a été vérifié après sauvegarde et rechargement. Vérification finale combinée : TypeScript a été passé ; 171 fichiers de test ont été passés (1 066 tests réussis, 3 ignorés) ; la construction du SDK et son utilisation indépendante ont été passées ; la construction pour production web et les vérifications de l’espace blanc ont été passées.

<a id="performance-acceptance-2026-10-02"></a>

## Acceptation des performances (2026-10-02)

Courir `node --import tsx scripts/benchmark-plugin-elements.mts`Sur cette machine macOS arm64 avec Node 24.15.0, la projection native médiane de 1 000 paragraphes ordinaires était de 0,513 ms avec les deux codecs intégrés originaux et de 0,515 ms avec le codec élément ajouté. Le décalage médian associé était dans la plage de bruit de mesure. La vérification élément sparse ajoutée pour 10 000 cellules occupées coûtait 0,039 ms ; avec 100 éléments configurés, elle coûtait 0,111 ms. La première validation de 100 en-têtes de compte à rebours coûtait 0,188 ms, tandis que la clonage et l’appel de 100 callbacks de canvas exemplaires coûtaient 0,101 ms. Le benchmark des callbacks utilise un canvas simulé et ne mesure pas la peinture native.

Les cellules ordinaires sortent après vérification de la propriété personnalisée. La validation riche est mémorisée, et la validation du canvas est stockée par payload/provider et invalidée en cas de changement de registre. Un seul timer de vue coalescé est réarmé uniquement lorsque la cellule temporelle visible est dessinée, avec une période minimale de 1 seconde. Les pages cachées le annulent. Une feuille sans cellules temporelles visibles n’a pas de timer de mise à jour récurrente. Les tests du planificateur couvrent les timers inactifs nuls, la coalescence de 100 éléments, le quitter de la vue, la cachage et l’élimination. L’observation par le navigateur des documents en train de tourner pendant plus de 60 secondes inactives n’a montré aucun nouveau contenu séquentiel/historique ; les timers ne pénètrent jamais dans l’outbox de persistance.

Ces mesures montrent que le travail supplémentaire requis par le CPU de l’hôte est négligeable pour les cas testés. Elles ne garantissent pas un coût nul pour les rendus de tiers arbitraires, les requêtes externes, les grands nombres d’éléments visibles ou pour tous les appareils. Le fournisseur de services de production doit valider son propre travail de rendu/asynchrone.
