'use strict';
var _paq = _paq || [];
/* tracker methods like "setCustomDimension" should be called before "trackPageView" */
_paq.push(['trackPageView']);
_paq.push(['enableLinkTracking']);
_paq.push(['enableHeartBeatTimer']);
(function() {
    var u="https://stats.nimiq-network.com/";
    _paq.push(['setTrackerUrl', u+'nimiq.php']);
    _paq.push(['setSiteId', '1']);
    var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];
    g.type='text/javascript'; g.async=true; g.defer=true; g.src=u+'nimiq.js';s.parentNode.insertBefore(g,s);
})();

function isSupportedBrowser() {
    if (typeof Symbol === "undefined") return false;
    try {
        eval("class Foo {}");
        eval("var bar = (x) => x+1");
        eval("const func = async function() { await func; }");
    } catch (e) {
        return false;
    }
    return true;
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

if (!isSupportedBrowser()) {
    document.getElementById('landingSection').classList.add('warning');
    document.getElementById('warning-old-browser').style.display = 'block';
    _paq.push(['trackEvent', 'Loading', 'old-browser']);
} else if (!hasLocalStorage()) {
    // no local storage. This is for example the case in private browsing in Safari and Android Browser
    document.getElementById('landingSection').classList.add('warning');
    document.getElementById('warning-no-localstorage').style.display = 'block';
    _paq.push(['trackEvent', 'Loading', 'no-localstorage']);
}
