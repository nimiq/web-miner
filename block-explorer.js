class BlockExplorerUi {
    constructor(blockchain) {
        this._blockchain = blockchain;
        this._blockListEl = document.getElementById('blocks-overview');
        this._entries = [];
        document.getElementById('mining-on-block').addEventListener('click', this.show.bind(this));
        document.getElementById('exit-blocks-overview').addEventListener('click', this.hide.bind(this));
        blockchain.on('head-changed', this._onHeadChanged.bind(this));
        this._fillList(blockchain.head);
    }

    _fillList(currentBlock) {
    	if (!currentBlock || this._entries.length >= BlockExplorerUi.MAX_COUNT) {
    		return;
    	}
    	// create an entry at the end of the list
    	let entry = new BlockEntry();
    	entry.block = currentBlock;
    	this._entries.push(entry);
    	this._blockListEl.appendChild(entry.element);
    	// get the predecessor
    	this._blockchain.getBlock(currentBlock.prevHash).then(prevBlock => this._fillList(prevBlock));
    }

    _onHeadChanged(head) {
    	// add an entry at the beginning of the list
    	let entry;
    	if (this._entries.length < BlockExplorerUi.MAX_COUNT) {
    		entry = new BlockEntry();
    	} else {
    		// remove the last entry and reuse it as the first one
    		entry = this._entries.splice(this._entries.length-1, 1)[0];
    	}
    	this._entries.splice(0, 0, entry);
    	entry.block = head;
    	this._blockListEl.insertBefore(entry.element, this._blockListEl.firstChild);
    }

    show() {
    	this._blockListEl.style.display = 'block';
        document.body.setAttribute('overlay', 'blocks-overview');
    }

    hide() {
        document.body.removeAttribute('overlay');
        window.setTimeout(function() {
        	this._blockListEl.style.display = 'none';
        }.bind(this), 600);
    }
}
BlockExplorerUi.MAX_COUNT = 20;


class BlockEntry {
	constructor() {
		let element = document.createElement('div');
		element.classList.add('blocks-overview-block');
		let blockNumber = document.createElement('div');
		blockNumber.classList.add('blocks-overview-block-number');
		let time = document.createElement('div');
		let transactions = document.createElement('div');
		let transactionCount = document.createElement('span');
		let totalAmount = document.createElement('span');
		totalAmount.classList.add('is-currency');
		transactions.appendChild(transactionCount);
		transactions.appendChild(totalAmount);
		let minerAddress = document.createElement('div');
		minerAddress.classList.add('ellipsis');
		let size = document.createElement('div');
		element.appendChild(blockNumber);
		element.appendChild(time);
		element.appendChild(transactions);
		element.appendChild(minerAddress);
		element.appendChild(size);
		this._element = element;
		this._blockNumberEl = blockNumber;
		this._timeEl = time;
		this._transactionCountEl = transactionCount;
		this._totalAmountEl = totalAmount;
		this._minerAddressEl = minerAddress;
		this._sizeEl = size;
		this._block = null;
		this._timer = null;
	}

	get element() {
		return this._element;
	}

	_updateTimeString() {
		let passedTime = Math.max(0, Date.now()/1000 - this._block.timestamp);
		if (passedTime < 60) {
			// less then a minute ago
			this._timeEl.textContent = 'now';
			return;
		}
		let timesteps = [{ unit: 'min', factor: 60 }, { unit: 'hr', factor: 60 }, { unit: 'day', factor: 24 }];
		let unit = 'sec';
		for (let i = 0; i < timesteps.length; ++i) {
		    let timestep = timesteps[i];
		    if (passedTime / timestep.factor < 1) {
		        break;
		    } else {
		        passedTime /= timestep.factor;
		        unit = timestep.unit;
		    }
		}
		passedTime = Math.floor(passedTime);
		if (passedTime > 1) {
			unit += 's';
		}
		this._timeEl.textContent = Math.floor(passedTime) + ' ' + unit + ' ago';
	}

	set block(block) {
		this._block = block;
		this._blockNumberEl.textContent = '#'+block.height;
		this._updateTimeString();
		this._transactionCountEl.textContent = block.transactionCount+' transactions (';
		let totalAmount = block.transactions.reduce(function(sum, transaction) {
			return sum + transaction.value + transaction.fee;
		}, 0);
		totalAmount = Nimiq.Policy.satoshisToCoins(totalAmount).toFixed(2);
		this._totalAmountEl.textContent = totalAmount+')';
		this._minerAddressEl.textContent = 'mined by '+block.minerAddr.toHex().toUpperCase();
		this._sizeEl.textContent = block.serializedSize + ' Bytes';
		window.clearInterval(this._timer);
		window.clearTimeout(this._timer);
		var remainingTimeUntilFullMinute = 60000 - (Math.max(0, Date.now() - this._block.timestamp*1000) % 60000);
		this._timer = window.setTimeout(function() {
			this._updateTimeString();
			this._timer = window.setInterval(function() {
				this._updateTimeString();
			}.bind(this), 60000); // every minute
		}.bind(this), remainingTimeUntilFullMinute);
	}
}