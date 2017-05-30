class FactsUI {
    constructor() {
        this._peers = document.getElementById('factPeers');
        this._blockHeight = document.getElementById('factBlockHeight');
        this._globalHashrate = document.getElementById('factGlobalHashrate');
        this._myHashrate = document.getElementById('factMyHashrate');
        this._myBalance = document.getElementById('factBalance');
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

    set myBalance(balance){
    	this._myBalance.innerHTML = (balance/1e8).toFixed(2);
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

    _onConsensus() {
        this.$.accounts.getBalance(this.$.wallet.address)
            .then(balance => this._onBalanceChanged(balance))
        this.$.accounts.on(this.$.wallet.address, balance => this._onBalanceChanged(balance))
        this.$.miner.startWork();
    }

    _peersChanged() {
        const peers = this.$.network.peerCount;
        this.ui.facts.peers = peers;
    }

    _onSyncing(targetHeight) {
        this._targetHeight = targetHeight;
    }

    _onHeadChanged() {
        const height = this.$.blockchain.height;
        this.ui.facts.blockHeight = height;
        //this.setSyncProgress(height / this._targetHeight);
        this._globalHashrateChanged();
    }

    _globalHashrateChanged(){
    	const nBits = this.$.blockchain.head.header.nBits;
    	const difficulty = BlockUtils.compactToDifficulty(nBits);
    	const hashrate = difficulty * 2**16 / 30;
    	this.ui.facts.globalHashrate = hashrate;
    }

    _myHashrateChanged(){
    	const hashrate = this.$.miner.hashrate;
    	this.ui.facts.myHashrate = hashrate;
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
