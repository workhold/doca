<a id="administrator-resource-handover"></a>

# Transfert des ressources d’administrateur

[中文](admin-resource-handover.zh-CN.md)

Dans **Administration → Utilisateurs**Un administrateur système actif ouvre **Transférer des ressources** Pour un compte désactivé, il faut sélectionner un destinataire actif et des entrées de ressources, puis examiner et confirmer les modifications effectuées. Le compte source reste désactivé. Les utilisateurs ordinaires ne peuvent pas utiliser aucun des trois endpoints.

<a id="scope"></a>

## Portée

L’inventaire lit les métadonnées de gestion provenant des enregistrements de ressources, d’archives, de fichiers et de permissions existants. Il ne lit pas les contenus des documents ou les identifiants privés.

- Documents, bibliothèques et livres de connaissances : transfert des ressources sélectionnées et des descendants appartenant à la source. Les autres personnes conservent la propriété ; le contenu associé est indiqué séparément. L'autorité existante du propriétaire de la bibliothèque s'applique au bénéficiaire.
- Images de documents et pièces jointes : actifs liés au transfert et éléments de dossier avec leur document. Ils ne peuvent pas être sélectionnés indépendamment. Les créateurs d’origine et les auteurs historiques restent inchangés.
- Dossiers/fichiers ordinaires : transfert des descendants et fichiers appartenant à la source. Un dossier imbriqué ou un fichier indépendant sélectionné est déplacé dans la racine personnelle du destinataire lorsque son parent n’est ni transféré ni appartenant au destinataire. L’affichage préliminaire montre ce déplacement.
- Subventions documentaires/bibliothèques conservées : les sources de subventions locales actives explicitement sélectionnées deviennent des bénéficiaires de subventions directes et sont retirées de la source. La portée des descendants est conservée ; les tokens de lien ne sont pas copiés.
- Prijures de dossiers partagés : fusionner la priure dans le dossier du destinataire sans réduire le rôle existant, puis supprimer la priure source sélectionnée.
- Ressources détruites : la propriété peut être transférée, tandis que l’état supprimé reste intact.

Les fichiers personnels d’IA, les conversations privées, les identifiants et les documents professionnels liés aux extensions sont exclus. Les liens de fichiers existants liés aux sessions d’IA ou de connaissances, les fichiers normalement verrouillés et les métadonnées non reconnues restent protégés. Le verrou du gestionnaire de fichiers d’un fichier attaché à un document ne empêche pas sa transfert avec le document lui-même. Les entrées protégées expliquent pourquoi elles ne peuvent pas être sélectionnées ; les fichiers protégés dans un dossier sélectionné bloquent l’ensemble du lot.

<a id="preview-and-permission-checks"></a>

## Prévisualisation et vérification des permissions

L’affichage préliminaire liste les modifications d’propriété, de permissions et d’attachements, les déplacements, ainsi que les éléments associés dont la propriété reste inchangée. Sélectionner un parent permet d’étendre ses descendants éligibles. Chaque lot permet jusqu’à 500 entrées de stock sélectionnées ; l’étendue peut inclure davantage de descendants. Le stock et les modifications utilisent des pages de 50 lignes.

Les permissions existantes pour les destinataires supérieurs restent valables. Les rôles incomparables de nœud/descendant, les restrictions sur les enfants source qui élargiraient l’accès, ainsi que les restrictions explicites pour les destinataires entraînent des conflits et empêchent la confirmation. Vérifiez ces permissions via le flux de travail des permissions existants ou modifiez les choix. La transfert de droits ne surpasse pas de telles restrictions ni ne copie des droits hérités non liés.

Les invitations vers la source ou le destinataire des documents/fichiers sélectionnés sont annulées, de sorte qu’une acceptation ultérieure ne peut pas effacer la transmission des documents. Les invitations de documents sont archivées avec des tickets ; les invitations de fichiers conservent leurs lignes et tickets annulés. Les invitations d’autres personnes restent intactes. La vue préliminaire montre le nombre d’annulations. La visibilité publique, les définitions des liens et les autres collaborateurs conservent leurs paramètres existants ; l’accès public ne devient pas une liste de blocage pour l’utilisateur.

<a id="consistency-and-audit"></a>

## Consistance et audit

L’inventaire et la vue préliminaire utilisent des snapshots de base de données cohérents. L’exécution calcule à nouveau une empreinte qui couvre les comptes, ressources, subventions, pièces jointes et contenu des répertoires pertinents. Les changements d’état rendent la confirmation obsolète et renvoient le code 409. Réinitialiser et effectuer à nouveau la vue préliminaire. Les confirmations simultanées du même lot ne réussissent qu’une seule fois.

Une seule transaction confirme la propriété, valide les décisions de grant, d’invitation, les tâches d’index et les audits de sécurité. Les politiques d’admission/quotas des bénéficiaires existantes continuent d’être appliquées. Tout échec fait revenir tout le lot en arrière. Les objets stockés ne sont ni déplacés ni supprimés. Le contenu des documents, l’histoire, les uploaders et les auteurs originaux restent intacts. Après la confirmation, les permissions actives sont mis à jour et les comptes concernés sont notifiés.

Le `user.resources_handed_over` L’audit de sécurité enregistre l’administrateur réel, la source, le destinataire, l’empreinte digitale, les modifications et les métadonnées précédentes correspondantes. Il exclut les données privées des destinataires non liés. L’exécution est synchrone ; il ne s’agit pas d’un travail en arrière-plan repointable. Après une disconnexion du navigateur ou une perte de réponse, il est nécessaire de rescanner l’inventaire avant de tenter une autre opération.

Cette fonction utilise les tables existantes et les formats persistants, sans aucun changement de schéma ou conversion historique. Il n’y a pas de transfert inverse automatique ni de révocation des permissions. Les corrections apportées à une décision commerciale confirmée nécessitent une révision de l’audit ainsi que des droits de propriété/permissions actuels.

<a id="api-and-verification"></a>

## API et vérification

- `GET /api/v1/admin/users/:id/resource-handover`: inventaire.
- `POST /api/v1/admin/users/:id/resource-handover/preview`: `targetUserId`, `keys`.
- `POST /api/v1/admin/users/:id/resource-handover/execute`: la même sélection plus la vue préliminaire `fingerprint`.

Courir `pnpm exec vitest run tests/resource-handover.test.ts` pour les tests de service/API. Exécuter `pnpm exec tsx scripts/qa-resource-handover.mts` pour l’interface utilisateur administrative réelle, en ce qui concerne SQLite isolé/comptes/documents/stockage. Les résultats se trouvent ici `artifacts/verification/resource-handover/`Ces vérifications ne garantissent pas la vérification en temps réel de PostgreSQL.
