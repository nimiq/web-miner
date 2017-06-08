class BlockExplorerUi {
	// TODO improve performance by disabling the timers when hidden. Or event not update the list at all
	// and then update on demand

    constructor(blockchain) {
        this._blockchain = blockchain;
        this._blockDetailUi = new BlockDetailUi();
        this._blockListEl = document.getElementById('blocks-overview');
        this._entries = [];
        document.getElementById('mining-on-block').addEventListener('click', this.show.bind(this));
        document.getElementById('exit-blocks-overview').addEventListener('click', this.hide.bind(this));
        blockchain.on('head-changed', this._onHeadChanged.bind(this));
        this._fillList(blockchain.head);
    }

    _createBlockEntry(block) {
    	let entry = new BlockEntry();
    	entry.block = block;
    	entry.addClickListener(entry => this._blockDetailUi.show(entry.block));
    	return entry;
    }

    _fillList(currentBlock) {
    	if (!currentBlock || this._entries.length >= BlockExplorerUi.MAX_COUNT) {
    		return;
    	}
    	// create an entry at the end of the list
    	let entry = this._createBlockEntry(currentBlock);
    	this._entries.push(entry);
    	this._blockListEl.appendChild(entry.element);
    	// get the predecessor
    	this._blockchain.getBlock(currentBlock.prevHash).then(prevBlock => this._fillList(prevBlock));
    }

    _onHeadChanged(head) {
    	// add an entry at the beginning of the list
    	let entry;
    	if (this._entries.length < BlockExplorerUi.MAX_COUNT) {
    		entry = this._createBlockEntry(head);
    	} else {
    		// remove the last entry and reuse it as the first one
    		entry = this._entries.splice(this._entries.length-1, 1)[0];
    		entry.block = head;
    	}
    	this._entries.splice(0, 0, entry);
    	this._blockListEl.insertBefore(entry.element, this._blockListEl.firstChild);
    }

    show() {
    	this._blockListEl.style.display = 'block';
        document.body.setAttribute('overlay', 'blocks-overview');
        this._entries.forEach(function(entry) {
        	entry.visible = true;
        });
    }

    hide() {
        document.body.removeAttribute('overlay');
        window.setTimeout(function() {
        	this._blockListEl.style.display = 'none';
        }.bind(this), 600);
        this._entries.forEach(function(entry) {
        	entry.visible = false;
        });
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
		let closingParenthesis = document.createElement('span');
		closingParenthesis.textContent = ')';
		transactions.appendChild(transactionCount);
		transactions.appendChild(totalAmount);
		transactions.appendChild(closingParenthesis);
		let minerAddress = document.createElement('div');
		minerAddress.classList.add('ellipsis');
		let size = document.createElement('div');
		element.appendChild(blockNumber);
		element.appendChild(time);
		element.appendChild(transactions);
		element.appendChild(minerAddress);
		element.appendChild(size);
		element.addEventListener('click', this._onClick.bind(this));
		this._element = element;
		this._blockNumberEl = blockNumber;
		this._timeEl = time;
		this._transactionCountEl = transactionCount;
		this._totalAmountEl = totalAmount;
		this._closingParenthesis = closingParenthesis;
		this._minerAddressEl = minerAddress;
		this._sizeEl = size;
		this._block = null;
		this._timer = null;
		this._clickListeners = [];
		this._visible = false;
	}

	get element() {
		return this._element;
	}

	get block() {
		return this._block;
	}

	set visible(visible) {
		this._visible = visible;
		if (!visible) {
			this._stopTimer();
		} else {
			this._updateTimeString();
			this._startTimer();
		}
	}

	addClickListener(clickListener) {
		this._clickListeners.push(clickListener);
	}

	_onClick() {
		this._clickListeners.forEach(function(clickListener) {
			clickListener(this);
		}, this);
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

	_stopTimer() {
		window.clearInterval(this._timer);
		window.clearTimeout(this._timer);
	}

	_startTimer() {
		this._stopTimer();
		var remainingTimeUntilFullMinute = 60000 - (Math.max(0, Date.now() - this._block.timestamp*1000) % 60000);
		this._timer = window.setTimeout(function() {
			this._updateTimeString();
			this._timer = window.setInterval(this._updateTimeString.bind(this), 60000); // every minute
		}.bind(this), remainingTimeUntilFullMinute);
	}

	set block(block) {
		this._block = block;
		this._blockNumberEl.textContent = '#'+block.height;
		this._updateTimeString();
		let hasTransactions = !!block.transactionCount;
		this._transactionCountEl.textContent = block.transactionCount+' transactions'
			+ (hasTransactions? ' (' : '');
		if (hasTransactions) {
			let totalAmount = block.transactions.reduce(function(sum, transaction) {
				return sum + transaction.value + transaction.fee;
			}, 0);
			totalAmount = Nimiq.Policy.satoshisToCoins(totalAmount).toFixed(2);
			this._totalAmountEl.textContent = totalAmount;
			this._totalAmountEl.style.display = 'inline';
			this._closingParenthesis.style.display = 'inline';
		} else {
			this._totalAmountEl.style.display = 'none';
			this._closingParenthesis.style.display = 'none';
		}
		this._minerAddressEl.textContent = 'mined by '+block.minerAddr.toHex().toUpperCase();
		this._sizeEl.textContent = block.serializedSize + ' Bytes';
		if (this._visible) {
			this._startTimer();
		}
	}
}


class BlockDetailUi {
	constructor() {
		this._blockNumberEl = document.getElementById('block-detail-block-number');
		this._blockHashEl = document.getElementById('block-detail-block-hash');
		this._transactionCountEl = document.getElementById('block-detail-info-transactions');
		this._totalAmountEl = document.getElementById('block-detail-info-overall-value');
		this._blockRewardEl = document.getElementById('block-detail-info-block-reward');
		this._difficultyEl = document.getElementById('block-detail-info-difficulty');
		this._timestampEl = document.getElementById('block-detail-info-timestamp');
		this._sizeEl = document.getElementById('block-detail-info-size');
		this._nonceEl = document.getElementById('block-detail-info-nonce');
		this._bitsEl = document.getElementById('block-detail-info-bits');
		this._minerAddressEl = document.getElementById('block-detail-info-mined-by');
		this._bodyHashEl = document.getElementById('block-detail-info-body-hash');
		this._accountsHashEl = document.getElementById('block-detail-info-accounts-hash');
		this._transactionsContainer = document.getElementById('block-detail-transactions');
		this._noTransactionsInfo = document.getElementById('block-detail-no-transactions');
		document.getElementById('block-detail-exit-area').addEventListener('click', this.hide.bind(this));
		document.getElementById('blockexplorer-close').addEventListener('click', this.hide.bind(this));
	}

	set block(block) {
		this._blockNumberEl.textContent = '#' + block.height;
		block.hash().then(hash => this._blockHashEl.textContent = hash.toHex());
		this._transactionCountEl.textContent = block.transactionCount;
		let totalAmount = block.transactions.reduce(function(sum, transaction) {
			return sum + transaction.value + transaction.fee;
		}, 0);
		totalAmount = Nimiq.Policy.satoshisToCoins(totalAmount).toFixed(2);
		this._totalAmountEl.textContent = totalAmount;
		this._blockRewardEl.textContent = Nimiq.Policy.satoshisToCoins(Nimiq.Policy.BLOCK_REWARD);
		this._difficultyEl.textContent = block.difficulty.toFixed(2);
		let date = new Date(block.timestamp * 1000);
		this._timestampEl.textContent = this._padNumber(date.getMonth()+1, 2) + '/'
			+ this._padNumber(date.getDate(), 2) + '/' + date.getFullYear().toString().substr(2, 2)
			+ ' ' + this._padNumber(date.getHours(), 2)+ ':' + this._padNumber(date.getMinutes(), 2);
		this._sizeEl.textContent = block.serializedSize + ' Bytes';
		this._nonceEl.textContent = block.nonce;
		this._bitsEl.textContent = block.nBits.toString(16);
		this._minerAddressEl.textContent = block.minerAddr.toHex();
		this._bodyHashEl.textContent = block.bodyHash.toHex();
		this._accountsHashEl.textContent = block.accountsHash.toHex();
		if (block.transactionCount === 0) {
			this._noTransactionsInfo.style.display = 'table';
			this._transactionsContainer.style.display = 'none';
		} else {
			this._noTransactionsInfo.style.display = 'none';
			this._transactionsContainer.style.display = 'table';
			// clear old transactions
			let entry = this._transactionsContainer.firstElementChild;
			while (entry) {
				let next = entry.nextElementSibling;
				if (!entry.classList.contains('block-detail-transactions-header')) {
					entry.parentNode.removeChild(entry);
				}
				entry = next;
			}
			// put the current transactions
			block.transactions.forEach(function(transaction) {
				let entry = document.createElement('div');
				entry.classList.add('block-detail-transactions-row');
				entry.classList.add('table-row');
				let sender = document.createElement('p');
				let recipient = document.createElement('p');
				let value = document.createElement('p');
				value.classList.add('is-currency');
				transaction.getSenderAddr().then(address => sender.textContent=address.toHex().toUpperCase());
				recipient.textContent = transaction.recipientAddr.toHex().toUpperCase();
				value.textContent = Nimiq.Policy.satoshisToCoins(transaction.value).toFixed(2);
				entry.appendChild(sender);
				entry.appendChild(recipient);
				entry.appendChild(value);
				this._transactionsContainer.appendChild(entry);
			}, this);
		}
	}

	_padNumber(number, digits) {
		let result = '' + number;
		while (result.length < digits) {
			result = '0'+result;
		}
		return result;
	}

	show(block) {
		if (block) {
			this.block = block;
		}
		this._previousOverlay = document.body.getAttribute('overlay');
		document.body.setAttribute('overlay', 'block-detail');
	}

	hide() {
		if (this._previousOverlay) {
			document.body.setAttribute('overlay', this._previousOverlay);
		} else {
			document.body.removeAttribute('overlay');
		}
	}
}