# Building the Vivrecon Android app in Android Studio

Your Android app is a **TWA (Trusted Web Activity)** — a small native app that opens
`https://vivrecon.com` full-screen. You build the whole thing in Android Studio only.
No PWABuilder, no Bubblewrap.

Do it once slowly; after that, updates are just changing the version number and clicking build.

---

## 0. One-time prep (already done for you)
- Your website is live at `https://vivrecon.com` and is a PWA (has a manifest).
- `https://vivrecon.com/.well-known/assetlinks.json` exists. **Important:** it currently
  holds the fingerprint from the PWABuilder key. When you build with your OWN key below,
  you must replace that fingerprint with your new key's SHA-256 (Step 8). Tell me the new
  fingerprint and I'll update the file.

---

## 1. Create the project
1. Open **Android Studio → New → New Project**.
2. Choose **Empty Views Activity** → **Next**.
3. Fill in:
   - **Name:** `Vivrecon`
   - **Package name:** `com.vivrecon`
   - **Language:** Java (doesn't matter — we won't write code)
   - **Minimum SDK:** API 21
4. **Finish.** Wait for it to finish loading (Gradle sync).

---

## 2. Add the TWA library
Open **Gradle Scripts → build.gradle (Module :app)** and inside `dependencies { ... }` add:

```gradle
implementation 'com.google.androidbrowserhelper:androidbrowserhelper:2.5.0'
```

In the same file, make sure `defaultConfig` looks like this:

```gradle
defaultConfig {
    applicationId "com.vivrecon"
    minSdk 21
    targetSdk 35          // meets Google Play's requirement
    versionCode 3         // bump this by 1 for every new upload
    versionName "1.0.2"
}
```

Also set `compileSdk 35` near the top of the `android { }` block.

Click **Sync Now** (the bar that appears at the top).

---

## 3. Set the app colors
Open **app/src/main/res/values/colors.xml** and make it:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="colorPrimary">#1a2744</color>
    <color name="colorPrimaryDark">#12192b</color>
    <color name="backgroundColor">#f0ebe3</color>
</resources>
```

---

## 4. Tell it your website (asset_statements)
Open **app/src/main/res/values/strings.xml** and add this inside `<resources>`:

```xml
<string name="asset_statements">
[{ \"relation\": [\"delegate_permission/common.handle_all_urls\"],
   \"target\": {\"namespace\": \"web\", \"site\": \"https://vivrecon.com\"}}]
</string>
```

(Keep the backslashes — they are required.)

---

## 5. Configure the manifest
Open **app/src/main/AndroidManifest.xml**. Replace the whole `<application> ... </application>`
block with this:

```xml
<application
    android:allowBackup="true"
    android:icon="@mipmap/ic_launcher"
    android:label="Vivrecon"
    android:supportsRtl="true"
    android:theme="@style/Theme.AppCompat.NoActionBar">

    <meta-data
        android:name="asset_statements"
        android:resource="@string/asset_statements" />

    <activity
        android:name="com.google.androidbrowserhelper.trusted.LauncherActivity"
        android:exported="true">

        <meta-data
            android:name="android.support.customtabs.trusted.DEFAULT_URL"
            android:value="https://vivrecon.com" />

        <meta-data
            android:name="android.support.customtabs.trusted.STATUS_BAR_COLOR"
            android:resource="@color/colorPrimary" />

        <intent-filter>
            <action android:name="android.intent.action.MAIN" />
            <category android:name="android.intent.category.LAUNCHER" />
        </intent-filter>

        <intent-filter android:autoVerify="true">
            <action android:name="android.intent.action.VIEW" />
            <category android:name="android.intent.category.DEFAULT" />
            <category android:name="android.intent.category.BROWSABLE" />
            <data android:scheme="https" android:host="vivrecon.com" />
        </intent-filter>
    </activity>
</application>
```

If Android Studio underlines `Theme.AppCompat.NoActionBar` in red, that's fine — it comes
from AppCompat which is already included. If it complains, change the theme line to
`android:theme="@android:style/Theme.NoTitleBar"`.

You can delete the auto-generated `MainActivity.java` and its layout file — the TWA doesn't
use them.

---

## 6. Set the app icon
1. Right-click **app/src/main/res** → **New → Image Asset**.
2. Icon type: **Launcher Icons (Adaptive and Legacy)**.
3. Under **Foreground Layer**, choose the `icon-512.png` I made (in your project at
   `frontend/public/icons/`), or any 512×512 PNG.
4. **Next → Finish.**

---

## 7. Build the signed App Bundle (.aab)
1. Menu **Build → Generate Signed App Bundle / APK**.
2. Choose **Android App Bundle** → **Next**.
3. Under **Key store path**, click **Create new…**:
   - Pick a folder and filename, e.g. `vivrecon-key.jks`
   - Set a **password** (write it down — you need it forever)
   - Alias: `vivrecon`, another password, validity 25+ years, fill your name/country.
   - **Keep this .jks file safe. If you lose it you can never update the app.**
4. **Next → build variant `release` → Finish.**
5. When done, click the **locate** link — your file is
   `app/release/app-release.aab`. That's what you upload to Play Console.

---

## 8. Get your key's fingerprint (for assetlinks)
Open a terminal in Android Studio (**View → Tool Windows → Terminal**) and run
(adjust the path/alias to your keystore):

```
keytool -list -v -keystore vivrecon-key.jks -alias vivrecon
```

Copy the **SHA-256** line. Send it to me — I'll put it into
`vivrecon.com/.well-known/assetlinks.json` so the app opens without a browser bar.
(If you enrolled in Play App Signing, also use the SHA-256 shown in
Play Console → your app → **Setup → App integrity**.)

---

## 9. Upload
Play Console → **Internal testing → Create release** → upload `app-release.aab`.
For every future update: bump **versionCode** by 1 (Step 2), rebuild (Step 7), upload.

---

### Recap of what to send me
- Your key's **SHA-256** fingerprint (Step 8) so I fix `assetlinks.json`.
