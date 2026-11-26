<a id="documentation-maintenance"></a>

# Maintenance de la documentation

[中文](documentation.zh-CN.md)

La documentation utilise Docsify 5.0.0. Le fichier source Markdown reste intact. `docs/`; `docs/site/navigation.json` Définit les pages publiques et leur ordre de lecture. Les chemins de source du contrat technique restent stables pour les références de dépôte et d’éditeur.

<a id="layout"></a>

## Mise en page

| Groupe | Contenu |
| --- | --- |
| Commencer | Démarrage rapide, configuration, guide utilisateur, résolution de problèmes |
| Guides utilisateur | Documents, partage, permissions, notes, connaissances |
| Déploiement et opérations | Docker, stockage, scalabilité, authentification, identifiants de service, webhooks |
| Développement | Configuration de la source, architecture, éditeurs, collaboration, langues d'interface |
| Extensions | Développement, installation, services publics, contributions |
| Référence | API, base de données, SDK et contrats éditeur |
| Lancement | Changements, exigences et validation spécifiques à la version |
| Projet | Maintenance de la documentation et archives de recherche originale/acceptation |

Les pages publiques actuelles ont huit éditions en langues différentes. La source par défaut est `name.md`Les suffixes linguistiques, les chemins et le texte de navigation sont définis dans `docs/site/languages.json`Les versions antérieures à 0.3.0, les données de recherche et les registres d’acceptation conservent leurs éditions originales ainsi que leur champ de vérification. Les implémentations abandonnées et les propositions remplacées sont indiquées en haut de leurs fichiers source. Un inventaire des implémentations distingue les APIs exportées, les propositions et le comportement des services externes/appareils non vérifiés.

Les nouvelles modifications suivent [processus de travail SDD en étapes](sdd.fr.md). Le [module index](sdd-module-index.fr.md) Il relie la source, les contrats autoritaires et les vérifications réutilisables. Les spécifications décrivent les modifications individuelles ; les contrats techniques actuels conservent leurs chemins de source existants et sont mis à jour dans le même PR lorsque le comportement change.

<a id="check-and-preview"></a>

## Vérifier et prévisualiser

```sh
pnpm install --frozen-lockfile
pnpm docs:check
pnpm docs:dev
```

Ouvrir `http://127.0.0.1:39140/#/en/` ou `http://127.0.0.1:39140/#/zh-cn/`La vue préliminaire ne lit que la documentation et ne commence pas Doca ni ne se connecte à ses bases de données. Ressuscitez la commande après les modifications du code source pour regénérer le dossier de publication.

`pnpm docs:build` prépare `.cache/docs-site/` avec des dossiers tels que `en/getting-started/` et `zh-cn/operations/`Il copie et réécrit les liens Markdown ; Docsify affiche le contenu dans le navigateur. Il ne compile pas le code d’application ni ne pré-rendre le Markdown en HTML. Le dossier généré est ignoré par Git.

Les liens vers les pages publiques restent en langue actuelle. Les liens linguistiques montrent la page correspondante lorsque cette édition est disponible. Les liens vers le code source, les exemples et les recherches ouvrent les fichiers correspondants sur GitHub. Les pages reçoivent un lien vers le source d’édition et des liens vers les éditions disponibles. Une traduction manquante échoue le test, sans remplacer par une autre langue.

`docs:check` Inventaires en Markdown via Git, y compris les nouveaux fichiers non ignorés et les fichiers à exclure `tests/fixtures/`. Il vérifie les liens Markdown/HTML et les cibles des titres dans la documentation du dépôt, y compris les liens vers ce dépôt depuis la branche principale. Les éléments ignorés et les URLs externes ou étiquetées sans date ne sont pas récupérés. Les ancres de titres publiées sont également examinées selon les règles de Docsify. Le contrôle compare également les entrées de la version actuelle, les matrices de paquets éditeur, toutes les lignes de tableau/field de la base de données (y compris les interfaces de schéma héritées), et les cinq références de compétences portables avec leurs documents sources. Il lit les types TypeScript sans ouvrir de base de données application. L’accessibilité des sites web externes et la cohérence sémantique de chaque référence nécessitent encore une revue.

