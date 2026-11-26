<a id="specification-driven-development"></a>

# Développement guidé par les spécifications

[中文](sdd.zh-CN.md)

Ce workflow s’applique aux nouvelles tâches dans tout Doca. Le GitHub Spec Kit 1.0.4 fournit les compétences, scripts et modèles Codex validés ; les détails d’installation et d’upgrade se trouvent dans… [Spécifier/README.md](../.specify/README.md). [AGENTS.md](../AGENTS.md), le [constitution](../.specify/memory/constitution.md) Et les contrats techniques existants régissent son utilisation. Commencez par [module index](sdd-module-index.fr.md) Pour localiser la source de courant, les contrats et les vérifications réutilisables.

<a id="choose-the-level"></a>

## Choisissez le niveau

| Niveau | Impact sémantique | Enregistrement minimal avant mise en œuvre |
| --- | --- | --- |
| `full` | Base de données ou formats persistants ; authentification/autorisation ; collaboration ; contrats SDK/API publics ; frontières architecturales, de credences ou de déploiement | `spec.md`, `plan.md`, `tasks.md`, `validation.md` dans un dossier de fonctionnalités |
| `standard` | Autres caractéristiques et changements de comportement observables au sein des limites établies | Un `spec.md` avec portée, acceptation, conception, tâches et validation |
| `light` | Corrections limitées, copies, styles, tests ou documentation sans aucun des impacts mentionnés ci-dessus | Problème de PR, comportement final, vérification et explication de l’impact |

Jugez le comportement, pas le nombre de lignes. Une modification d’autorisation d’une seule ligne est considérée comme complète. Une correction qui restaure le comportement spécifié peut être mineure si elle ne modifie aucun contrat ou aucune limite à haut risque. Les modifications uniquement liées au processus peuvent choisir de conserver une description complète pour documenter leur adoption, comme [cette installation](../specs/001-sdd-adoption/spec.md) Fait. Augmente le niveau et met à jour le champ d’application avant d’étendre une tâche. Indique la raison de la classification dans le PR ; les vérifications automatisées ne peuvent pas établir le niveau sémantique correct.

<a id="work-on-a-change"></a>

## Travailler sur un changement

