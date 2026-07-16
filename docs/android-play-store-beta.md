# Android Play Store beta runbook

Last checked: 2026-07-08

This runbook moves the Android client from manually shared Google Drive APKs to Google Play testing tracks so beta users can install from Play and receive automatic Play Store updates.

## Current project state

- Client project: `MessagingAppClient`
- Expo app config: `MessagingAppClient/app.json`
- EAS config: `MessagingAppClient/eas.json`
- Current Android package: `NoFutureStudios.MessengerClient`
- Firebase Android package in `google-services.json`: `NoFutureStudios.MessengerClient`
- Current beta API URL: `https://desktop-ke30sl9.tail915de.ts.net`
- Current Drive build command: `eas build --platform android --profile preview`
- Play-ready build command: `eas build --platform android --profile production`

The `preview` EAS profile uses `"distribution": "internal"`, which is good for installable APK-style internal distribution. The `production` profile has `autoIncrement: true` and no internal distribution flag, so EAS will use its normal Play Store path and produce an Android App Bundle (`.aab`).

## Big decisions before the first Play upload

### 1. Permanent package name

The first Play upload permanently reserves the package name for this app. This project is now configured to use the existing Firebase Android package:

```text
NoFutureStudios.MessengerClient
```

The Firebase app nickname can still be `NFS MessageBoards`; the nickname is only a Firebase Console label. The Android package name is the identity that must match `MessagingAppClient/app.json`, `MessagingAppClient/google-services.json`, and the first Play Console upload.

Changing the package after release means a different app as far as Android and Play are concerned.

### 2. Existing Drive APK users should reinstall

Even though the package name is staying the same, plan for testers to uninstall the old Google Drive APK and reinstall from Google Play. That keeps the migration simple around app signing and Play App Signing. Backend data is persistent, so testers should only need to log back in.

Tester message:

```text
Please uninstall the old Google Drive build, then install the beta from this Play testing link.
```

That can clear local app storage, including saved sessions and server URL overrides.

### 3. Decide the testing track

Recommended path for this project:

1. Use Internal testing first for a tiny smoke test. This supports up to 100 testers and is the fastest Play-based distribution path.
2. Move to Closed testing for the real beta group.
3. Avoid Production until the policy and product gaps below are handled.

If the Google Play developer account is a personal account created after 2023-11-13, Google requires a closed test with at least 12 opted-in testers for 14 continuous days before production access.

## Play policy items to handle before broad beta

This app has accounts, messaging, profile data, image upload, and push subscriptions. Treat these as real Play review items, not paperwork.

Minimum items to prepare:

- Privacy policy URL covering accounts, usernames, passwords/authentication data, messages, images/avatars, device or push notification identifiers, diagnostics/logs if collected, retention, deletion, and contact info: `https://messageboards.nofuturestudio.com/privacy`.
- Account deletion path. Because users can create accounts in-app, Play expects an in-app path and a web link/resource where users can request account and associated data deletion: `https://messageboards.nofuturestudio.com/account-deletion`.
- App access/sign-in details for reviewers. The app is login-gated, so Play Console needs either test credentials or clear instructions for account creation and the beta API URL.
- Data safety form. Likely collected data categories include User IDs, other in-app messages, photos, other user-generated content, device or other IDs, and maybe diagnostics depending on logging/crash tooling.
- UGC safety. Because users can create boards, send messages, upload images, and message 1:1, Play's UGC policy expects terms/rules, reporting, moderation, and user/content blocking where applicable.
- Content rating questionnaire.
- Target audience and content declaration. Unless this is intentionally for children, keep the target audience adult/older teen as appropriate and do not market it to children.
- Ads declaration. Current project docs do not indicate ads, so this is probably "No".

Internal testing can start earlier, but closed/open/production review will get much easier if these are addressed first.

## First Play Store beta upload

### 1. Prepare locally

```powershell
cd MessagingAppClient
eas whoami
eas --version
```

The project currently requires EAS CLI `>= 18.8.1`; this machine has `18.8.1`. Upgrading is fine, but not required by `eas.json`.

Optional sanity checks:

