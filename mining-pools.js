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
        if (enabled === this.isPoolMinerEnabled) return;
        localStorage[MiningPoolsUi.KEY_USE_POOL_MINER] = enabled? 'yes' : 'no';
        if (enabled) {
            this._miner.connectPoolMiner();
        } else {
            this._miner.disconnectPoolMiner();
        }
    }

    get joinedMiningPoolId() {
        return localStorage[MiningPoolsUi.KEY_JOINED_POOL];
    }

    set joinedMiningPoolId(poolId) {
        if (poolId === this.joinedMiningPoolId) return;
        const switchingPool = !!this.joinedMiningPoolId;
        localStorage[MiningPoolsUi.KEY_JOINED_POOL] = poolId;
        if (switchingPool && this._miner.poolConnectionState !== Nimiq.BasePoolMiner.ConnectionState.CLOSED) {
            // disconnect from previous pool
            this._miner.disconnectPoolMiner(false);
            // reconnect to new pool
            this._miner.connectPoolMiner();
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
                const pools = this._shuffleArray(await response.json())
                    .filter(pool => !App.NANO_CLIENT || pool.supportsNano);
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
        if (this._miner.paused) this._miner.disconnectPoolMiner(false);
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
        this._previousConnectionState = null;
        this._connectionStatus = el.querySelector('#mining-pool-connection-indicator');
        this._joinButton = el.querySelector('#mining-pool-join');
        this._balance = el.querySelector('#mining-pool-info-balance');
        this._warningPoolConnection = el.querySelector('#mining-pool-info-connection-warning');

        this._infoName = this._el.querySelector('#mining-pool-info-name');
        this._infoDescription = this._el.querySelector('#mining-pool-info-description');
        this._infoLinks = this._el.querySelector('#mining-pool-info-links');
        this._infoFees = this._el.querySelector('#mining-pool-info-fees');
        this._infoPayouts = this._el.querySelector('#mining-pool-info-payouts');
        this._infoHost = this._el.querySelector('#mining-pool-info-host');
        this._infoPort = this._el.querySelector('#mining-pool-info-port');

        this._joinButton.addEventListener('click', () => this._joinOrLeave());
        this._miner.$.miner.on('connection-state', () => this._updateConnectionStatus());
        this._miner.$.miner.on('confirmed-balance', () => this._updateBalance());

        if (App.NANO_CLIENT) {
            this._warningPoolConnection.querySelector('#mining-pool-info-connection-warning-mining-status').textContent
                = 'mining disabled';
        }
    }

    set miningPool(miningPool) {
        this._miningPoolId = MiningPoolsUi.poolIdFromHostAndPort(miningPool.host, miningPool.port);
        this._infoName.textContent = miningPool.name;
        this._infoDescription.textContent = miningPool.description;
        this._infoFees.textContent = miningPool.fees;
        this._infoPayouts.textContent = miningPool.payouts;
        this._infoHost.textContent = miningPool.host;
        this._infoPort.textContent = miningPool.port;

        this._infoLinks.textContent = ''; // clear
        if (miningPool.website) {
            const link = document.createElement('a');
            link.textContent = 'Website';
            link.setAttribute('target', '_blank');
            link.setAttribute('href', miningPool.website);
            this._infoLinks.appendChild(link);
        }
        if (miningPool.community) {
            if (miningPool.website) {
                const dash = document.createTextNode(' \u2013 '); // ndash
                this._infoLinks.appendChild(dash);
            }
            const link = document.createElement('a');
            link.textContent = 'Community';
            link.setAttribute('target', '_blank');
            link.setAttribute('href', miningPool.community);
            this._infoLinks.appendChild(link);
        }

        this._updateConnectionStatus();
        this._updateBalance();
    }

    _updateConnectionStatus() {
        if (this._miningPoolId !== this._poolsUi.joinedMiningPoolId
            || this._miner.poolConnectionState === Nimiq.BasePoolMiner.ConnectionState.CLOSED) {
            this._connectionStatus.setAttribute('status', 'disconnected');
            this._el.removeAttribute('connected');
            this._joinButton.textContent = 'Join';
            if (this._miningPoolId !== this._poolsUi.joinedMiningPoolId
                || !this._poolsUi.isPoolMinerEnabled) {
                this._warningPoolConnection.style.display = 'none';
            }
        } else if (this._miner.poolConnectionState === Nimiq.BasePoolMiner.ConnectionState.CONNECTED) {
            this._connectionStatus.setAttribute('status', 'connected');
            this._el.setAttribute('connected', '');
            this._joinButton.textContent = 'Leave';
            this._warningPoolConnection.style.display = 'none';
        } else {
            this._connectionStatus.setAttribute('status', 'connecting');
            this._el.removeAttribute('connected');
            this._joinButton.textContent = 'Leave';
        }

        if (this._poolsUi.isPoolMinerEnabled
                && this._miningPoolId === this._poolsUi.joinedMiningPoolId
                && this._previousConnectionState === Nimiq.BasePoolMiner.ConnectionState.CONNECTING
                && this._miner.poolConnectionState === Nimiq.BasePoolMiner.ConnectionState.CLOSED) {
            this._warningPoolConnection.style.display = 'flex';
        }
        this._previousConnectionState = this._miner.poolConnectionState;
    }

    _updateBalance() {
        this._balance.textContent = Nimiq.Policy.lunasToCoins(this._miner.poolBalance).toFixed(2);
    }

    _joinOrLeave() {
        if (this._miner.poolConnectionState === Nimiq.BasePoolMiner.ConnectionState.CLOSED
            || this._miningPoolId !== this._poolsUi.joinedMiningPoolId) {
            this._previousConnectionState = null;
            this._poolsUi.joinedMiningPoolId = this._miningPoolId;
            this._poolsUi.isPoolMinerEnabled = true;
            this._miner.connectPoolMiner();
        } else {
            this._poolsUi.isPoolMinerEnabled = false;
            this._miner.disconnectPoolMiner();
        }
    }
}

