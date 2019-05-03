class MinerPolicy {
    constructor() {
        this.name = this.constructor.name;
    }

    equals(otherPolicy) {
        return otherPolicy && this.name === otherPolicy.name;
    }

    serialize() {
        const serialized = {};

        for (const prop in this)
            if (!(this[prop] instanceof Function)) serialized[prop] = this[prop];

        return serialized;
    }

    allows(method, args, state) {
        switch (method) {
            case 'list':
            case 'createWallet':
            case 'getMinerAccount':
                return true;
            default:
                throw new Error(`Unhandled method: ${method}`);
        }
    }

    needsUi(method, args, state) {
        switch (method) {
            case 'list':
            case 'getMinerAccount':
                return false;
            case 'createWallet':
                return true;
            default:
                throw new Error(`Unhandled method: ${method}`);
        }
    }
}


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
        document.body.setAttribute('network', App.NETWORK);
        this.$accountPromptUi = document.querySelector('#create-account-prompt');
        this.$createAccountButton = document.querySelector('#createAccountButton');
        this.$createAccountButton.addEventListener('click', () => this._createAccount());
        this.$connectButton = document.querySelector('#connectBtn');

        if (App.NETWORK === 'test') {
            document.querySelector('#header-link').href = 'https://nimiq-testnet.com';
        }

        return this._launch();
    }

    async getMinerAccount() {
        return this._keyGuardClient.getMinerAccount();
    }

    async _launch() {
        this._keyGuardClient = await KeyguardClient.create(App.SECURE_ORIGIN,
            new MinerPolicy(), () => {});
        const minerAccount = await this.getMinerAccount();
        this._dependenciesPromise = this._initDependencies();
        if (minerAccount) {
            this._showConnectButton();
            await this._awaitUserConnect();
            await this._connectMiner();
        } else {
            this._showAccountCreationPrompt();
        }
        App.instance = this;
        return this;
    }

    _showAccountCreationPrompt() {
        this.$accountPromptUi.style.display = 'block';
    }

    async _createAccount() {
        // needs to be called by a user interaction to open keyguard popup window
        await this._keyGuardClient.createWallet('New Account');
        const minerAccount = await this.getMinerAccount();
        if (!minerAccount) return; // User cancelled account creation. Keep the prompt open.
        this.$accountPromptUi.style.display = 'none';
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
            Nimiq.init(async () => {
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
        const $loadingSpinner = document.querySelector('#initialLoadingSpinner');
        $loadingSpinner.style.display = 'block';
        await this._dependenciesPromise;
        $loadingSpinner.parentElement.removeChild($loadingSpinner);
        const address = Nimiq.Address.fromUserFriendlyAddress((await this.getMinerAccount()).address);
        const deviceId = Nimiq.BasePoolMiner.generateDeviceId(this.$.network.config);
        if (App.NANO_CLIENT) {
            this.$.miner = new Nimiq.NanoPoolMiner(this.$.blockchain, this.$.network.time, address, deviceId);
        } else {
            this.$.miner = new Nimiq.SmartPoolMiner(this.$.blockchain, this.$.accounts, this.$.mempool,
                this.$.network.time, address, deviceId);
        }
        this._miner = new Miner(this.$);
        this._miner.connect();
    }

    _showConnectButton() {
        this.$connectButton.style.display = 'inline-block';
    }

    _awaitUserConnect() {
        return new Promise(resolve => {
            this.$connectButton.addEventListener('click', () => {
                this.$connectButton.parentElement.removeChild(this.$connectButton);
                this.$connectButton = null;
                resolve();
            });
        });
    }
}
App.SECURE_ORIGIN = window.location.origin.indexOf('nimiq.com')!==-1? 'https://keyguard.nimiq.com'
    : window.location.origin.indexOf('localhost')!==-1? `${location.origin}/libraries/keyguard/src`
        : 'https://keyguard.nimiq-testnet.com';

App.NIMIQ_PATH = window.location.origin.indexOf('nimiq.com')!==-1? 'https://cdn.nimiq.com/nimiq.js'
    : window.location.origin.indexOf('localhost')!==-1? '/dist/nimiq.js'
    : 'https://cdn.nimiq-testnet.com/nimiq.js';

App.NANO_CLIENT = true; // FIXME currently using nano on desktop and mobile. At some point switch back to mobile only

App.NETWORK = window.location.origin.indexOf('nimiq.com')!==-1? 'main'
    : 'test';

App.ERROR_OLD_BROWSER = 'old browser';
App.ERROR_UNKNOWN_INITIALIZATION_ERROR = 'unknown initialization error';
App.ERROR_DATABASE_ACCESS = 'error database reset failed';

new App().then(app => window.app = app);
