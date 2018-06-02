class FactsUI {
    constructor() {
        this._address = null;
        this._peers = document.getElementById('factPeers');
        this._blockHeight = document.getElementById('factBlockHeight');
        this._myHashrate = document.getElementById('factMyHashrate');
        this._myHashrateUnit = document.getElementById('factMyHashrateUnit');
        this._globalHashrate = document.getElementById('factGlobalHashrate');
        this._globalHashrateUnit = document.getElementById('factGlobalHashrateUnit');
        this._myBalance = document.getElementById('factBalance');
        this._myBalanceContainer = document.getElementById('factBalanceContainer');
        this._myBalanceContainerInner = document.getElementById('factBalanceContainerInner');
        this._poolBalance = document.getElementById('factPoolMinerBalance');
        this._expectedHashTime = document.getElementById('factExpectedHashTime');
        this._averageBlockReward = document.getElementById('factAverageBlockReward');
        this._rewardInfoSoloMiner = document.getElementById('rewardInfoSoloMiner');
        this._rewardInfoPoolMiner = document.getElementById('rewardInfoPoolMiner');
        this._blockReward = document.getElementById('factBlockReward');
        this._blockProcessingState = document.getElementById('factBlockProcessingState');
        this._consensusProgress = document.getElementById('progress');
        this._miningSection = document.getElementById('miningSection');

        this._myBalanceContainer.addEventListener('click',
            () => this._myBalanceContainerInner.classList.remove('call-to-action'));
    }

    set peers(peers) {
        this._peers.textContent = peers;
    }

    set blockHeight(height) {
        this._blockHeight.textContent = height;
    }

    set myHashrate(hashrate) {
        this._setHashrate(hashrate, 'my');
    }

    set globalHashrate(hashrate) {
        this._setHashrate(hashrate, 'global');
    }

    set poolEnabled(poolEnabled) {
        if (poolEnabled) {
            this._rewardInfoSoloMiner.style.display = 'none';
            this._rewardInfoPoolMiner.style.display = 'inline';
        } else {
            this._rewardInfoSoloMiner.style.display = 'inline';
            this._rewardInfoPoolMiner.style.display = 'none';
            this._poolBalance.textContent = 'Off';
        }
    }

    set averageBlockReward(satoshis) {
        if (!satoshis) {
            this._averageBlockReward.textContent = '0 NIM';
            return;
        }
        const nims = Nimiq.Policy.satoshisToCoins(satoshis);
        if (nims < 0.01) {
            this._averageBlockReward.textContent = satoshis.toFixed(2) + ' Satoshi';
        } else {
            this._averageBlockReward.textContent = nims.toFixed(2) + ' NIM';
        }
    }

    set expectedHashTime(expectedHashTime) {
        if (!Number.isFinite(expectedHashTime)) {
            this._expectedHashTime.innerHTML = '&infin; years';
            return;
        }

        // the time is given in seconds. Convert it to an appropriate base unit:
        let timesteps = [{ unit: 'minutes', factor: 60 }, { unit: 'hours', factor: 60 }, { unit: 'days', factor: 24 },
            { unit: 'months', factor: 365 / 12 }, { unit: 'years', factor: 12 }, { unit: 'decades', factor: 10 }
        ];
        let convertedTime = expectedHashTime;
        let unit = 'seconds';
        for (let i = 0; i < timesteps.length; ++i) {
            let timestep = timesteps[i];
            if (convertedTime / timestep.factor < 1) {
                break;
            } else {
                convertedTime /= timestep.factor;
                unit = timestep.unit;
            }
        }
        this._expectedHashTime.textContent = convertedTime.toFixed(1) + ' ' + unit;
    }

    set myBalance(balance) {
        this._myBalance.textContent = Nimiq.Policy.satoshisToCoins(balance).toFixed(2);
    }

    set accountNeedsUpgrade(accountNeedsUpgrade) {
        if (accountNeedsUpgrade) {
            this._myBalanceContainerInner.classList.add('call-to-action');
        } else {
            this._myBalanceContainerInner.classList.remove('call-to-action');
        }
        this._updateSafeLink(accountNeedsUpgrade);
    }

    set poolBalance(balance) {
        if (!MiningPoolsUi.isPoolMinerEnabled) this._poolBalance.textContent = 'Off';
        else this._poolBalance.textContent = Nimiq.Policy.satoshisToCoins(balance).toFixed(2);
    }

    set address(address) {
        this._address = address;
        this._updateSafeLink();
    }

    set synced(isSynced) {
        if (isSynced) {
            this._blockProcessingState.textContent = "Mining on";
            this._miningSection.offsetWidth; // enforce an update
            this._miningSection.classList.add('synced');
            setTimeout(function() {
                // change the text when the _consensusProgress is faded out by the synced class
                this._consensusProgress.setAttribute('state', 'synced');
            }.bind(this), 1500);
        } else {
            this._blockProcessingState.textContent = "Current";
            this._consensusProgress.setAttribute('state', 'syncing');
            this._miningSection.classList.remove('synced');
            this._miningSection.offsetWidth; // enforce an update
        }
    }

    set syncProgress(state) {
        this._consensusProgress.setAttribute('state', state);
    }

    set blockReward(satoshis) {
        this._blockReward.textContent = Math.floor(Nimiq.Policy.satoshisToCoins(satoshis));
    }

    _setHashrate(hashrate, type) {
        let steps = ['k', 'M', 'G', 'T', 'P', 'E']; // kilo, mega, giga, tera, peta, exa
        let prefix = '';
        for (let i = 0, step; step = steps[i]; ++i) {
            if (hashrate / 1000 < 1) {
                break;
            } else {
                hashrate /= 1000;
                prefix = step;
            }
        }
        let unit = prefix + 'H/s';
        let hashrateEl, unitEl;
        if (type === 'global') {
            hashrateEl = this._globalHashrate;
            unitEl = this._globalHashrateUnit;
        } else {
            hashrateEl = this._myHashrate;
            unitEl = this._myHashrateUnit;
        }
        hashrateEl.textContent = hashrate.toFixed(2);
        unitEl.textContent = unit;
    }

    _updateSafeLink(accountNeedsUpgrade = false) {
        const safeUrl = window.location.origin.indexOf('nimiq.com') !== -1? 'https://safe.nimiq.com/'
            : window.location.origin.indexOf('nimiq-testnet.com') !== -1? 'https://safe.nimiq-testnet.com/'
                : `${location.origin.replace('miner', 'safe')}/apps/safe/src/`;
        if (accountNeedsUpgrade) {
            this._myBalanceContainer.href = `${safeUrl}#/_please-upgrade_`;
        } else {
            this._myBalanceContainer.href =
                `${safeUrl}#/_account/${this._address.toUserFriendlyAddress().replace(/ /g, '-')}_`;
        }
    }
}

