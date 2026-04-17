# Apple Developer Signing Guide

This guide covers generating the certificates and API keys needed to code-sign and notarize Muxara builds for macOS distribution.

## Prerequisites

- Apple Developer Program membership ($99/year) — [developer.apple.com](https://developer.apple.com/programs/)
- Account Holder role on the developer account
- Keychain Access (pre-installed on macOS)

## 1. Generate a Developer ID Application Certificate

This certificate signs the app for distribution outside the Mac App Store.

1. Open **Keychain Access** on your Mac
2. Go to **Keychain Access > Certificate Assistant > Request a Certificate from a Certificate Authority**
3. Enter your email, leave CA Email blank, select **Saved to disk**, click **Continue**
4. Save the `.certSigningRequest` file

5. Log in to [developer.apple.com/account/resources/certificates](https://developer.apple.com/account/resources/certificates/list)
6. Click **+** to create a new certificate
7. Select **Developer ID Application** and click **Continue**
8. Upload the `.certSigningRequest` file from step 4
9. Download the generated `.cer` file
10. Double-click the `.cer` to import it into Keychain Access

## 2. Export as .p12

1. In **Keychain Access**, find the certificate under **My Certificates**
   - It will be named "Developer ID Application: Your Name (TEAM_ID)"
2. Right-click > **Export**
3. Choose **Personal Information Exchange (.p12)** format
4. Set a strong password — you'll need this for `APPLE_CERTIFICATE_PASSWORD`
5. Save the `.p12` file

## 3. Base64 Encode the Certificate

The GitHub Actions workflow needs the certificate as a base64 string:

```bash
base64 -i DeveloperIDApplication.p12 | pbcopy
```

This copies the base64 string to your clipboard. Paste it as the `APPLE_CERTIFICATE` secret.

## 4. Create an App Store Connect API Key

This key is used for notarization (submitting the signed app to Apple for verification).

1. Log in to [App Store Connect > Users and Access > Integrations > App Store Connect API](https://appstoreconnect.apple.com/access/integrations/api)
2. Click **Generate API Key** (or **+**)
3. Name: `Muxara CI` (or any descriptive name)
4. Access: **Developer**
5. Click **Generate**

**Important:** Download the `.p8` file immediately. It can only be downloaded once.

6. Note the **Key ID** shown next to the key name
7. Note the **Issuer ID** shown at the top of the API keys page

## 5. Configure GitHub Secrets

Go to the repository **Settings > Secrets and variables > Actions** and add these secrets:

| Secret Name | Value | Source |
|-------------|-------|--------|
| `APPLE_CERTIFICATE` | Base64 of the `.p12` file | Step 3 |
| `APPLE_CERTIFICATE_PASSWORD` | Password from `.p12` export | Step 2 |
| `APPLE_SIGNING_IDENTITY` | Certificate name, e.g. `Developer ID Application: Your Name (TEAM_ID)` | Keychain Access |
| `KEYCHAIN_PASSWORD` | Any random string (used for CI's temporary keychain) | Generate one |
| `APPLE_API_ISSUER` | Issuer ID from App Store Connect | Step 4.7 |
| `APPLE_API_KEY` | Key ID from App Store Connect | Step 4.6 |
| `APPLE_API_KEY_PATH` | Full contents of the `.p8` file | Step 4.5 |

## 6. Verify

After configuring secrets, push a test tag to trigger the release workflow:

```bash
git tag v0.1.0-rc.1
git push origin v0.1.0-rc.1
```

Check the GitHub Actions run. Once the DMG is built, download and verify:

```bash
# Verify code signature
codesign --verify --deep --verbose Muxara.app

# Verify notarization
spctl --assess --type execute --verbose Muxara.app
```

## Troubleshooting

- **"No signing identity found"** — The `APPLE_SIGNING_IDENTITY` doesn't match the certificate name. Check Keychain Access for the exact name.
- **"Unable to notarize"** — Ensure the API key has Developer access and the `.p8` contents are pasted correctly (including the `-----BEGIN PRIVATE KEY-----` header).
- **"Hardened runtime not enabled"** — Tauri v2 enables this by default. If you see this error, check `tauri.conf.json` bundle settings.
