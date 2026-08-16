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
                navigator.vibrate(50); // Fallback for standard browsers
            }
        } catch (e) {
            console.log('Haptics unavailable', e);
        }
    }

    static async showToast(message) {
        try {
            if (window.Capacitor?.isPluginAvailable('Toast')) {
                const { Toast } = window.Capacitor.Plugins;
                await Toast.show({ text: message });
            } else {
                console.log(`[App Toast]: ${message}`);
            }
        } catch (e) {
            console.log('Toast unavailable', e);
        }
    }
}

// =========================================================================
// 2. FRAMEWORK CORE & WEB COMPONENTS
// =========================================================================
class Component {
    constructor(tagOrElement) {
        this.el = typeof tagOrElement === 'string'
            ? document.createElement(tagOrElement)
            : tagOrElement;
    }

    id(idString) { this.el.id = idString; return this; }

    add(...children) {
        children.forEach(child => {
            if (typeof child === 'string') {
                this.el.appendChild(document.createTextNode(child));
            } else if (child instanceof Component) {
                this.el.appendChild(child.el);
            } else if (child instanceof HTMLElement) {
                this.el.appendChild(child);
            }
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

    let node = null;
    if (childComponentOrElement) {
        node = childComponentOrElement instanceof Component
            ? childComponentOrElement.el
            : childComponentOrElement;
    }

    switch (action) {
        case 'prepend':
            if (node) targetEl.insertBefore(node, targetEl.firstChild);
            break;
        case 'replace':
            if (node) targetEl.replaceWith(node);
            break;
        case 'update':
            targetEl.innerHTML = '';
            if (node) targetEl.appendChild(node);
            break;
        case 'remove':
            if (targetEl) targetEl.remove();
            break;
    }
}

customElements.define('v-layout', class extends HTMLElement {
    connectedCallback() {
        if (!this.hasAttribute('direction')) this.setAttribute('direction', 'vertical');
    }
});

customElements.define('v-card', class extends HTMLElement {});

customElements.define('v-button', class extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>
                button { width: 100%; padding: 0.6rem 1rem; background: var(--primary, #0066cc); color: white; border: 1px solid transparent; border-radius: 4px; font-weight: 600; cursor: pointer; font-family: inherit; font-size: 0.95rem; }
                :host([variant="danger"]) button { background: var(--danger, #dc3545); }
                :host([variant="secondary"]) button { background: #6c757d; }
                :host([variant="outline"]) button { background: #fff; color: #333; border-color: #ccc; }
            </style>
            <button><slot></slot></button>
        `;
    }
});

customElements.define('v-textfield', class extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>
                :host { flex: 1; display: flex; }
                input { width: 100%; padding: 0.6rem; border: 1px solid #ccc; border-radius: 4px; font-size: 0.95rem; box-sizing: border-box; }
            </style>
            <input type="text" />
        `;
        this._input = this.shadowRoot.querySelector('input');
    }
    connectedCallback() {
        if (this.hasAttribute('placeholder')) this._input.placeholder = this.getAttribute('placeholder');
        if (this.hasAttribute('value')) this._input.value = this.getAttribute('value');
    }
    get value() { return this._input.value; }
    set value(val) { this._input.value = val; }
    clear() { this._input.value = ''; }
});

customElements.define('v-badge', class extends HTMLElement {
    static get observedAttributes() { return ['status']; }
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>
                .badge { font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: 10px; font-weight: bold; font-family: inherit; }
                .local { background: #fff3cd; color: #856404; }
                .synced { background: #d4edda; color: #155724; }
            </style>
            <span class="badge local"><slot></slot></span>
        `;
        this._span = this.shadowRoot.querySelector('.badge');
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'status') this._span.className = `badge ${newValue === 'synced' ? 'synced' : 'local'}`;
    }
});

const VerticalLayout = (...c) => new Component('v-layout').attr('direction', 'vertical').add(...c);
const HorizontalLayout = (...c) => new Component('v-layout').attr('direction', 'horizontal').add(...c);
const Card = (...c) => new Component('v-card').add(...c);
const H2 = (txt) => new Component('h2').text(txt);
const Text = (txt) => new Component('span').text(txt);
const Paragraph = (txt) => new Component('p').text(txt);

class Button extends Component {
    constructor(text, onClickHandler, variant = 'primary') {
        super('v-button');
        this.text(text);
        if (variant !== 'primary') this.attr('variant', variant);
        if (onClickHandler) this.onClick(onClickHandler);
    }
}

class TextField extends Component {
    constructor(placeholder = '') {
        super('v-textfield');
        if (placeholder) this.attr('placeholder', placeholder);
    }
    getValue() { return this.el.value; }
    setValue(val) { this.el.value = val; return this; }
    clear() { this.el.clear(); return this; }
}

class Badge extends Component {
    constructor(text, isSynced) {
        super('v-badge');
        this.attr('status', isSynced ? 'synced' : 'local').text(text);
    }
}

// =========================================================================
// 3. DOMAIN MODEL & DATABASE LAYER
// =========================================================================
class Task {
    constructor({ id = Date.now().toString(), title, synced = 0, createdAt = Date.now(), editing = false }) {
        this.id = id;
        this.title = title;
        this.synced = synced;
        this.createdAt = createdAt;
        this.editing = editing;
    }
}

class TaskRepository {
    constructor() {
        this.dbName = 'VaadinCapacitorDB';
        this.storeName = 'tasks';
    }

    async getDatabase() {
        return new Promise((res) => {
            const req = indexedDB.open(this.dbName, 1);
            req.onupgradeneeded = () => req.result.createObjectStore(this.storeName, { keyPath: 'id' });
            req.onsuccess = () => res(req.result);
        });
    }

    async findAll() {
        const db = await this.getDatabase();
        return new Promise(res => {
            const req = db.transaction(this.storeName, 'readonly').objectStore(this.storeName).getAll();
            req.onsuccess = () => res(req.result.map(data => new Task(data)));
        });
    }

    async save(task) {
        const db = await this.getDatabase();
        return new Promise(res => {
            const tx = db.transaction(this.storeName, 'readwrite');
            tx.objectStore(this.storeName).put(task);
            tx.oncomplete = () => res(task);
        });
    }

    async deleteById(id) {
        const db = await this.getDatabase();
        return new Promise(res => {
            const tx = db.transaction(this.storeName, 'readwrite');
            tx.objectStore(this.storeName).delete(id);
            tx.oncomplete = () => res();
        });
    }

    async saveAllAndClear(tasks) {
        const db = await this.getDatabase();
        return new Promise(res => {
            const tx = db.transaction(this.storeName, 'readwrite');
            const store = tx.objectStore(this.storeName);
            store.clear();
            tasks.forEach(t => store.put(t));
            tx.oncomplete = () => res();
        });
    }
}

// =========================================================================
// 4. SERVICE LAYER (DIRECT DOM REPLACEMENT + NATIVE INTEGRATION)
// =========================================================================
class TaskService {
    constructor(repository) {
        this.taskRepository = repository;
        this.serverUrl = 'http://localhost:3000';
    }

    async updateCountBadge() {
        const tasks = await this.getTasks();
        updateDOM('update', 'cart-count-badge', Text(`${tasks.length}`));
    }

    async getTasks() {
        return await this.taskRepository.findAll();
    }

    async createTask(title) {
        const task = new Task({ title, synced: 0 });
        await this.taskRepository.save(task);
        await this.updateCountBadge();

        await NativeService.vibrate();
        await NativeService.showToast(`Task added!`);
        return task;
    }

    async updateTask(task) {
        const updated = await this.taskRepository.save(task);
        await this.updateCountBadge();
        return updated;
    }

    async deleteTask(id) {
        await this.taskRepository.deleteById(id);
        await this.updateCountBadge();
        await NativeService.vibrate();
        await NativeService.showToast('Task deleted');
        if (navigator.onLine) {
            fetch(`${this.serverUrl}/api/tasks/${id}`, { method: 'DELETE' }).catch(() => {});
        }
    }

    async syncWithRemoteServer() {
        if (!navigator.onLine) return;
        try {
            const localTasks = await this.taskRepository.findAll();
            const unsynced = localTasks.filter(t => !t.synced);

            if (unsynced.length > 0) {
                const res = await fetch(`${this.serverUrl}/api/sync`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tasks: unsynced })
                });
                if (res.ok) {
                    const { syncedIds } = await res.json();
                    for (const task of localTasks) {
                        if (syncedIds.includes(task.id)) {
                            task.synced = 1;
                            await this.taskRepository.save(task);
                        }
                    }
                }
            }

            const getRes = await fetch(`${this.serverUrl}/api/tasks`);
            if (getRes.ok) {
                const { tasks: serverTasks } = await getRes.json();
                await this.taskRepository.saveAllAndClear(serverTasks);
                await this.updateCountBadge();
                await NativeService.showToast('Server sync completed');
                AppRouter.renderCurrentRoute();
            }
        } catch (err) {
            console.log('Server offline - using local store.');
        }
    }
}

const taskRepository = new TaskRepository();
const taskService = new TaskService(taskRepository);

// =========================================================================
// 5. VIEW & BADGE COMPONENTS
// =========================================================================
class CartBadgeComponent extends Component {
    constructor() {
        super('span');
        this.addClass('cart-badge').id('cart-count-badge').text('0');
        taskService.getTasks().then(tasks => this.text(`${tasks.length}`));
    }
}

class TaskItemComponentBuilder {
    static build(task) {
        const li = new Component('li').id(`task-${task.id}`);

        if (task.editing) {
            const editInput = new TextField().setValue(task.title);

            const saveBtn = new Button('Save', async () => {
                const newTitle = editInput.getValue().trim();
                if (newTitle) {
                    task.title = newTitle;
                    task.synced = 0;
                    delete task.editing;
                    await taskService.updateTask(task);
                    updateDOM('replace', `task-${task.id}`, TaskItemComponentBuilder.build(task));
                    taskService.syncWithRemoteServer();
                }
            });

            const cancelBtn = new Button('Cancel', async () => {
                delete task.editing;
                await taskService.updateTask(task);
                updateDOM('replace', `task-${task.id}`, TaskItemComponentBuilder.build(task));
            }, 'secondary');

            li.add(HorizontalLayout(editInput, saveBtn, cancelBtn).addClass('edit-mode'));
        } else {
            const titleText = Text(`📌 ${task.title}`);
            const badge = new Badge(task.synced ? 'Synced' : 'Local', task.synced);

            const editBtn = new Button('Edit', async () => {
                task.editing = true;
                await taskService.updateTask(task);
                updateDOM('replace', `task-${task.id}`, TaskItemComponentBuilder.build(task));
            }, 'secondary');

            const deleteBtn = new Button('Delete', async () => {
                await taskService.deleteTask(task.id);
                updateDOM('remove', `task-${task.id}`);
            }, 'danger');

            const actions = HorizontalLayout(badge, editBtn, deleteBtn).addClass('actions');
            li.add(titleText, actions);
        }

        return li;
    }
}

class TaskView {
    static async render() {
        const container = VerticalLayout();
        container.add(H2('Task Manager'));

        const taskInput = new TextField('Add new task...');
        const addButton = new Button('Add Task', async () => {
            const title = taskInput.getValue().trim();
            if (!title) return;

            const newTask = await taskService.createTask(title);
            taskInput.clear();

            updateDOM('prepend', 'task-list', TaskItemComponentBuilder.build(newTask));
            taskService.syncWithRemoteServer();
        });

        container.add(HorizontalLayout(taskInput, addButton));

        const tasks = await taskService.getTasks();
        const taskList = new Component('ul').id('task-list');

        tasks.reverse().forEach(task => {
            taskList.add(TaskItemComponentBuilder.build(task));
        });

        container.add(taskList);
        return container;
    }
}

class SyncSettingsView {
    static async render() {
        const tasks = await taskService.getTasks();
        const pending = tasks.filter(t => !t.synced).length;

        const versionStr = window.APP_VERSION || '1.0.0-dev';

        return VerticalLayout(
            H2('Settings'),
            Paragraph(`Database Engine: IndexedDB (TaskRepository)`),
            Paragraph(`Unsynced Tasks: ${pending}`),
            Paragraph(`App Version: ${versionStr}`),
            new Button('Sync with Backend', async () => {
                await taskService.syncWithRemoteServer();
            }),
            new Button('Check for Updates', async () => {
                if (window.otaClient) {
                    await window.otaClient.check(false);
                } else {
                    await NativeService.showToast('OTA not initialized');
                }
            }, 'secondary')
        );
    }
}

// =========================================================================
// 6. ROUTER & INITIALIZATION
// =========================================================================
class AppRouter {
    static currentRoute = '/';
    static navContainer = null;
    static appContainer = null;

    static init() {
        const root = document.getElementById('root');

        const tasksNavBtn = new Button('Tasks', () => this.navigate('/'), 'outline').addClass('active');
        const cartBadge = new CartBadgeComponent();
        tasksNavBtn.add(cartBadge);

        this.navContainer = HorizontalLayout(
            tasksNavBtn,
            new Button('Settings', () => this.navigate('/settings'), 'outline')
        ).addClass('nav');

        this.appContainer = Card();
        root.appendChild(this.navContainer.el);
        root.appendChild(this.appContainer.el);

        window.addEventListener('popstate', () => {
            this.currentRoute = window.location.pathname || '/';
            this.renderCurrentRoute();
        });

        this.renderCurrentRoute();
    }

    static async navigate(path) {
        this.currentRoute = path;
        window.history.pushState({}, '', path);
        await this.renderCurrentRoute();
    }

    static async renderCurrentRoute() {
        const buttons = this.navContainer.el.querySelectorAll('v-button');
        if (buttons.length >= 2) {
            buttons[0].classList.toggle('active', this.currentRoute === '/');
            buttons[1].classList.toggle('active', this.currentRoute === '/settings');
        }

        let viewComponent;
        switch (this.currentRoute) {
            case '/settings':
                viewComponent = await SyncSettingsView.render();
                break;
            case '/':
            default:
                viewComponent = await TaskView.render();
                break;
        }

        this.appContainer.removeAll().add(viewComponent);
    }
}

window.addEventListener('online', () => taskService.syncWithRemoteServer());
window.addEventListener('DOMContentLoaded', () => {
    AppRouter.init();
    taskService.syncWithRemoteServer();
    // OTA initialization will be handled in ota.js
});
