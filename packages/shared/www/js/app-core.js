// =========================================================================
// 1. CAPACITOR NATIVE SERVICES BRIDGE
// =========================================================================
class NativeService {
    static async vibrate() {
        try {
            if (window.Capacitor?.isPluginAvailable('Haptics')) {
                const { Haptics } = window.Capacitor.Plugins;
                await Haptics.vibrate();
            } else if ('vibrate' in navigator) {
                navigator.vibrate(50);
            }
        } catch (e) { console.log('Haptics unavailable', e); }
    }

    static async showToast(message) {
        try {
            if (window.Capacitor?.isPluginAvailable('Toast')) {
                const { Toast } = window.Capacitor.Plugins;
                await Toast.show({ text: message });
            } else { console.log(`[App Toast]: ${message}`); }
        } catch (e) { console.log('Toast unavailable', e); }
    }
}

// =========================================================================
// 2. FRAMEWORK CORE & WEB COMPONENTS
// =========================================================================
class Component {
    constructor(tagOrElement) {
        this.el = typeof tagOrElement === 'string' ? document.createElement(tagOrElement) : tagOrElement;
    }
    id(idString) { this.el.id = idString; return this; }
    add(...children) {
        children.forEach(child => {
            if (typeof child === 'string') this.el.appendChild(document.createTextNode(child));
            else if (child instanceof Component) this.el.appendChild(child.el);
            else if (child instanceof HTMLElement) this.el.appendChild(child);
        });
        return this;
    }
    addClass(...classes) { this.el.classList.add(...classes); return this; }
    attr(name, val) { this.el.setAttribute(name, val); return this; }
    text(content) { this.el.textContent = content; return this; }
    onClick(handler) { this.el.addEventListener('click', handler); return this; }
    removeAll() { this.el.innerHTML = ''; return this; }
}

function updateDOM(action, targetId, childComponentOrElement) {
    const targetEl = document.getElementById(targetId);
    if (!targetEl && action !== 'remove') return;
    let node = childComponentOrElement instanceof Component ? childComponentOrElement.el : childComponentOrElement;
    switch (action) {
        case 'prepend': if (node) targetEl.insertBefore(node, targetEl.firstChild); break;
        case 'replace': if (node) targetEl.replaceWith(node); break;
        case 'update': targetEl.innerHTML = ''; if (node) targetEl.appendChild(node); break;
        case 'remove': if (targetEl) targetEl.remove(); break;
    }
}

customElements.define('v-layout', class extends HTMLElement { connectedCallback() { if (!this.hasAttribute('direction')) this.setAttribute('direction', 'vertical'); } });
customElements.define('v-card', class extends HTMLElement {});
customElements.define('v-button', class extends HTMLElement {
    constructor() {
        super(); this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `<style>button { width: 100%; padding: 0.6rem 1rem; background: var(--primary, #0066cc); color: white; border: 1px solid transparent; border-radius: 4px; font-weight: 600; cursor: pointer; font-family: inherit; font-size: 0.95rem; } :host([variant="danger"]) button { background: var(--danger, #dc3545); } :host([variant="secondary"]) button { background: #6c757d; } :host([variant="outline"]) button { background: #fff; color: #333; border-color: #ccc; }</style><button><slot></slot></button>`;
    }
});
customElements.define('v-textfield', class extends HTMLElement {
    constructor() {
        super(); this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `<style>:host { flex: 1; display: flex; } input { width: 100%; padding: 0.6rem; border: 1px solid #ccc; border-radius: 4px; font-size: 0.95rem; box-sizing: border-box; }</style><input type="text" />`;
        this._input = this.shadowRoot.querySelector('input');
    }
    connectedCallback() { if (this.hasAttribute('placeholder')) this._input.placeholder = this.getAttribute('placeholder'); if (this.hasAttribute('value')) this._input.value = this.getAttribute('value'); }
    get value() { return this._input.value; }
    set value(val) { this._input.value = val; }
    clear() { this._input.value = ''; }
});
customElements.define('v-badge', class extends HTMLElement {
    static get observedAttributes() { return ['status']; }
    constructor() {
        super(); this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `<style>.badge { font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: 10px; font-weight: bold; font-family: inherit; } .local { background: #fff3cd; color: #856404; } .synced { background: #d4edda; color: #155724; }</style><span class="badge local"><slot></slot></span>`;
        this._span = this.shadowRoot.querySelector('.badge');
    }
    attributeChangedCallback(name, oldValue, newValue) { if (name === 'status') this._span.className = `badge ${newValue === 'synced' ? 'synced' : 'local'}`; }
});

