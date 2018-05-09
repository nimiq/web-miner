class Panel {
    constructor(id, el) {
        this._id = id;
        this._el = el;
    }

    get id() {
        return this._id;
    }

    get element() {
        return this._el;
    }

    hide(fade = true) {
        this._el.style.opacity = 0;
        this._el.style.pointerEvents = 'none';
        clearTimeout(this._hideTimeout);
        if (fade) {
            // give it time to fade
            this._hideTimeout = setTimeout(() => {
                this._el.style.display = 'none';
            }, 500);
        } else {
            // hide it immediately
            this._el.style.display = 'none';
        }
    }

    show(fade = true) {
        this._el.style.display = 'block';
        if (fade) {
            this._el.offsetWidth; // force style update to display the element and then fade it.
            // Otherwise it gets displayed and and shown (opacity=1) at the same time without fading.
        }
        this._el.style.opacity = 1;
        this._el.style.pointerEvents = 'all';
    }
}

class BottomPanels {
    constructor(el) {
        this._el = el;
        this._panels = new Map(); // map id -> panel
        this._triggers = new Map(); // map id -> triggers
        this._bottomInfo = this._el.querySelector('#bottomInfo');
        this._exitArea = document.querySelector('#bottom-panels-exit');
        this._exitArea.addEventListener('click', () => this.hide());
        this._exitArea.style.display = 'none';
        this._currentPanel = null;
        this._hightlightedTrigger = null;
        this._hidden = true;
        this._container = this._el.parentElement;
        this._container.style.transform = 'translateY(-' + BottomPanels.ALWAYS_VISIBLE_HEIGHT + ')';
        window.addEventListener('resize', () => this._onResize());
    }

    get currentPanel() {
        return this._currentPanel;
    }

    addPanel(panel, trigger) {
        this._panels.set(panel.id, panel);
        this._triggers.set(panel.id, trigger);
    }

    show(panelId) {
        const panel = this._panels.get(panelId) || this._currentPanel;
        if (!panel) {
            throw Error('Unknown panel: '+panelId);
        }
        clearTimeout(this._hideTimeout);
        const fade = !this._hidden;
        if (this._currentPanel && panel !== this._currentPanel) {
            this._currentPanel.hide(fade);
        }
        panel.show(fade);
        this._currentPanel = panel;
        if (this._hightlightedTrigger) {
            this._hightlightedTrigger.classList.remove('highlighted');
        }
        this._hightlightedTrigger = this._triggers.get(panelId);
        if (this._hightlightedTrigger) {
            this._hightlightedTrigger.classList.add('highlighted');
        }
        this._bottomInfo.style.visibility = 'hidden';
        this._bottomInfo.style.pointerEvents = 'none';
        this._hidden = false;
        const height = panel.element.offsetHeight + 'px';
        this._container.style.transform = 'translateY(-' + height + ')';
        this._exitArea.style.display = 'block';
        document.body.setAttribute('overlay', 'bottom-panels');
    }

    hide() {
        this._container.style.transform = 'translateY(-' + BottomPanels.ALWAYS_VISIBLE_HEIGHT + ')';
        this._exitArea.style.display = 'none';
        if (this._hightlightedTrigger) {
            this._hightlightedTrigger.classList.remove('highlighted');
        }
        this._hightlightedTrigger = null;
        document.body.removeAttribute('overlay');

        clearTimeout(this._hideTimeout);
        this._hideTimeout = setTimeout(() => {
            this._hidden = true;
            this._bottomInfo.style.visibility = 'visible';
            this._bottomInfo.style.pointerEvents = 'all';
            this._currentPanel.hide(false);
            this._currentPanel = null;
            // set the transform again, just in case there was a resize that overwrote it
            this._container.style.transform = 'translateY(-' + BottomPanels.ALWAYS_VISIBLE_HEIGHT + ')';
        }, 500);
    }

    _onResize() {
        if (!this._hidden && this._currentPanel) {
            const height = this._currentPanel.element.offsetHeight + 'px';
            this._container.style.transform = 'translateY(-' + height + ')';
        }
    }
}
BottomPanels.ALWAYS_VISIBLE_HEIGHT = '45px'; // upper part of the bottom panels where the bottom info is visible when
// no panel is shown


class Overlay {
    constructor(id, el) {
        this._id = id;
        this._el = el;
        el.querySelector('.overlay-close').addEventListener('click', this.hide.bind(this));
        el.addEventListener('click', event => {
            if (event.target === el) {
                // clicked on the background container
                this.hide();
            }
        });
    }

    show() {
        const previousOverlay = document.body.getAttribute('overlay');
        if (previousOverlay !== this._id) {
            this._previousOverlay = previousOverlay;
        }
        document.body.setAttribute('overlay', this._id);
    }

    hide() {
        if (this._previousOverlay) {
            document.body.setAttribute('overlay', this._previousOverlay);
        } else {
            document.body.removeAttribute('overlay');
        }
    }
}
