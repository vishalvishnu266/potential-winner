/**
 * Worker App Logic
 */

class HomepageView {
    static async render() {
        return VerticalLayout(
            H1('ERP Worker Terminal'),
            Paragraph('Welcome, Operator. System status is nominal.'),
            Card(
                H2('Active Jobs'),
                Paragraph('No active jobs assigned to your terminal.')
            )
        ).addClass('page');
    }
}

class SettingsView {
    static async render() {
        const versionStr = window.APP_VERSION || '1.0.0-dev';
        const currentServer = window.getServerUrl();
        const serverInput = new TextField('ERP Server URL').setValue(currentServer);
        
        const saveBtn = new Button('Save Server Config', async () => {
            const url = serverInput.getValue().trim();
            if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
                window.setServerUrl(url);
                await NativeService.showToast('Worker node config updated');
                AppRouter.renderCurrentRoute();
            } else {
                await NativeService.showToast('Invalid URL');
            }
        }, 'secondary');

        return VerticalLayout(
            H2('Terminal Settings'),
            Paragraph(`Build Version: ${versionStr}`),
            Paragraph('OTA Node Gateway:'),
            HorizontalLayout(serverInput, saveBtn),
            new Button('Force Sync', () => ERPService.syncWithRemoteServer(), 'outline'),
            new Button('Check Updates', () => window.otaClient?.check(false), 'outline')
        ).addClass('page');
    }
}

class AppRouter {
    static currentRoute = '/';
    static appContainer = null;

    static init() {
        const root = document.getElementById('root');
        this.appContainer = new Component('main').id('app-container');
        
        const tabList = [
            { id: 'home', label: 'Terminal', path: '/', icon: '📋' },
            { id: 'settings', label: 'Setup', path: '/settings', icon: '🛠️' }
        ];

        const tabBar = new Component('nav').addClass('tab-bar');
        tabList.forEach(tab => {
            const btn = new Component('div').addClass('tab-item')
                .add(Text(tab.icon), Text(tab.label))
                .onClick(() => this.navigate(tab.path));
            btn.el.dataset.path = tab.path;
            tabBar.add(btn);
        });

        root.appendChild(this.appContainer.el);
        root.appendChild(tabBar.el);

        window.addEventListener('popstate', () => {
            this.currentRoute = window.location.pathname || '/';
            this.renderCurrentRoute();
        });

        this.renderCurrentRoute();
    }

    static async navigate(path) {
        if (this.currentRoute === path) return;
        this.currentRoute = path;
        window.history.pushState({}, '', path);
        await this.renderCurrentRoute();
    }

    static async renderCurrentRoute() {
        document.querySelectorAll('.tab-item').forEach(el => {
            el.classList.toggle('active', el.dataset.path === this.currentRoute);
        });

        let view;
        if (this.currentRoute === '/settings') {
            view = await SettingsView.render();
        } else {
            view = await HomepageView.render();
        }

        this.appContainer.removeAll().add(view);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    AppRouter.init();
    ERPService.syncWithRemoteServer();
});
