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
        document.body.setAttribute('overlay', 'blocks-overview');
    }

    hide() {
        document.body.removeAttribute('overlay');
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
	}

	get element() {
		return this._element;
	}

	set block(block) {
		this._blockNumberEl.textContent = '#'+block.height;
		this._timeEl.textContent = block.timestamp; // TODO make more fancy
		this._transactionCountEl.textContent = block.transactionCount+' transactions (';
		this._totalAmountEl.textContent = 'TODO)';
		this._minerAddressEl.textContent = 'mined by '+block.minerAddr;
		this._sizeEl.textContent = block.serializedSize + ' Bytes';
	}
}