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
        this._blockProcessingState = document.getElementById('factBlockProcessingState');
        this._consensusProgress = document.getElementById('progress');
        this._miningSection = document.getElementById('miningSctn');
    }

    set peers(peers) {
        this._peers.textContent = peers;
    }

    set blockHeight(height) {
        this._blockHeight.textContent = height;
    }

    set myHashrate(hashrate){
        this._setHashrate(hashrate, 'my');
    }

    set globalHashrate(hashrate){
        this._setHashrate(hashrate, 'global');
    }

    set expectedHashTime(expectedHashTime) {
        if (!Number.isFinite(expectedHashTime)) {
            return;
        }
        // the time is given in seconds. Convert it to an appropriate base unit:
        let timesteps = [{unit:'minutes', factor:60}, {unit:'hours', factor:60}, {unit:'days', factor:24},
            {unit:'months', factor:365/12}, {unit:'years', factor:12}, {unit:'decades', factor:10}];
        let convertedTime = expectedHashTime;
        let unit = 'seconds';
        for (let i=0; i<timesteps.length; ++i) {
            let timestep = timesteps[i];
            if (convertedTime / timestep.factor < 1) {
                break;
            } else {
                convertedTime /= timestep.factor;
                unit = timestep.unit;
            }
        }
        this._expectedHashTime.textContent = convertedTime.toFixed(1)+' '+unit;
    }

    set myBalance(balance) {
        this._myBalance.textContent = Policy.satoshisToCoins(balance).toFixed(2);
    }

    set syncing(isSyncing) {
        if (isSyncing) {
            this._blockProcessingState.textContent = "Fetching";
            this._consensusProgress.textContent = "Synchronizing";
            this._miningSection.classList.remove('synced');
            this._miningSection.offsetWidth; // enforce an update
            this._miningSection.classList.add('syncing');      
        } else {
            this._blockProcessingState.textContent = "Mining on";
            this._miningSection.classList.remove('syncing');
            this._miningSection.offsetWidth; // enforce an update
            this._miningSection.classList.add('synced');
            setTimeout(function() {
                // change the text when the _consensusProgress is faded out by the synced class
                this._consensusProgress.textContent = "Consensus Established";
            }.bind(this), 1000);
        }
    }

    _setHashrate(hashrate, type) {
        let steps = ['k', 'M', 'G', 'T', 'P', 'E']; // kilo, mega, giga, tera, peta, exa
        let prefix = '';
        for (let i=0, step; step=steps[i]; ++i) {
            if (hashrate / 1000 < 1) {
                break;
            } else {
                hashrate /= 1000;
                prefix = step;
            }
        }
        let unit = prefix+'H/s';
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
    constructor() {
        this.connBtn = document.getElementById('connBtn');
        this._progressBar = document.getElementById('progressBar');
        this.facts = new FactsUI();
        this._sections = {
            'landing': document.getElementById("landingSctn"),
            'mining': document.getElementById("miningSctn")
        };
    }

    setState(newState) {
        let states = ['landing', 'mining'];
        states.forEach(function(state) {
            let style = this._sections[state].style;
            if (state === newState) {
                setTimeout(function() {
                    // show as soon as the other page is hidden
                    style.display = 'flex';
                    this._sections[state].offsetWidth; // enforce style update
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

    set syncProgress(progress) {
        this._progressBar.style.transform = 'scaleX('+Math.min(1, progress)+') translateZ(0)';
    }
}



class NimiqMiner {
    constructor($) {
        this.ui = new MinerUI();
        this.ui.connBtn.onclick = e => this._connect($);
        this.syncing = true;
    }

    _initCore($) {
        this.$ = $;
        $.consensus.on('established', _ => this._onConsensus())
        $.consensus.on('syncing', _targetHeight => this._onSyncing(_targetHeight));
        $.blockchain.on('head-changed', _ => this._onHeadChanged());
        $.network.on('peers-changed', () => this._peersChanged());
        $.miner.on('hashrate-changed', () => this._myHashrateChanged());
        setInterval(() => this._peersChanged(), 2500);

        $.network.connect();
        this._onHeadChanged();
    }

    get hashrate() {
        return this.$.miner.hashrate;
    }

    get globalHashrate() {
        const nBits = this.$.blockchain.head.header.nBits;
        const difficulty = BlockUtils.compactToDifficulty(nBits);
        return difficulty * 2**16 / Policy.BLOCK_TIME;
    }

    _onConsensus() {
        // TODO the core can switch between syncing and consensus multiple times, so this method
        // can be called multiple times
        this.$.accounts.getBalance(this.$.wallet.address)
            .then(balance => this._onBalanceChanged(balance))
        this.$.accounts.on(this.$.wallet.address, balance => this._onBalanceChanged(balance))
        this.$.miner.startWork();
        this.ui.facts.syncing = false;
        this.syncing = false;
        this._globalHashrateChanged();
    }

    _peersChanged() {
        const peers = this.$.network.peerCount;
        this.ui.facts.peers = peers;
    }

    _onSyncing(targetHeight) {
        this._targetHeight = targetHeight;
        this.ui.facts.syncing = true;
        this.syncing = true;
    }

    _onHeadChanged() {
        const height = this.$.blockchain.height;
        this.ui.facts.blockHeight = height;
        if (this.syncing) {
            this.ui.syncProgress = height / this._targetHeight;
        } else {
            this._globalHashrateChanged();
        }
    }

    _globalHashrateChanged(){
        this.ui.facts.globalHashrate = this.globalHashrate;
        this._expectedHashTimeChanged();
    }

    _myHashrateChanged(){
        this.ui.facts.myHashrate = this.hashrate;
        this._expectedHashTimeChanged();
    }

    _expectedHashTimeChanged() {
        let myWinProbability = this.hashrate / this.globalHashrate;
        this.ui.facts.expectedHashTime = (1/myWinProbability) * Policy.BLOCK_TIME;
    }

    _onBalanceChanged(balance){
        const myBalance = balance.value;
        this.ui.facts.myBalance = myBalance; 
    }

    _connect($) {
        this.ui.setState('mining');
        this._initCore($)
    }
}

Core.init($ => new NimiqMiner($));
