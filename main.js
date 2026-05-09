const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const Store = require('electron-store');
const powernet = require('./private_modules/powernet-api');

const store = new Store();

function createWindow() {
  const win = new BrowserWindow({
    width: 1250, height: 900,
    backgroundColor: '#000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  win.loadFile('index.html');
}

app.whenReady().then(() => {
  const filter = { urls: ['https://*.powernet.com.ru/*', 'http://*.powernet.com.ru/*'] };
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
ipcMain.handle('add-account', (e, acc) => {
    const accs = store.get('accounts', []);
    accs.push(acc);
    store.set('accounts', accs);
    return true;
});
ipcMain.handle('delete-account', (e, login) => {
    const accs = store.get('accounts', []);
    store.set('accounts', accs.filter(a => String(a.login) !== String(login)));
    return true;
});

ipcMain.handle('fetch-data', (e, acc) => powernet.getFullData(acc.login, acc.password));
ipcMain.handle('get-all-cameras', () => powernet.getAllCameras());
ipcMain.handle('get-stream-url', (e, c) => powernet.getStreamUrl(c.login, c.password, c.streamId));
ipcMain.handle('get-pay-link', (e, d) => powernet.getPaymentLink(d.login, d.amount, d.method));

ipcMain.handle('get-credit', (e, acc) => powernet.getCreditStatus(acc.login, acc.password));
ipcMain.handle('activate-credit', (e, d) => powernet.activateCredit(d.login, d.password, d.days));
ipcMain.handle('get-stats', (e, acc) => powernet.getStatData(acc.login, acc.password));

app.on('window-all-closed', () => app.quit());