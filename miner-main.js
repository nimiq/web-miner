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
        if (!MiningPoolsUi.isPoolMinerEnabled || balance==='off') this._poolBalance.textContent = 'Off';
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

    set disconnected(disconnected) {
        if (disconnected) {
            this._miningSection.classList.add('disconnected');
        } else {
            this._miningSection.classList.remove('disconnected');
        }
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

        this._toggleMinerBtn = document.querySelector('#toggleMinerBtn');
        this._toggleMinerBtn.onclick = () => miner.toggleMining();

        this.facts = new FactsUI();
        this._bottomPanels = new BottomPanels(document.querySelector('#bottom-panels'));
        this._createBottomPanels(miner);

        this._miningPoolsUi = new MiningPoolsUi(document.querySelector('#mining-pools'), this.miner);
        document.querySelector('#pool-miner').addEventListener('click', () => this._miningPoolsUi.show());

        this._warningMinerStopped = document.querySelector('#warning-miner-stopped');
        this._warningDisconnected = document.querySelector('#warning-disconnected');
        this._warningPoolConnection = document.querySelector('#warning-pool-connection');

        const resumeMinerBtn = document.querySelector('#resumeMinerBtn');
        resumeMinerBtn.onclick = () => miner.startMining();

        const reconnectBtn = document.querySelector('#reconnectBtn');
        reconnectBtn.onclick = () => {
            // XXX HACK!!!!!!!!!!!!!!!!!!
            miner.$.network._connectingCount = 0;
            miner.$.network.connect();
        };

        const switchToSoloMiningButton = document.querySelector('#warning-pool-connection-switch-solo');
        switchToSoloMiningButton.onclick = () => miner.setCurrentMiner(miner.soloMiner);

        new UpdateChecker(miner);
    }

    setState(newState) {
        let states = ['landing', 'loading', 'mining'];
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

    minerStopped() {
        this._toggleMinerBtn.innerText = 'Resume Mining';
        this.facts.myHashrate = 0;
        this.facts.averageBlockReward = 0;
        this.facts.expectedHashTime = Number.POSITIVE_INFINITY;
        if (this._warningPoolConnection.style.opacity === '1' || this._warningDisconnected.style.opacity === '1') return;
        this._warningMinerStopped.style.display = 'block';
        this._warningMinerStopped.offsetWidth; // enforce style update
        this._warningMinerStopped.style.opacity = 1;
        clearTimeout(this._minerWarningTimeout);
    }

    minerWorking() {
        this._toggleMinerBtn.innerText = 'Pause Mining';
        this._warningMinerStopped.style.opacity = 0;
        clearTimeout(this._minerWarningTimeout);
        this._minerWarningTimeout = setTimeout(() => {
            this._warningMinerStopped.style.display = 'none';
        }, 1000);
    }

    hideMinerStoppedWarning() {
        this._warningMinerStopped.style.display = 'none';
        this._warningMinerStopped.style.opacity = 0;
    }

    poolMinerCantConnect() {
        if (this._warningDisconnected.style.opacity === '1') return;
        this.hideMinerStoppedWarning();
        this._warningPoolConnection.style.display = 'block';
        this._warningPoolConnection.offsetWidth; // enforce style update
        this._warningPoolConnection.style.opacity = 1;
        clearTimeout(this._poolMinerWarningTimeout);
    }

    poolMinerCanConnect() {
        this._warningPoolConnection.style.opacity = 0;
        this._poolMinerWarningTimeout = setTimeout(() => {
            this._warningPoolConnection.style.display = 'none';
            if (this.miner.paused) {
                this.minerStopped(); // show miner stopped warning
            }
        }, 1000);
    }

    hidePoolMinerConnectionWarning() {
        this._warningPoolConnection.style.display = 'none';
        this._warningPoolConnection.style.opacity = 0;
    }
    
    disconnected() {
        this.hideMinerStoppedWarning();
        this.hidePoolMinerConnectionWarning();
        this._warningDisconnected.style.display = 'block';
        this._warningDisconnected.offsetWidth; // enforce style update
        this._warningDisconnected.style.opacity = 1;
        this.facts.disconnected = true;
        clearTimeout(this._disconnectWarningTimeout);
    }
    
    reconnected() {
        this._warningDisconnected.style.opacity = 0;
        this._disconnectWarningTimeout = setTimeout(() => {
            this._warningDisconnected.style.display = 'none';
            if (this.miner.paused) {
                this.minerStopped(); // show miner stopped warning
            }
        }, 1000);
        this.facts.disconnected = false;
    }

    get blockExplorer() {
        return this._blockExplorer;
    }

    get minerSettingsUi() {
        return this._minerSettingsUi;
    }

    get miningPoolsUi() {
        return this._miningPoolsUi;
    }

    _createBottomPanels(miner) {
        const blockExplorerTrigger = document.getElementById('mining-on-block');
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

        const minerSettingsTrigger = document.getElementById('my-hashrate');
        this._minerSettingsUi = new MinerSettingsUi(document.getElementById('miner-settings'), miner);
        minerSettingsTrigger.addEventListener('click', () => this._bottomPanels.show(this._minerSettingsUi.id));
        this._bottomPanels.addPanel(this._minerSettingsUi, minerSettingsTrigger);
    }
}


