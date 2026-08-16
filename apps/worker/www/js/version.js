window.APP_VERSION = '1.0.0-dev';
window.APP_NAME = 'worker';
window.DEFAULT_SERVER_URL = 'http://localhost:3000';
window.getServerUrl = function() {
    return localStorage.getItem('ota:serverUrl') || window.DEFAULT_SERVER_URL;
};
window.setServerUrl = function(url) {
    if (url) localStorage.setItem('ota:serverUrl', url);
    else localStorage.removeItem('ota:serverUrl');
};

