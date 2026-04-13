# Guide de Déploiement Mobile (GitHub Actions)

Ce guide explique comment configurer votre dépôt GitHub pour générer automatiquement vos applications Android (APK/AAB) et iOS.

## 1. Génération du Keystore (Android)

Puisque vous travaillez sur Android, vous pouvez utiliser **Termux** (disponible sur le Play Store) pour générer votre clé de signature.

1. Installez OpenJDK dans Termux :
   ```bash
   pkg install openjdk-17
   ```
2. Générez le Keystore :
   ```bash
   keytool -genkey -v -keystore release-key.keystore -alias cpla_alias -keyalg RSA -keysize 2048 -validity 10000
   ```
   *Note : Retenez bien le mot de passe et l'alias.*
3. Convertissez le fichier en BASE64 pour GitHub :
   ```bash
   base64 release-key.keystore > keystore_base64.txt
   cat keystore_base64.txt
   ```
4. Copiez le contenu de `keystore_base64.txt`.

## 2. Configuration des Secrets GitHub

Allez dans **Settings > Secrets and variables > Actions** sur votre dépôt GitHub et ajoutez les **11 secrets** suivants :

### Configuration Firebase & IA
1. `VITE_FIREBASE_API_KEY` : Votre API Key Firebase.
2. `VITE_FIREBASE_AUTH_DOMAIN` : Votre Auth Domain.
3. `VITE_FIREBASE_PROJECT_ID` : Votre Project ID.
4. `VITE_FIREBASE_STORAGE_BUCKET` : Votre Storage Bucket.
5. `VITE_FIREBASE_MESSAGING_SENDER_ID` : Votre Messaging Sender ID.
6. `VITE_FIREBASE_APP_ID` : Votre App ID.
7. `VITE_FIREBASE_FIRESTORE_DATABASE_ID` : Votre Database ID Firestore.
8. `GEMINI_API_KEY` : Votre clé API Gemini.

### Signature Android
9. `KEYSTORE_BASE64` : Le contenu du fichier `keystore_base64.txt` généré plus haut.
10. `KEYSTORE_PASSWORD` : Le mot de passe du Keystore.
11. `KEY_ALIAS` : L'alias choisi (ex: `cpla_alias`).
12. `KEY_PASSWORD` : Le mot de passe de la clé (souvent le même que le keystore).

## 3. Utilisation

- **Android** : Chaque `push` sur la branche `main` lancera automatiquement la compilation. Vous retrouverez l'APK et l'AAB dans l'onglet **Actions** de GitHub, sous la section "Artifacts" du build réussi.
- **iOS** : Allez dans l'onglet **Actions**, sélectionnez "Build iOS (Test)" et cliquez sur "Run workflow". Ce build est destiné aux tests et ne nécessite pas de compte développeur Apple payant.

## 4. Permissions Android
Le workflow injecte automatiquement les permissions suivantes :
- Internet
- Caméra
- Lecture/Écriture stockage externe (pour les téléchargements/scans)