Courir `pnpm test:docs` Pour les cas de régression de vérification. Après avoir modifié un contrat, exécutez. `node scripts/sync-docs-skills.mjs`; il conserve le texte source et réécrit les liens relatifs pour être utilisé en dehors du processus de paiement. Un argument de répertoire `installed-skills` optionnel met également à jour les références installées. Par exemple : `node scripts/sync-docs-skills.mjs /absolute/path/to/installed/skills`Mettez toutes les copies installées en synchronisation conformément aux règles de maintenance correspondantes.

<a id="github-pages"></a>

## GitHub Pages

Le `.github/workflows/docs.yml` Le workflow vérifie la documentation dans les pull requests et publie les modifications. `main`Configurer le répertoire en bas **Paramètres → Pages → Construction et déploiement → Source → GitHub Actions**Le flux de travail utilise `github-pages` environnement de déploiement et ses règles d’approbation. Il peut également être exécuté manuellement via les Actions.

Les entrées prévues sont :

- Anglais : <https://workhold.github.io/doca/#/en/>
- Chinois : <https://workhold.github.io/doca/#/zh-cn/>

Ces adresses deviennent disponibles après que le workflow est déployé avec succès. Les liens dans le fichier README renvoient aux entrées linguistiques correspondantes. Le site utilise le domaine par défaut GitHub Pages et ne nécessite aucun fichier DNS de domaine personnalisé ou de CNAME pour le répertoire de stockage.

Servir le contenu `.cache/docs-site/` Pour publication ailleurs. Le routage par hash permet un sous-pathe de répertoire et des mises à jour directes sans nécessiter de réécriture de route serveur. Le résultat généré `.nojekyll` Conserve les fichiers de navigation soulignés lorsqu’ils sont hébergés via Pages.

<a id="assets-and-updates"></a>

## Actifs et mises à jour

Les résumés de vérification et les pièces jointes de documentation ont été examinés et sont conservés. [`docs/verification/`](verification/README.md), classés par cas d’acceptation ou libération. Les entrées de script réutilisables appartiennent à `tests/fixtures/`Les fichiers de journal générés, les captures d’écran, les rapports et les caches sont stockés. `artifacts/`, qui est complètement ignorée par Git ; conserver les nouvelles preuves ne nécessite aucune modification des règles d’ignorance.

Le runtime Docsify, le plugin de recherche, les styles clair/obscur et la licence MIT sont vendus en version complète. `docs/site/assets/vendor/docsify/`. `README.txt` Enregistre la version et vérifie l’intégrité du fichier tarball npm provenant du réseau upstream. Ces ressources sont chargées directement depuis le site de documentation. Les diagrammes Mermaid chargent progressivement la version ESM Mermaid pinée. `site.js`; ils nécessitent un accès à ce CDN.

Lors de l’ajout d’une page publique, créer les huit éditions, puis ajouter la page. `navigation.json`, et courir `pnpm docs:check` et `pnpm docs:build`Liens vers un enregistrement technique/design non public. [recherche](research.fr.md), et un résumé de vérification examiné provenant de [indice de vérification](verification/README.md). Assurez que les exemples de code et les exigences de version sont alignés. Lors de la mise à jour d’un contrat, suivez les compétences du dépôt de référence et mettez à jour les références packagées en conséquence. Les ressources en temps de exécution et les plugins supplémentaires nécessitent une sélection explicite de la version et une vérification par le navigateur.

La quatrième valeur dans l’entrée de navigation d’une sortie est `true` Lorsque toutes les huit éditions linguistiques sont disponibles. Conservez cette valeur après la sortie ultérieure. Placez les captures d’écran vérifiées dans le sous-dossier linguistique. `docs/images/` Ainsi, le site et le README peuvent faire référence à l’interface correspondante.
