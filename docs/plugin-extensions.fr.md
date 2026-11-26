<a id="public-reads-and-ui-extensions"></a>

# Lectures publiques et extensions de l’interface utilisateur

[中文](plugin-extensions.zh-CN.md)

Cette référence couvre les services de lecture publique et les commandes, vues et positions Web réutilisables. Les ajouts originaux de lecture/interface utilisateur ont été intégrés dans la source du SDK. `0.1.4`; éléments de document entrés `0.1.6`Pour l’hôte actuel, utilisez le SDK `0.1.9` et déclarer un correspondant `sdkRange` comme par exemple `^0.1.9`. Vérifiez l'hôte installé et les artefacts SDK créés avant de compter sur une API ; une implémentation source ne prouve pas que les artefacts npm ou le déploiement ont été mis à jour.

<a id="public-services"></a>

## Services publics

| Service / export | Méthodes | Objectif et limites |
| --- | --- | --- |
| `users.v1` / `@smartdoca/plugin-sdk/platform` | `me`, `searchPage`, `resolveDirectory`, `validateSelection` | L’administrateur d’honor surpasse les politiques de répertoire « aucun/ tous/ liés » ; la recherche expose les projections de présentation publique ; les lectures de profil personnel sont distinctes. |
| `permissions.v1` | `registerDirectory` | Les modules internes et les plugins partagent des ressources `DirectorySource`Seul le mode lié appelle les sources, vérifie les candidats et fusionne les identifiants utilisateur. |
| `documents.read.v1` / `@smartdoca/plugin-sdk/documents` | `get`, `readSnapshot`, `capabilities`, `references` | Métadonnées du document, contenu natif persistant complet, capacités actuelles et références ; distincte du service de collaboration interne. `documents.v1` |
| `libraries.v1` / `@smartdoca/plugin-sdk/documents` | `list`, `children`, `path` | Bibliothèques découvrables, contenus paginés pour les enfants, et chemins autorisés pour les ancêtres ; le contenu nécessite une autorisation dédiée |
| `files.v1` / `@smartdoca/plugin-sdk/files` | folders/files/uploads/bindings/content/receipts | Structure des dossiers, informations sur les fichiers, flux autorisés, liens d’attachement, téléchargements et reçus |
| `content.v1` / `@smartdoca/plugin-sdk/content` | `list`, `read`, `resolve`, `search` | Récupération de contenu, analyse et abonnements à des connaissances ; ne remplace pas la structure native des documents |

Les tokens sont `usersServiceToken`, `permissionsServiceToken`, `documentReadServiceToken`, `librariesServiceToken`, `filesServiceToken`, et `contentServiceToken`. Indiquer les exigences du serveur `injections.required` et obtenir des implémentations par le biais de `context.inject(token)`. Enregistrez un source de répertoire uniquement lorsque vous contribuez à un source de relation. Les IDs de source doivent appartenir au nom de space du plugin. Le cycle de vie est responsable de l’enregistrement ; son détenteur libère uniquement les contributions en temps réel.

`DirectorySource` Conserve le schemaVersion 1 et le protocole correspondant/à vérifier. Les documents intégrés et les dossiers partagés enregistrent également les sources. Aucune recherche ne renvoie de candidats ; utilisez `me` Lire soi-même. Toutes les requêtes sont effectuées directement sur les comptes du site, sans avoir besoin de contacter les sources. Les agrégats associés travaillent sur les sources en parallèle, vérifient les candidats et filtrent l’état du compte. Les candidats provenant d’une source sont rejetés en cas d’erreurs, de curseurs répétés, de dépassements de budget ou de non-réinscription pendant l’exécution. Les résultats paginés indiquent une panne partielle de la source. `complete: false`Chaque source dispose d’un budget de 2 secondes, au maximum 40 pages, et au maximum 250 candidats par page.

`searchPage({query,cursor?,limit?})` retourne `{items,nextCursor,complete}`La limite est de 1–100, par défaut 20. Les curseurs lient le appelant, la requête et le mode de répertoire effectif ; chaque page se réautorise à nouveau. Une modification de politique lors de la pagination renvoie 409 : il faut relancer depuis la page un. `resolveDirectory({ids})` et `validateSelection({ids})` Accepter au maximum 100 identifiants et révérifier le répertoire actuel. La découverte d’un compte ne confère aucun droit de partage, d’attribution ou de permissions pour ressources commerciales. Existant `search` Il renvoie toujours un tableau d’au plus 20 éléments ; le serveur de confiance uniquement. `list` n’est pas exposé aux navigateurs.

