const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),

  // Theme
  getTheme: () => ipcRenderer.invoke('config:getTheme'),
  setTheme: (theme) => ipcRenderer.invoke('config:setTheme', theme),

    // Dialogs
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
  selectFile: () => ipcRenderer.invoke('dialog:selectFile'),
  selectIconFolder: () => ipcRenderer.invoke('dialog:selectIconFolder'),
  selectOutputFolder: () => ipcRenderer.invoke('dialog:selectOutputFolder'),
  selectIcoFile: () => ipcRenderer.invoke('dialog:selectIcoFile'),
  selectPng: () => ipcRenderer.invoke('dialog:selectPng'),
  selectShortcutDir: () => ipcRenderer.invoke('dialog:selectShortcutDir'),

  // Config
  getIconFolder: () => ipcRenderer.invoke('config:getIconFolder'),
  getIconFolderPath: () => ipcRenderer.invoke('config:getIconFolderPath'),
  getOutputFolder: () => ipcRenderer.invoke('config:getOutputFolder'),

    // Icons
  scanIcons: () => ipcRenderer.invoke('icons:scan'),
  applyToFolder: (data) => ipcRenderer.invoke('icon:applyToFolder', data),
  applyToShortcut: (data) => ipcRenderer.invoke('icon:applyToShortcut', data),
  applyToExe: (data) => ipcRenderer.invoke('icon:applyToExe', data),
  createShortcut: (data) => ipcRenderer.invoke('icon:createShortcut', data),
  refreshCache: (targetPath) => ipcRenderer.invoke('icon:refreshCache', targetPath || null),

  // Explorer
  restartExplorer: () => ipcRenderer.invoke('explorer:restart'),
  openFolder: (path) => ipcRenderer.invoke('shell:openFolder', path),

  // Permissions
  checkPermissions: (folder) => ipcRenderer.invoke('folder:checkPermissions', folder),

  // Converter
  convertPngToIco: (data) => ipcRenderer.invoke('convert:pngToIco', data),
  batchConvertPngToIco: (data) => ipcRenderer.invoke('convert:batchPngToIco', data),

  // App
  getLogo: () => ipcRenderer.invoke('app:getLogo'),
});