class MinerUI {
    constructor(miner) {
        this.miner = miner;

        this._miningSection = document.querySelector('#miningSection');

        this._toggleMinerBtn = this._miningSection.querySelector('#toggleMinerBtn');
        this._toggleMinerBtn.onclick = () => miner.toggleMining();

        this.facts = new FactsUI();
        this._bottomPanels = new BottomPanels(document.querySelector('#bottom-panels'));
        this._createBottomPanels(miner);

        this._miningPoolsUi = new MiningPoolsUi(document.querySelector('#mining-pools'), this.miner);
        this._miningSection.querySelector('#pool-miner').addEventListener('click', () => this._miningPoolsUi.show());

        this._warningUpdateAvailable = this._miningSection.querySelector('#warning-update');
        this._warningDisconnected = this._miningSection.querySelector('#warning-disconnected');
        this._warningSelectPool = this._miningSection.querySelector('#warning-select-pool');
        this._warningPoolConnection = this._miningSection.querySelector('#warning-pool-connection');
        this._warningMinerStopped = this._miningSection.querySelector('#warning-miner-stopped');

        const reload = () => window.location.reload();
        [this._warningUpdateAvailable.querySelector('#warning-update-reload'),
            this._warningDisconnected.querySelector('#warning-disconnected-reload')].forEach(btn =>
            btn.onclick = reload);

        const reconnectBtn = this._warningDisconnected.querySelector('#reconnectBtn');
        reconnectBtn.onclick = () => {
            // XXX HACK!!!!!!!!!!!!!!!!!!
            miner.$.network._connectingCount = 0;
            miner.$.network.connect();
        };

        const showPoolUi = () => this.miningPoolsUi.show();
        [this._warningSelectPool.querySelector('#warning-select-pool-btn'),
            this._warningPoolConnection.querySelector('#warning-pool-connection-change-pool')].forEach(btn =>
            btn.onclick = showPoolUi);

        const resumeMinerBtn = this._miningSection.querySelector('#resumeMinerBtn');
        resumeMinerBtn.onclick = () => miner.startMining();

        if (App.NANO_CLIENT) {
            this._warningPoolConnection.querySelector('#warning-pool-connection-mining-status').textContent
                = 'mining disabled';
        }

        new UpdateChecker(miner);
    }

