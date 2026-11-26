<a id="authentication-registration-approval-and-account-linking"></a>

# Authentification, approbation de registration et lien de compte

Le client de bureau uniquement à distance ajoute une identifiant d’hôte approuvé par le navigateur, sans expiration de durée. Voir [Contrat client de bureau](desktop-client.fr.md)Les sessions existantes sur le navigateur/mobile conservent leurs dates d’expiration et leurs règles de stockage.

[中文](authentication.zh-CN.md)

Cela s’applique à la version actuelle de Doca, qui ne contient aucun espace et aucun arbre d’organisation. Elle couvre les comptes locaux, les fournisseurs d’identité externes, l’approbation de l’enregistrement et les méthodes de connexion alternatives.

<a id="boundary"></a>

## Frontière

Un utilisateur Doca peut lier plusieurs identités de connexion. Les documents, les permissions, les avatars et les préférences appartiennent toujours à une entité stable. `users.id`Les comptes ne sont pas fusionnés par e-mail, nom d’affichage ou numéro de téléphone. La personne se connecte au compte original et relie intentionnellement sa nouvelle identité.

Le design sépare les données de profil des identités de connexion et utilise des liens explicites, plutôt que des correspondances implicites par e-mail. La création d’un compte et son activation sont des processus distincts, ce qui permet une situation de révision en attente. Les comptes existants ne sont pas migrés vers un autre produit d’authentification, et Doca ne dépend pas d’un service authentik externe.

L'administrateur utilise son propre shell d'une page complète : sa navigation, sa zone de défilement et un moyen de retour vers l'espace de travail. Les paramètres de compte utilisent leur propre navigation. Le langage visuel reste celui de Doca.

<a id="three-registration-policies"></a>

## Trois politiques de registration

Sous Administration, Connexion et inscription, chaque entrée est configurée séparément :

| Entrée | Aucun nouvel utilisateur | Enregistrement automatique | Approuvation nécessaire |
| --- | --- | --- | --- |
| Mot de passe du site | L’inscription est close. | Le dépôt de nom est suivi de l’enregistrement | Un utilisateur en attente est créé. |
| Enterprise OIDC | Seule une identité déjà liée peut se connecter | Le premier accès crée un utilisateur | La première connexion crée un utilisateur en attente. |
| Google, GitHub, WeChat, QQ | Seule une identité déjà liée peut se connecter | Le premier accès crée un utilisateur | La première connexion crée un utilisateur en attente. |

Un utilisateur actif qui est déjà lié n’est pas bloqué par une inscription fermée et peut encore lier une autre identité. Un utilisateur créé par un administrateur est actif immédiatement. Un utilisateur en attente n’a pas de session sur le site et ne peut pas ouvrir de documents ou le WebSocket. Un administrateur utilise la page dédiée de vérification d’inscription pour approuver ou rejeter. Les actions d’activation/désactivation d’un utilisateur ordinaire ne permettent pas d’approuver un compte en attente. Après l’approbation, la personne se connecte à nouveau. Le ancien processus d’autorisation n’est pas activé.

L’enregistrement externe et tous les fournisseurs d’identité sont désactivés par défaut. La saisie du mot de passe reste disponible afin que les pannes des fournisseurs d’identité ne puissent pas bloquer l’administrateur. La vérification par contact, le login avec code téléphonique et la récupération du mot de passe sont disponibles. Les limites liées à l’envoi de codes et aux tentatives utilisent la base de données partagée. Les limites liées au login par mot de passe et aux IP des bots publics utilisent des comptes locaux au niveau du processus, sans Redis et sans comptes partagés lorsque Redis est configuré. Le SMS dispose de sa propre règle d’admission. Une source tierce peut annuler la politique de catégorie.

Lorsque les méthodes de connexion changent, le serveur vérifie chaque utilisateur et administrateur actif en fonction des méthodes activées, des contacts vérifiés, des identifiants de mot de passe et des identifiants fournisseurs. Si quelqu’un ne dispose plus d’une méthode utilisable après ce changement, la sauvegarde est rejetée. Un administrateur peut d’abord choisir une nouvelle méthode via l’option « exiger que les utilisateurs ajoutent une méthode de connexion ». La prochaine fois que ces utilisateurs ouvrent le site, ils doivent vérifier ou lier leur compte. La méthode ancienne est fermée uniquement après que tout le monde a terminé. L’ajout d’une méthode ne force pas son utilisation par défaut.

