'use strict';

function isEs6Supported() {
    if (typeof Symbol === "undefined") return false;
    try {
        eval("class Foo {}");
        eval("var bar = (x) => x+1");
    } catch (e) {
        return false;
    }
    return true;
}

// check whether this UI code can be executed by the browser
if (!isEs6Supported()) {
    document.getElementById('warning-old-browser').style.display = 'block';
}

window.isMobile = (function (userAgent) {
    if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od|ad)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(userAgent)
        || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(userAgent.substr(0, 4)))
        return true;
    else
        return false;
})((navigator.userAgent || navigator.vendor || window.opera).toLowerCase());

if (!window.isMobile) {
    // load the background as video
    var iframe = document.createElement('iframe');
    iframe.src = "https://www.youtube.com/embed/_fL-HXjm5fA?rel=0&controls=0&showinfo=0&autoplay=1&loop=1&playlist=_fL-HXjm5fA";
    iframe.setAttribute('frameborder', 0);
    iframe.classList.add('background-video');
    document.body.appendChild(iframe);

    setTimeout(function() {
        // fade it in when it got some time to load up
        iframe.style.opacity = 1;
    }, 3000);
}

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
            console.log('synchronization state: syncing');
            this._blockProcessingState.textContent = "Fetching";
            this._consensusProgress.textContent = "Synchronizing";
            this._miningSection.classList.remove('synced');
            this._miningSection.offsetWidth; // enforce an update
            this._miningSection.classList.add('syncing');      
        } else {
            console.log('synchronization state: synced');
            this._blockProcessingState.textContent = "Mining on";
            this._miningSection.classList.remove('syncing');
            this._miningSection.offsetWidth; // enforce an update
            this._miningSection.classList.add('synced');
            setTimeout(function() {
                // change the text when the _consensusProgress is faded out by the synced class
                this._consensusProgress.textContent = "Consensus Established";
            }.bind(this), 1500);
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
                    style.display = 'block';
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

    enableConnectButton() {
        this.connBtn.style.display = 'inline-block';
    }
}



class NimiqMiner {
    constructor($) {
        this.ui = new MinerUI();
        this.ui.connBtn.onclick = e => this._connect($);
        this.ui.enableConnectButton();
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
        return difficulty * Math.pow(2, 16) / Policy.BLOCK_TIME;
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
        this.ui.syncProgress = 1;
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


Nimiq.init($ => {
    // when all other tabs are closed, the succes case gets invoked
    document.getElementById('warning-multiple-tabs').style.display = 'none';
    new NimiqMiner($);
}, function(error) {
    if (error === Nimiq.ERR_WAIT) {
        document.getElementById('warning-multiple-tabs').style.display = 'block';
    } else if (error === Nimiq.ERR_UNSUPPORTED) {
        document.getElementById('warning-old-browser').style.display = 'block';
    } else {
        document.getElementById('warning-general-error').style.display = 'block';
    }
});