    setState(newState) {
        let states = ['landing', 'mining'];
        states.forEach(function(state) {
            const section = document.querySelector(`#${state}Section`);
            const style = section.style;
            if (state === newState) {
                setTimeout(function() {
                    // show as soon as the other page is hidden
                    style.display = 'block';
                    section.offsetWidth; // enforce style update
                    style.opacity = 1; // fades for 1s
                }.bind(this), 1000);
            } else {
                style.opacity = 0; // fades for 1s
                setTimeout(function() {
                    style.display = 'none';
                }, 1000);
            }
        }, this);
    }

    showWarning(warning) {
        warning.style.animation = 'fade-in 1s';
        warning.classList.add('show'); // also hides less important warning via css
    }

    hideWarning(warning) {
        warning.style.animation = 'fade-out 1s forwards';
        setTimeout(() => {
            if (warning.style.animation !== 'fade-out 1s forwards') return; // was shown again in the mean time
            warning.classList.remove('show');
        }, 1000);
    }

    updateAvailable() {
        this.showWarning(this._warningUpdateAvailable);
    }

    disconnected() {
        this.showWarning(this._warningDisconnected);
        this._miningSection.classList.add('disconnected');
    }

    reconnected() {
        this.hideWarning(this._warningDisconnected);
        this._miningSection.classList.remove('disconnected');
    }

    needToSelectPool() {
        this.showWarning(this._warningSelectPool);
        this._miningSection.classList.add('need-to-select-pool');
    }

    poolSelected() {
        this.hideWarning(this._warningSelectPool);
        this._miningSection.classList.remove('need-to-select-pool');
    }

    poolMinerCantConnect() {
        this.showWarning(this._warningPoolConnection);
    }

    poolMinerCanConnect() {
        this.hideWarning(this._warningPoolConnection);
    }

    minerStopped() {
        this.showWarning(this._warningMinerStopped);
        this._toggleMinerBtn.innerText = 'Resume Mining';
    }

    minerWorking() {
        this.hideWarning(this._warningMinerStopped);
        this._toggleMinerBtn.innerText = 'Pause Mining';
    }

    get minerSettingsUi() {
        return this._minerSettingsUi;
    }

    get miningPoolsUi() {
        return this._miningPoolsUi;
    }

    _createBottomPanels(miner) {
        const minerSettingsTrigger = this._miningSection.querySelector('#my-hashrate');
        this._minerSettingsUi = new MinerSettingsUi(document.getElementById('miner-settings'), miner);
        minerSettingsTrigger.addEventListener('click', () => this._bottomPanels.show(this._minerSettingsUi.id));
        this._bottomPanels.addPanel(this._minerSettingsUi, minerSettingsTrigger);

        const blockExplorerTrigger = this._miningSection.querySelector('#mining-on-block');
        if (App.NANO_CLIENT) {
            blockExplorerTrigger.removeAttribute('trigger-fact');
            return;
        }
        this._blockExplorer = new BlockExplorerUi(document.getElementById('block-explorer'), miner.$);
        blockExplorerTrigger.addEventListener('click', () => {
            if (window.innerWidth >= BlockExplorerUi.MIN_WIDTH) {
                // on larger screens show the block explorer
                this._bottomPanels.show(this._blockExplorer.id);
            }
        });
        this._bottomPanels.addPanel(this._blockExplorer, blockExplorerTrigger);
        window.addEventListener('resize', () => {
            const currentPanel = this._bottomPanels.currentPanel;
            if (currentPanel && currentPanel.id === BlockExplorerUi.ID
                && window.innerWidth < BlockExplorerUi.MIN_WIDTH) {
                // resized the window to a smaller size. Hide the block explorer.
                this._bottomPanels.hide();
            }
        });
    }
}


class Miner {
    constructor($) {
        this.$ = $;

        this.ui = new MinerUI(this);
        this.ui.facts.address = $.miner.address;

        this.map = new MapUI($);

        this.paused = false;
    }

