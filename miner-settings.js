/* Miner Settings */

class MinerSettingsUi extends Panel {
    constructor(el, miner) {
        super(MinerSettingsUi.ID, el);
        this._el = el;
        this._miner = miner;
        this._threadCountLabel = this._el.querySelector('#miner-settings-thread-count');
        this._threadSlider = this._el.querySelector('#miner-settings-thread-slider');
        this._threadSlider.setAttribute('max', navigator.hardwareConcurrency || 4);
        this._threadSlider.addEventListener('input', // triggered while dragging
            () => this._threadCountLabel.textContent = this._threadSlider.value);
        this._threadSlider.addEventListener('change', // triggered after releasing the slider
            () => this.threads = parseInt(this._threadSlider.value));
    }

    set threads(threadCount) {
        this._threadCountLabel.textContent = threadCount;
        this._threadSlider.value = threadCount;
        const storedThreadCount = this.threads;
        if (threadCount !== storedThreadCount) {
            localStorage[MinerSettingsUi.KEY_THREAD_COUNT] = threadCount;
            this._miner.threads = threadCount;
        }
    }

    get threads() {
        return parseInt(localStorage[MinerSettingsUi.KEY_THREAD_COUNT]);
    }
}
MinerSettingsUi.ID = 'miner-settings';
MinerSettingsUi.KEY_THREAD_COUNT = 'miner-settings-thread-count';

