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

if (isSupportedBrowser()) {
    var scripts = ['geoip.js', 'map.js', 'miner.js'];

    // allow to load staging branch instead
    if (window.location.hash === '#staging') {
        var nimiq = 'https://cdn.nimiq-network.com/staging/nimiq.js';
    } else {
        var nimiq = 'https://cdn.nimiq.com/core/nimiq.js';
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
} else {
    document.getElementById('landingSection').classList.add('warning');
    document.getElementById('warning-old-browser').style.display = 'block';
}