    connect() {
        this.$.miner.on('hashrate-changed', () => this._onHashrateChanged());
        this.$.miner.on('block-mined', () => _paq.push(['trackEvent', 'Miner', 'block-mined']));
        this.$.miner.on('start', () => this._onMinerChanged());
        this.$.miner.on('stop', () => this._onMinerChanged());
        this.$.miner.on('confirmed-balance', balance => this.ui.facts.poolBalance = balance);
        this.$.miner.on('connection-state', state => this._onPoolMinerConnectionChange(state));

        this.$.consensus.on('established', () => this._onConsensusEstablished());
        this.$.consensus.on('lost', () => this._onConsensusLost());
        this.$.consensus.on('syncing', () => this._onConsensusSyncing());

        this.$.consensus.on('sync-chain-proof', () => this._updateSyncProgress('sync-chain-proof'));
        this.$.consensus.on('verify-chain-proof', () => this._updateSyncProgress('verify-chain-proof'));
        this.$.consensus.on('sync-accounts-tree', () => this._updateSyncProgress('sync-accounts-tree'));
        this.$.consensus.on('verify-accounts-tree', () => this._updateSyncProgress('verify-accounts-tree'));
        this.$.consensus.on('sync-finalize', () => this._updateSyncProgress('sync-finalize'));

        this.$.blockchain.on('head-changed', this._onHeadChanged.bind(this));
        this.$.network.on('peers-changed', () => this._onPeersChanged());
        this.$.network.on('peer-joined', peer => this._onPeerJoined(peer));

        this.$.network.connect();

        this.threads = this.ui.minerSettingsUi.threads || this.$.miner.threads;
        if (MiningPoolsUi.isPoolMinerEnabled) {
            // Fetch the pool balance while still syncing.
            this.connectPoolMiner();
        } else if (App.NANO_CLIENT) {
            this.ui.needToSelectPool();
        }

        this.map.fadeIn();
        this.ui.setState('mining');

        this._onHeadChanged();
    }

    set threads(threadCount) {
        this.$.miner.threads = threadCount;
        this.ui.minerSettingsUi.threads = threadCount;
    }

    get hashrate() {
        return this.$.miner.hashrate;
    }

    get globalHashrate() {
        const nBits = this.$.blockchain.head.header.nBits;
        const difficulty = Nimiq.BlockUtils.compactToDifficulty(nBits);
        return difficulty * Math.pow(2, 16) / Nimiq.Policy.BLOCK_TIME;
    }

    get poolConnectionState() {
        return this.$.miner.connectionState;
    }

    get poolBalance() {
        return this.$.miner.confirmedBalance || 0;
    }

    toggleMining() {
        if (this.paused) {
            this.startMining();
        } else {
            this.stopMining();
        }
    }

    stopMining(disableRestart = true) {
        if (disableRestart) this.paused = true;
        this.$.miner.stopWork();
        this.disconnectPoolMiner(false);
        this._onMinerChanged();
    }

    startMining() {
        this.paused = false;
        if (this.ui.miningPoolsUi.isPoolMinerEnabled) {
            this.connectPoolMiner();
        }
        if (!this.$.consensus.established || (App.NANO_CLIENT && !this.$.miner.isConnected())) {
            // will pick up mining when we have consensus and for nano when we are connected to the pool.
            return;
        }
        this.$.miner.startWork();
        this._onMinerChanged();
    }

    connectPoolMiner() {
        this.ui.miningPoolsUi.isPoolMinerEnabled = true;
        this.ui.facts.poolEnabled = true;
        this.ui.poolSelected();
        if (this.$.miner.connectionState !== Nimiq.BasePoolMiner.ConnectionState.CLOSED) return;
        const { host, port } = this.ui.miningPoolsUi.settings;
        this.$.miner.connect(host, port);
    }

    disconnectPoolMiner(disablePoolMining = true) {
        if (disablePoolMining) {
            this.ui.miningPoolsUi.isPoolMinerEnabled = false;
            this.ui.facts.poolEnabled = false;
            if (App.NANO_CLIENT) this.ui.needToSelectPool();
        }
        if (this.$.miner.connectionState === Nimiq.BasePoolMiner.ConnectionState.CLOSED) return;
        this.$.miner.disconnect();
    }

    _onConsensusEstablished() {
        _paq.push(['trackEvent', 'Consensus', 'established']);

        this.ui.facts.synced = true;
        this.ui.facts.blockReward = Nimiq.Policy.blockRewardAt(this.$.blockchain.height);
        this.ui.reconnected();

        if (!this.paused) {
            this.startMining();
        }

        this._onGlobalHashrateChanged();
        this._updateBalance();
    }

    _onConsensusLost() {
        _paq.push(['trackEvent', 'Consensus', 'lost']);
        this.stopMining(false);
        this.ui.facts.synced = false;
    }

    _onConsensusSyncing() {
        this.ui.facts.synced = false;
    }

    _updateSyncProgress(state) {
        if (!this.$.consensus.established) {
            this.ui.facts.syncProgress = state;
        }
    }

