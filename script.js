class Utils {
    static formatValue(value, decimals=2) {
        const roundingFactor = Math.pow(10, decimals);
        value = Math.floor(value * roundingFactor) / roundingFactor;
        let result = value.toFixed(decimals);
        if (Math.abs(value) < 10000) return result;
        // add thin spaces (U+202F) every 3 digits. Stop at the decimal separator if there is one
        const regexp = decimals > 0? /(\d)(?=(\d{3})+\.)/g : /(\d)(?=(\d{3})+$)/g;
        return result.replace(regexp, '$1\u202F');
    }
}


class App {
    constructor() {
        this._dependenciesPromise = this._initDependencies();
        this._address = localStorage.getItem(App.KEY_STORED_ADDRESS);

        const year = new Date().getFullYear();
        document.querySelectorAll('.copyright-year').forEach((el) => el.textContent = year);

        document.body.setAttribute('network', App.NETWORK);
        if (App.NETWORK === 'test') {
            document.querySelector('#header-link').href = 'https://nimiq-testnet.com';
        }

        // note that the whole landing section gets removed once not needed anymore. Therefore we don't keep any
        // references to the elements here for proper garbage collection
        document.querySelector('#chooseAddressButton').addEventListener('click', () => this._chooseAddress());
        document.querySelector('#changeMiningAddressButton ').addEventListener('click', () => this._chooseAddress());
        document.querySelector('#connectBtn').addEventListener('click', () => this._connectMiner());

        if (this._address) {
            document.querySelector('#connect-prompt').style.display = 'block';
        } else {
            document.querySelector('#choose-address-prompt').style.display = 'block';
        }
    }

    async _chooseAddress() {
        // needs to be called by a user interaction to open Nimiq hub popup window
        try {
            this._hubApi = this._hubApi || new HubApi();
            this._address = (await this._hubApi.chooseAddress({ appName: 'Nimiq Miner' })).address;
            localStorage.setItem(App.KEY_STORED_ADDRESS, this._address);
            _paq.push(['trackEvent', 'Address', 'chosen']);
        } catch (e) {
            const message =  e.message || e;
            if (/closed/i.test(message) || /canceled/i.test(message)) return;
            _paq.push(['trackEvent', 'Address', 'Nimiq Hub Error', message]);
            throw e;
        }
        await this._connectMiner();
    }

    async _loadScript(src) {
        return new Promise(resolve => {
            const script = document.createElement('script');
            script.onload = () => {
                script.onload = null;
                resolve();
            };
            script.type = 'text/javascript';
            script.src = src;
            document.body.appendChild(script);
        });
    }

