const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const Store = require('electron-store');
const powernet = require('./private_modules/powernet-api');

const store = new Store();

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 900,
    backgroundColor: '#050505',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.loadFile('index.html');
}

app.whenReady().then(() => {
  const filter = {
    urls: [
        'https://*.powernet.com.ru/*', 
        'http://*.powernet.com.ru/*'
    ]
  };

  session.defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
    I
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
});
ipcMain.handle('delete-account', (event, login) => {
    const accounts = store.get('accounts', []);
    const updatedAccounts = accounts.filter(acc => acc.login !== login);
    store.set('accounts', updatedAccounts);
    return true;
});
ipcMain.handle('fetch-data', (event, acc) => powernet.getFullData(acc.login, acc.password));
ipcMain.handle('get-all-cameras', () => powernet.getAllCameras());
ipcMain.handle('get-stream-url', (event, creds) => powernet.getStreamUrl(creds.login, creds.password, creds.streamId));
ipcMain.handle('get-net-status', (event, acc) => powernet.getNetworkStatus(acc.login, acc.password));
ipcMain.handle('reset-net-status', async (event, { hash, requests }) => {
    let successCount = 0;

    for (const req of requests) {
        const zid = req.ID || req.zid;
        if (await powernet.resetNetworkStatus(hash, zid)) successCount++;
    }
    return successCount > 0;
});
ipcMain.handle('get-pay-link', (event, data) => {
    return powernet.getPaymentLink(data.login, data.amount, data.method);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});