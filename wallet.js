function $$(selector) {
    return document.querySelector(selector);
}

class WalletUI {
    constructor($) {
        this.$ = $;
        this._el = $$('#wallet');

        this._pendingTx = null;
        this._pendingElapsed = 0;

        this._receivingTx = null;
        this._receivingElapsed = 0;

        this._accountContainer = $$('#wallet-account-input');
        this._accountInput = $$('#wallet-account-input input');
        this._accountInput.onchange = () => this._validateAddress();
        this._accountInput.onkeyup = () => this._validateAddress();

        this._amountContainer = $$('#wallet-amount-input');
        this._amountInput = $$('#wallet-amount-input input');
        this._amountInput.onchange = () => this._validateAmount();
        this._amountInput.onkeyup = () => this._validateAmount();

        this._sendTxBtn = $$('.wallet-submit-button');
        this._sendTxBtn.onclick = () => this._sendTx();

        const accountAddr = $$('#wallet-account .address');
        accountAddr.innerText = $.wallet.address.toUserFriendlyAddress();

        const wa = $$('#wallet-account');
        wa.setAttribute('data-clipboard-text', $.wallet.address.toUserFriendlyAddress().toUpperCase());
        const clipboard = new Clipboard('#wallet-account');
        clipboard.on('success', () => {
            wa.classList.add('copied');
            setTimeout(() => wa.classList.remove('copied'), 3000);
        });

        this._updateBalance();
        $.blockchain.on('head-changed', (head, branching) => {
            if (!branching) {
                this._updateBalance();
            }
        });

        $.mempool.on('transaction-added', tx => this._onTxReceived(tx));
        $.mempool.on('transactions-ready', () => this._onTxsProcessed());

        $$('#factBalanceContainer').onclick = () => this.show();
        $$('#wallet-close').onclick = () => this.hide();
        this._el.onclick = event => {
            if (event.srcElement === this._el) {
                // clicked on the background container
                this.hide();
            }
        };

        $$('.wallet-sidebar-leave').onclick = () => this._el.classList.remove('transaction-received');
    }

    show() {
        const previousOverlay = document.body.getAttribute('overlay');
        if (previousOverlay !== 'wallet') {
            this._previousOverlay = previousOverlay;
        }
        document.body.setAttribute('overlay', 'wallet');
    }

    hide() {
        if (this._previousOverlay) {
            document.body.setAttribute('overlay', this._previousOverlay);
        } else {
            document.body.removeAttribute('overlay');
        }
    }

    _isAccountAddressValid() {
        try {
            Nimiq.Address.fromUserFriendlyAddress(this._accountInput.value);
            return true;
        } catch(e) {
            return false;
        }
    }

    _validateAddress() {
        this._accountContainer.className = !this._accountInput.value || this._isAccountAddressValid() ? '' : 'invalid';
        this._checkEnableSendTxBtn();
    }

    _isAmountValid() {
        const amount = parseFloat(this._amountInput.value);
        const satoshis = Nimiq.Policy.coinsToSatoshis(amount);
        const waitingTransactions = $.mempool.getWaitingTransactions(this.$.wallet.publicKey);
        return satoshis >=1 && this._balance.value >= satoshis + waitingTransactions.map(t => t.value + t.fee).reduce((a, b) => a + b, 0);
    }

    _validateAmount() {
        this._amountContainer.className = this._isAmountValid() || !this._amountInput.value  ? '' : 'invalid';
        this._checkEnableSendTxBtn();
    }

    _checkEnableSendTxBtn() {
        this._sendTxBtn.disabled = !this._isAccountAddressValid() || !this._isAmountValid();
    }

    _updateBalance() {
        $.accounts.getBalance($.wallet.address).then(balance => this._onBalanceChanged(balance));
    }

    _onBalanceChanged(balance) {
        this._balance = balance;
        $$('#wallet-balance').innerText = Nimiq.Policy.satoshisToCoins(balance.value).toFixed(2);
        this._validateAmount();
    }

