/* Miner Settings */

class MinerSettingsUi extends Panel {
    constructor(el, miner) {
        super(MinerSettingsUi.ID, el);
        this._el = el;
        this._miner = miner;
        this._threadCountLabel = this._el.querySelector('#miner-settings-thread-count');
        this._threadSlider = this._el.querySelector('#miner-thread-slider');
        // estimate the maximum number of threads that is useful. We divide navigator.hardwareConcurrency by 2 as this
        // count includes hyper threads that are not very beneficial for the hashrate.
        this._threadSlider.setAttribute('max', navigator.hardwareConcurrency || 4);
        this._threadSlider.addEventListener('input', // triggered while dragging
            () => this._threadCountLabel.textContent = this._threadSlider.value);
        this._threadSlider.addEventListener('change', // triggered after releasing the slider
            () => this.threads = parseInt(this._threadSlider.value));
    }

    set threads(threadCount) {
        this._threadCountLabel.textContent = threadCount;
        this._threadSlider.value = threadCount;
        const storedThreadCount = this.threads;
        if (threadCount !== storedThreadCount) {
            localStorage[MinerSettingsUi.KEY_THREAD_COUNT] = threadCount;
            this._miner.threads = threadCount;
        }
    }

    get threads() {
        return parseInt(localStorage[MinerSettingsUi.KEY_THREAD_COUNT]);
    }
}
MinerSettingsUi.ID = 'miner-settings';
MinerSettingsUi.KEY_THREAD_COUNT = 'miner-settings-thread-count';



/* Mining Pool Settings */

class PoolMinerSettingsUi extends Panel {
    constructor(el, miner) {
        super(PoolMinerSettingsUi.ID, el);
        // TODO reenable for pool
        if (App.NETWORK !== 'main') {
            this._el = el;
            this._miner = miner;
            this._connectionStatus = this._el.querySelector('#pool-miner-settings-connection-status');
            this._connectButton = this._el.querySelector('#pool-miner-settings-connect-button');
            this._balance = this._el.querySelector('#pool-miner-settings-pool-balance');
            this._payoutButton = this._el.querySelector('#pool-miner-settings-payout-button');
            this._payoutNotice = this._el.querySelector('#pool-miner-payout-notice');

            this._connectButton.addEventListener('click', () => this._changeConnection());
            this._payoutButton.addEventListener('click', () => this._requestPayout());

            miner.poolMiner.on('connection-state', connectionState => this._onConnectionChange(connectionState));
            miner.poolMiner.on('confirmed-balance', balance => this._onBalanceChange(balance));
            miner.poolMiner.on('balance', () => this._updatePayoutStatus());
        }
    }

    get settings() {
        return {
            host: PoolMinerSettingsUi.DEFAULT_POOL_MINER_HOST,
            port: PoolMinerSettingsUi.DEFAULT_POOL_MINER_PORT,
            enabled: this.isPoolMinerEnabled
        };
    }

    static get isPoolMinerEnabled() {
        // TODO reenable for pool
        if (App.NETWORK === 'main') return false;
        return localStorage[PoolMinerSettingsUi.KEY_USE_POOL_MINER]==='yes';
    }

    get isPoolMinerEnabled() {
        return PoolMinerSettingsUi.isPoolMinerEnabled;
    }

    set isPoolMinerEnabled(enabled) {
        localStorage[PoolMinerSettingsUi.KEY_USE_POOL_MINER] = enabled? 'yes' : 'no';
        this._miner.setCurrentMiner();
    }

    _changeConnection() {
        if (this._miner.poolMiner.connectionState === Nimiq.BasePoolMiner.ConnectionState.CLOSED) {
            this._connect();
        } else {
            this._disconnect();
        }
    }

    _connect() {
        this.isPoolMinerEnabled = true;
        const poolMiner = this._miner.poolMiner;
        if (poolMiner.connectionState !== Nimiq.BasePoolMiner.ConnectionState.CLOSED) return;
        const {host, port} = this.settings;
        poolMiner.connect(host, port);
    }

    _disconnect() {
        this.isPoolMinerEnabled = false;
        const poolMiner = this._miner.poolMiner;
        if (poolMiner.connectionState === Nimiq.BasePoolMiner.ConnectionState.CLOSED) return;
        poolMiner.disconnect();
    }

    _onConnectionChange(connectionState) {
        if (connectionState === Nimiq.BasePoolMiner.ConnectionState.CONNECTED) {
            this._connectionStatus.textContent = 'Connected';
            this._connectButton.textContent = 'Disconnect';
            this._el.setAttribute('connected', '');
            this._updatePayoutStatus();
        } else if (connectionState === Nimiq.BasePoolMiner.ConnectionState.CONNECTING) {
            this._connectionStatus.textContent = 'Connecting...';
            this._connectButton.textContent = 'Disconnect';
            this._el.removeAttribute('connected');
        } else {
            this._connectionStatus.textContent = 'Disconnected';
            this._connectButton.textContent = 'Connect';
            this._el.removeAttribute('connected');
        }
        this._el.dispatchEvent(new CustomEvent('resize', {
            bubbles: true
        }));
    }

    _onBalanceChange(balance) {
        this._balance.textContent = Nimiq.Policy.satoshisToCoins(balance).toFixed(2);
        this._updatePayoutStatus();
    }

    _requestPayout() {
        const poolMiner = this._miner.poolMiner;
        poolMiner.requestPayout();
        this._payoutNotice.style.display = 'block';
        this._el.dispatchEvent(new CustomEvent('resize', {
            bubbles: true
        }));
    }

    _updatePayoutStatus() {
        const poolMiner = this._miner.poolMiner;
        this._payoutNotice.style.display = poolMiner.payoutRequestActive? 'block' : 'none';
        this._payoutButton.style.display = poolMiner.payoutRequestActive || !poolMiner.confirmedBalance?
            'none' : 'block';
        this._el.dispatchEvent(new CustomEvent('resize', {
            bubbles: true
        }));
    }
}
PoolMinerSettingsUi.ID = 'pool-miner-settings';
PoolMinerSettingsUi.DEFAULT_POOL_MINER_HOST = 'pool.nimiq-network.com';
PoolMinerSettingsUi.DEFAULT_POOL_MINER_PORT = '8080';
PoolMinerSettingsUi.KEY_USE_POOL_MINER = 'pool-miner-settings-use-pool';
