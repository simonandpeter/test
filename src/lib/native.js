/**
 * What the site does differently inside its own app (2026-09-05).
 *
 * The app is the built site inside a Capacitor shell — `capacitor.config.json`,
 * `android/`, `ios/` — and the shell has three things a browser tab does not:
 * a status bar whose glyphs have to be told which theme is under them, a
 * splash the OS paints until the page says it is ready, and on Android a
 * hardware back button. Everything else the app does, the site already did.
 *
 * **This module never runs in a browser.** main.js imports it dynamically and
 * only when `window.Capacitor.isNativePlatform()` answers true, which is a
 * global the shell injects before the page's own scripts and no browser has.
 * That is what keeps `@capacitor/core` and the three plugins out of the web
 * bundle's entry chunk: the §13 first-paint gate on CI has ~130 ms of headroom
 * (HANDOFF, 2026-09-02), and a static import here would spend it on readers
 * who are not in the app. A dynamic import of a module nobody calls costs the
 * web build one hashed chunk it never fetches.
 */

import { App } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

/**
 * The status bar's glyphs follow the theme: dark glyphs over gesso, light
 * over bole clay. Read off the same class index.html sets before first paint
 * and theme.js toggles after, so there is one source of truth for "which
 * theme is this" and the bar cannot disagree with the page under it. The
 * bar overlays the page (`overlaysWebView` in capacitor.config.json) and the
 * page keeps its own ground clear of it with `env(safe-area-inset-top)`
 * (base.css, `.chrome-bar`), so no background is set here — a painted bar
 * would be a second gesso that drifts the day tokens.css moves.
 */
function paintStatusBar() {
  const dark = document.documentElement.classList.contains('dark');
  StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {});
}

export function initNative() {
  paintStatusBar();
  // theme.js toggles `.dark` on the root; watching the attribute is how this
  // follows a press of the toggle *and* a change of the system preference
  // without theme.js having to know the app exists.
  new MutationObserver(paintStatusBar).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });

  /*
   * Android's back button. Left to the shell, a press at the app's first
   * page does nothing at all — the App plugin's own handler only walks the
   * WebView's history — and a button that does nothing reads as a hang. With
   * a listener registered the shell hands the press here instead: inside the
   * app's own history it is the browser's back (the router listens for
   * popstate); at the root it leaves the app, the way every other Android app
   * does. An open chooser panel is closed first, the same as Escape, because
   * back means "dismiss what is in front of me" before it means "leave".
   */
  App.addListener('backButton', ({ canGoBack }) => {
    const openPanel = document.querySelector('.church-panel:not([hidden])');
    if (openPanel) {
      openPanel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      return;
    }
    if (canGoBack) history.back();
    else App.exitApp();
  });
}

/**
 * Called once the first view is on the page. `launchAutoHide` is off in the
 * config so the splash covers the boot's own wait — manifest, day records,
 * locale pack — rather than a timer guessing at it; the veil the site paints
 * for the same wait is under the splash and is what a reader sees if the
 * splash goes first for any reason.
 */
export function bootDone() {
  SplashScreen.hide().catch(() => {});
}
