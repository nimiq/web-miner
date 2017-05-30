class FactsUI {
    constructor() {
        this._peers = document.getElementById('factPeers');
        this._blockHeight = document.getElementById('factBlockHeight');
        this._globalHashrate = document.getElementById('factGlobalHashrate');
        this._expectedHashTime = document.getElementById('factExpectedHashTime');
        this._myHashrate = document.getElementById('factMyHashrate');
        this._myBalance = document.getElementById('factBalance');
        this._blockProcessingState = document.getElementById('factBlockProcessingState');
        this._consensusProgress = document.getElementById('progress');
    }

    set peers(peers) {
        this._peers.innerHTML = peers;
    }

    set blockHeight(height) {
        this._blockHeight.innerHTML = height;
    }

    set myHashrate(hashrate){
    	this._myHashrate.innerHTML = (hashrate/1000).toFixed(2);
    }

    set globalHashrate(hashrate){
    	this._globalHashrate.innerHTML = (hashrate/1000).toFixed(2);
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
        for (var i=0; i<timesteps.length; ++i) {
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
    	this._myBalance.innerHTML = (balance/1e8).toFixed(2);
    }

    set syncReady(isSyncReady) {
        if (isSyncReady) {
            this._blockProcessingState.textContent = "Mining on";
            this._consensusProgress.textContent = "Consensus Established";
            this._consensusProgress.classList.add('ready');
        } else {
            this._blockProcessingState.textContent = "Downloading";
            this._consensusProgress.textContent = "Synchronizing"
            this._consensusProgress.classList.remove('ready');
            this._consensusProgress.style.opacity = 1;
        }
    }
}

class MinerUI {
    constructor() {
        this.connBtn = document.getElementById('connBtn');
        this.facts = new FactsUI();
    }
}



class NimiqMiner {
    constructor($) {
        this.ui = new MinerUI();
        this.ui.connBtn.onclick = e => this._connect($);
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
        return difficulty * 2**16 / 30;
    }

    _onConsensus() {
        this.$.accounts.getBalance(this.$.wallet.address)
            .then(balance => this._onBalanceChanged(balance))
        this.$.accounts.on(this.$.wallet.address, balance => this._onBalanceChanged(balance))
        this.$.miner.startWork();
        this.ui.facts.syncReady = true;
    }

    _peersChanged() {
        const peers = this.$.network.peerCount;
        this.ui.facts.peers = peers;
    }

    _onSyncing(targetHeight) {
        this._targetHeight = targetHeight;
        this.ui.facts.syncReady = false;
    }

    _onHeadChanged() {
        const height = this.$.blockchain.height;
        this.ui.facts.blockHeight = height;
        //this.setSyncProgress(height / this._targetHeight);
        this._globalHashrateChanged();
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
        this._setState('loading');
        this._setState('mining');
        this._initCore($)
    }

    _setState(state) {
        document.body.removeAttribute('landing', 0)
        document.body.removeAttribute('loading', 0)
        document.body.removeAttribute('mining', 0)
        document.body.setAttribute(state, 1)
    }
}

Core.init($ => new NimiqMiner($));
