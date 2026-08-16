class ERPItemComponentBuilder {
    static build(record) {
        const li = new Component('li').id(`erp-${record.id}`);
        const titleText = Text(`💼 JOB: ${record.title}`);
        const badge = new Badge(record.synced ? 'Synced' : 'Local', record.synced);
        const acceptBtn = new Button('Process Order', async () => {
            await NativeService.vibrate();
            await NativeService.showToast('Order Processed!');
        });
        li.add(titleText, HorizontalLayout(badge, acceptBtn).addClass('actions'));
        return li;
    }
}

class ERPView {
    static async render() {
        const container = VerticalLayout().add(H2('ERP Worker: Inventory & Jobs'));
        const records = await erpService.getRecords();
        const recordList = new Component('ul').id('erp-list');
        records.reverse().forEach(record => recordList.add(ERPItemComponentBuilder.build(record)));
        return container.add(recordList);
    }
}

class SyncSettingsView {
    static async render() {
        const records = await erpService.getRecords();
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
            Paragraph(`Worker Profile: Active`),
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
        this.navContainer = HorizontalLayout(
            new Button('Jobs', () => this.navigate('/'), 'outline').addClass('active'),
            new Button('Settings', () => this.navigate('/settings'), 'outline')
        ).addClass('nav');
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
