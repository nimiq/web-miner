class MinerSettingsUi extends Panel {
    constructor(el, miner) {
        super(MinerSettingsUi.ID, el);
        this._el = el;
        this._miner = miner;
        this._threadCountLabel = this._el.querySelector('#miner-settings-thread-count');
        this._threadSlider = this._el.querySelector('#miner-thread-slider');
        // estimate the maximum number of threads that is useful. We divide navigator.hardwareConcurrency by 2 as this
        // count includes hyperthreads that are not very beneficial for the hashrate.
        this._threadSlider.setAttribute('max', navigator.hardwareConcurrency || 4);
        this._threadSlider.addEventListener('input', // triggered while dragging
            () => this._threadCountLabel.textContent = this._threadSlider.value);
        this._threadSlider.addEventListener('change', // triggered after releasing the slider
            () => this.threads = this._threadSlider.value);
        this.threads = this.threads || this._miner.threads;
    }

    set threads(threadCount) {
        if (threadCount !== this._miner.threads) {
            this._miner.threads = threadCount;
        }
        localStorage[MinerSettingsUi.KEY_THREAD_COUNT] = threadCount;
        this._threadCountLabel.textContent = threadCount;
        this._threadSlider.value = threadCount;
    }

    get threads() {
        return parseInt(localStorage[MinerSettingsUi.KEY_THREAD_COUNT]);
    }
}
MinerSettingsUi.ID = 'miner-settings';
MinerSettingsUi.KEY_THREAD_COUNT = 'miner-settings-thread-count';