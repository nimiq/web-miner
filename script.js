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
    // Load main script.
    var head = document.getElementsByTagName('head')[0];
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'miner.js';
    head.appendChild(script);
} else {
    document.getElementById('warning-old-browser').style.display = 'block';
}
