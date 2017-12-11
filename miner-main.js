class FactsUI {
    constructor() {
        this._peers = document.getElementById('factPeers');
        this._blockHeight = document.getElementById('factBlockHeight');
        this._myHashrate = document.getElementById('factMyHashrate');
        this._myHashrateUnit = document.getElementById('factMyHashrateUnit');
        this._globalHashrate = document.getElementById('factGlobalHashrate');
        this._globalHashrateUnit = document.getElementById('factGlobalHashrateUnit');
        this._myBalance = document.getElementById('factBalance');
        this._expectedHashTime = document.getElementById('factExpectedHashTime');
        this._blockReward = document.getElementById('factBlockReward');
        this._blockProcessingState = document.getElementById('factBlockProcessingState');
        this._consensusProgress = document.getElementById('progress');
        this._miningSection = document.getElementById('miningSection');
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

    set expectedHashTime(expectedHashTime) {
        if (!expectedHashTime || !Number.isFinite(expectedHashTime)) {
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
        this._blockReward.textContent = Nimiq.Policy.satoshisToCoins(satoshis).toFixed(2);
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
}

class MinerUI {
    constructor(miner) {
        this.miner = miner;

        this._loadingSpinner = document.querySelector('#initialLoadingSpinner');

        this._connectBtn = document.querySelector('#connectBtn');
        this._connectBtn.onclick = () => miner.connect();

        this._toggleMinerBtn = document.querySelector('#toggleMinerBtn');
        this._toggleMinerBtn.onclick = () => miner.toggleMining();

        // this._miningAnimation = document.querySelector('#miningAnimation');
        this._miningAnimationStarted = false;

        this.facts = new FactsUI();
        this._bottomPanels = new BottomPanels(document.querySelector('#bottom-panels'));

        const resumeMinerBtn = document.querySelector('#resumeMinerBtn');
        resumeMinerBtn.onclick = () => miner.toggleMining();

        new UpdateChecker(miner.$.miner);
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

    enableConnectButton() {
        // we won't need the spinner anymore
        this._loadingSpinner.parentElement.removeChild(this._loadingSpinner);
        this._loadingSpinner = null;
        this._connectBtn.style.display = 'inline-block';
    }

    minerStopped() {
        this._toggleMinerBtn.innerText = 'Resume Mining';
        //this._miningAnimation.pauseAnimations();
    }

    minerWorking() {
        this._toggleMinerBtn.innerText = 'Pause Mining';
        if (!this._miningAnimationStarted) {
            //document.querySelector('#circleanimate').beginElement();
            this._miningAnimationStarted = true;
        } else {
            //this._miningAnimation.unpauseAnimations();
        }
    }

    createBottomPanels(blockchain, miner) {
        const blockExplorerTrigger = document.getElementById('mining-on-block');
        const blockExplorer = new BlockExplorerUi(document.getElementById('block-explorer'), blockchain);
        blockExplorerTrigger.addEventListener('click', () => {
            if (window.innerWidth >= BlockExplorerUi.MIN_WIDTH) {
                // on larger screens show the block explorer
                this._bottomPanels.show(blockExplorer.id);
            }
        });
        this._bottomPanels.addPanel(blockExplorer, blockExplorerTrigger);
        window.addEventListener('resize', () => {
            const currentPanel = this._bottomPanels.currentPanel;
            if (currentPanel && currentPanel.id === BlockExplorerUi.ID
                && window.innerWidth < BlockExplorerUi.MIN_WIDTH) {
                // resized the window to a smaller size. Hide the block explorer.
                this._bottomPanels.hide();
            }
        });

        const minerSettingsTrigger = document.getElementById('my-hashrate');
        const minerSettings = new MinerSettingsUi(document.getElementById('miner-settings'), miner);
        minerSettingsTrigger.addEventListener('click', () => this._bottomPanels.show(minerSettings.id));
        this._bottomPanels.addPanel(minerSettings, minerSettingsTrigger);
    }
}


class Miner {
    constructor($) {
        this.$ = $;

        this.ui = new MinerUI(this);
        this.ui.enableConnectButton();
        this._hadConsensusBefore = false;

        this.map = new MapUI($);

        this.paused = false;

        this._warningMinerStopped = document.querySelector('#warning-miner-stopped');
        this._warningConsensusLost = document.querySelector('#warning-consensus-lost');

        const reconnectBtn = document.querySelector('#reconnectBtn');
        reconnectBtn.onclick = () => {
            // XXX HACK!!!!!!!!!!!!!!!!!!
            this.$.network._connectingCount = 0;
            this.$.network.connect();
        }
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

        this.$.miner.on('hashrate-changed', () => this._onHashrateChanged());
        this.$.miner.on('start', () => this._onMinerChanged());
        this.$.miner.on('stop', () => this._onMinerChanged());

        this.$.network.connect();

        this.map.fadeIn();
        this.ui.setState('mining');

        this._onHeadChanged();
    }

    toggleMining() {
        if (this.$.miner.working) {
            this.paused = true;
            this.$.miner.stopWork();
            this._warningMinerStopped.style.display = 'block';
            this._warningMinerStopped.offsetWidth; // enforce style update
            this._warningMinerStopped.style.opacity = 1;
        } else if (this.$.consensus.established) {
            this.paused = false;
            this.$.miner.startWork();
            this._warningMinerStopped.style.opacity = 0;
            setTimeout(() => {
                this._warningMinerStopped.style.display = 'none';
            }, 1000);
        }
    }

    get hashrate() {
        return this.$.miner.hashrate;
    }

    get globalHashrate() {
        const nBits = this.$.blockchain.head.header.nBits;
        const difficulty = Nimiq.BlockUtils.compactToDifficulty(nBits);
        return difficulty * Math.pow(2, 16) / Nimiq.Policy.BLOCK_TIME;
    }

    _onConsensusEstablished() {
        _paq.push(['trackEvent', 'Consensus', 'established']);
        this.$.accounts.get(this.$.wallet.address)
            .then(account => this._onBalanceChanged(account));

        this.ui.facts.synced = true;
        this._warningConsensusLost.style.display = 'none';

        if (!this.paused) {
            this.$.miner.startWork();
        }

        this._onGlobalHashrateChanged();

        if (!this._hadConsensusBefore) {
            this.ui.createBottomPanels(this.$.blockchain, this.$.miner);
        }
        this._hadConsensusBefore = true;
    }

    _onConsensusLost() {
        _paq.push(['trackEvent', 'Consensus', 'lost']);
        this.$.miner.stopWork();
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
            if (this._warningConsensusLost.style.display === 'block') {
                this._warningConsensusLost.style.opacity = 0;
                setTimeout(() => {
                    this._warningConsensusLost.style.display = 'none';
                }, 1000);

                if (this.paused) {
                    this._warningMinerStopped.style.display = 'block';
                    this._warningMinerStopped.offsetWidth; // enforce style update
                    this._warningMinerStopped.style.opacity = 1;
                }
            }
        } else {
            this._warningMinerStopped.style.display = 'none';
            this._warningConsensusLost.style.display = 'block';
            this._warningConsensusLost.offsetWidth; // enforce style update
            this._warningConsensusLost.style.opacity = 1;
        }
    }

    _onHeadChanged(_, branching) {
        this.ui.facts.blockHeight = this.$.blockchain.height;
        if (this.$.consensus.established && !branching) {
            this._onGlobalHashrateChanged();
            this.ui.facts.blockReward = Nimiq.Policy.blockRewardAt(this.$.blockchain.height);
            this.$.accounts.get(this.$.wallet.address)
                .then(account => this._onBalanceChanged(account));
        }
    }

    _onMinerChanged() {
        if (this.$.miner.working) {
            this.ui.minerWorking();
        } else {
            this.ui.minerStopped();
            this.ui.facts.myHashrate = 0;
            this.ui.facts.expectedHashTime = null;
        }
    }

    _onGlobalHashrateChanged() {
        this.ui.facts.globalHashrate = this.globalHashrate;
        this._onExpectedHashTimeChanged();
    }

    _onHashrateChanged() {
        this.ui.facts.myHashrate = this.hashrate;
        this._onExpectedHashTimeChanged();
    }

    _onExpectedHashTimeChanged() {
        const myWinProbability = this.hashrate / this.globalHashrate;
        this.ui.facts.expectedHashTime = (1 / myWinProbability) * Nimiq.Policy.BLOCK_TIME;
    }

    _onBalanceChanged(account) {
        account = account || Nimiq.BasicAccount.INITIAL;
        this.ui.facts.myBalance = account.balance;
    }
}

(() => {
    let triedDatabaseReset = false;
    function tryResetDatabaseAndInit() {
        if (triedDatabaseReset) {
            // it didn't work out, the error reappears
            document.getElementById('landingSection').classList.add('warning');
            document.getElementById('warning-general-error').style.display = 'block';
        } else {
            console.warn('Resetting the database.');
            triedDatabaseReset = true;
            Nimiq.ConsensusDB.getLight().then(jdb => {
                const accounts = jdb.getObjectStore('Accounts');
                const chain = jdb.getObjectStore('ChainData');
                return Promise.all([accounts.truncate(), chain.truncate()]);
            }).then(initNimiq, e => {
                console.error(e);
                document.getElementById('landingSection').classList.add('warning');
                document.getElementById('warning-database-access').style.display = 'block';
            });
        }
    }

    // Initialize Nimiq Core.
    function initNimiq() {
        Nimiq.init(() => {
            document.getElementById('landingSection').classList.remove('warning');
            document.getElementById('warning-multiple-tabs').style.display = 'none';
            const $ = {};

            Nimiq.Consensus.light().then(consensus => {
                $.consensus = consensus;
                // XXX Legacy API
                $.blockchain = $.consensus.blockchain;
                $.accounts = $.blockchain.accounts;
                $.mempool = $.consensus.mempool;
                $.network = $.consensus.network;

                return Nimiq.Wallet.getPersistent();
            }).then(wallet => {
                // XXX Legacy components
                $.wallet = wallet;
                $.miner = new Nimiq.Miner($.blockchain, $.mempool, $.wallet.address);
                $.miner.on('block-mined', (block) => _paq.push(['trackEvent', 'Miner', 'block-mined']));

                window.$ = $;
                window.Miner = new Miner($);
                window.Wallet = new WalletUI($);
            }).catch(e => {
                console.error(e);
                tryResetDatabaseAndInit();
            });
        }, function(error) {
            document.getElementById('landingSection').classList.add('warning');
            if (error === Nimiq.ERR_WAIT) {
                document.getElementById('warning-multiple-tabs').style.display = 'block';
            } else if (error === Nimiq.ERR_UNSUPPORTED) {
                document.getElementById('warning-old-browser').style.display = 'block';
            } else {
                tryResetDatabaseAndInit();
            }
        });
    }

    initNimiq();
})();

function checkScreenOrientation() {
    // we check the screen dimensions instead of innerWidth/innerHeight for correct behaviour when the keyboard
    // is shown on mobile
    var isLandscape = window.screen.width >= window.screen.height;
    if (isLandscape && window.innerHeight < 540) {
        document.body.classList.add('mobile-landscape');
    } else {
        document.body.classList.remove('mobile-landscape');
    }
}
window.addEventListener('resize', checkScreenOrientation);
checkScreenOrientation();