    _updateTargetHeight(delay = 0) {
        if (this.$.consensus.established) {
            return;
        }
        // can update with a delay to give the blockchain time to update
        clearTimeout(this._targetHeightUpdateTimer);
        this._targetHeightUpdateTimer = setTimeout(() => {
            const targetHeight = this.$.consensus._agents.values()
                .map(agent => Math.max(agent._blockchain.height, agent._partialChain? agent._partialChain.height : 0))
                .reduce((max, current) => Math.max(max, current), 0);
            if (targetHeight && !this.$.consensus.established) {
                this.ui.facts.blockHeight = targetHeight;
            }
        }, delay);
    }

    _onPeerJoined(peer) {
        this._updateTargetHeight(150);
        if (App.NANO_CLIENT) return;
        this.$.consensus._agents.get(peer.id)._chain.on('head-changed', () => this._updateTargetHeight());
    }

    _onPeersChanged() {
        this.ui.facts.peers = this.$.network.peerCount;

        if (this.$.network.peerCount > 0) {
            this.ui.reconnected();
        } else {
            this.ui.disconnected();
        }
    }

    _onHeadChanged(_, branching) {
        this.ui.facts.blockHeight = this.$.blockchain.height;
        if (this.$.consensus.established && !branching) {
            this._onGlobalHashrateChanged();
            this.ui.facts.blockReward = Nimiq.Policy.blockRewardAt(this.$.blockchain.height);
            this._updateBalance();
        }
    }

    _onMinerChanged() {
        // checking for paused instead of miner.working as if working===false && paused===false, the miner tries
        // to start automatically and there is no point in asking the user whether he wants to resume mining
        if (!this.paused) {
            this.ui.minerWorking();
        } else {
            this.ui.minerStopped();
        }
        this._onHashrateChanged();
    }

    _onPoolMinerConnectionChange(state) {
        if (!this.ui.miningPoolsUi.isPoolMinerEnabled) return;
        if (state === Nimiq.BasePoolMiner.ConnectionState.CONNECTED) {
            this.ui.facts.poolBalance = this.poolBalance;
            this.ui.poolMinerCanConnect();
            if (!this.paused) this.startMining();
        } else if (state === Nimiq.BasePoolMiner.ConnectionState.CLOSED) {
            if (App.NANO_CLIENT) this.stopMining(false); // nano can't mine without pool
            if (this._previousPoolConnectionState === Nimiq.BasePoolMiner.ConnectionState.CONNECTING) {
                // pool connecting failed
                this.ui.poolMinerCantConnect();
            }
        }
        this._previousPoolConnectionState = state;
    }

    _onGlobalHashrateChanged() {
        this.ui.facts.globalHashrate = this.globalHashrate;
        this._onAverageBlockRewardChanged();
        this._onExpectedHashTimeChanged();
    }

    _onHashrateChanged() {
        this.ui.facts.myHashrate = this.hashrate;
        this._onAverageBlockRewardChanged();
        this._onExpectedHashTimeChanged();
    }

    _onAverageBlockRewardChanged() {
        this.ui.facts.averageBlockReward =
            Math.min(1, this.hashrate / this.globalHashrate) * Nimiq.Policy.blockRewardAt(this.$.blockchain.height);
    }

    _onExpectedHashTimeChanged() {
        const myWinProbability = this.hashrate / this.globalHashrate;
        this.ui.facts.expectedHashTime = (1 / myWinProbability) * Nimiq.Policy.BLOCK_TIME;
    }

    async _updateBalance() {
        let account;
        if (App.NANO_CLIENT) {
            account = await this.$.consensus.getAccount(this.$.miner.address);
        } else {
            account = await this.$.accounts.get(this.$.miner.address);
        }
        account = account || Nimiq.BasicAccount.INITIAL;
        this.ui.facts.myBalance = account.balance;
        const minerAccount = await App.instance.getMinerAccount();
        // show the user that he should backup his account
        this.ui.facts.accountNeedsUpgrade = account.balance > 0 && minerAccount.type === 'low';
    }
}



function checkScreenOrientation() {
    // we check the screen dimensions instead of innerWidth/innerHeight for correct behaviour when the keyboard
    // is shown on mobile
    const isLandscape = window.screen.width >= window.screen.height;
    if (isLandscape && window.innerHeight < 480) {
        document.body.classList.add('mobile-landscape');
    } else {
        document.body.classList.remove('mobile-landscape');
    }
}
window.addEventListener('resize', checkScreenOrientation);
checkScreenOrientation();