<a id="identity-providers"></a>

## Provedeurs d’identité

- **OIDC SSO.** Découverte standard, par exemple Keycloak ou authentik. `openid-client` 6.8.8, code d’autorisation plus PKCE S256, vérification de l’état, du nonce, de la signature du token ID, ainsi que des vérifications concernant l’émetteur, l’audience et la durée de vie. L’authentification du client est `client_secret_post`Les JWT à clé privée, mTLS et SAML ne sont pas supportés. L’OAuth 2 simplifié n’est pas une configuration OIDC.
- **Google.** Découverte corrigée à `https://accounts.google.com`, champ d’application `openid profile`, plus e-mail lorsque la source déclare e-mail.
- **GitHub.** Code d’autorisation plus PKCE S256 et `read:user`L’identifiant numérique stable provient de `/user`Lorsque l’e-mail est déclaré, `user:email` lire l’adresse e-mail principale vérifiée.
- **WeChat.** Site web QR `snsapi_login`Le binding utilise l’OpenID via l’id de l’application. Le UnionID ne fusionne pas les comptes. Ce n’est pas une page de compte officiel, un mini-programme, ni un accès à une application mobile.
- **QQ.** Site web OAuth. Token et `me` Utilisez JSON, puis le profil est lu. `me.client_id` doit correspondre à la configuration.

Les adaptateurs WeChat et QQ ont été implémentés et testés avec des réponses simulées. Ils ne sont pas acceptés sur les plateformes en direct. Chaque fournisseur externe doit disposer d’une application et de credences de cette plateforme. WeChat et QQ, dans ce flux, ne transmettent pas PKCE et ne sont pas équivalents à l’PKCE d’OIDC.

