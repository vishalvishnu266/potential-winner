window.APP_VERSION = '1.0.0-20260816065740';
window.APP_NAME = 'customer';
window.DEFAULT_SERVER_URL = 'http://192.168.0.5:3000';
window.getServerUrl = function() { return localStorage.getItem('ota:serverUrl') || window.DEFAULT_SERVER_URL; };
window.setServerUrl = function(url) { if (url) localStorage.setItem('ota:serverUrl', url); else localStorage.removeItem('ota:serverUrl'); };