1. Vérifiez l’index des modules, les exportations réelles du source/package et les compétences applicables. Enregistrez la version actuelle et distinguez le comportement réel de la proposition. L’autorisation des utilisateurs existants continue pendant les points de contrôle de revue.
2. Pour un travail complet ou standard, créez `specs/<number>-<short-name>/spec.md` Avant la mise en œuvre. Utilisez le prochain numéro de trois chiffres non utilisé ; les identifiants sont uniques. Les branches Git sont indépendantes et sont généralement utilisées `codex/`. Enregistrement `Level`, `Status`, `Created`, `Decision`, `Scope` et stable `AC-001` IDs d’acceptation. Les [modèle de projet](../.specify/templates/overrides/spec-template.md) fournit les sections.
3. Le travail complet inclut un plan, des tâches avec coches de validation qui renvoient aux IDs d’acceptation, ainsi qu’un enregistrement de validation initialement en attente. [plan](../.specify/templates/overrides/plan-template.md), [tâches](../.specify/templates/overrides/tasks-template.md) et [validation](../.specify/templates/overrides/validation-template.md) Les modèles sont disponibles. Le travail standard se poursuit. `Design`, `Tasks` et `Validation` Dans sa spécification : Ajoutez des recherches distinctes, des modèles de données et des contrats uniquement lorsque le champ de travail l’exige.
4. Avant la mise en œuvre de la compatibilité, obtenez séparément l’accord concret requis par AGENTS.md : versions/formats affectés, comportements de rejet/retention/conversion/migration, conservation, validation et restauration. L’état d’acceptation d’un spécification n’est pas la simple approbation. Les modifications de base de données suivent… [contrat d’amélioration](database-schema-evolution.fr.md).
5. Implémenter les tâches ciblées et mettre à jour les contrats actuels concernés dans le même PR. Mapper les IDs d’acceptation aux vérifications et observations. Enregistrer les résultats réels, les cas omis, les versions et les limites. Les résultats sont fournis conformément aux normes existantes. [règles d’artefact](documentation.fr.md#assets-and-updates).
6. Courir `pnpm sdd:check` et les vérifications des modules pertinentes. Utilisez [Modèle de publicité](../.github/PULL_REQUEST_TEMPLATE.md)Enregistrer le niveau déclaré et une voie de spécification principale. Des éléments de travail supplémentaires peuvent être liés à partir de la spécification principale. Examiner explicitement les limites à haut risque, les contrats et les décisions de compatibilité distinctes.

<a id="codex-skills"></a>

## Codex skills

Le check-in `.agents/skills/speckit-*` Les compétences deviennent disponibles lorsqu’une session Codex détecte les compétences du projet ; ouvrez une nouvelle chatte de projet si la session actuelle est antérieure à l’installation. Invoquez les compétences dans la chatte de l’agent, et non dans le terminal. La procédure complète peut se dérouler selon cette séquence :

```text
$speckit-specify Describe the requested behavior and affected users
$speckit-plan State the actual Doca modules, packages and constraints
$speckit-tasks
$speckit-analyze
$speckit-implement
$speckit-converge
```

La constitution est déjà établie. Les clarifications et les vérifications de compétences sont optionnelles lorsqu’elles sont utiles. Le travail standard ou léger peut utiliser directement les registres hiérarchisés sans exécuter tous les commandes du flux de travail complet. Le flux de travail générique en amont reste installé avec ses portes de revue ; la séquence ci-dessus suit le flux de travail proportionnel de Doca et l’autorisation utilisateur existante. Les prompts génériques ne permettent pas de décisions de compatibilité ni d’autoriser les messages, la publication ou le déploiement.

Sélectionner une fonctionnalité existante explicitement lorsque nécessaire :

```sh
SPECIFY_FEATURE_DIRECTORY=specs/001-sdd-adoption bash .specify/scripts/bash/check-prerequisites.sh --json --require-spec --require-tasks --include-tasks
bash .specify/scripts/bash/resolve-template.sh spec-template
```

Le pointeur de fonctionnalité en `.specify/feature.json` L’état local du checkout est ignoré. Ne le partagez pas en tant que branche ou référentiel de projet. Les scripts/templates en amont restent inchangés ; personnalisez-les. `templates/overrides/`Le vérificateur vérifie les hachages upstream intégrés. Les modèles de projet sont conçus pour `specs/<number>-<name>/`Ajustez leurs liens relatifs si vous utilisez intentionnellement une autre localisation.

<a id="status-and-evidence"></a>

## Statut et preuves

| Statut | Signification |
| --- | --- |
| `draft` | Portée ou décisions encore en cours de préparation |
| `accepted` | Portée acceptée ; toute approbation concrète de compatibilité est enregistrée séparément |
| `implemented` | Le code/tâches spécifiés ont été terminés ; la vérification peut encore être en attente ou partielle |
| `verified` | Tous les IDs d’acceptation ont enregistré des résultats dans la portée de vérification indiquée. |
| `superseded` | Enregistrement historique ; les lecteurs pointent vers son remplacement |

Ne marquez pas les éléments vérifiés avec des tâches inachevées, des acceptations non résolues ou des résultats en attente/échoués. Une spécification vérifiée historiquement ne valide pas le code actuel. Les contrats actuels restent la source du comportement actuel ; les designs et les liens de remplacement sont désignés comme tels. Les spécifications, contrats et registres d’acceptation existants conservent leurs chemins et dates. L’index des modules est un point d’entrée, et non une acceptation rétrospective.

<a id="checks-and-prs"></a>

## Vérifications et relations publiques

`pnpm sdd:check` Vérifie les dossiers de spécifications numérotés, les niveaux/états, les enregistrements requis, la traçabilité de l’acceptation/tâche, la vérification effectuée et les hachages installés en amont. `pnpm test:sdd` Cela couvre les cas positifs et négatifs, ainsi que l’utilisation isolée de scripts/templets en amont. `pnpm docs:check` Vérifie les liens réels entre documents et modules, y compris les compétences installées et les modèles de projets.

Les organismes de relations publiques déclarent ces lignes indépendantes, avec des valeurs réelles :

```text
SDD-Level: full
SDD-Spec: specs/001-sdd-adoption/spec.md
```

Les changements de lumière sont utilisés `SDD-Level: light` et `SDD-Spec: none`Toutes les relations publiques remplissent `Problem`, `Behavior`, `Impacts` et `Verification` sections. Le workflow GitHub SDD vérifie les métadonnées des PR pour les demandes ouvertes, modifiées et synchronisées, ainsi que les enregistrements du répertoire sur main. Il s’exécute sur `pull_request`Avec des permissions de lecture seule et sans secrets. Il vérifie la structure et les références, mais pas si le risque déclaré, l’accord des utilisateurs ou le résultat des tests sont véridiques. Les maintainers examinent ces affirmations. Le flux de travail ne configure pas la protection des branches ; la nécessité de la mettre en place pour les merges est une configuration du répertoire.

<a id="evaluate-the-first-changes"></a>

## Évaluer les premières modifications

Pour les 3 à 5 changements réels suivants, ajoutez une brève observation à la validation ou aux commentaires de PR : effort d’enquête, exigences manquantes repérées lors de l’examen, réécriture après mise en œuvre et coûts de maintenance des données. Utilisez des durées si elles ont été mesurées ; sinon, indiquez que cela n’a pas été mesuré. Comparez les changements similaires lorsque possible, et ajustez la profondeur du modèle en fonction de la charge observée. La simple installation du Spec Kit ne démontre pas d’amélioration des taux de défauts ou de la vitesse de livraison.
