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
        this._miningSection = document.getElementById('miningSection');
    }

    set peers(peers) {
        this._peers.textContent = peers;
    }

    set blockHeight(height) {
        this._blockHeight.textContent = (height+1);
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
                this._consensusProgress.textContent = "Consensus established";
            }.bind(this), 1500);
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
}

class MinerUI {
    constructor(miner) {
        this.miner = miner;

        this._loadingSpinner = document.querySelector('#initialLoadingSpinner');

        this._connectBtn = document.querySelector('#connectBtn');
        this._connectBtn.onclick = () => miner.connect();

        this._toggleMinerBtn = document.querySelector('#toggleMinerBtn');
        this._toggleMinerBtn.onclick = () => miner.toggleMining();

        this._miningAnimation = document.querySelector('#miningAnimation');
        this._miningAnimationStarted = false;

        this._progressBar = document.querySelector('#progressBar');
        this.facts = new FactsUI();

        const resumeMinerBtn = document.querySelector('#resumeMinerBtn');
        resumeMinerBtn.onclick = () => miner.toggleMining();

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

    set syncProgress(progress) {
        this._progressBar.style.transform = 'scaleX(' + Math.min(1, progress) + ') translateZ(0)';
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
}


class PeerDescUI {
    constructor() {
        this._container = document.querySelector('.peer-desc');
        this._iconBrowser = document.querySelector('.peer-desc .browser');
        this._iconBackbone = document.querySelector('.peer-desc .backbone');
        this._text = document.querySelector('.peer-desc .peer-desc-text');
    }

    _setNodeType(isBrowser) {
        if (isBrowser) {
            this._iconBrowser.style.display = 'inline-block';
            this._iconBackbone.style.display = 'none';
        } else {
            this._iconBrowser.style.display = 'none';
            this._iconBackbone.style.display = 'inline-block';
        }
    }

    show(desc) {
        const isBrowser = desc.protocol === Nimiq.Protocol.RTC;
        this._setNodeType(isBrowser);
        const nodeType = isBrowser ? 'Browser' : 'Backbone';
        this._text.innerHTML = `<b>${desc.status} ${nodeType}</b><br>${desc.country} ${desc.city}<br><small>${desc.addr || '&nbsp;'}</small>`;
        this._container.style.opacity = 1;
    }

    hide() {
        this._container.style.opacity = 0;
    }
}

class CellCounter {
    constructor() {
        this._cellCount = {};
    }

    incCellCount(cell) {
        if (!this._cellCount[cell.cellId]) {
            this._cellCount[cell.cellId] = 0;
        }
        this._cellCount[cell.cellId]++;
    }

    decCellCount(cell) {
        if (!this._cellCount[cell.cellId]) {
            this._cellCount[cell.cellId] = 0;
        }
        if (this._cellCount[cell.cellId] > 0) {
            return --this._cellCount[cell.cellId];
        }
        return 0;
    }

    getCellCount(cell) {
        return this._cellCount[cell.cellId] || 0;
    }
}

class MapUI {
    constructor($) {
        this._mapElem = document.querySelector('#map svg');
        this._map = new HexagonMap(this._mapElem);
        this.$ = $;
        this._polled = Nimiq.PeerAddresses.SEED_PEERS;
        this._connectedPeers = new Nimiq.HashMap();
        this._knownPeers = new Nimiq.HashMap();
        this._cellCountKnown = new CellCounter();
        this._cellCountConnected = new CellCounter();
        this._peerDescUI = new PeerDescUI()

        $.network.on('peer-joined', peer => this._onPeerJoined(peer));
        $.network.on('peer-left', peer => this._onPeerLeft(peer));

        GeoIP.retrieveOwn(response => this._highlightOwnPeer(response));

        this._mapElem.onmousemove = e => this._mapHighlight(e);
    }

    fadeIn() {
        this._mapElem.style.opacity = 1;
        setInterval(this._pollPeers.bind(this), MapUI.REFRESH_INTERVAL);
    }

    _mapHighlight(e) {
        if (e.target.data) {
            const data = e.target.data;
            this._peerDescUI.show(data);
        } else {
            this._peerDescUI.hide();
        }
    }

    _getPeerHost(peer) {
        if (peer.peerAddress.protocol === Nimiq.Protocol.WS) {
            return peer.peerAddress.host;
        } else if (peer.netAddress && !peer.netAddress.isPrivate()) {
            return peer.netAddress.ip;
        } else {
            return null;
        }
    }

    _onPeerJoined(peer) {
        var host = this._getPeerHost(peer);
        if (host && !this._connectedPeers.contains(host)) {
            GeoIP.retrieve(response => this._highlightConnectedPeer(peer.peerAddress.protocol, host, response), host);
        }
    }

    _onPeerLeft(peer) {
        var host = this._getPeerHost(peer);
        if (!host) return;

        var cell = this._connectedPeers.get(host);
        if (cell) {
            // Only remove highlight if there are no more peers on this cell.
            if (this._cellCountConnected.decCellCount(cell) === 0) {
                // Either change class if there are still known peers there.
                if (this._cellCountKnown.getCellCount(cell) > 0) {
                    this._map.highlightCell(cell, 'known-peer', undefined);
                }
                // Or remove class at all.
                else {
                    this._map.unhighlightCell(cell);
                }
                this._map.removeLink(this._ownCell, cell);
            }
            this._connectedPeers.remove(host);
        }
    }

    _noise() {
        return 0; //(1 - Math.random() * 2) * 0.9;
    }

    _highlightOwnPeer(response) {
        if (response && response.location && response.location.latitude) {
            var loc = response.location;
            var locDesc = this._responseToDesc(response, Nimiq.Protocol.RTC, null, 'My');
            var cell = this._map.getCellByLocation(loc.latitude, loc.longitude);
            if (cell) {
                this._ownCell = cell;
                this._map.highlightCell(cell, 'own-peer', locDesc);
                this._cellCountConnected.incCellCount(cell);
                var connectedPeersCells = this._connectedPeers.values();
                for (var i = 0, peerCell; peerCell = connectedPeersCells[i]; ++i) {
                    this._map.addLink(cell, peerCell);
                }
            }
        }
    }

    _highlightConnectedPeer(protocol, addr, response) {
        if (response && response.location && response.location.latitude) {
            var loc = response.location;
            var locDesc = this._responseToDesc(response, protocol, addr, 'Connected');
            var cell = this._map.getCellByLocation(loc.latitude + this._noise(), loc.longitude + this._noise());
            if (cell) {
                if (this._ownCell !== cell) {
                    // do not highlight own cell
                    this._map.highlightCell(cell, 'connected-peer', locDesc);
                }
                this._connectedPeers.put(addr, cell);
                this._cellCountConnected.incCellCount(cell);
                this._map.addLink(this._ownCell, cell);
            }
        }
    }

    _responseToDesc(response, protocol, addr, status) {
        return {
            status: status,
            city: response.city ? response.city : '',
            country: response.country ? isoCountries[response.country] : '',
            protocol: protocol,
            addr: addr
        }
    }

    _highlightKnownPeer(protocol, addr, response) {
        if (response && response.location && response.location.latitude) {
            var loc = response.location;
            var locDesc = this._responseToDesc(response, protocol, addr, 'Available');
            var cell = this._map.getCellByLocation(loc.latitude + this._noise(), loc.longitude + this._noise());
            if (cell) {
                var numKnown = this._knownPeers.length;
                this._knownPeers.put(addr, cell);
                this._cellCountKnown.incCellCount(cell);
                // Highlight only if necessary.
                if (this._cellCountConnected.getCellCount(cell) === 0) {
                    this._map.highlightCell(cell, 'known-peer', locDesc);
                }
                // If too many are already highlighted, remove a random one.
                if (numKnown >= MapUI.KNOWN_PEERS_MAX) {
                    var i = Math.floor(Math.random() * numKnown);
                    var addr = this._knownPeers.keys()[i];
                    var cell = this._knownPeers.get(addr);
                    this._knownPeers.remove(addr);
                    this._cellCountKnown.decCellCount(cell);
                    // If we now have neither connected nor known peers, remove highlight.
                    if (this._cellCountKnown.getCellCount(cell) === 0 && this._cellCountConnected.getCellCount(cell) === 0) {
                        this._map.unhighlightCell(cell);
                    }
                    // Otherwise, we either have a connected peer -> do not change the class.
                    // Or we still have known peers -> do not change the class.
                }
            }
        }
    }

    _pollPeers() {
        if (this._polled.length === 0) {
            this._polled = this.$.network._addresses.query(Nimiq.Protocol.WS | Nimiq.Protocol.RTC, Nimiq.Services.DEFAULT);
            // Limit to 100 addresses.
            this._polled = this._polled.slice(0, 100);
        }
        if (this._polled.length > 0) {
            var peerAddress = this._polled.shift();
            var host = peerAddress.host || peerAddress.netAddress && !peerAddress.netAddress.isPrivate() && peerAddress.netAddress.ip;
            if (host) {
                GeoIP.retrieve(response => this._highlightKnownPeer(peerAddress.protocol, host, response), host);
            }
        }
    }
}
MapUI.KNOWN_PEERS_MAX = 500;
MapUI.REFRESH_INTERVAL = 1000;

class Miner {
    constructor($) {
        this.$ = $;

        this.ui = new MinerUI(this);
        this.ui.enableConnectButton();

        this.map = new MapUI($);
        this._blockExplorer = null;

        this.syncing = true;
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
        this.$.consensus.on('syncing', _targetHeight => this._onSyncing(_targetHeight));

        this.$.blockchain.on('head-changed', _ => this._onHeadChanged());
        this.$.network.on('peers-changed', () => this._onPeersChanged());

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
        // TODO the core can switch between syncing and consensus multiple times, so this method
        // can be called multiple times
        this.$.accounts.getBalance(this.$.wallet.address)
            .then(balance => this._onBalanceChanged(balance));
        this.$.accounts.on(this.$.wallet.address, account => this._onBalanceChanged(account.balance));

        this._warningConsensusLost.style.display = 'none';

        if (!this.paused) {
            this.$.miner.startWork();
        }

        this.ui.facts.syncing = false;
        this.syncing = false;
        this.ui.syncProgress = 1;

        this._onGlobalHashrateChanged();

        if (!this._blockExplorer) {
            this._blockExplorer = new BlockExplorerUi(this.$.blockchain);
        }
    }

    _onConsensusLost() {
        this.$.miner.stopWork();
    }

    _onSyncing(targetHeight) {
        this._targetHeight = targetHeight;
        this.ui.facts.syncing = true;
        this.syncing = true;
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

    _onHeadChanged() {
        const height = this.$.blockchain.height;
        this.ui.facts.blockHeight = height;
        if (this.syncing) {
            this.ui.syncProgress = height / this._targetHeight;
        } else {
            this._onGlobalHashrateChanged();
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

    _onBalanceChanged(balance) {
        this.ui.facts.myBalance = balance.value;
    }
}

// Initialize Nimiq Core.
Nimiq.init($ => {
    document.getElementById('landingSection').classList.remove('warning');
    document.getElementById('warning-multiple-tabs').style.display = 'none';
    window.$ = $;
    window.Miner = new Miner($);
    window.Wallet = new WalletUI($);
}, function(error) {
    document.getElementById('landingSection').classList.add('warning');
    if (error === Nimiq.ERR_WAIT) {
        document.getElementById('warning-multiple-tabs').style.display = 'block';
    } else if (error === Nimiq.ERR_UNSUPPORTED) {
        document.getElementById('warning-old-browser').style.display = 'block';
    } else {
        document.getElementById('warning-general-error').style.display = 'block';
    }
});


function checkScreenOrientation() {
    // we check the screen dimensions instead of innerWidth/innerHeight for correct behaviour when the keyboard
    // is shown on mobile
    var isLandscape = window.screen.width >= window.screen.height;
    if (isLandscape && window.innerHeight < 400) {
        document.body.classList.add('mobile-landscape');
    } else {
        document.body.classList.remove('mobile-landscape');
    }
}
window.addEventListener('resize', checkScreenOrientation);
checkScreenOrientation();



/*************************** Country Codes *************************************************************/


var isoCountries = {
    'AF': 'Afghanistan',
    'AX': 'Aland Islands',
    'AL': 'Albania',
    'DZ': 'Algeria',
    'AS': 'American Samoa',
    'AD': 'Andorra',
    'AO': 'Angola',
    'AI': 'Anguilla',
    'AQ': 'Antarctica',
    'AG': 'Antigua And Barbuda',
    'AR': 'Argentina',
    'AM': 'Armenia',
    'AW': 'Aruba',
    'AU': 'Australia',
    'AT': 'Austria',
    'AZ': 'Azerbaijan',
    'BS': 'Bahamas',
    'BH': 'Bahrain',
    'BD': 'Bangladesh',
    'BB': 'Barbados',
    'BY': 'Belarus',
    'BE': 'Belgium',
    'BZ': 'Belize',
    'BJ': 'Benin',
    'BM': 'Bermuda',
    'BT': 'Bhutan',
    'BO': 'Bolivia',
    'BA': 'Bosnia And Herzegovina',
    'BW': 'Botswana',
    'BV': 'Bouvet Island',
    'BR': 'Brazil',
    'IO': 'British Indian Ocean Territory',
    'BN': 'Brunei Darussalam',
    'BG': 'Bulgaria',
    'BF': 'Burkina Faso',
    'BI': 'Burundi',
    'KH': 'Cambodia',
    'CM': 'Cameroon',
    'CA': 'Canada',
    'CV': 'Cape Verde',
    'KY': 'Cayman Islands',
    'CF': 'Central African Republic',
    'TD': 'Chad',
    'CL': 'Chile',
    'CN': 'China',
    'CX': 'Christmas Island',
    'CC': 'Cocos (Keeling) Islands',
    'CO': 'Colombia',
    'KM': 'Comoros',
    'CG': 'Congo',
    'CD': 'Congo, Democratic Republic',
    'CK': 'Cook Islands',
    'CR': 'Costa Rica',
    'CI': 'Cote D\'Ivoire',
    'HR': 'Croatia',
    'CU': 'Cuba',
    'CY': 'Cyprus',
    'CZ': 'Czech Republic',
    'DK': 'Denmark',
    'DJ': 'Djibouti',
    'DM': 'Dominica',
    'DO': 'Dominican Republic',
    'EC': 'Ecuador',
    'EG': 'Egypt',
    'SV': 'El Salvador',
    'GQ': 'Equatorial Guinea',
    'ER': 'Eritrea',
    'EE': 'Estonia',
    'ET': 'Ethiopia',
    'FK': 'Falkland Islands (Malvinas)',
    'FO': 'Faroe Islands',
    'FJ': 'Fiji',
    'FI': 'Finland',
    'FR': 'France',
    'GF': 'French Guiana',
    'PF': 'French Polynesia',
    'TF': 'French Southern Territories',
    'GA': 'Gabon',
    'GM': 'Gambia',
    'GE': 'Georgia',
    'DE': 'Germany',
    'GH': 'Ghana',
    'GI': 'Gibraltar',
    'GR': 'Greece',
    'GL': 'Greenland',
    'GD': 'Grenada',
    'GP': 'Guadeloupe',
    'GU': 'Guam',
    'GT': 'Guatemala',
    'GG': 'Guernsey',
    'GN': 'Guinea',
    'GW': 'Guinea-Bissau',
    'GY': 'Guyana',
    'HT': 'Haiti',
    'HM': 'Heard Island & Mcdonald Islands',
    'VA': 'Holy See (Vatican City State)',
    'HN': 'Honduras',
    'HK': 'Hong Kong',
    'HU': 'Hungary',
    'IS': 'Iceland',
    'IN': 'India',
    'ID': 'Indonesia',
    'IR': 'Iran, Islamic Republic Of',
    'IQ': 'Iraq',
    'IE': 'Ireland',
    'IM': 'Isle Of Man',
    'IL': 'Israel',
    'IT': 'Italy',
    'JM': 'Jamaica',
    'JP': 'Japan',
    'JE': 'Jersey',
    'JO': 'Jordan',
    'KZ': 'Kazakhstan',
    'KE': 'Kenya',
    'KI': 'Kiribati',
    'KR': 'Korea',
    'KW': 'Kuwait',
    'KG': 'Kyrgyzstan',
    'LA': 'Lao People\'s Democratic Republic',
    'LV': 'Latvia',
    'LB': 'Lebanon',
    'LS': 'Lesotho',
    'LR': 'Liberia',
    'LY': 'Libyan Arab Jamahiriya',
    'LI': 'Liechtenstein',
    'LT': 'Lithuania',
    'LU': 'Luxembourg',
    'MO': 'Macao',
    'MK': 'Macedonia',
    'MG': 'Madagascar',
    'MW': 'Malawi',
    'MY': 'Malaysia',
    'MV': 'Maldives',
    'ML': 'Mali',
    'MT': 'Malta',
    'MH': 'Marshall Islands',
    'MQ': 'Martinique',
    'MR': 'Mauritania',
    'MU': 'Mauritius',
    'YT': 'Mayotte',
    'MX': 'Mexico',
    'FM': 'Micronesia, Federated States Of',
    'MD': 'Moldova',
    'MC': 'Monaco',
    'MN': 'Mongolia',
    'ME': 'Montenegro',
    'MS': 'Montserrat',
    'MA': 'Morocco',
    'MZ': 'Mozambique',
    'MM': 'Myanmar',
    'NA': 'Namibia',
    'NR': 'Nauru',
    'NP': 'Nepal',
    'NL': 'Netherlands',
    'AN': 'Netherlands Antilles',
    'NC': 'New Caledonia',
    'NZ': 'New Zealand',
    'NI': 'Nicaragua',
    'NE': 'Niger',
    'NG': 'Nigeria',
    'NU': 'Niue',
    'NF': 'Norfolk Island',
    'MP': 'Northern Mariana Islands',
    'NO': 'Norway',
    'OM': 'Oman',
    'PK': 'Pakistan',
    'PW': 'Palau',
    'PS': 'Palestinian Territory, Occupied',
    'PA': 'Panama',
    'PG': 'Papua New Guinea',
    'PY': 'Paraguay',
    'PE': 'Peru',
    'PH': 'Philippines',
    'PN': 'Pitcairn',
    'PL': 'Poland',
    'PT': 'Portugal',
    'PR': 'Puerto Rico',
    'QA': 'Qatar',
    'RE': 'Reunion',
    'RO': 'Romania',
    'RU': 'Russian Federation',
    'RW': 'Rwanda',
    'BL': 'Saint Barthelemy',
    'SH': 'Saint Helena',
    'KN': 'Saint Kitts And Nevis',
    'LC': 'Saint Lucia',
    'MF': 'Saint Martin',
    'PM': 'Saint Pierre And Miquelon',
    'VC': 'Saint Vincent And Grenadines',
    'WS': 'Samoa',
    'SM': 'San Marino',
    'ST': 'Sao Tome And Principe',
    'SA': 'Saudi Arabia',
    'SN': 'Senegal',
    'RS': 'Serbia',
    'SC': 'Seychelles',
    'SL': 'Sierra Leone',
    'SG': 'Singapore',
    'SK': 'Slovakia',
    'SI': 'Slovenia',
    'SB': 'Solomon Islands',
    'SO': 'Somalia',
    'ZA': 'South Africa',
    'GS': 'South Georgia And Sandwich Isl.',
    'ES': 'Spain',
    'LK': 'Sri Lanka',
    'SD': 'Sudan',
    'SR': 'Suriname',
    'SJ': 'Svalbard And Jan Mayen',
    'SZ': 'Swaziland',
    'SE': 'Sweden',
    'CH': 'Switzerland',
    'SY': 'Syrian Arab Republic',
    'TW': 'Taiwan',
    'TJ': 'Tajikistan',
    'TZ': 'Tanzania',
    'TH': 'Thailand',
    'TL': 'Timor-Leste',
    'TG': 'Togo',
    'TK': 'Tokelau',
    'TO': 'Tonga',
    'TT': 'Trinidad And Tobago',
    'TN': 'Tunisia',
    'TR': 'Turkey',
    'TM': 'Turkmenistan',
    'TC': 'Turks And Caicos Islands',
    'TV': 'Tuvalu',
    'UG': 'Uganda',
    'UA': 'Ukraine',
    'AE': 'United Arab Emirates',
    'GB': 'United Kingdom',
    'US': 'United States',
    'UM': 'United States Outlying Islands',
    'UY': 'Uruguay',
    'UZ': 'Uzbekistan',
    'VU': 'Vanuatu',
    'VE': 'Venezuela',
    'VN': 'Viet Nam',
    'VG': 'Virgin Islands, British',
    'VI': 'Virgin Islands, U.S.',
    'WF': 'Wallis And Futuna',
    'EH': 'Western Sahara',
    'YE': 'Yemen',
    'ZM': 'Zambia',
    'ZW': 'Zimbabwe'
};

function getCountryName(countryCode) {
    if (isoCountries.hasOwnProperty(countryCode)) {
        return isoCountries[countryCode];
    } else {
        return countryCode;
    }
}
