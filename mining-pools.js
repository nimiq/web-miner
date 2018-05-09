class MiningPoolsUi extends Overlay {
    constructor(el, miner) {
        super(MiningPoolsUi.ID, el);
        this._el = el;
        this._miner = miner;
        this._poolsList = this._el.querySelector('#mining-pools-list');
        this._detailUi = new MiningPoolDetailUi(el.querySelector('#mining-pool-detail'), this, miner);

        this._initMiningPoolsList();
    }

    get settings() {
        const [host, port] = MiningPoolsUi.poolIdToHostAndPort(this.joinedMiningPoolId);
        return {
            host: host,
            port: port,
            enabled: this.isPoolMinerEnabled
        };
    }
    
    static get isPoolMinerEnabled() {
        return localStorage[MiningPoolsUi.KEY_USE_POOL_MINER]==='yes';
    }

    get isPoolMinerEnabled() {
        return MiningPoolsUi.isPoolMinerEnabled;
    }

    set isPoolMinerEnabled(enabled) {
        localStorage[MiningPoolsUi.KEY_USE_POOL_MINER] = enabled? 'yes' : 'no';
        this._miner.setCurrentMiner();
    }

    get joinedMiningPoolId() {
        return localStorage[MiningPoolsUi.KEY_JOINED_POOL];
    }

    set joinedMiningPoolId(poolId) {
        if (poolId === this.joinedMiningPoolId) return;
        const switchingPool = !!this.joinedMiningPoolId;
        localStorage[MiningPoolsUi.KEY_JOINED_POOL] = poolId;
        if (switchingPool && this._miner.isPoolMinerInstantiated
            && this._miner.poolMiner.connectionState !== Nimiq.BasePoolMiner.ConnectionState.CLOSED) {
            // disconnect from previous pool
            this._miner.poolMiner.disconnect();
            // reconnect to new pool TODO use this._miner.connectPoolMiner when connectionState bug after disconnect is fixed in pool miner
            const { host, port } = this.settings;
            this._miner.poolMiner.connect(host, port);
        }
    }

    static poolIdFromHostAndPort(host, port) {
        return host + ':' + port;
    }

    static poolIdToHostAndPort(poolId) {
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

    async _initMiningPoolsList() {
        const miningPools = await this._loadMiningPools();
        for (const miningPool of miningPools) {
            const poolId = MiningPoolsUi.poolIdFromHostAndPort(miningPool.host, miningPool.port);
            const radioButton = document.createElement('input');
            radioButton.type = 'radio';
            radioButton.value = poolId;
            radioButton.name = 'mining-pools-list';
            radioButton.id = `mining-pool-${poolId.replace(':', '-')}`;
            radioButton.addEventListener('change', e => this._onPoolSelected(e.target.value));
            const label = document.createElement('label');
            label.textContent = miningPool.name;
            label.setAttribute('for', radioButton.id);
            this._poolsList.appendChild(radioButton);
            this._poolsList.appendChild(label);
        }
        this._selectPool(this.joinedMiningPoolId);
    }

    _selectPool(poolId) {
        const selectedRadio = this._poolsList.querySelector(`input[value="${poolId}"]`)
            || this._poolsList.querySelector('input:first-of-type'); // arbitrarily select first entry
        selectedRadio.checked = true;
        this._onPoolSelected(selectedRadio.value);
    }

    async _onPoolSelected(selectedPoolId) {
        const [host, port] = MiningPoolsUi.poolIdToHostAndPort(selectedPoolId);
        const miningPools = await this._loadMiningPools();
        for (const pool of miningPools) {
            if (pool.host !== host || pool.port !== port) continue;
            this._detailUi.miningPool = pool;
            return;
        }
    }

    show() {
        if (this.isPoolMinerEnabled) {
            // make sure we're connected to update balance
            this._miner.connectPoolMiner();
        }
        this._selectPool(this.joinedMiningPoolId);
        super.show();
    }

    hide() {
        super.hide();
        this._miner.disconnectPoolMiner(true);
    }
}
MiningPoolsUi.ID = 'mining-pools';
MiningPoolsUi.KEY_USE_POOL_MINER = 'pool-miner-settings-use-pool';
MiningPoolsUi.KEY_JOINED_POOL = 'pool-miner-settings-selected-pool';



class MiningPoolDetailUi {
    constructor(el, poolsUi, miner) {
        this._el = el;
        this._poolsUi = poolsUi;
        this._miner = miner;
        this._miningPoolId = null;
        this._connectionStatus = el.querySelector('#mining-pool-connection-indicator');
        this._joinButton = el.querySelector('#mining-pool-join');
        this._balance = el.querySelector('#mining-pool-info-balance');
        this._joinButton.addEventListener('click', () => this._joinOrLeave());
        this._poolEventsBound = false;
    }

    set miningPool(miningPool) {
        this._miningPoolId = MiningPoolsUi.poolIdFromHostAndPort(miningPool.host, miningPool.port);
        this._el.querySelector('#mining-pool-info-name').textContent = miningPool.name;
        this._el.querySelector('#mining-pool-info-host').textContent = miningPool.host;
        this._el.querySelector('#mining-pool-info-port').textContent = miningPool.port;
        this._el.querySelector('#mining-pool-info-description').textContent = miningPool.description;
        this._el.querySelector('#mining-pool-info-fees').textContent = miningPool.fees;
        this._el.querySelector('#mining-pool-info-payouts').textContent = miningPool.payouts;
        if (this._poolsUi.isPoolMinerEnabled) this._bindPoolEvents();
        this._updateConnectionStatus();
        this._updateBalance();
    }

    _bindPoolEvents() {
        if (this._poolEventsBound) return;
        this._poolEventsBound = true;
        this._miner.poolMiner.on('connection-state', () => this._updateConnectionStatus());
        this._miner.poolMiner.on('confirmed-balance', () => this._updateBalance());
    }

    _updateConnectionStatus() {
        if (!this._miner.isPoolMinerInstantiated
            || this._miningPoolId !== this._poolsUi.joinedMiningPoolId
            || this._miner.poolMiner.connectionState === Nimiq.BasePoolMiner.ConnectionState.CLOSED) {
            this._connectionStatus.setAttribute('status', 'disconnected');
            this._el.removeAttribute('connected');
            this._joinButton.textContent = 'Join';
        } else if (this._miner.poolMiner.connectionState === Nimiq.BasePoolMiner.ConnectionState.CONNECTED) {
            this._connectionStatus.setAttribute('status', 'connected');
            this._el.setAttribute('connected', '');
            this._joinButton.textContent = 'Leave';
        } else {
            this._connectionStatus.setAttribute('status', 'connecting');
            this._el.removeAttribute('connected');
            this._joinButton.textContent = 'Leave';
        }
    }

    _updateBalance() {
        const balance = !this._miner.isPoolMinerInstantiated? 0 : (this._miner.poolMiner.confirmedBalance || 0);
        this._balance.textContent =
            Nimiq.Policy.satoshisToCoins(balance).toFixed(2);
    }

    _joinOrLeave() {
        if (this._miner.poolMiner.connectionState === Nimiq.BasePoolMiner.ConnectionState.CLOSED
            || this._miningPoolId !== this._poolsUi.joinedMiningPoolId) {
            this._poolsUi.joinedMiningPoolId = this._miningPoolId;
            this._poolsUi.isPoolMinerEnabled = true;
            this._bindPoolEvents();
            this._miner.connectPoolMiner();
        } else {
            this._poolsUi.isPoolMinerEnabled = false;
            this._miner.disconnectPoolMiner();
        }
    }
}

