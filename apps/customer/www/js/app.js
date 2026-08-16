class CartBadgeComponent extends Component {
    constructor() {
        super('span');
        this.addClass('cart-badge').id('cart-count-badge').text('0');
        erpService.getRecords().then(records => this.text(`${records.length}`));
    }
}

class ERPItemComponentBuilder {
    static build(record) {
        const li = new Component('li').id(`erp-${record.id}`);
        if (record.editing) {
            const editInput = new TextField().setValue(record.title);
            const saveBtn = new Button('Save', async () => {
                const newTitle = editInput.getValue().trim();
                if (newTitle) {
                    record.title = newTitle; record.synced = 0; delete record.editing;
                    await erpService.updateRecord(record);
                    updateDOM('replace', `erp-${record.id}`, ERPItemComponentBuilder.build(record));
                    erpService.syncWithRemoteServer();
                }
            });
            const cancelBtn = new Button('Cancel', async () => {
                delete record.editing; await erpService.updateRecord(record);
                updateDOM('replace', `erp-${record.id}`, ERPItemComponentBuilder.build(record));
            }, 'secondary');
            li.add(HorizontalLayout(editInput, saveBtn, cancelBtn).addClass('edit-mode'));
        } else {
            const titleText = Text(`📦 ${record.title}`);
            const badge = new Badge(record.synced ? 'Synced' : 'Local', record.synced);
            const editBtn = new Button('Edit', async () => {
                record.editing = true; await erpService.updateRecord(record);
                updateDOM('replace', `erp-${record.id}`, ERPItemComponentBuilder.build(record));
            }, 'secondary');
            const deleteBtn = new Button('Delete', async () => {
                await erpService.deleteRecord(record.id); updateDOM('remove', `erp-${record.id}`);
            }, 'danger');
            li.add(titleText, HorizontalLayout(badge, editBtn, deleteBtn).addClass('actions'));
        }
        return li;
    }
}

class ERPView {
    static async render() {
        const container = VerticalLayout().add(H2('ERP: Client Management'));
        const recordInput = new TextField('Enter new client or record...');
        const addButton = new Button('Add Record', async () => {
            const title = recordInput.getValue().trim();
            if (!title) return;
            const newRecord = await erpService.createRecord(title);
            recordInput.clear();
            updateDOM('prepend', 'erp-list', ERPItemComponentBuilder.build(newRecord));
            erpService.syncWithRemoteServer();
        });
        container.add(HorizontalLayout(recordInput, addButton));
        const records = await erpService.getRecords();
        const recordList = new Component('ul').id('erp-list');
        records.reverse().forEach(record => recordList.add(ERPItemComponentBuilder.build(record)));
        return container.add(recordList);
    }
}

class SyncSettingsView {
    static async render() {
        const records = await erpService.getRecords();
        const pending = records.filter(t => !t.synced).length;
        const versionStr = window.APP_VERSION || '1.0.0-dev';
        const currentServer = window.getServerUrl();
        const serverInput = new TextField('ERP Server URL').setValue(currentServer);
        const saveBtn = new Button('Save Server URL', async () => {
            const url = serverInput.getValue().trim();
            if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
                window.setServerUrl(url); await NativeService.showToast('ERP Server updated'); AppRouter.renderCurrentRoute();
            } else await NativeService.showToast('Invalid URL');
        }, 'secondary');

        return VerticalLayout(
            H2('Settings'),
            Paragraph(`Database: IndexedDB`),
            Paragraph(`Unsynced: ${pending}`),
            Paragraph(`Version: ${versionStr}`),
            Paragraph('ERP OTA Config:'),
            HorizontalLayout(serverInput, saveBtn),
            new Button('Sync with Backend', () => erpService.syncWithRemoteServer()),
            new Button('Check for Updates', () => window.otaClient?.check(false), 'secondary')
        );
    }
}

class AppRouter {
    static currentRoute = '/';
    static navContainer = null; static appContainer = null;
    static init() {
        const root = document.getElementById('root');
        const recordsNavBtn = new Button('Records', () => this.navigate('/'), 'outline').addClass('active');
        recordsNavBtn.add(new CartBadgeComponent());
        this.navContainer = HorizontalLayout(recordsNavBtn, new Button('Settings', () => this.navigate('/settings'), 'outline')).addClass('nav');
        this.appContainer = Card();
        root.appendChild(this.navContainer.el); root.appendChild(this.appContainer.el);
        window.addEventListener('popstate', () => { this.currentRoute = window.location.pathname || '/'; this.renderCurrentRoute(); });
        this.renderCurrentRoute();
    }
    static async navigate(path) { this.currentRoute = path; window.history.pushState({}, '', path); await this.renderCurrentRoute(); }
    static async renderCurrentRoute() {
        const buttons = this.navContainer.el.querySelectorAll('v-button');
        if (buttons.length >= 2) { buttons[0].classList.toggle('active', this.currentRoute === '/'); buttons[1].classList.toggle('active', this.currentRoute === '/settings'); }
        this.appContainer.removeAll().add(this.currentRoute === '/settings' ? await SyncSettingsView.render() : await ERPView.render());
    }
}

window.addEventListener('online', () => erpService.syncWithRemoteServer());
window.addEventListener('DOMContentLoaded', () => { AppRouter.init(); erpService.syncWithRemoteServer(); });
