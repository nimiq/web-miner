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
        this._el = el;
        this._miner = miner;
        this._poolSelector = this._el.querySelector('#pool-miner-settings-pool-select');
        this._connectionInfo = this._el.querySelector('#pool-miner-settings-connection');
        this._connectionStatus = this._el.querySelector('#pool-miner-settings-connection-status');
        this._connectButton = this._el.querySelector('#pool-miner-settings-connect-button');
        this._balance = this._el.querySelector('#pool-miner-settings-pool-balance');
        //this._payoutButton = this._el.querySelector('#pool-miner-settings-payout-button');
        this._payoutNotice = this._el.querySelector('#pool-miner-payout-notice');
        this._poolInfoButton = this._el.querySelector('#pool-miner-settings-pool-info');
        this._poolInfoUi = new MiningPoolInfoUi(document.querySelector('#mining-pool-info'));

        this._poolSelector.addEventListener('change', () => this._updateUi());
        this._poolInfoButton.addEventListener('click', () => this._showPoolInfo());
        this._connectButton.addEventListener('click', () => this._changeConnection());
        //this._payoutButton.addEventListener('click', () => this._requestPayout());

        this._poolEventsBound = false;
        if (this.isPoolMinerEnabled) this._bindPoolEvents();

        this._initMiningPoolSelector();
    }

    get settings() {
        const [host, port] = this._poolIdToHostAndPort(this.selectedMiningPoolId);
        return {
            host: host,
            port: port,
            enabled: this.isPoolMinerEnabled
        };
    }

    static get isPoolMinerEnabled() {
        return localStorage[PoolMinerSettingsUi.KEY_USE_POOL_MINER]==='yes';
    }

    get isPoolMinerEnabled() {
        return PoolMinerSettingsUi.isPoolMinerEnabled;
    }

    set isPoolMinerEnabled(enabled) {
        localStorage[PoolMinerSettingsUi.KEY_USE_POOL_MINER] = enabled? 'yes' : 'no';
        if (enabled) this._bindPoolEvents();
        this._miner.setCurrentMiner();
    }

    get selectedMiningPoolId() {
        return localStorage[PoolMinerSettingsUi.KEY_SELECTED_POOL];
    }

    set selectedMiningPoolId(miningPoolId) {
        localStorage[PoolMinerSettingsUi.KEY_SELECTED_POOL] = miningPoolId;
    }

    _hostAndPortToPoolId(host, port) {
        return host + ':' + port;
    }

    _poolIdToHostAndPort(poolId) {
        if (!poolId) return [null, null];
        return poolId.split(':');
    }

    async _loadMiningPools() {
        this._loadMiningPoolsPromise = this._loadMiningPoolsPromise || new Promise(async (resolve, reject) => {
            try {
                const file = App.NETWORK === 'main' ? 'mining-pools-mainnet.json' : 'mining-pools-testnet.json';
                const url = window.location.origin.indexOf('localhost') !== -1 ? `/apps/miner/${file}` : `/${file}`;
                const response = await fetch(url);
                const pools = this._shuffleArray(await response.json());
                resolve(pools);
            } catch(e) {
                reject(e);
            }
        });
        return this._loadMiningPoolsPromise;
    }

    _shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    async _initMiningPoolSelector() {
        const miningPools = await this._loadMiningPools();
        for (const miningPool of miningPools) {
            const entry = document.createElement('option');
            entry.setAttribute('value', this._hostAndPortToPoolId(miningPool.host, miningPool.port));
            entry.textContent = miningPool.name;
            this._poolSelector.appendChild(entry);
        }
        this._poolSelector.value = this.selectedMiningPoolId || "";
        this._updateUi();
    }

    _bindPoolEvents() {
        if (this._poolEventsBound) return;
        this._poolEventsBound = true;
        this._miner.poolMiner.on('connection-state', () => this._updateUi());
        this._miner.poolMiner.on('confirmed-balance', () => this._updateUi());
        this._miner.poolMiner.on('balance', () => this._updateUi());
    }

    _changeConnection() {
        if (this._miner.poolMiner.connectionState === Nimiq.BasePoolMiner.ConnectionState.CLOSED
            || this._poolSelector.value !== this.selectedMiningPoolId) {
            this._connect();
        } else {
            this._disconnect();
        }
    }

    _connect() {
        if (!this._poolSelector.value) return;
        const previousMiningPool = this.selectedMiningPoolId;
        this.selectedMiningPoolId = this._poolSelector.value; // set as selected pool when user actually connects
        this.isPoolMinerEnabled = true;
        let switchingPool = false;
        if (previousMiningPool && this._poolSelector.value !== previousMiningPool) {
            // disconnect from previous pool
            this._miner.poolMiner.disconnect();
            switchingPool = true;
        }
        if (this._miner.poolMiner.connectionState !== Nimiq.BasePoolMiner.ConnectionState.CLOSED
            && !switchingPool) return;
        const {host, port} = this.settings;
        this._miner.poolMiner.connect(host, port);
    }

    _disconnect() {
        this.isPoolMinerEnabled = false;
        if (this._miner.poolMiner.connectionState === Nimiq.BasePoolMiner.ConnectionState.CLOSED) return;
        this._miner.poolMiner.disconnect();
    }


    _updateUi() {
        this._updatePoolInfoButton();
        this._updateConnectionStatus();
        this._updateConnectButtonLabel();
        this._updateBalance();
        this._updatePayoutStatus();
        // TODO don't use resize event to communicate with bottom panels
        this._el.dispatchEvent(new CustomEvent('resize', {
            bubbles: true
        }));
    }

    _updatePoolInfoButton() {
        if (!this._poolSelector.value) {
            this._poolInfoButton.style.display = 'none';
        } else {
            this._poolInfoButton.style.display = null;
        }
    }

    _updateConnectionStatus() {
        if (!this._poolSelector.value) {
            this._connectionInfo.style.display = 'none';
            return;
        } else {
            this._connectionInfo.style.display = null;
        }
        if (!this._miner.isPoolMinerInstantiated
            || this._poolSelector.value !== this.selectedMiningPoolId
            || this._miner.poolMiner.connectionState === Nimiq.BasePoolMiner.ConnectionState.CLOSED) {
            this._connectionStatus.textContent = 'Disconnected';
            this._el.removeAttribute('connected');
        } else if (this._miner.poolMiner.connectionState === Nimiq.BasePoolMiner.ConnectionState.CONNECTED) {
            this._connectionStatus.textContent = 'Connected';
            this._el.setAttribute('connected', '');
        } else {
            this._connectionStatus.textContent = 'Connecting...';
            this._el.removeAttribute('connected');
        }
    }

    _updateConnectButtonLabel() {
        if (!this._miner.isPoolMinerInstantiated
            || this._poolSelector.value !== this.selectedMiningPoolId
            || this._miner.poolMiner.connectionState === Nimiq.BasePoolMiner.ConnectionState.CLOSED) {
            this._connectButton.textContent = 'Connect';
        } else {
            this._connectButton.textContent = 'Disconnect';
        }
    }

    _updateBalance() {
        const balance = !this._miner.isPoolMinerInstantiated? 0 : (this._miner.poolMiner.confirmedBalance || 0);
        this._balance.textContent =
            Nimiq.Policy.satoshisToCoins(balance).toFixed(2);
    }

    _updatePayoutStatus() {
        this._payoutNotice.style.display =
            this._miner.isPoolMinerInstantiated && this._miner.poolMiner.payoutRequestActive? 'block' : 'none';
        /*this._payoutButton.style.display =
            !this._miner.isPoolMinerInstantiated || poolMiner.payoutRequestActive || !poolMiner.confirmedBalance
            ? 'none' : null;*/
    }

    async _showPoolInfo() {
        if (!this._poolSelector.value) return;
        const [host, port] = this._poolIdToHostAndPort(this._poolSelector.value);
        const miningPools = await this._loadMiningPools();
        for (const miningPool of miningPools) {
            if (miningPool.host !== host || miningPool.port !== port) continue;
            this._poolInfoUi.show(miningPool);
            return;
        }
    }

    /*
    _requestPayout() {
        this._miner.poolMiner.requestPayout();
        this._payoutNotice.style.display = 'block;
        this._el.dispatchEvent(new CustomEvent('resize', {
            bubbles: true
        }));
    }
    */
}
PoolMinerSettingsUi.ID = 'pool-miner-settings';
PoolMinerSettingsUi.KEY_USE_POOL_MINER = 'pool-miner-settings-use-pool';
PoolMinerSettingsUi.KEY_SELECTED_POOL = 'pool-miner-settings-selected-pool';


class MiningPoolInfoUi extends Overlay {
    constructor(el) {
        super(el);
        this._name = el.querySelector('#mining-pool-info-name');
        this._host = el.querySelector('#mining-pool-info-host');
        this._port = el.querySelector('#mining-pool-info-port');
        this._description = el.querySelector('#mining-pool-info-description');
        this._fees = el.querySelector('#mining-pool-info-fees');
        this._payouts = el.querySelector('#mining-pool-info-payouts');
    }

    set miningPool(miningPool) {
        this._name.textContent = miningPool.name;
        this._host.textContent = miningPool.host;
        this._port.textContent = miningPool.port;
        this._description.textContent = miningPool.description;
        this._fees.textContent = miningPool.fees;
        this._payouts.textContent = miningPool.payouts;
    }

    show(miningPool) {
        if (miningPool) {
            this.miningPool = miningPool;
        }
        super.show();
    }
}
MiningPoolInfoUi.ID = 'mining-pool-info';
