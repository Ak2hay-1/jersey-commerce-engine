const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('jceDesktop', {
  isDesktop: true,
  getMode: () => ipcRenderer.invoke('desktop:get-mode'),
  switchMode: (mode) => ipcRenderer.invoke('desktop:switch-mode', mode),
  getApiUrl: () => ipcRenderer.invoke('desktop:get-api-url'),
});