    async _resetDatabase() {
        console.log('Resetting the database.');
        return new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase(`${App.NETWORK}-${App.NANO_CLIENT? 'nano' : 'light'}-consensus`);
            request.onerror = () => reject(App.ERROR_DATABASE_ACCESS);
            request.onsuccess = resolve;
        });
    }

    async _initNimiqInstance(tryDatabaseReset = true) {
        return new Promise((resolve, reject) => {
            Nimiq.load().then(async () => {
                try {
                    if (document.getElementById('warning-multiple-tabs').style.display === 'block') {
                        document.getElementById('warning-multiple-tabs').style.display = 'none';
                        document.getElementById('landingSection').classList.remove('warning');
                    }

                    let genesisInitialized;
                    try {
                        genesisInitialized = !!Nimiq.GenesisConfig.NETWORK_NAME;
                    } catch(e) {
                        genesisInitialized = false;
                    }
                    if (!genesisInitialized) {
                        Nimiq.GenesisConfig[App.NETWORK]();
                    }

                    const $ = {};
                    $.consensus = App.NANO_CLIENT? await Nimiq.Consensus.nano() : await Nimiq.Consensus.light();
                    // XXX Legacy API
                    $.blockchain = $.consensus.blockchain;
                    $.mempool = $.consensus.mempool;
                    $.network = $.consensus.network;
                    if (!App.NANO_CLIENT) {
                        $.accounts = $.blockchain.accounts;
                    }
                    window.$ = $;
                    resolve($);
                } catch(e) {
                    reject(e);
                }
            }, function (error) {
                if (error === Nimiq.ERR_WAIT) {
                    document.getElementById('landingSection').classList.add('warning');
                    document.getElementById('warning-multiple-tabs').style.display = 'block';
                } else if (error === Nimiq.ERR_UNSUPPORTED) {
                    reject(App.ERROR_OLD_BROWSER);
                } else {
                    reject(App.ERROR_UNKNOWN_INITIALIZATION_ERROR);
                }
            });
        }).catch(async e => {
            console.error(e);
            if (tryDatabaseReset) {
                await this._resetDatabase();
                return this._initNimiqInstance(false);
            } else {
                throw e;
            }
        });
    }

    async _initDependencies() {
        try {
            this.$ = (await Promise.all([
                this._loadScript(App.NIMIQ_PATH).then(() => {
                    _paq.push(['trackEvent', 'Loading', 'success']);
                    return this._initNimiqInstance();
                }),
                this._loadScript('geoip.js'),
                this._loadScript('map.js'),
                this._loadScript('miner-settings.js'),
                this._loadScript('mining-pools.js'),
                this._loadScript('block-explorer.js'),
                this._loadScript('update-check.js'),
                this._loadScript('miner-main.js')
            ]))[0];
        } catch(e) {
            console.error(e);
            document.getElementById('landingSection').classList.add('warning');
            if (e === App.ERROR_OLD_BROWSER) {
                document.getElementById('warning-old-browser').style.display = 'block';
            } else if (e === App.ERROR_DATABASE_ACCESS) {
                document.getElementById('warning-database-access').style.display = 'block';
            } else {
                document.getElementById('warning-general-error').style.display = 'block';
            }
            throw e;
        }
    }

    async _connectMiner() {
        // if dependencies have not loaded yet display the spinner
        const spinnerTimeout = setTimeout(() => {
            document.querySelector('#choose-address-prompt').style.display = 'none';
            document.querySelector('#connect-prompt').style.display = 'none';
            document.querySelector('#initialLoadingSpinner').style.display = 'block';
        }, 50);
        await this._dependenciesPromise;
        clearTimeout(spinnerTimeout);
        const address = Nimiq.Address.fromUserFriendlyAddress(this._address);
        const deviceId = Nimiq.BasePoolMiner.generateDeviceId(this.$.network.config);
        if (App.NANO_CLIENT) {
            this.$.miner = new Nimiq.NanoPoolMiner(this.$.blockchain, this.$.network.time, address, deviceId);
        } else {
            this.$.miner = new Nimiq.SmartPoolMiner(this.$.blockchain, this.$.accounts, this.$.mempool,
                this.$.network.time, address, deviceId);
        }
        this._miner = new Miner(this.$);
        this._miner.connect(); // Note that this will also clean up the landing section
    }
}
App.NIMIQ_PATH = window.location.origin.indexOf('nimiq.com')!==-1? 'https://cdn.nimiq.com/v1.4.3/nimiq.js'
    : window.location.origin.indexOf('localhost')!==-1? 'https://cdn.nimiq-testnet.com/v1.4.3/nimiq.js'
    : 'https://cdn.nimiq-testnet.com/v1.4.3/nimiq.js';

App.NANO_CLIENT = true; // FIXME currently using nano on desktop and mobile. At some point switch back to mobile only

App.NETWORK = window.location.origin.indexOf('nimiq.com')!==-1? 'main'
    : 'test';

App.KEY_STORED_ADDRESS = 'miner-stored-address';

App.ERROR_OLD_BROWSER = 'old browser';
App.ERROR_UNKNOWN_INITIALIZATION_ERROR = 'unknown initialization error';
App.ERROR_DATABASE_ACCESS = 'error database reset failed';

window.app = new App();