Doca est un client SSO uniquement. En tant que fournisseur d’OIDC, les fonctionnalités SAML et la synchronisation des déconnexions ou annulations du SSO global ne sont pas implémentées. Le désactiver un compte auprès du fournisseur d’identité ne annule pas une session Doca déjà délivrée. Les sessions dans le navigateur sont par défaut de 24 heures, mais peuvent être configurées. [durée de vie du login](configuration.fr.md#login-lifetime)Les sessions existantes conservent leur date d'expiration stockée. Un administrateur du site désactive l'utilisateur, ou un événement de cycle de vie d'IdP ultérieur est nécessaire.

<a id="deployment"></a>

## Déploiement

1. Enregistrer la demande sur chaque plateforme. Utiliser l’URL HTTP(S) configurée. `DOCA_ORIGIN`Le proxy conserve l’hôte configuré.
2. Dans les paramètres de plateforme, dans Service credentials, SSO, ajoutez un nom de credentiel et un secret client, puis définissez les origines SSO personnalisées autorisées. Le secret est stocké dans la base de données, prend effet dès sa sauvegarde, et n’est pas répété.
3. Ajoutez un fournisseur d’identité : nom de présentation, émetteur uniquement pour OIDC, ID client ou application, et ID des credences. Laissez-le désactivé, sauvegardez, et copiez l’URL de retour.
4. Ajoutez cette URL dans la liste d’autorisation de la plateforme, précisément. `https://doca.example.com/api/v1/auth/providers/<UUID>/callback`Chaque fournisseur possède son propre URL. Une URL de retour arbitraire n’est pas acceptée.
5. Configurer la politique de registration et activer le fournisseur. Se connecter ou se déconnecter depuis la page de profil et tester la connexion. Conserver la méthode d’administrateur originale jusqu’à ce que cela fonctionne.

Google, GitHub, WeChat et QQ autorisent par défaut les hôtes HTTPS. Chaque hôte dans un issuer OIDC, ainsi que dans les URL d’autorisation, de tokens et de JWKS renvoyées par le service de découverte, doit être listé dans la liste des origines SSO personnalisées, une origine par ligne. Les redirections sont interdites. Un fournisseur auto-hébergé explicitement inclus dans la liste d’autorisation peut utiliser HTTP ; l’OIDC permet également la découverte par HTTP et les endpoints dans ce cas. L’opérateur conserve la liste d’autorisation ainsi que la politique d’éjection. Ne pas faire confiance aux DNS mutables ou non fiables, ni aux adresses privées arbitraires ou ouvertes.

Le type, l’émetteur et l’identifiant client constituent un espace de noms immuable. Un nouvel émetteur ou application est un nouveau fournisseur. Les utilisateurs le lient eux-mêmes. Ne pointez pas un ancien identifiant vers un autre fournisseur. Le nom, l’identifiant des credences et l’état d’activation utilisent un verrou optimiste de version et invalident les anciens flux d’autorisation. Désactiver un fournisseur peut empêcher les utilisateurs qui ne disposaient que de cette source d’accès. Arrangez d’abord un autre lien. Une nouvelle méthode de connexion n’est pas imposée, sauf si un administrateur remplace une ancienne et définit « exiger que les utilisateurs ajoutent une méthode de connexion ».

<a id="security-flow"></a>

## Flot de sécurité

1. Un POST de même origine commence le processus avec un état aléatoire, une credenciale de navigateur, un nonce et un verificateur PKCE. La liaison suivante complète le contrôle de sécurité dédié par l’administrateur. Cette credenciale est utilisée une seule fois dans cinq minutes.
2. Le serveur stocke les hachages de l’état et des identifiants du navigateur, ainsi qu’un cookie de flux de dix minutes. Le cookie de flux est HttpOnly et SameSite=Lax. Le cookie principal reste HttpOnly et SameSite=Strict, et Secure sur HTTPS.
3. Le callback vérifie le fournisseur, l’état et les identifiants du navigateur, initie le flux une seule fois, et valide l’identité. Les logs ne enregistrent pas les paramètres de requête du callback, les codes, les tokens ou les corps d’erreur du fournisseur.
4. Le navigateur est redirigé vers `/#/auth/complete`Un POST de même origine se termine et restaure la session Strict. Le lien doit toujours être l’utilisateur et la session qui l’a initié, et le credentiel de vérification de sécurité doit toujours être valide.
5. Une transaction consomme le flux et vérifie la version du fournisseur, l’identité unique, la politique d’enregistrement et l’état de l’utilisateur. Le statut « en attente » ne génère pas de session. Le statut « actif » ne génère qu’une session Doca.

Les tokens d’accès et de mise à jour de tiers ne sont pas stockés. Le sujet, le nom d’affichage à l’époque et les métadonnées du lien sont stockés. Une URL d’avatar HTTP(S) déclarée par la source peut être affichée. Le serveur ne la récupère pas de manière aveugle. L’avatar téléchargé utilise toujours le stockage du site.

Pour désabonner, une vérification récente est nécessaire et il est impossible d’éliminer le dernier moyen d’accès valide. Un fournisseur désactivé ou un compte manquant de credences ne compte pas comme ce dernier moyen. Un compte sans mot de passe peut définir un mot de passe pour le site après une vérification récente. Un compte qui dispose déjà d’un mot de passe utilise la procédure normale de modification du mot de passe. L’identifiant utilisateur public et le login local forment une seule chaîne unique et significative. Si la source ne fournit pas un identifiant approprié, l’utilisateur doit en fournir un. Un UUID n’est pas utilisé comme nom. L’identifiant UUID de l’utilisateur interne reste stable.

<a id="database"></a>

## Base de données

La base actuelle inclut ces structures d’identité. Elle ne crée pas de utilisateur ni ne réinitialise pas un mot de passe par elle-même.

- `settings.registration_review` avec l’interrupteur de ré inscription existant. `sso_registration` et `social_registration` Elles sont fermées, automatiques ou approuvées. Elles partagent un verrou de révision.
- `account_flows` Stockage d’une credence de vérification de sécurité unique. La session n’est pas une preuve suffisante.
- `auth_providers` Il stocke la configuration, le nom de espace immuable et la version. Il ne stocke pas de secrets. `type` L’identifiant de l’émetteur et du client est unique.
- `auth_identities` cartes `user_id` à `provider_id` plus `subject`Cette paire est unique. `user_id` plus `provider_id` Permet une identité par utilisateur par fournisseur.
- `auth_flows` C’est un flux à utilisation unique d’une durée de dix minutes. `stage` Il est lancé, échangé ou vérifié. La fin de l’exécution le supprime. L’expiration est nettoyée lorsque un nouveau flux commence.

<a id="http"></a>

## HTTP

Le préfixe est `/api/v1`Les écrits doivent correspondre à l’Origine.

| Route | Qui | Comportement |
| --- | --- | --- |
| GET /auth/providers | Public | Activer les fournisseurs qui ont des identifiants : id, nom, type |
| GET /admin/auth | Administrateur | Les trois politiques, la révision, les fournisseurs, la préparation, les URLs de retour de appel. Aucun secret. |
| GET/PUT /admin/accounts/policy | Administrateur | Connexion par mot de passe, téléphone et e-mail, type d’accoutrement par mot de passe, et `forcedLoginMethod`Sauvegarder les vérifications qui font que chaque utilisateur actif possède une méthode utilisable |
| PUT /admin/auth/policy | Administrateur | `{revision,local,sso,social}` avec fermeture, automatique ou approbation |
| POST /admin/auth/providers | Administrateur | `{type,name,issuer,client_id,credential_ref,enabled,version:0}` |
| PUT /admin/auth/providers/:id | Administrateur | Mêmes champs, version actuelle. Les champs immuables ne peuvent pas être modifiés. |
| POST /auth/providers/:id/start | `{intent:"login"\|"link"\|"security"\|"replace"}` | Retour `{url}` et le cookie de flux. le lien nécessite une vérification récente |
| GET /auth/providers/:id/callback | Le fournisseur | Échange et vérifie l’identité, puis redirige vers cette source. |
| POST /auth/complete | Consomme le flux vérifié | Statut actif, lié ou en attente. Les problèmes actifs définissent une session. |
| GET /me/identities | Connecté | Connexion locale, qu’une mot de passe existe-t-il, les liens et s’ils sont utilisables. Aucun sujet ou token. |
| POST /auth/reauth | Connecté | `{password}` Mise à jour du temps de vérification récent de cette session |
| POST /auth/password/setup | Vérification récente | `{password}` De 12 à 128 caractères, uniquement pour la première configuration, annule les autres sessions |
| DELETE /me/identities/:id | Vérification récente | Déconnecter. La dernière méthode utilisable est protégée. |
| GET /admin/users?status=pending | Administrateur | Filtre et page actif, en attente, ou désactivé |
| GET /admin/registration-reviews | Administrateur | Réviews paginées en attente, approuvées ou rejetées |
| POST /admin/registration-reviews/:id | Administrateur | `{decision:"approved"\|"rejected",message?}` |
| PATCH /admin/users/:id | Administrateur | Seulement pour les utilisateurs actifs ou handicapés ordinaires ; retours en attente 409 |

`POST /auth/register` ajoute `status`« Pending » demande à la personne d’attendre et ne les enregistre pas.

<a id="tests"></a>

## Tests

`tests/identity.test.ts` Utilise des réponses OIDC simulées signées par RSA via le réel `openid-client` Chemin. Il couvre PKCE, signatures, nonce, issuer, cookies, callbacks répétés et expirés, binding de session, politique, approbation et déconnexion. Les adaptateurs sociaux utilisent un HTTP simulé. Ce n’est pas une revue par le fournisseur ni un test sur une réseau public.

SQLite et une base de données PostgreSQL isolée exécutent toutes deux la régression complète contre le schéma actuel. Un fournisseur de identité réel, un proxy HTTPS et la récupération des comptes nécessitent leur propre acceptation.

<a id="september-2026-module-split"></a>

## Division du module de septembre 2026

L’identité vit dans… `packages/core/src/modules/identity`. Les adaptateurs de protocole vivent `apps/server/src/adapters/identity-providers.ts`Un adaptateur de code d’autorisation OAuth 2 et de PKCE personnalisé peut configurer les endpoints ainsi qu’un champ d’identité stable, tout en restant inclus dans la liste d’autorisation d’origine HTTP(S). Il est distinct de l’OIDC. Un token OAuth ordinaire n’est pas considéré comme un token d’identité.

Chaque source `profile_config` Déclare les champs d’enregistrement, leur source, et si ils peuvent être modifiés ou synchronisés. Si le profil est incomplète, `/auth/complete` retourne `needs_profile` Et ne crée pas une session complète. L’inscription ou l’approbation se poursuit après que les profils requis et les credences de vérification de contact ont été soumis. L’unicité du nom d’utilisateur et l’association entre le fournisseur et le sujet sont indépendantes. Un nom identique ne fusionne pas les comptes. Une configuration de protocole personnalisée ne peut pas être associée à un autre espace de noms d’identité après sa création.
