'use strict';

function isSupportedBrowser() {
    if (typeof Symbol === "undefined") return false;
    try {
        eval("class Foo {}");
        eval("var bar = (x) => x+1");
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
} else if (!hasLocalStorage()) {
    // no local storage. This is for example the case in private browsing in Safari and Android Browser
    document.getElementById('landingSection').classList.add('warning');
    document.getElementById('warning-no-localstorage').style.display = 'block';
} else {
    var scripts = ['geoip.js', 'map.js', 'wallet.js', 'block-explorer.js', 'miner.js'];

    // allow to load staging branch instead
    var nimiq;
    if (window.location.hash === '#local') {
        nimiq = '/core/dist/nimiq.js';
    } else if (window.location.hash === '#staging') {
        nimiq = 'https://cdn.nimiq-network.com/staging/nimiq.js';
    } else {
        nimiq = 'https://cdn.nimiq.com/core/nimiq.js';
    }

    window.nimiq_loaded = false;
    var head = document.getElementsByTagName('head')[0];

    var ret = function() {
        // Load main script.
        if (!window.nimiq_loaded) {
            window.nimiq_loaded = true;
            for (var i = 0; i < scripts.length; ++i) {
                var script = document.createElement('script');
                script.type = 'text/javascript';
                script.src = scripts[i];
                head.appendChild(script);
            }
        }
    }

    var script = document.createElement('script');
    script.onreadystatechange = ret;
    script.onload = ret;
    script.type = 'text/javascript';
    script.src = nimiq;
    head.appendChild(script);
}