const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const Store = require('electron-store');
const powernet = require('./private_modules/powernet-api');

const store = new Store();

function createWindow() {
  const win = new BrowserWindow({
    width: 1200, height: 900, backgroundColor: '#000000', autoHideMenuBar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true, preload: path.join(__dirname, 'preload.js') }
  });
  win.loadFile('index.html');
}

app.whenReady().then(() => {
  const filter = {
    urls: [
        'https://*.powernet.com.ru/*', 
        'http://*.powernet.com.ru/*',
        'wss://*.powernet.com.ru/*'
    ]
  };

session.defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {

    if (details.url.includes('flussonic')) {
        details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36';
        details.requestHeaders['X-Requested-With'] = 'com.powermobile.hello';
        details.requestHeaders['Referer'] = 'https://cam.powernet.com.ru/';
        details.requestHeaders['Origin'] = 'https://cam.powernet.com.ru';
    }
    
    callback({ requestHeaders: details.requestHeaders });
  });
  createWindow();
});

ipcMain.handle('get-accounts', () => store.get('accounts', []));
ipcMain.handle('add-account', (event, acc) => {
    const accounts = store.get('accounts', []);
    accounts.push(acc);
    store.set('accounts', accounts);
    return true;
});
ipcMain.handle('delete-account', (event, login) => {
    const accounts = store.get('accounts', []);
    store.set('accounts', accounts.filter(acc => String(acc.login) !== String(login)));
    return true;
});

ipcMain.handle('fetch-data', (event, acc) => powernet.getFullData(acc.login, acc.password));
ipcMain.handle('get-all-cameras', () => powernet.getAllCameras());
ipcMain.handle('get-stream-url', (event, creds) => powernet.getStreamUrl(creds.login, creds.password, creds.streamId));
ipcMain.handle('get-pay-link', (event, data) => powernet.getPaymentLink(data.login, data.amount, data.method));
ipcMain.handle('get-credit', (event, acc) => powernet.getCreditStatus(acc.login, acc.password));
ipcMain.handle('activate-credit', (event, data) => powernet.activateCredit(data.login, data.password, data.days));
ipcMain.handle('get-stats', (event, acc) => powernet.getStatData(acc.login, acc.password));

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });