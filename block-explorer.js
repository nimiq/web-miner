class BlockExplorerUi extends Panel {
	constructor(el, $) {
    	super(BlockExplorerUi.ID, el);
    	this._el = el;
        this._blockchain = $.blockchain;
        this._consensus = $.consensus;
        this._blockDetailUi = new BlockDetailUi(document.getElementById('block-detail'));
        this._blockListEl = this._el.querySelector('#blocks-overview');
        this._entries = [];
        this._visible = false;
        this._blockchain.on('head-changed', this._onHeadChanged.bind(this));
        this._consensusListenerId = this._consensus.on('established', () => this._onConsensus());
    }

    _onConsensus() {
		this._consensus.off('established', this._consensusListenerId);
		this._fillList(this._blockchain.head);
    }

    _createBlockEntry(block) {
		if (block.isLight()) return null;
    	let entry = new BlockEntry();
    	entry.block = block;
    	entry.addClickListener(entry => this._blockDetailUi.show(entry.block));
    	entry.visible = this._visible;
    	return entry;
    }

    _fillList(currentBlock) {
    	if (!currentBlock || this._entries.length >= BlockExplorerUi.MAX_COUNT) {
    		return;
    	}
    	// create an entry at the end of the list
    	let entry = this._createBlockEntry(currentBlock);
    	if (entry) {
            this._entries.push(entry);
            this._blockListEl.appendChild(entry.element);
		}
    	// get the predecessor
    	this._blockchain.getBlock(currentBlock.prevHash).then(prevBlock => this._fillList(prevBlock));
    }

    _onHeadChanged(head) {
		if (!this._consensus.established) return;
		this._removeForkEntries(head);
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

    _removeForkEntries(head) {
        // remove all block entries with block.height >= head.height for the case that we switched to a fork
        for (let i = 0; i<this._entries.length; ++i) {
			const entry = this._entries[i];
			if (entry.block.height < head.height) break;
			// remove the old fork entry
			entry.visible = false;
			this._entries.splice(i, 1);
			this._blockListEl.removeChild(entry.element);
			i--;
        }

    }

    show(fade = true) {
		this._visible = true;
        this._entries.forEach(function(entry) {
        	entry.visible = true;
        });
        super.show(fade);
    }

    hide(fade = true) {
		this._visible = false;
        this._entries.forEach(function(entry) {
        	entry.visible = false;
        });
        super.hide(fade);
    }
}
BlockExplorerUi.ID = 'block-explorer';
BlockExplorerUi.MAX_COUNT = 60;
BlockExplorerUi.MIN_WIDTH = 850;


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
		this._blockNumberEl.textContent = '#'+Utils.formatValue(block.height, 0);
		let hasTransactions = !!block.transactionCount;
		this._transactionCountEl.textContent = block.transactionCount+' transactions'
			+ (hasTransactions? ' (' : '');
		if (hasTransactions) {
			let totalAmount = block.transactions.reduce(function(sum, transaction) {
				return sum + transaction.value + transaction.fee;
			}, 0);
			totalAmount = Nimiq.Policy.lunasToCoins(totalAmount);
			this._totalAmountEl.textContent = Utils.formatValue(totalAmount);
			this._totalAmountEl.style.display = 'inline';
			this._closingParenthesis.style.display = 'inline';
		} else {
			this._totalAmountEl.style.display = 'none';
			this._closingParenthesis.style.display = 'none';
		}
		this._minerAddressEl.textContent = 'mined by '+block.minerAddr.toUserFriendlyAddress().toUpperCase();
		this._sizeEl.textContent = Utils.formatValue(block.serializedSize, 0) + ' Bytes';
        this._updateTimeString();
		if (this._visible) {
			this._startTimer();
		}
	}
}


class BlockDetailUi extends Overlay {
	constructor(el) {
		super(BlockDetailUi.ID, el);
		this._blockNumberEl = el.querySelector('#block-detail-block-number');
		this._blockHashEl = el.querySelector('#block-detail-block-hash');
		this._transactionCountEl = el.querySelector('#block-detail-info-transactions');
		this._totalAmountEl = el.querySelector('#block-detail-info-overall-value');
		this._blockRewardEl = el.querySelector('#block-detail-info-block-reward');
		this._difficultyEl = el.querySelector('#block-detail-info-difficulty');
		this._timestampEl = el.querySelector('#block-detail-info-timestamp');
		this._sizeEl = el.querySelector('#block-detail-info-size');
		this._nonceEl = el.querySelector('#block-detail-info-nonce');
		this._bitsEl = el.querySelector('#block-detail-info-bits');
		this._minerAddressEl = el.querySelector('#block-detail-info-mined-by');
		this._bodyHashEl = el.querySelector('#block-detail-info-body-hash');
		this._accountsHashEl = el.querySelector('#block-detail-info-accounts-hash');
		this._extraDataEl = el.querySelector('#block-detail-info-extra-data');
		this._extraDataContainer = el.querySelector('#block-detail-container-extra-data');
		this._transactionsContainer = el.querySelector('#block-detail-transactions');
		this._noTransactionsInfo = el.querySelector('#block-detail-no-transactions');
	}

	set block(block) {
		this._blockNumberEl.textContent = '#' + Utils.formatValue(block.height, 0);
		const hash = block.hash();
		this._blockHashEl.textContent = hash.toHex();
		this._transactionCountEl.textContent = block.transactionCount;
		let totalAmount = block.transactions.reduce(function(sum, transaction) {
			return sum + transaction.value + transaction.fee;
		}, 0);
		totalAmount = Nimiq.Policy.lunasToCoins(totalAmount);
		this._totalAmountEl.textContent = Utils.formatValue(totalAmount);
		this._blockRewardEl.textContent = Nimiq.Policy.lunasToCoins(Nimiq.Policy.blockRewardAt(block.height)).toFixed(2);
		this._difficultyEl.textContent = block.difficulty.toFixed(2);
		let date = new Date(block.timestamp * 1000);
		this._timestampEl.textContent = this._padNumber(date.getMonth()+1, 2) + '/'
			+ this._padNumber(date.getDate(), 2) + '/' + date.getFullYear().toString().substr(2, 2)
			+ ' ' + this._padNumber(date.getHours(), 2)+ ':' + this._padNumber(date.getMinutes(), 2);
		this._sizeEl.textContent = Utils.formatValue(block.serializedSize, 0) + ' Bytes';
		this._nonceEl.textContent = block.nonce;
		this._bitsEl.textContent = block.nBits.toString(16);
		this._minerAddressEl.textContent = block.minerAddr.toUserFriendlyAddress();
		this._bodyHashEl.textContent = block.bodyHash.toHex();
		this._accountsHashEl.textContent = block.accountsHash.toHex();
		if (block.body.extraData.length > 0) {
		    const isPrintable = block.body.extraData.every(charCode => charCode >= 32 && charCode <= 126);
		    this._extraDataEl.textContent = isPrintable? Nimiq.BufferUtils.toAscii(block.body.extraData)
                : Nimiq.BufferUtils.toBase64(block.body.extraData);
            this._extraDataContainer.style.display = 'flex';
        } else {
		    this._extraDataContainer.style.display = 'none';
        }
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
				sender.textContent=transaction.sender.toUserFriendlyAddress().toUpperCase();
				recipient.textContent = transaction.recipient.toUserFriendlyAddress().toUpperCase();
				value.textContent = Utils.formatValue(Nimiq.Policy.lunasToCoins(transaction.value));
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
        super.show();
    }
}
BlockDetailUi.ID = 'block-detail';
