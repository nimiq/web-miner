class UpdateChecker {
    constructor(miner) {
        this._miner = miner;
        this._miningSection = document.querySelector('#miningSection');
        this._currentVersion = null;
        this._checkVersion();
        this._updateTimer = window.setInterval(() => this._checkVersion(), 60 * 60 * 1000); // check every hour
    }

    static fetchVersion() {
        return new Promise((resolve, reject) => {
            const xmlhttp = new XMLHttpRequest();
            xmlhttp.onreadystatechange = function() {
                if (this.readyState === 4) {
                    if (this.status === 200) {
                        resolve(JSON.parse(this.responseText));
                    } else {
                        reject();
                    }
                }
            };
            xmlhttp.onerror = reject;
            xmlhttp.ontimeout = reject;
            xmlhttp.open('GET', UpdateChecker.CHECK_URL, true);
            xmlhttp.timeout = 5000;
            xmlhttp.send();
        });
    }

    _checkVersion() {
        UpdateChecker.fetchVersion().then(version => {
            if (!this._currentVersion) {
                this._currentVersion = version;
                return;
            }
            if (version.code > this._currentVersion.code) {
                this._miner.ui.updateAvailable();
                if (version.minRequiredVersion > this._currentVersion.code) {
                    this._miner.stopMining();
                }
            }
            this._currentVersion = version;
        }).catch(() => console.warn('Couldn\'t fetch update information'));
    }
}
UpdateChecker.CHECK_URL = 'https://cdn.nimiq.com/VERSION';