`readSnapshot({documentId,expectedRevision?})` retourne `{documentId,format,codec,schemaVersion,revision,epochId,seq,content,assets}`. Les formats pris en charge sont texte enrichi, markdown, feuille de calcul, canevas et présentation. Le contenu est le modèle natif de l'éditeur (une chaîne de caractères pour Markdown), et non une synthèse ou une mise à jour Yjs. La révision est un identifiant de contenu opaque qui intègre le contenu réel, le codec/schema et les informations d'époque/sequençage ; il est distinct du métadonnée version. Une inconformité entre expectedRevision renvoie 409. Le texte enrichi persistant sans époque de collaboration renvoie `epochId: null` Sans créer une époque. Les retournements de statut persistant manquants renvoient 409 sans initialisation. Le corps JSON de plus de 16 MiB renvoie 413.

Une transaction cohérente restaure le contenu persistant sans mélanger les modifications non sauvegardées de l’éditeur ou écrire de contenu, d’historique ou d’ACKs. Les assets ne présentent que les identifiants de fichier/nom/mime stables actuellement autorisés, sans inclure les clés de stockage, les chemins physiques ou les URLs temporaires persistantes. Les capacités décrivent les permissions actuelles des ressources et le support des snapshots ; elles ne impliquent pas de service de écriture de documents public.

Liste des livres en bibliothèque / Retours pour enfants `{items,nextCursor}`, en utilisant les 100 pages actuelles de l’hôte. les enfants acceptent `{libraryId,parentId,cursor?}` avec parentId=null au niveau de la racine ; le chemin est accepté `{resourceId}`La découverte et la lecture sont distinctes : un titre visible peut avoir une valeur `role=none`, tandis que l’accès au corps du contenu est refusé. Chaque page vérifie à nouveau l’accès et ne représente pas un inventaire figé. Une exploration incomplète ne permet pas de déterminer si le contenu a été supprimé.

<a id="browser-and-app-webview"></a>

## Naveur et Application WebView

`PluginWebHost.platform` Fournit des clients typés pour ces services d’application :

```js
const page = await host.platform.users.searchPage({ query: "张", limit: 20 });
const self = await host.platform.users.me();
const snapshot = await host.platform.documents.readSnapshot(
  { documentId }, { signal: context.signal },
);
const children = await host.platform.libraries.children({ libraryId, parentId: null });
const folders = await host.platform.files.folders.list({ parentId: null });
```

Les clients des utilisateurs incluent me/searchPage/resolveDirectory/validateSelection ; les documents et les bibliothèques exposent toutes les opérations de lecture mentionnées ci-dessus ; les fichiers exposent les fonctions folders.get/list et files.get/list. Les écritures de fichiers, les flux de contenu et les téléchargements d’attaches utilisent le serveur. `files.v1` ou les capacités d’attachement existantes ; les flux ne sont pas en JSON.

Les appels authentifiés utilisent `POST /api/v1/plugin-platform/{pluginId}/{operation}`. Seuls les espaces de noms installed-plugin en cours d'exécution et les opérations explicitement listées sont acceptés. L'entrée ne peut pas fournir de principal, de mode ou un nom de service arbitraire. Les réponses ne sont pas mises en cache. Existant `host.request` reste limité à l’extension du plugin `/api/v1/plugins/{pluginId}/` API.

Les plugins mobiles utilisent des sessions WebView émises par l’hôte, ciblées sur un seul plugin. Les appels publics doivent rester dans ce nom de domaine ; le serveur vérifie toujours les permissions utilisateur et de ressources actuelles. Les plugins ne reçoivent pas le token porteur natif. Les tests isolés couvrent la frontière de la session HTTP. Ces placements de cartes et de documents sont des implémentations de l’interface utilisateur web ; les placements mobiles natifs n’ont pas été implémentés ou acceptés sur les appareils.

<a id="commands-views-and-placements"></a>

## Commandes, visualisations et positions

Les rendeurs de route de page web reçoivent un contenu propriétaire de l’hôte `PageHeader` composant dans eux
contexte de route. Afficher `<context.PageHeader title={title} actions={actions} />`
Placer le contenu React dans la barre de titre du espace de travail, aux côtés des contrôles globaux.
L'hôte possède les cibles de montage et supprime le contenu du portail lorsque la page est chargée
démontage. Les plugins ne doivent pas interroger les sélecteurs DOM de l'hôte ni importer les sources de l'hôte. Utilisez
Un en-tête intégré dans le shell de l’extension mobile, qui ne possède pas de barre de titre de espace de travail.
Cette entrée nécessite l'hôte source actuel ; il n’y a pas d’adaptateur pour un hôte plus ancien.

`WebPluginBundle` inclut trois collections optionnelles :

- Commandes : actions réutilisables avec id/pluginId/title/supportedContexts/execute.
- Vues : vues réutilisables avec id/pluginId/title/supportedContexts/render.
- Places : Enregistrements d'installation avec id/pluginId/slot/order?/conditions?, en faisant référence à exactement un commandId ou viewId. Un view peut spécifier une présentation de dialogue/drawer/sidebar ; sinon, il s'affiche dans la place.

