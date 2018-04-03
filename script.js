class MinerPolicy {
    constructor() {
        this.name = window.location.origin.indexOf('localhost')!==-1
            ? 'SafePolicy' // for localhost choose SafePolicy as this is the policy that the keyguard chooses
            : this.constructor.name;
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
            case 'getDefaultAccount':
                return true;
            default:
                throw new Error(`Unhandled method: ${method}`);
        }
    }

    needsUi(method, args, state) {
        switch (method) {
            case 'list':
            case 'getDefaultAccount':
                return false;
            case 'createWallet':
                return true;
            default:
                throw new Error(`Unhandled method: ${method}`);
        }
    }
}



class App {
    constructor() {
        document.body.setAttribute('network', App.NETWORK);
        this.$loadingSpinner = document.querySelector('#initialLoadingSpinner');
        this.$walletPromptUi = document.querySelector('#create-wallet-prompt');
        this.$createAccountButton = document.querySelector('#createAccountButton');
        this.$createAccountButton.addEventListener('click', () => this._createAccount());
        this.$connectButton = document.querySelector('#connectBtn');
        this.$connectButton.addEventListener('click', () => this._miner.connect());

        return this._launch();
    }

    async getDefaultAccount() {
        return this._keyGuardClient.getDefaultAccount();
    }

    async _launch() {
        this._keyGuardClient = await KeyguardClient.create(App.SECURE_ORIGIN,
            new MinerPolicy(), () => {});
        const defaultAccount = await this.getDefaultAccount();
        if (defaultAccount) {
            await this._initMiner();
            this._showConnectButton();
        } else {
            this._showAccountCreationPrompt();
        }
    }

    _showAccountCreationPrompt() {
        this.$loadingSpinner.style.display = 'none';
        this.$walletPromptUi.style.display = 'block';
    }

    async _createAccount() {
        // needs to be called by a user interaction to open keyguard popup window
        await this._keyGuardClient.createWallet();
        const defaultAccount = await this.getDefaultAccount();
        if (!defaultAccount) return; // User cancelled wallet creation. Keep the prompt open.
        this.$walletPromptUi.style.display = 'none';
        await this._initMiner();
        this._miner.connect();
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
            const request = indexedDB.deleteDatabase(`${App.NETWORK}-light-consensus`);
            request.onerror = () => reject(App.ERROR_DATABASE_ACCESS);
            request.onsuccess = resolve;
        });
    }

    async _initNimiqInstance(tryDatabaseReset = true) {
        return new Promise((resolve, reject) => {
            Nimiq.init(async () => {
                try {
                    document.getElementById('landingSection').classList.remove('warning');
                    document.getElementById('warning-multiple-tabs').style.display = 'none';

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
                    $.consensus = await Nimiq.Consensus.light();
                    // XXX Legacy API
                    $.blockchain = $.consensus.blockchain;
                    $.accounts = $.blockchain.accounts;
                    $.mempool = $.consensus.mempool;
                    $.network = $.consensus.network;
                    $.address = Nimiq.Address.fromUserFriendlyAddress((await this.getDefaultAccount()).address);
                    $.miner = new Nimiq.Miner($.blockchain, $.accounts, $.mempool, $.network.time, $.address);
                    $.miner.on('block-mined', (block) => _paq.push(['trackEvent', 'Miner', 'block-mined']));
                    window.$ = $;
                    resolve($);
                } catch(e) {
                    reject(e);
                }
            }, function (error) {
                document.getElementById('landingSection').classList.add('warning');
                if (error === Nimiq.ERR_WAIT) {
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

    async _initMiner() {
        this.$loadingSpinner.style.display = 'block';
        await this._loadScript(App.NIMIQ_PATH);
        _paq.push(['trackEvent', 'Loading', 'success']);
        let $;
        try {
            $ = (await Promise.all([
                this._initNimiqInstance(),
                // load scripts that depend on Nimiq script
                this._loadScript('geoip.js'),
                this._loadScript('map.js'),
                this._loadScript('block-explorer.js'),
                this._loadScript('miner-settings.js'),
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
        // we won't need the spinner anymore
        this.$loadingSpinner.parentElement.removeChild(this.$loadingSpinner);
        this.$loadingSpinner = null;
        this._miner = new Miner($);
    }

    _showConnectButton() {
        this.$connectButton.style.display = 'inline-block';
    }
}
App.SECURE_ORIGIN = window.location.origin.indexOf('nimiq.com')!==-1? 'https://keyguard.nimiq.com/index-list-only.html'
    : window.location.origin.indexOf('nimiq-testnet.com')!==-1? 'https://keyguard.nimiq-testnet.com/index-list-only.html'
        : `${location.origin}/libraries/keyguard/src/index-list-only.html`;

App.NIMIQ_PATH = window.location.origin.indexOf('nimiq.com')!==-1? 'https://cdn.nimiq.com/nimiq.js'
    : window.location.origin.indexOf('nimiq-testnet.com')!==-1? 'https://cdn.nimiq-testnet.com/nimiq.js'
        : `/dist/nimiq.js`;

App.NETWORK = window.location.origin.indexOf('nimiq.com')!==-1? 'main'
    : window.location.origin.indexOf('nimiq-testnet.com')!==-1? 'test'
        : 'dev';

App.ERROR_OLD_BROWSER = 'old browser';
App.ERROR_UNKNOWN_INITIALIZATION_ERROR = 'unknown initialization error';
App.ERROR_DATABASE_ACCESS = 'error database reset failed';

window.app = new App();
