const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getAccounts: () => ipcRenderer.invoke('get-accounts'),
  addAccount: (acc) => ipcRenderer.invoke('add-account', acc),
  deleteAccount: (login) => ipcRenderer.invoke('delete-account', login),
  fetchData: (acc) => ipcRenderer.invoke('fetch-data', acc),
  getAllCameras: () => ipcRenderer.invoke('get-all-cameras'),
  getStreamUrl: (creds) => ipcRenderer.invoke('get-stream-url', creds),
  getPayLink: (data) => ipcRenderer.invoke('get-pay-link', data),
  
  getCredit: (acc) => ipcRenderer.invoke('get-credit', acc),
  activateCredit: (data) => ipcRenderer.invoke('activate-credit', data),
  getStats: (acc) => ipcRenderer.invoke('get-stats', acc)
});