class Miner {
    constructor($) {
        this.$ = $;

        this.ui = new MinerUI(this);
        this.ui.facts.address = $.address;

        this.map = new MapUI($);

        this.paused = false;
    }

    connect() {
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

        this.setCurrentMiner();
        this.threads = this.threads || this._currentMiner.threads;

        this.$.network.connect();

        this.map.fadeIn();
        this.ui.setState('mining');

        this._onHeadChanged();
    }

    set threads(threadCount) {
        if (this._currentMiner) this._currentMiner.threads = threadCount;
        this.ui.minerSettingsUi.threads = threadCount;
    }

    get threads() {
        return this.ui.minerSettingsUi.threads;
    }

    get hashrate() {
        return this._currentMiner.hashrate;
    }

    get globalHashrate() {
        const nBits = this.$.blockchain.head.header.nBits;
        const difficulty = Nimiq.BlockUtils.compactToDifficulty(nBits);
        return difficulty * Math.pow(2, 16) / Nimiq.Policy.BLOCK_TIME;
    }

    get soloMiner() {
        if (this._soloMiner) return this._soloMiner;
        // instantiate miner lazily only when needed as the simultaneous instantiation of solo miner crashes the
        // browser tab under certain circumstances due to too many worker threads (e.g. on high thread count or when
        // both miners instantiated at the same time as the connect call)
        this._soloMiner = new Nimiq.Miner(this.$.blockchain, this.$.accounts, this.$.mempool, this.$.network.time,
            this.$.address);
        console.log('Solo Miner instantiated');
        this._soloMiner.on('block-mined', () => _paq.push(['trackEvent', 'Miner', 'block-mined']));
        this._soloMiner.on('hashrate-changed', () => this._onHashrateChanged());
        this._soloMiner.on('start', () => this._onMinerChanged());
        this._soloMiner.on('stop', () => this._onMinerChanged());
        return this._soloMiner;
    }

    get poolMiner() {
        if (this._poolMiner) return this._poolMiner;
        this._poolMiner = new Nimiq.SmartPoolMiner(this.$.blockchain, this.$.accounts, this.$.mempool,
            this.$.network.time, this.$.address, Nimiq.BasePoolMiner.generateDeviceId(this.$.network.config));
        console.log('Pool Miner instantiated');
        this._poolMiner.on('hashrate-changed', () => this._onHashrateChanged());
        this._poolMiner.on('start', () => this._onMinerChanged());
        this._poolMiner.on('stop', () => this._onMinerChanged());
        this._poolMiner.on('confirmed-balance', balance => this.ui.facts.poolBalance = balance);
        this._poolMiner.on('connection-state', state => this._onPoolMinerConnectionChange(state));
        return this._poolMiner;
    }

    get isPoolMinerInstantiated() {
        return !!this._poolMiner;
    }

    setCurrentMiner(miner = null) {
        if (miner) {
            this.ui.miningPoolsUi.isPoolMinerEnabled = miner instanceof Nimiq.BasePoolMiner;
        } else {
            miner = this.ui.miningPoolsUi.isPoolMinerEnabled? this.poolMiner : this.soloMiner;
        }
        if (miner === this._currentMiner) return;

        if (this._currentMiner) {
            this.stopMining(false);
            if (this._currentMiner instanceof Nimiq.BasePoolMiner) {
                this.ui.facts.poolBalance = 'off';
                this.ui.hidePoolMinerConnectionWarning();
            }
        }

        this._currentMiner = miner;

        if (!this.paused) {
            this.startMining();
            if (this._currentMiner instanceof Nimiq.BasePoolMiner) {
                // already manually connect to pool in the case that mining doesn't start when not synced yet
                this.connectPoolMiner();
            }
        } else {
            this.stopMining(false);
        }

        this.ui.facts.poolEnabled = this._currentMiner instanceof Nimiq.BasePoolMiner;
    }

