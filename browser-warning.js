'use strict';
var _paq = _paq || [];
/* tracker methods like "setCustomDimension" should be called before "trackPageView" */
_paq.push(['trackPageView']);
_paq.push(['enableLinkTracking']);
_paq.push(['enableHeartBeatTimer']);
(function() {
    var u="https://stats.nimiq-network.com/";
    _paq.push(['setTrackerUrl', u+'nimiq.php']);
    _paq.push(['setSiteId', '4']);
    var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];
    g.type='text/javascript'; g.async=true; g.defer=true; g.src=u+'nimiq.js';s.parentNode.insertBefore(g,s);
})();

(function() {
    function isWebView() {
        if (typeof navigator.mediaDevices === 'undefined'
            || typeof navigator.mediaDevices.getUserMedia === 'undefined') return true;
        var userAgent = navigator.userAgent;
        var inAppBrowsers = ['FB_IAB', 'Instagram'];
        for (var i = 0; i < inAppBrowsers.length; i++) {
            if (userAgent.indexOf(inAppBrowsers[i]) > -1) {
                return true;
            }
        }
        return false;
    }

    function isSupportedBrowser() {
        if (typeof Symbol === "undefined") return false;
        try {
            eval("class Foo {}");
            eval("var bar = (x) => x+1");
            eval("const func = async function() { await func; }");
        } catch (e) {
            return false;
        }
        return !isOutdatedIos();
    }

    function isOutdatedIos() {
        if (!/iP(hone|od|ad)/.test(navigator.platform)) return false;
        var version = (navigator.appVersion).match(/OS (\d+)_(\d+)_?(\d+)?/);
        version = [parseInt(version[1], 10), parseInt(version[2], 10), parseInt(version[3] || 0, 10)];
        return version[0] < 11 || (version[0] === 11 && (version[1] <= 2));
    }

    function hasLocalStorage() {
        // taken from MDN
        try {
            var storage = window['localStorage'],
                x = '__storage_test__';
            storage.setItem(x, x);
            storage.removeItem(x);
            return true;
        } catch(e) {
            // return false if the error is a QuotaExceededError and the storage length is 0.
            // If the length is > 0 then we really just exceed the storage limit.
            // If another exception is thrown then probably localStorage is undefined.
            return e instanceof DOMException && (
                    // everything except Firefox
                e.code === 22 ||
                // Firefox
                e.code === 1014 ||
                // test name field too, because code might not be present
                // everything except Firefox
                e.name === 'QuotaExceededError' ||
                // Firefox
                e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
                // acknowledge QuotaExceededError only if there's something already stored
                storage.length !== 0;
        }
    }

    function isSafari() {
        return (
            /Constructor/.test(window.HTMLElement) ||
            (function (root) {
                    return (!root || root.pushNotification).toString() === '[object SafariRemoteNotification]';
                }
            )(window.safari)
        );
    }

    function isChrome() {
        return navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
    }

    function isPrivateMode() {
        return new Promise(function (resolve) {
            const on = function () { resolve(true) }; // is in private mode
            const off = function () { resolve(false) }; // not private mode
            // Chrome & Opera
            if (window.webkitRequestFileSystem) {
                return void window.webkitRequestFileSystem(0, 0, off, on);
            }
            // Firefox
            if ('MozAppearance' in document.documentElement.style) {
                const db = indexedDB.open(null);
                db.onerror = on;
                db.onsuccess = off;
                return void 0;
            }
            // Safari
            if (isSafari()) {
                try {
                    window.openDatabase(null, null, null, null);
                } catch (_) {
                    return on();
                }
            }
            // IE10+ & Edge
            if (!window.indexedDB && (window.PointerEvent || window.MSPointerEvent)) {
                return on();
            }
            // others
            return off();
        });
    }

    var landingSection = document.getElementById('landingSection');
    if (isWebView()) {
        landingSection.classList.add('warning');
        document.getElementById('warning-web-view').style.display = 'block';
        _paq.push(['trackEvent', 'Loading', 'web-view']);
    } else if (!isSupportedBrowser()) {
        landingSection.classList.add('warning');
        document.getElementById('warning-old-browser').style.display = 'block';
        _paq.push(['trackEvent', 'Loading', 'old-browser']);
    } else if (!hasLocalStorage()) {
        // no local storage. This is for example the case in private browsing in Android Browser
        landingSection.classList.add('warning');
        document.getElementById('warning-no-localstorage').style.display = 'block';
        _paq.push(['trackEvent', 'Loading', 'no-localstorage']);
    } else {
        // check for private mode
        isPrivateMode().then(function(isPrivate) {
            if (!isPrivate) return;
            // Chrome is supported. All other browsers not.
            if (!isChrome()) {
                landingSection.classList.add('warning');
                document.getElementById('warning-unsupported-private-mode').style.display = 'block';
                _paq.push(['trackEvent', 'Loading', 'unsupported-private-mode']);
            } else {
                // in chrome show a warning on top
                document.getElementById('warning-private-mode').classList.add('shown');
            }
        });
    }
})();