Les titres sont utilisés `{zh,en}`; Les IDs appartiennent au namespace de la plugin. supportedContexts est global/home/document/library/folder/resources. conditions filtrent les cibles, les types de ressources, les formats et les capacités. Le support et la visibilité sont des règles d’affichage, distinctes de l’autorisation serveur. Les IDs dupliqués, les emplacements invalides, les références manquantes et les références entre plugins rejettent l’ensemble du bundle et annulent les contributions enregistrées.

Les entrées de commande/vue uniquement iconiques utilisent le même branding PNG que le magasin de plugins configuré. L’hôte le fournit via une authentification. `GET /api/v1/plugin-icons/<id>` Pour exécuter les installations store/npm avec des ressources Web ; les installations locales conservent l’icône générique. Les détails du store sont validés selon le protocole existant du store, les demandes du même plugin partagent une lecture en attente, et les succès, échecs et erreurs sont stockés uniquement dans la mémoire du hôte pendant 60 secondes. Pendant le chargement, si aucune icône de store n’existe ou si une image ne peut pas être chargée, l’entrée conserve son icône générique et reste utilisable. Les bundles de plugins existants, les versions SDK et les données persistantes restent inchangés ; aucune déclaration, conversion ou migration d’icône n’est nécessaire. Revenir à cette configuration du hôte rétablit la présentation précédente.

| Mise en œuvre du slot Web | Contexte |
| --- | --- |
| global.more | Les actions globales partagent l’icône de l’application en haut à droite avec la navigation web.more ; les entrées actions/vue utilisent des icônes avec des labels lors de l’hover ; elles sont cachées lorsque les deux ensembles filtrés sont vides. |
| global.leftMore | Les actions globales partagent le menu déroulant leftMore avec la navigation web.leftMore ; elles sont cachées lorsque les deux ensembles filtrés sont vides. |
| home.cards / home.actions | Cartes de base et raccourcis |
| document.toolbar / document.menu | ID du document, format et permissions actuelles ; la même action peut occuper les deux. |
| document.sidebar / document.status | Contenu de barre latérale et de statut ; sur les écrans étroits, la barre latérale suit le corps du document |
| library.toolbar / library.nodeMenu | Nœuds d’entrée de bibliothèque et de répertoire |
| folder.toolbar / folder.rowMenu | Ressource de dossier ou de ligne actuelle |
| resource.bulkActions / resource.details | Sélection non vide et extensions de détails de document |

Le contexte inclut le champ de champ/objectif/locale/ressource?/ressources?/capacités/signal, sans fournir automatiquement le corps ou le dossier utilisateur complet. L’hôte fournit les capacités de lecture/commentaire/édition/gestion/déploiement des ressources. Les emplacements des fichiers ne disposent pas encore d’une projection unifiée des capacités ; l’absence de capacité ne détermine pas l’autorisation d’accès.

Étiquettes de gestion de navigation `web.more` comme en haut à droite : Plus et `web.leftMore` Comme indiqué ci-dessus. Les administrateurs ne peuvent placer une page de plugin sur la gauche qu’après que la navigation de serveur des allowedSlots le permet explicitement. `web.leftMore`Les entrées utilisateur intégrées prennent en charge les deux. `global.leftMore` C’est une fonction de commande ou de vue client optionnelle distincte, qui prend en charge le contexte global. Les vues sans présentation s’agrandissent dans le menu.

Les règles existantes confirmées le 2026-10-02 restent en vigueur `web.more` et `global.more` En haut à droite. La configuration existante n’est pas migrée et les plugins existants ne prennent pas automatiquement les emplacements gauche. Left More nécessite une déclaration/configuration explicite et ne reçoit pas un débordement automatique. Une entrée peut occuper explicitement les deux emplacements More ; les autres règles de déduplication/débordement restent valables. Le stockage de la navigation utilise schemaVersion=1. Avant de revenir à un hôte sans support pour les emplacements gauche, supprimez et publiez toute configuration web.leftMore : le validateur strict plus ancien ne peut pas le convertir. Évitez également de déclarer de nouveaux emplacements client/serveur ou revenez en arrière sur le plugin.

Cet exemple de navigateur ESM ne consomme aucune path de source hôte :