const VerticalLayout = (...c) => new Component('v-layout').attr('direction', 'vertical').add(...c);
const HorizontalLayout = (...c) => new Component('v-layout').attr('direction', 'horizontal').add(...c);
const Card = (...c) => new Component('v-card').add(...c);
const H2 = (txt) => new Component('h2').text(txt);
const Text = (txt) => new Component('span').text(txt);
const Paragraph = (txt) => new Component('p').text(txt);
class Button extends Component { constructor(text, onClickHandler, variant = 'primary') { super('v-button'); this.text(text); if (variant !== 'primary') this.attr('variant', variant); if (onClickHandler) this.onClick(onClickHandler); } }
class TextField extends Component { constructor(placeholder = '') { super('v-textfield'); if (placeholder) this.attr('placeholder', placeholder); } getValue() { return this.el.value; } setValue(val) { this.el.value = val; return this; } clear() { this.el.clear(); return this; } }
class Badge extends Component { constructor(text, isSynced) { super('v-badge'); this.attr('status', isSynced ? 'synced' : 'local').text(text); } }

// =========================================================================
// 3. DOMAIN MODEL & DATABASE LAYER
// =========================================================================
class ERPRecord { constructor({ id = Date.now().toString(), title, synced = 0, createdAt = Date.now(), editing = false }) { this.id = id; this.title = title; this.synced = synced; this.createdAt = createdAt; this.editing = editing; } }
class ERPRepository {
    constructor() { this.dbName = 'ERPPlatformDB'; this.storeName = 'records'; }
    async getDatabase() { return new Promise((res) => { const req = indexedDB.open(this.dbName, 1); req.onupgradeneeded = () => req.result.createObjectStore(this.storeName, { keyPath: 'id' }); req.onsuccess = () => res(req.result); }); }
    async findAll() { const db = await this.getDatabase(); return new Promise(res => { const req = db.transaction(this.storeName, 'readonly').objectStore(this.storeName).getAll(); req.onsuccess = () => res(req.result.map(data => new ERPRecord(data))); }); }
    async save(record) { const db = await this.getDatabase(); return new Promise(res => { const tx = db.transaction(this.storeName, 'readwrite'); tx.objectStore(this.storeName).put(record); tx.oncomplete = () => res(record); }); }
    async deleteById(id) { const db = await this.getDatabase(); return new Promise(res => { const tx = db.transaction(this.storeName, 'readwrite'); tx.objectStore(this.storeName).delete(id); tx.oncomplete = () => res(); }); }
    async saveAllAndClear(records) { const db = await this.getDatabase(); return new Promise(res => { const tx = db.transaction(this.storeName, 'readwrite'); const store = tx.objectStore(this.storeName); store.clear(); records.forEach(t => store.put(t)); tx.oncomplete = () => res(); }); }
}

class ERPService {
    constructor(repository) { this.erpRepository = repository; }
    get serverUrl() { return window.getServerUrl(); }
    async updateCountBadge() { const records = await this.getRecords(); updateDOM('update', 'cart-count-badge', Text(`${records.length}`)); }
    async getRecords() { return await this.erpRepository.findAll(); }
    async createRecord(title) { const record = new ERPRecord({ title, synced: 0 }); await this.erpRepository.save(record); await this.updateCountBadge(); await NativeService.vibrate(); await NativeService.showToast(`Record added!`); return record; }
    async updateRecord(record) { const updated = await this.erpRepository.save(record); await this.updateCountBadge(); return updated; }
    async deleteRecord(id) { await this.erpRepository.deleteById(id); await this.updateCountBadge(); await NativeService.vibrate(); await NativeService.showToast('Record deleted'); if (navigator.onLine) { fetch(`${this.serverUrl}/api/erp/${id}`, { method: 'DELETE' }).catch(() => {}); } }
    async syncWithRemoteServer() {
        if (!navigator.onLine) return;
        try {
            const localRecords = await this.erpRepository.findAll();
            const unsynced = localRecords.filter(t => !t.synced);
            if (unsynced.length > 0) {
                const res = await fetch(`${this.serverUrl}/api/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ records: unsynced }) });
                if (res.ok) { const { syncedIds } = await res.json(); for (const record of localRecords) { if (syncedIds.includes(record.id)) { record.synced = 1; await this.erpRepository.save(record); } } }
            }
            const getRes = await fetch(`${this.serverUrl}/api/erp`);
            if (getRes.ok) { const { records: serverRecords } = await getRes.json(); await this.erpRepository.saveAllAndClear(serverRecords); await this.updateCountBadge(); await NativeService.showToast('ERP sync completed'); if (AppRouter.renderCurrentRoute) AppRouter.renderCurrentRoute(); }
        } catch (err) { console.log('Server offline - using local store.'); }
    }
}
const erpRepository = new ERPRepository();
const erpService = new ERPService(erpRepository);
