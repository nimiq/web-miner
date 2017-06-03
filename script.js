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
    // Load main script.
    var head = document.getElementsByTagName('head')[0];
    for (var i = 0; i < scripts.length; ++i) {
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = scripts[i];
        head.appendChild(script);
    }
} else {
    document.getElementById('warning-old-browser').style.display = 'block';
}