    toggleMining() {
        if (!this.paused) {
            this.stopMining();
        } else {
            this.startMining();
        }
    }

    stopMining(disableRestart = true) {
        if (disableRestart) this.paused = true;
        this._currentMiner.stopWork();
        this._currentMiner.threads = 0;
        if (this._currentMiner instanceof Nimiq.BasePoolMiner) {
            this.disconnectPoolMiner();
        }
        this._onMinerChanged();
    }

    startMining() {
        this.paused = false;
        if (!this.$.consensus.established) return; // will pick up mining when we have consensus
        this._currentMiner.threads = this.threads || this._currentMiner.threads;
        if (this._currentMiner instanceof Nimiq.BasePoolMiner) {
            this._startPoolMiner();
        } else {
            this._currentMiner.startWork();
        }
        this._onMinerChanged();
    }

    _startPoolMiner() {
        if (this.poolMiner.connectionState === Nimiq.BasePoolMiner.ConnectionState.CONNECTED) {
            this.poolMiner.startWork();
            return;
        }

        // still connecting or disconnected
        const connectionListenerId = this.poolMiner.on('connection-state', connectionState => {
            if (connectionState === Nimiq.BasePoolMiner.ConnectionState.CONNECTING) return;
            // connection established or closed again
            this.poolMiner.off('connection-state', connectionListenerId);
            if (connectionState === Nimiq.BasePoolMiner.ConnectionState.CONNECTED
                && !this.paused && this._currentMiner === this.poolMiner) {
                this.poolMiner.startWork();
            }
        });

        this.connectPoolMiner();
    }

    connectPoolMiner() {
        if (this.poolMiner.connectionState !== Nimiq.BasePoolMiner.ConnectionState.CLOSED) return;
        const { host, port } = this.ui.miningPoolsUi.settings;
        this.poolMiner.connect(host, port);
    }

    disconnectPoolMiner(onlyWhenNotMining = false) {
        if (!this.isPoolMinerInstantiated
            || this.poolMiner.connectionState === Nimiq.BasePoolMiner.ConnectionState.CLOSED
            || onlyWhenNotMining && !this.paused) return;
        this.poolMiner.disconnect();
    }

    _onConsensusEstablished() {
        _paq.push(['trackEvent', 'Consensus', 'established']);
        this.$.accounts.get(this.$.address)
            .then(account => this._onBalanceChanged(account));

        this.ui.facts.synced = true;
        this.ui.facts.blockReward = Nimiq.Policy.blockRewardAt(this.$.blockchain.height);
        this.ui.reconnected();

        if (!this.paused) {
            this.startMining();
        }

        this._onGlobalHashrateChanged();
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
            this.$.accounts.get(this.$.address)
                .then(account => this._onBalanceChanged(account));
        }
    }

    _onMinerChanged() {
        // checking for paused instead of _currentMiner.working as if working===false && paused===false, the miner tries
        // to start automatically and there is no point in asking the user whether he wants to resume mining
        if (!this.paused) {
            this.ui.minerWorking();
        } else {
            this.ui.minerStopped();
        }
    }

    _onPoolMinerConnectionChange(state) {
        if (state === Nimiq.BasePoolMiner.ConnectionState.CONNECTED) {
            this.ui.facts.poolBalance = this.poolMiner.confirmedBalance || 0;
            this.ui.poolMinerCanConnect();
        } else if (state === Nimiq.BasePoolMiner.ConnectionState.CLOSED
            && this._currentMiner === this.poolMiner
            && this._previousPoolConnectionState === Nimiq.BasePoolMiner.ConnectionState.CONNECTING) {
            // connecting failed
            this.ui.facts.myHashrate = 0;
            this.ui.poolMinerCantConnect();
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
        if (!this.ui.miningPoolsUi.isPoolMinerEnabled) return;
        this.ui.facts.averageBlockReward =
            Math.min(1, this.hashrate / this.globalHashrate) * Nimiq.Policy.blockRewardAt(this.$.blockchain.height);
    }

    _onExpectedHashTimeChanged() {
        if (this.ui.miningPoolsUi.isPoolMinerEnabled) return;
        const myWinProbability = this.hashrate / this.globalHashrate;
        this.ui.facts.expectedHashTime = (1 / myWinProbability) * Nimiq.Policy.BLOCK_TIME;
    }

    async _onBalanceChanged(account) {
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