```powershell
npm install
npx expo-doctor
```

`npm run lint` currently cannot complete because the project has no ESLint config and Expo's auto-config step failed in this environment.

### 2. Build the Play artifact

```powershell
cd MessagingAppClient
eas build --platform android --profile production
```

When the build finishes, download the `.aab` from EAS.

### 3. Create the Play Console app

In Google Play Console:

1. Create app.
2. Choose app, not game.
3. Choose free unless there is a clear monetization plan.
4. Fill initial declarations.
5. Be careful that the first uploaded bundle locks the package name.

### 4. Set up Internal testing

In Play Console:

1. Go to Test and release > Testing > Internal testing.
2. Create an email tester list.
3. Add Google account emails for testers.
4. Create new release.
5. Configure Play App Signing when prompted.
6. Upload the `.aab`.
7. Add release notes.
8. Review and start rollout.
9. Copy the opt-in link and send it to testers.

For future beta updates, repeat the production EAS build and upload the new `.aab` to the same testing track. The `production` profile's `autoIncrement` setting should keep Android version codes moving upward.

### 5. Move to Closed testing

Once the internal test installs and push notifications work on real devices:

1. Go to Test and release > Testing > Closed testing.
2. Create or manage a closed track.
3. Add testers by email list or Google Group.
4. Create a new release using a higher-version `.aab`.
5. Roll it out and share the opt-in link.

Closed testers receive Play Store updates for the highest version code they are eligible for.

## Optional: EAS Submit after the first manual upload

Expo says the first upload must be manual because of Google Play API limitations. After that, EAS Submit can automate uploads.

Typical command:

```powershell
cd MessagingAppClient
eas submit --platform android --profile production
```

To use this, create a Google service account, grant it Play Console access, and upload the service account key to EAS credentials. Keep service account keys out of git.

## Optional: EAS Update for JavaScript-only fixes

Play Store testing tracks update the native app binary. This project is not currently configured for EAS Update.

EAS Update is useful for quick JavaScript, styling, copy, and asset fixes between Play releases. It cannot ship native changes, permission changes, Expo SDK changes, or new native dependencies.

Setup outline:

```powershell
cd MessagingAppClient
npx expo install expo-updates
eas update:configure
eas build --platform android --profile production
```

After the new binary is installed by testers:

```powershell
eas update --channel production --message "Describe the JS-only beta fix"
```

Only use EAS Update for changes that still comply with Play policies.

## Project-specific readiness checklist

- [x] Keep Play package name as `NoFutureStudios.MessengerClient`.
- [x] Treat existing Drive APK testers as uninstall/reinstall.
- [ ] Confirm production EAS build creates an `.aab`.
- [ ] Create Play Console app.
- [x] Create a privacy policy URL.
- [x] Add account deletion request flow or at least a web deletion request resource before closed/open/production.
- [ ] Add UGC reporting/blocking/moderation paths before broad beta.
- [ ] Prepare reviewer sign-in instructions.
- [ ] Fill App content declarations.
- [ ] Upload first `.aab` manually to Internal testing.
- [ ] Verify install, login, image upload, and Expo push notifications on tester devices.
- [ ] Move active beta to Closed testing.
- [ ] Optionally configure EAS Submit for future uploads.
- [ ] Optionally configure EAS Update for JS-only beta fixes.

## Official references

- Google Play testing tracks: https://support.google.com/googleplay/android-developer/answer/9845334
- Prepare and roll out a release: https://support.google.com/googleplay/android-developer/answer/9859348
- Play App Signing: https://support.google.com/googleplay/android-developer/answer/9842756
- Android App Bundles: https://developer.android.com/guide/app-bundle
- Target API requirements: https://support.google.com/googleplay/android-developer/answer/11926878
- Data safety form: https://support.google.com/googleplay/android-developer/answer/10787469
- Account deletion requirements: https://support.google.com/googleplay/android-developer/answer/13327111
- User generated content policy: https://support.google.com/googleplay/android-developer/answer/9876937
- EAS Android submit: https://docs.expo.dev/submit/android/
- EAS Update: https://docs.expo.dev/eas-update/introduction/
