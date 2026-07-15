# Social Auth Setup Guide

## Overview

Vivrecon uses the **token-based** social auth pattern — the correct approach for mobile apps:

```
Mobile app  →  Provider SDK  →  idToken / accessToken
Mobile app  →  POST /api/auth/social/{provider}  { token }
Backend     →  verifies token with provider
Backend     →  returns Vivrecon accessToken + refreshToken
```

The backend **never redirects** to OAuth URLs. It only verifies tokens that the mobile SDK already obtained.

---

## 1. Google Sign-In

### Console setup
1. Go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create an **OAuth 2.0 Client ID** → Application type: **iOS** (and one for Android separately)
3. Note the **Client ID** (looks like `123456789-abc.apps.googleusercontent.com`)

### Backend env var
```env
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
```

### Mobile (Android - Kotlin)
```kotlin
val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
    .requestIdToken("YOUR_GOOGLE_CLIENT_ID")
    .requestEmail()
    .build()
val client = GoogleSignIn.getClient(activity, gso)

// After sign-in:
val account = GoogleSignIn.getSignedInAccountFromIntent(data).result
val idToken = account.idToken!!

// Send to backend:
api.googleAuth(GoogleAuthRequest(idToken = idToken))
```

### Mobile (iOS - Swift)
```swift
import GoogleSignIn

GIDSignIn.sharedInstance.signIn(withPresenting: self) { result, error in
    guard let user = result?.user, let idToken = user.idToken?.tokenString else { return }
    // Send to backend:
    api.googleAuth(idToken: idToken)
}
```

### API call
```http
POST /api/auth/social/google
Content-Type: application/json

{ "idToken": "<Google ID token>" }
```

---

## 2. Sign in with Apple

### Developer setup
1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/identifiers/list)
2. Create a **Service ID** (e.g. `com.yourcompany.vivrecon.service`)
3. Enable **Sign in with Apple** and configure your return URLs (for web flows)
4. In your app's Bundle ID, also enable **Sign in with Apple** capability

### Backend env var
```env
APPLE_CLIENT_ID=com.yourcompany.vivrecon.service
```
> Use your **Bundle ID** (e.g. `com.yourcompany.vivrecon`) for native iOS apps,
> or your **Service ID** for web / Android.

### Mobile (iOS - Swift)
```swift
import AuthenticationServices

let request = ASAuthorizationAppleIDProvider().createRequest()
request.requestedScopes = [.fullName, .email]

// In the delegate:
func authorizationController(controller:, didCompleteWithAuthorization authorization:) {
    guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
          let tokenData = credential.identityToken,
          let identityToken = String(data: tokenData, encoding: .utf8) else { return }

    // Apple only provides fullName on the FIRST sign-in — send it immediately
    let fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
        .compactMap { $0 }.joined(separator: " ")

    api.appleAuth(identityToken: identityToken, fullName: fullName.isEmpty ? nil : fullName)
}
```

### API call
```http
POST /api/auth/social/apple
Content-Type: application/json

{
  "identityToken": "<Apple identity token>",
  "fullName": "John Doe"   // Only on first sign-in. Omit on subsequent logins.
}
```

> ⚠️ Apple only returns the user's name **once** — on the very first sign-in.
> The mobile app must forward it immediately. The backend stores it and will
> not receive it again.

---

## 3. Facebook Login

### Developer setup
1. Go to [Meta for Developers](https://developers.facebook.com/apps)
2. Create an app → Add **Facebook Login** product
3. Under Facebook Login → Settings, add your OAuth Redirect URIs
4. Note your **App ID** and **App Secret** from the app dashboard
5. Make sure the `email` permission is in your login scope

### Backend env vars
```env
FACEBOOK_APP_ID=1234567890
FACEBOOK_APP_SECRET=abcdef1234567890abcdef1234567890
```

### Mobile (Android - Kotlin)
```kotlin
LoginManager.getInstance().logInWithReadPermissions(
    activity, listOf("email", "public_profile")
)

// In the callback:
override fun onSuccess(result: LoginResult) {
    val accessToken = result.accessToken.token
    api.facebookAuth(FacebookAuthRequest(accessToken = accessToken))
}
```

### Mobile (iOS - Swift)
```swift
LoginManager().logIn(permissions: ["email", "public_profile"], from: self) { result, error in
    guard let token = result?.token?.tokenString else { return }
    api.facebookAuth(accessToken: token)
}
```

### API call
```http
POST /api/auth/social/facebook
Content-Type: application/json

{ "accessToken": "<Facebook access token>" }
```

---

## Response (all providers)

All three social endpoints return the same `AuthResponse` as email/password login:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "refreshToken": "a3f1c2d4-...",
  "disclaimerAccepted": false
}
```

If `disclaimerAccepted` is `false`, show the Terms screen and call:
```http
POST /api/me/disclaimer/accept
Authorization: Bearer <accessToken>
```

---

## Account linking behaviour

| Scenario | Result |
|---|---|
| First time with Google → new user created | ✅ New account |
| First time with Apple → new user created | ✅ New account |
| Social login with email that already has a LOCAL account | ✅ Reuses existing account |
| Same person, Google then Facebook (different provider IDs) | ⚠️ Two separate accounts — account linking not yet implemented |

---

## Security notes

- Google tokens are verified via `https://oauth2.googleapis.com/tokeninfo` (online verification)
- Apple tokens are verified locally using Apple's JWKS public keys (no network dependency after key fetch)
- Facebook tokens are verified via the Graph API `debug_token` endpoint + app access token
- All provider tokens are one-time use from the backend's perspective — we immediately exchange them for our own JWT
- `JWT_SECRET` must be at least 32 characters and kept secret in production