```js
export default host => {
  const pluginId = "example.tools";
  const viewId = "example.tools.preview";
  return {
    manifest: { pluginId, version: "1.0.0", targets: ["web"] },
    views: [{
      id: viewId, pluginId,
      title: { zh: "预览", en: "Preview" }, supportedContexts: ["document"],
      render(context) {
        return host.React.createElement("p", null, context.resource.title);
      },
    }],
    commands: [{
      id: "example.tools.open", pluginId,
      title: { zh: "预览", en: "Preview" }, supportedContexts: ["document"],
      execute(context) {
        host.ui.openView({ viewId, presentation: "dialog", context });
      },
    }],
    placements: ["document.toolbar", "document.menu"].map((slot, index) => ({
      id: `example.tools.placement${index}`, pluginId, slot,
      commandId: "example.tools.open",
    })),
  };
};
```

Les vues utilisent l’instance React hôte et regroupent leurs dépendances ; le hôte ne résout pas les importations npm brutes dans le ESM du plugin. Les erreurs de Render/child-component sont isolées, les promesses de commande rejetées fournissent un retour d’information, et les boutons d’exécution sont désactivés. Les gestionnaires d’événements créés par le plugin et le travail asynchrone doivent gérer eux-mêmes les erreurs et les annulations.

Un signal de commande/visualisation en place est annulé lorsque le contexte change ou lorsque le composant est démonté. L’ouverture d’un dialogue ou d’un compartiment transfère le contexte à la session propre du panneau, de sorte que la fermeture du menu déclencheur ne le détruit pas. La fermeture du panneau, le changement de route ou l’ouverture d’un autre panneau annulent cette session. Un ancien repose-pied ne peut pas fermer un panneau plus récent. Ces opérations de ressources ne mettent pas en évidence de repose-pied de sélection ou de contrat de écriture de modèle non sauvé.

<a id="capability-boundaries"></a>

## Limites de capacité

Les positions de sélection/bloc/insertion, les commandes de mutation du document, les commentaires/publications/historique, les invitations à partager, l'exécution publique de l’IA, les domaines d’application des événements et les contributions thématiques nécessitent leurs propres contrats et implémentations. Cette extension de lecture/interface utilisateur ne permet pas de mutations globales arbitraires de CSS/DOM, ni ne introduit la persistance du layout, les migrations de base de données ou la conversion des formats de stockage.

Les modèles et les matériaux ont maintenant une section dédiée [contrat de ressources de création](creation-resources.fr.md). Il réutilise les packages publics, les tokens de chaîne de caractères, les espaces de noms de plugin, les gestionnaires de cycle de vie, le contexte authentifié et les clients typés. Il ne transforme pas la table document_templates existante en un fournisseur. files.v1 et content.v1 conservent leurs significations existantes.

<a id="verification-record"></a>

## Enregistrement de vérification

Les vérifications isolées originales couvrent l'agrégation de dossiers, l'annulation de registration, les modifications de politique, les modèles et révisions natifs pour les cinq formats, la pagination autorisée après les candidats rejetés, la navigation, le rollback de registration, l'annulation de panel et les handles obsolètes, la liste d'autorisation HTTP, et le rejet de session mobile-cross-plugin.

`pnpm build:plugin-sdk` construit les artefacts de sortie. `node scripts/verify-plugin-sdk.mjs` Il copie les artefacts dans un répertoire node_modules temporaire et indépendant, exécute du JavaScript et vérifie les fichiers .d.ts dans un projet NodeNext sans mappages de chemin d'hôte. Il ne publie pas de packages npm et ne se installe pas non plus dans les répertoires de plugins utilisateur.

Un exemple isolé a été vérifié dans un navigateur pour les cartes de maison, le menu/barre d’outils « Plus » en haut à droite, la barre latérale de bureau et les dialogues de capture d’écran. Les deux plugins personnels et les appareils mobiles physiques nécessitent leur propre acceptation. L’exécution enregistrée le 2026-10-02 a passé le contrôle de type, 162 fichiers de test (1021 passés, 3 ignorés), la construction du SDK/consommation indépendante, la construction Web et les vérifications de espacement. Ce sont des résultats historiques, et non des vérifications réexécutées en lisant cette page.

<a id="document-plugin-elements"></a>

## Document éléments de plugin

Source SDK `0.1.6` Introduit le bundle Web optionnel `elements` et `@smartdoca/plugin-sdk/editor-elements`. Il prend en charge les éléments de texte riche atomiques intégrés, la rendering de feuille de calcul entière, ainsi que les formulaires de configuration. L’hôte valide la configuration via des commandes natives et l’undo ; les extensions ne reçoivent pas de handles éditeur sans restriction. Les types/versions inconnues affichent un placeholder d’erreur tout en conservant le JSON original sans conversion, migration ou nettoyage. Aucun fournisseur n’est installé par défaut. Voir [Contrat d'élément](plugin-editor-elements.fr.md) et [Exemple de comptage de temps indépendant / lien vers l’information](../examples/plugin-elements/README.md)L’acceptation de la source ne garantit pas la publication par npm, l’installation sur le produit ou l’acceptation du dispositif.