    _onTxReceived(tx) {
        if (!this.$.wallet.address.equals(tx.recipientAddr)) return;

        if (this._receivingTx) {
            if (this._receivingInterval) {
                clearInterval(this._receivingInterval);
            }

            this._receivingElapsed = 0;
            $$('#receivingElapsed').innerText = '0:00';
        }

        tx.getSenderAddr().then(sender => $$('#receivingSender').innerText = sender.toUserFriendlyAddress());
        $$('#receivingAmount').innerText = Nimiq.Policy.satoshisToCoins(tx.value).toFixed(2);
        $$('#receivingFee').innerText = Nimiq.Policy.satoshisToCoins(tx.fee).toFixed(2);

        this._receivingInterval = setInterval(() => {
            $$('#receivingElapsed').innerText = this._formatTime(++this._receivingElapsed);
        }, 1000);
        this._setEstimatedTime();

        this.show();
        this._el.classList.add('transaction-received');
        this._receivingTx = tx;
    }

    _onTxsProcessed() {
        if (this._pendingTx) {
            this._pendingTx.hash().then(hash => {
                if (!this.$.mempool.getTransaction(hash)) {
                    this._pendingTransactionConfirmed();
                }
            });
        }

        if (this._receivingTx) {
            this._receivingTx.hash().then(hash => {
                if (!this.$.mempool.getTransaction(hash)) {
                    this._receivingTransactionConfirmed();
                }
            });
        }
    }

    _sendTx() {
        if (!this._isAmountValid()) return;

        let address;
        try {
            address = Nimiq.Address.fromUserFriendlyAddress(this._accountInput.value);
        } catch(e) {
            return;
        }

        if (address.equals(this.$.wallet.address)) {
            alert('You cannot send transactions to yourself.');
            return;
        }

        const amount = parseFloat(this._amountInput.value);
        const satoshis = Nimiq.Policy.coinsToSatoshis(amount);

        this.$.accounts.getBalance(this.$.wallet.address)
            .then(balance => {
                const waitingTransactions = $.mempool.getWaitingTransactions(this.$.wallet.publicKey);
                return this.$.wallet.createTransaction(address, satoshis, 0, balance.nonce + waitingTransactions.length)
            })
            .then(tx => {
                this.$.mempool.pushTransaction(tx).then(result => {
                    if (!result) {
                        alert('Sending the transaction failed. Please try again later.');
                    } else {
                        this._transactionPending(tx);
                    }
                });
            });
    }

    _transactionPending(tx) {
        this._accountInput.value = '';
        this._amountInput.value = '';
        this._sendTxBtn.disabled = true;

        if (this._pendingTx) {
            if (this._pendingInterval) {
                clearInterval(this._pendingInterval);
            }

            this._pendingElapsed = 0;
            $$('#pendingElapsed').innerText = '0:00';
        }

        $$('#pendingReceiver').innerText = tx.recipientAddr.toUserFriendlyAddress();
        $$('#pendingAmount').innerText = Nimiq.Policy.satoshisToCoins(tx.value).toFixed(2);

        this._pendingInterval = setInterval(() => {
            $$('#pendingElapsed').innerText = this._formatTime(++this._pendingElapsed);
        }, 1000);
        this._setEstimatedTime();

        this._el.classList.add('transaction-pending');
        this._pendingTx = tx;
    }

    _pendingTransactionConfirmed() {
        this._pendingTx = null;
        this._pendingElapsed = 0;

        this._el.classList.remove('transaction-pending');

        $$('#pendingElapsed').innerText = '0:00';
        if (this._pendingInterval) {
            clearInterval(this._pendingInterval);
            this._pendingInterval = null;
        }
    }

    _receivingTransactionConfirmed() {
        this._receivingTx = null;
        this._receivingElapsed = 0;

        this._el.classList.remove('transaction-received');

        $$('#receivingElapsed').innerText = '0:00';
        if (this._receivingInterval) {
            clearInterval(this._receivingInterval);
            this._receivingInterval = null;
        }
    }

    _formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        seconds = seconds % 60;
        return minutes + ':' + (seconds < 10? '0' : '') + seconds;
    }

    _setEstimatedTime() {
        const blockCount = 5;
        const headBlock = this.$.blockchain.head;
        const tailHeight = Math.max(headBlock.height - blockCount, 1);

        this.$.blockchain.getBlockAt(tailHeight).then(tailBlock => {
            let averageBlockTime = (headBlock.timestamp - tailBlock.timestamp) / (Math.max(headBlock.height - tailBlock.height, 1));
            averageBlockTime = Math.round(averageBlockTime / 5) * 5; // round to 5 seconds
            const timeString = this._formatTime(averageBlockTime);
            Array.prototype.forEach.call(document.querySelectorAll('[estimated-time]'), el => el.textContent = timeString);
        });
    }
}

