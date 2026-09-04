# The app — shipping Daily Dox to the Play Store and the App Store

Written 2026-09-05, the day the native shells were generated. Everything here
was done from a Windows desk with no Android SDK and no Xcode, so **the shells
are generated and configured but no binary has been built**; the two "build"
sections below say exactly which steps still need a machine with the tools.
Nothing on this page is a substitute for reading the store's own console the
day you submit — both change their forms often.

## What the app is

The built site (`dist/`) inside a [Capacitor 8](https://capacitorjs.com) shell.
There is no second codebase: `npm run app:sync` builds the site exactly as the
website is built, then copies `dist/` into `android/app/src/main/assets/public`
and `ios/App/App/public` (both gitignored — they are build output). The shell
serves those files from a local origin (`https://localhost` on Android, the
`capacitor://localhost` scheme on iOS), and the app's own router works as it
does on the web because both shells answer any extensionless path with
`index.html` (`WebViewLocalServer`'s html5mode; iOS `Router.swift`).

The whole corpus ships inside the binary — `saints/` (~49 MB of icons and
lives), `data/`, the map's coastline and terrain tiles — so **the app works
fully offline from the first launch**, which is stronger than the website's
Session 10 guarantee (names and the day's calendar only). That is the trade:
a ~60 MB install against no network dependency at all. If the corpus grows
past what a store will carry comfortably (Play's AAB limit is 200 MB, iOS is
far larger), the lever is to stop bundling `saints/*/images` and let the
service worker's cache-on-read do the same job it does on the web.

Identity, set in `capacitor.config.json` and copied into both projects:

| | |
| --- | --- |
| app id / bundle id | `com.dailydox.app` |
| name | Daily Dox |
| version | 1.0 (build 1) — `android/app/build.gradle` `versionName`/`versionCode`; `ios/App/App.xcodeproj` `MARKETING_VERSION`/`CURRENT_PROJECT_VERSION` |
| Android | minSdk 24, target/compile 36 (Capacitor 8's own floor and ceiling) |
| iOS | the template's deployment target (14+); Swift Package Manager, no CocoaPods |

**The id is a guess and is the one thing here that cannot be changed after the
first store upload.** Change it in `capacitor.config.json`, then `npx cap sync`
rewrites the Android side; the iOS bundle id lives in
`ios/App/App.xcodeproj/project.pbxproj` (`PRODUCT_BUNDLE_IDENTIFIER`, two
places) and is changed in Xcode.

## What the site does differently inside the shell

Three things, all in `src/lib/native.js`, loaded by `main.js` only when
`window.Capacitor.isNativePlatform()` is true — a global the shell injects and
no browser has, so the web bundle's first paint carries none of it:

1. **The status bar's glyphs follow the theme** (dark on gesso, light on bole),
   by watching the `dark` class theme.js toggles on the root.
2. **The splash comes down when the first view is on the page**, not on a timer
   (`launchAutoHide: false` in the config; `bootDone()` after `router.start()`).
   The splash is the site's own cross on gesso, or on bole in dark mode.
3. **Android's back button** closes an open chooser panel first, then walks the
   app's own history, and at the root leaves the app — the shell's default
   does nothing at the root, which reads as a hang.

And one thing in CSS: the page runs under the status bar and the home
indicator (`viewport-fit=cover`, which both shells honour), so `.chrome-bar`
wears `env(safe-area-inset-top)` as padding, `main.chrome` and the map's
timeline wear the bottom inset, and the map's stage subtracts the top one
(base.css, map.css). In a browser every one of those is `0px`.

## Commands

| | |
| --- | --- |
| `npm run app:icons` | regenerate `resources/` from the cross geometry (Pillow), then every platform icon and splash from them (`@capacitor/assets`) |
| `npm run app:sync` | build the site and copy it into both shells |
| `npm run app:android` | that, then open Android Studio |
| `npm run app:ios` | that, then open Xcode (macOS only) |

`npx cap sync` alone copies the *current* `dist/` — run a build first or you
ship yesterday's site.

## Android — building and submitting

Needs: Android Studio (which brings the SDK and a JDK). On this desk neither
is installed, so none of this has been run.

1. `npm run app:android`. Let Gradle sync. Run on an emulator or a device once
   and check: the Daily page opens; back at the root leaves the app; the theme
   toggle changes the status bar glyphs; the map fills the window with the
   timeline above the gesture bar, not under it.
2. **Signing.** Create an upload keystore once and keep it outside the repo —
   losing it means a new app listing:

       keytool -genkey -v -keystore ~/dailydox-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload

   Then in Android Studio: *Build → Generate Signed Bundle* with that key, or
   add a `signingConfigs.release` block to `android/app/build.gradle` reading
   the path and passwords from `~/.gradle/gradle.properties` (never from a
   file in this repo).
3. `Build → Generate Signed Bundle → Android App Bundle (AAB)`, release. The
   AAB is what Play takes; an APK is for sideloading only.
4. **Play Console** (`play.google.com/console`, one-off $25 developer fee):
   create the app, upload the AAB to *Internal testing* first, then promote.
   The forms it will ask for, with the honest answers for this app:
   - *App content → Privacy policy*: a public URL is required. Use the About
     page, which already is one: `https://simonandpeter.github.io/test/about`
     (the "Privacy" section, `STRINGS.about.privacy`). If the site moves to a
     custom domain, update the URL in the console.
   - *Data safety*: **no data collected, no data shared**. Settings, saved
     saints and reading history live in the device's own IndexedDB and
     localStorage; nothing leaves the device (the About page's privacy text is
     written against the code and says the same).
   - *Content rating*: the IARC questionnaire — no violence, no user content,
     no purchases. Religious content is not a rated category.
   - *Target audience*: 13+ is the simplest honest answer (no under-13
     features; avoids the Families policy).
   - *Ads*: none. *In-app purchases*: none. *Login*: none.
   - Listing assets: 512×512 icon (`resources/icon-only.png` — regenerate at
     512 if the console rejects 1024), a 1024×500 feature graphic (not yet
     drawn), and phone screenshots (`node scripts/shot.mjs` at 360 wide is a
     start; Play wants at least two, 16:9 or 9:16, min 320 px).
   - Category: *Books & Reference* or *Lifestyle*.

## iOS — building and submitting

Needs: a Mac with Xcode 16+ and an Apple Developer Program membership
($99/year). Nothing below has been run.

1. On the Mac: clone, `npm ci`, `npm run app:ios`. Xcode opens `ios/App`. The
   Swift packages (Capacitor and the three plugins) resolve on first open.
2. In *Signing & Capabilities* pick the team; Xcode manages the provisioning
   profile for the bundle id.
3. Run on the simulator once and check the same four things as Android, plus:
   the notch — the header's gesso should fill the strip behind the clock and
   nothing should sit under the home indicator.
4. *Product → Archive*, then *Distribute App → App Store Connect*. Upload.
5. **App Store Connect** (`appstoreconnect.apple.com`): create the app record
   with the same bundle id, attach the build, and fill in:
   - *App Privacy*: **Data Not Collected**. Same reasoning as Play's form.
   - *Privacy Policy URL*: the About page, as above.
   - *Age rating*: none of the listed content; 4+.
   - *Content rights*: the lives are after the synaxaria with a source on
     every one, the icons are public-domain works with a source URL on every
     `icon.meta.json` (README, "Known gaps", closed 2026-09-03). Say so if
     asked.
   - *Export compliance*: the app uses only the OS's own HTTPS — answer "No"
     to proprietary encryption, or set `ITSAppUsesNonExemptEncryption` to
     `false` in `Info.plist` so the question stops being asked per build.
   - Screenshots: 6.7" and 6.5" iPhone sets are required; iPad only if the
     iPad box is ticked (it is, by the template's `TARGETED_DEVICE_FAMILY`
     — untick it in Xcode if you would rather not screenshot an iPad).
   - Review notes: "Reference app; no account, no network required, all
     content bundled." Reviewers reject apps that look like bare websites
     (guideline 4.2) — this one installs offline in full and has native
     back, status bar and splash, which is what that guideline asks to see.
6. TestFlight first, then submit for review.

## Things known and not done

- **No binary has been built on this desk** — see the top of the page. The
  first Gradle build and the first Xcode build are the two things most
  likely to surface something (a missing namespace, a plugin version). Both
  are ordinary.
- **The service worker still registers inside the app.** It is harmless — the
  shell already serves everything locally — and on iOS `capacitor://` refuses
  it, which `registerServiceWorker` catches. Turning it off inside the shell
  is one `isNativePlatform` check in `lib/offline.js` if it ever matters.
- **Deep links from outside the app** (`https://…/saints/anthony-the-great`
  opening the app rather than the browser) are not wired: that is Android App
  Links and iOS Universal Links, each needing a file served from the site's
  domain. The custom scheme `com.dailydox.app://` the template registers is
  there but nothing sends it.
- **Store listing copy and the feature graphic are not written or drawn.**
- **The shells are committed as generated** (Capacitor's own recommendation)
  so a change to a native setting is a diff, not a regeneration. `npx cap
  sync` after a Capacitor or plugin upgrade rewrites what it owns.
