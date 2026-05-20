const { app, BrowserWindow, ipcMain, dialog, protocol, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

let mainWindow;
let iconFolderPath = 'C:\\Windows\\System32';
let outputFolderPath = '';
let sharpModule = null;

// Try to load sharp (works in dev, may fail in production)
try {
  sharpModule = require('sharp');
} catch (e) {
  console.log('Sharp not available, using nativeImage fallback');
}

const configPath = path.join(app.getPath('userData'), 'config.json');

function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch (e) {}
  return { iconFolder: 'C:\\Windows\\System32', outputFolder: '', theme: 'dark' };
}

function saveConfig(config) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function execAsync(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout: 30000 }, (err, stdout, stderr) => {
      if (err) reject(err);
      else resolve(stdout);
    });
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// === RESIZE IMAGE using nativeImage (no sharp needed) ===
function resizeImage(inputBuffer, size) {
  try {
    let img = nativeImage.createFromBuffer(inputBuffer);
    if (img.isEmpty()) return null;
    img = img.resize({ width: size, height: size, quality: 'best' });
    return img.toPNG();
  } catch (e) {
    return null;
  }
}

// === RESIZE with sharp if available, fallback to nativeImage ===
async function resizeImageSmart(inputBuffer, size) {
  if (sharpModule) {
    try {
      return await sharpModule(inputBuffer)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
    } catch (e) {}
  }
  return resizeImage(inputBuffer, size);
}

// === CREATE THUMBNAIL ===
async function createThumbnail(filePath) {
  try {
    const raw = fs.readFileSync(filePath);

    // Try sharp first
    if (sharpModule) {
      try {
        const buffer = await sharpModule(filePath, { pages: 1 })
          .resize(48, 48, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer();
        return `data:image/png;base64,${buffer.toString('base64')}`;
      } catch (e) {}
    }

    // Fallback: nativeImage
    try {
      const img = nativeImage.createFromBuffer(raw);
      if (!img.isEmpty()) {
        const resized = img.resize({ width: 48, height: 48, quality: 'best' });
        const png = resized.toPNG();
        return `data:image/png;base64,${png.toString('base64')}`;
      }
    } catch (e) {}

    // Last fallback: raw file as base64
    return `data:image/x-icon;base64,${raw.toString('base64')}`;
  } catch (e) {
    return null;
  }
}

function createWindow() {
  const config = loadConfig();
  iconFolderPath = config.iconFolder || 'C:\\Windows\\System32';
  const defaultOutput = path.join(app.getPath('documents'), 'ColoIcons');
  outputFolderPath = config.outputFolder || defaultOutput;

  if (!fs.existsSync(outputFolderPath)) {
    try { fs.mkdirSync(outputFolderPath, { recursive: true }); } catch (e) {}
  }

  const assetsPath = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, 'assets');

  const icoPath = path.join(assetsPath, 'colocolo.ico');
  const pngPath = path.join(assetsPath, 'colocolo.png');

  let appIcon;
  if (fs.existsSync(icoPath)) {
    appIcon = nativeImage.createFromPath(icoPath);
  } else if (fs.existsSync(pngPath)) {
    appIcon = nativeImage.createFromPath(pngPath);
  }

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    backgroundColor: config.theme === 'light' ? '#faf5f0' : '#0f0b09',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
    icon: appIcon || undefined,
  });

    if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    // In production, dist is inside the asar at app root
    const indexPath = path.join(app.getAppPath(), 'dist', 'index.html');
    console.log('Loading:', indexPath, 'Exists:', fs.existsSync(indexPath));
    mainWindow.loadFile(indexPath);
  }

  // Debug: open devtools if load fails
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
    // Try alternative path
    const altPath = path.join(__dirname, 'dist', 'index.html');
    console.log('Trying alternative:', altPath, 'Exists:', fs.existsSync(altPath));
    if (fs.existsSync(altPath)) {
      mainWindow.loadFile(altPath);
    }
  });
}

app.whenReady().then(() => {
  protocol.registerFileProtocol('local-file', (request, callback) => {
    const filePath = decodeURIComponent(request.url.replace('local-file://', ''));
    callback({ path: filePath });
  });
  createWindow();
});

app.on('window-all-closed', () => app.quit());

// === WINDOW CONTROLS ===
ipcMain.handle('window:minimize', () => mainWindow.minimize());
ipcMain.handle('window:maximize', () => {
  mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
  return mainWindow.isMaximized();
});
ipcMain.handle('window:close', () => mainWindow.close());

// === THEME ===
ipcMain.handle('config:getTheme', () => loadConfig().theme || 'dark');
ipcMain.handle('config:setTheme', (event, theme) => {
  const config = loadConfig();
  config.theme = theme;
  saveConfig(config);
  return true;
});

// === SELECT FOLDER ===
ipcMain.handle('dialog:selectFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Seleccionar carpeta',
    properties: ['openDirectory'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const targetPath = result.filePaths[0];
  try {
    return {
      path: targetPath,
      name: path.basename(targetPath),
      isDirectory: true,
      isExe: false,
      isLnk: false,
      extension: '',
      supportsDirectIcon: true,
      supportsShortcut: false,
    };
  } catch (e) {
    return null;
  }
});

// === SELECT FILE ===
ipcMain.handle('dialog:selectFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Seleccionar archivo',
    properties: ['openFile'],
    filters: [
      { name: 'Todos los archivos', extensions: ['*'] },
    ],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const targetPath = result.filePaths[0];
  try {
    const ext = path.extname(targetPath).toLowerCase();
    const isExe = ext === '.exe';
    const isLnk = ext === '.lnk';

    return {
      path: targetPath,
      name: path.basename(targetPath),
      isDirectory: false,
      isExe,
      isLnk,
      extension: ext,
      supportsDirectIcon: isLnk || isExe,
      supportsShortcut: !isLnk && !isExe,
    };
  } catch (e) {
    return null;
  }
});

// === APPLY ICON TO EXE (rcedit) ===
ipcMain.handle('icon:applyToExe', async (event, { targetPath, iconPath }) => {
  try {
    // rcedit path — works in dev and production
    let rceditPath;
    try {
      rceditPath = require.resolve('rcedit/bin/rcedit-x64.exe');
    } catch (e) {
      // Fallback: look in node_modules
      const possible = [
        path.join(__dirname, 'node_modules', 'rcedit', 'bin', 'rcedit-x64.exe'),
        path.join(app.getAppPath(), 'node_modules', 'rcedit', 'bin', 'rcedit-x64.exe'),
      ];
      for (const p of possible) {
        if (fs.existsSync(p)) { rceditPath = p; break; }
      }
    }

    if (!rceditPath || !fs.existsSync(rceditPath)) {
      return { success: false, message: 'rcedit no encontrado. Reinstala la app.' };
    }

    // Verify target exists and is writable
    if (!fs.existsSync(targetPath)) {
      return { success: false, message: 'El archivo no existe' };
    }

    // Check write permissions on the exe
    try {
      fs.accessSync(targetPath, fs.constants.W_OK);
    } catch (e) {
      return {
        success: false,
        message: 'Sin permisos para modificar este .exe. Intenta copiar el .exe a otra ubicación primero.',
      };
    }

    // Verify ico exists
    if (!fs.existsSync(iconPath)) {
      return { success: false, message: 'El archivo .ico no existe' };
    }

    // Execute rcedit
    const cmd = `"${rceditPath}" "${targetPath}" --set-icon "${iconPath}"`;
    await execAsync(cmd);

    // Refresh
    await notifyShellChange(targetPath);
    await notifyShellChange(path.dirname(targetPath));
    await refreshIconCacheAggressive();

    return { success: true, message: `Icono del .exe cambiado: ${path.basename(targetPath)}` };
  } catch (e) {
    // Common errors
    const msg = e.message || '';
    if (msg.includes('Access is denied') || msg.includes('acceso')) {
      return {
        success: false,
        message: 'Acceso denegado. El .exe puede estar en uso o protegido. Ciérralo e intenta de nuevo.',
      };
    }
    return { success: false, message: `Error: ${e.message}` };
  }
});

// === CREATE SHORTCUT WITH ICON ===
ipcMain.handle('icon:createShortcut', async (event, { targetPath, iconPath, shortcutDir }) => {
  try {
    const baseName = path.basename(targetPath, path.extname(targetPath));
    let shortcutPath = path.join(shortcutDir, `${baseName}.lnk`);

    // Resolve name conflict
    let counter = 1;
    while (fs.existsSync(shortcutPath)) {
      shortcutPath = path.join(shortcutDir, `${baseName} (${counter}).lnk`);
      counter++;
    }

    const escapedTarget = targetPath.replace(/'/g, "''").replace(/\\/g, '\\\\');
    const escapedIcon = iconPath.replace(/'/g, "''").replace(/\\/g, '\\\\');
    const escapedShortcut = shortcutPath.replace(/'/g, "''").replace(/\\/g, '\\\\');
    const workDir = path.dirname(targetPath).replace(/'/g, "''").replace(/\\/g, '\\\\');

    const ps = `$shell = New-Object -ComObject WScript.Shell; $sc = $shell.CreateShortcut('${escapedShortcut}'); $sc.TargetPath = '${escapedTarget}'; $sc.WorkingDirectory = '${workDir}'; $sc.IconLocation = '${escapedIcon},0'; $sc.Save()`;

    await execAsync(`powershell -NoProfile -Command "${ps}"`);

    await notifyShellChange(shortcutDir);
    await refreshIconCacheAggressive();

    return {
      success: true,
      message: `Acceso directo creado: ${path.basename(shortcutPath)}`,
      shortcutPath,
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

// === SELECT SHORTCUT LOCATION ===
ipcMain.handle('dialog:selectShortcutDir', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Dónde guardar el acceso directo',
    properties: ['openDirectory'],
    defaultPath: path.join(app.getPath('desktop')),
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

// === ICON SOURCE FOLDER ===
ipcMain.handle('dialog:selectIconFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Seleccionar carpeta de iconos',
    properties: ['openDirectory'],
  });
  if (result.canceled) return null;
  const folderPath = result.filePaths[0];
  iconFolderPath = folderPath;
  const config = loadConfig();
  config.iconFolder = folderPath;
  saveConfig(config);
  return folderPath;
});

ipcMain.handle('config:getIconFolder', () => iconFolderPath);
ipcMain.handle('config:getIconFolderPath', () => iconFolderPath);

// === OUTPUT FOLDER ===
ipcMain.handle('dialog:selectOutputFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Carpeta donde guardar los .ico convertidos',
    properties: ['openDirectory'],
  });
  if (result.canceled) return null;
  const folderPath = result.filePaths[0];
  outputFolderPath = folderPath;
  const config = loadConfig();
  config.outputFolder = folderPath;
  saveConfig(config);
  return folderPath;
});

ipcMain.handle('config:getOutputFolder', () => outputFolderPath);

// === SCAN ICONS ===
ipcMain.handle('icons:scan', async () => {
  try {
    if (!fs.existsSync(iconFolderPath)) return [];
    const files = fs.readdirSync(iconFolderPath);
    const icoFiles = files
      .filter((f) => f.toLowerCase().endsWith('.ico'))
      .slice(0, 500);

    const results = [];
    for (const f of icoFiles) {
      const fullPath = path.join(iconFolderPath, f);
      const thumb = await createThumbnail(fullPath);
      results.push({ name: f, path: fullPath, thumb });
    }

    return results;
  } catch (e) {
    return [];
  }
});

// === SELECT SINGLE ICO FILE ===
ipcMain.handle('dialog:selectIcoFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Seleccionar archivo .ico',
    filters: [{ name: 'Iconos', extensions: ['ico'] }],
    properties: ['openFile'],
  });
  if (result.canceled) return null;
  const filePath = result.filePaths[0];
  const thumb = await createThumbnail(filePath);
  return { name: path.basename(filePath), path: filePath, thumb };
});

// === NOTIFY SHELL OF SPECIFIC FOLDER CHANGE ===
async function notifyShellChange(targetPath) {
  const escaped = targetPath.replace(/\\/g, '\\\\').replace(/'/g, "''");
  const ps = `
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class ShellNotify {
    [DllImport("shell32.dll")]
    public static extern void SHChangeNotify(int wEventId, uint uFlags, IntPtr dwItem1, IntPtr dwItem2);
    public static void NotifyUpdateDir(string path) {
        IntPtr pathPtr = Marshal.StringToHGlobalUni(path);
        SHChangeNotify(0x00001000, 0x0005, pathPtr, IntPtr.Zero);
        SHChangeNotify(0x00002000, 0x0005, pathPtr, IntPtr.Zero);
        SHChangeNotify(0x08000000, 0, IntPtr.Zero, IntPtr.Zero);
        Marshal.FreeHGlobal(pathPtr);
    }
}
'@
[ShellNotify]::NotifyUpdateDir('${escaped}')
  `.trim();

  try {
    await execAsync(`powershell -NoProfile -Command "${ps.replace(/"/g, '\\"')}"`);
  } catch (e) {}
}

// === GENERAL ICON CACHE REFRESH ===
async function refreshIconCacheAggressive() {
  try { exec('ie4uinit.exe -show'); } catch (e) {}
  try { exec('ie4uinit.exe -ClearIconCache'); } catch (e) {}
}

// === APPLY ICON TO FOLDER ===
ipcMain.handle('icon:applyToFolder', async (event, { targetPath, iconPath }) => {
  try {
    const desktopIniPath = path.join(targetPath, 'desktop.ini');

    try { await execAsync(`attrib -r -s -h "${targetPath}"`); } catch (e) {}
    await sleep(150);

    if (fs.existsSync(desktopIniPath)) {
      try { await execAsync(`attrib -h -s -r "${desktopIniPath}"`); } catch (e) {}
      await sleep(100);
      try { fs.unlinkSync(desktopIniPath); } catch (e) {
        try { await execAsync(`del /f /q "${desktopIniPath}"`); } catch (e2) {}
      }
      await sleep(150);
    }

    const content = [
      '[.ShellClassInfo]',
      `IconResource=${iconPath},0`,
      '[ViewState]',
      'Mode=',
      'Vid=',
      'FolderType=Generic',
      '',
    ].join('\r\n');

    fs.writeFileSync(desktopIniPath, content, { encoding: 'utf-8', flag: 'w' });
    await sleep(150);

    if (!fs.existsSync(desktopIniPath)) {
      return { success: false, message: 'No se pudo crear desktop.ini' };
    }

    try { await execAsync(`attrib +h +s "${desktopIniPath}"`); } catch (e) {}
    await sleep(100);
    try { await execAsync(`attrib +r "${targetPath}"`); } catch (e) {}
    await sleep(100);

    await notifyShellChange(targetPath);
    await notifyShellChange(path.dirname(targetPath));
    await refreshIconCacheAggressive();

    return { success: true, message: `Icono aplicado a: ${path.basename(targetPath)}` };
  } catch (e) {
    return { success: false, message: `Error: ${e.message}` };
  }
});

// === APPLY ICON TO SHORTCUT ===
ipcMain.handle('icon:applyToShortcut', async (event, { targetPath, iconPath }) => {
  try {
    const escapedTarget = targetPath.replace(/'/g, "''").replace(/\\/g, '\\\\');
    const escapedIcon = iconPath.replace(/'/g, "''").replace(/\\/g, '\\\\');
    const ps = `$shell = New-Object -ComObject WScript.Shell; $sc = $shell.CreateShortcut('${escapedTarget}'); $sc.IconLocation = '${escapedIcon},0'; $sc.Save()`;
    await execAsync(`powershell -NoProfile -Command "${ps}"`);
    await notifyShellChange(targetPath);
    await notifyShellChange(path.dirname(targetPath));
    await refreshIconCacheAggressive();
    return { success: true, message: `Icono aplicado a: ${path.basename(targetPath)}` };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

// === REFRESH CACHE ===
ipcMain.handle('icon:refreshCache', async (event, targetPath) => {
  if (targetPath) {
    await notifyShellChange(targetPath);
    await notifyShellChange(path.dirname(targetPath));
  }
  await refreshIconCacheAggressive();
  return true;
});

// === RESTART EXPLORER ===
ipcMain.handle('explorer:restart', async () => {
  try {
    await execAsync('taskkill /f /im explorer.exe');
    await sleep(1000);
    exec('start explorer.exe');
    return { success: true };
  } catch (e) {
    exec('start explorer.exe');
    return { success: false, message: e.message };
  }
});

// === CHECK PERMISSIONS ===
ipcMain.handle('folder:checkPermissions', async (event, folderPath) => {
  try {
    fs.accessSync(folderPath, fs.constants.W_OK);
    return { writable: true, needsAdmin: false };
  } catch (e) {
    return { writable: false, needsAdmin: true };
  }
});

// === SELECT PNG FILES ===
ipcMain.handle('dialog:selectPng', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Seleccionar imágenes',
    filters: [
      { name: 'Imágenes', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp'] },
    ],
    properties: ['openFile', 'multiSelections'],
  });
  if (result.canceled) return [];

  const files = [];
  for (const p of result.filePaths) {
    let thumb = null;
    try {
      const raw = fs.readFileSync(p);
      const img = nativeImage.createFromBuffer(raw);
      if (!img.isEmpty()) {
        const resized = img.resize({ width: 48, height: 48, quality: 'best' });
        thumb = `data:image/png;base64,${resized.toPNG().toString('base64')}`;
      }
    } catch (e) {}

    files.push({
      path: p,
      name: path.basename(p),
      baseName: path.basename(p, path.extname(p)),
      thumb,
    });
  }
  return files;
});

// === RESOLVE NAME CONFLICT ===
function resolveFileName(folder, baseName, ext) {
  let finalName = `${baseName}${ext}`;
  let finalPath = path.join(folder, finalName);
  let counter = 1;
  while (fs.existsSync(finalPath)) {
    finalName = `${baseName}_${counter}${ext}`;
    finalPath = path.join(folder, finalName);
    counter++;
  }
  return { finalName, finalPath };
}

// === CREATE ICO BUFFER (multi-size) ===
async function createIcoBuffer(inputBuffer) {
  const sizes = [16, 32, 48, 64, 128, 256];
  const images = [];

  for (const size of sizes) {
    const resized = await resizeImageSmart(inputBuffer, size);
    if (resized) {
      images.push({ size, data: resized });
    }
  }

  if (images.length === 0) throw new Error('No se pudo procesar la imagen');

  const numImages = images.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  let dataOffset = headerSize + (dirEntrySize * numImages);

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(numImages, 4);

  const dirEntries = [];
  const imageDataBuffers = [];

  for (const img of images) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(img.size >= 256 ? 0 : img.size, 0);
    entry.writeUInt8(img.size >= 256 ? 0 : img.size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(img.data.length, 8);
    entry.writeUInt32LE(dataOffset, 12);

    dataOffset += img.data.length;
    dirEntries.push(entry);
    imageDataBuffers.push(img.data);
  }

  return Buffer.concat([header, ...dirEntries, ...imageDataBuffers]);
}

// === CONVERT SINGLE ===
ipcMain.handle('convert:pngToIco', async (event, { pngPath, targetFolder }) => {
  try {
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    const pngBuffer = fs.readFileSync(pngPath);
    const baseName = path.basename(pngPath, path.extname(pngPath));
    const icoBuffer = await createIcoBuffer(pngBuffer);
    const { finalName, finalPath } = resolveFileName(targetFolder, baseName, '.ico');

    fs.writeFileSync(finalPath, icoBuffer);

    return {
      success: true,
      message: `Convertido: ${finalName}`,
      fileName: finalName,
      filePath: finalPath,
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

// === BATCH CONVERT ===
ipcMain.handle('convert:batchPngToIco', async (event, { pngPaths, targetFolder }) => {
  const results = [];

  if (!fs.existsSync(targetFolder)) {
    try { fs.mkdirSync(targetFolder, { recursive: true }); } catch (e) {
      return [{ success: false, name: 'all', error: `No se pudo crear carpeta: ${e.message}`, sourceName: 'all' }];
    }
  }

  try {
    fs.accessSync(targetFolder, fs.constants.W_OK);
  } catch (e) {
    return [{ success: false, name: 'all', error: 'Sin permisos de escritura. Elige otra carpeta.', sourceName: 'all' }];
  }

  for (const pngPath of pngPaths) {
    try {
      const pngBuffer = fs.readFileSync(pngPath);
      const baseName = path.basename(pngPath, path.extname(pngPath));
      const icoBuffer = await createIcoBuffer(pngBuffer);
      const { finalName, finalPath } = resolveFileName(targetFolder, baseName, '.ico');
      fs.writeFileSync(finalPath, icoBuffer);
      results.push({ success: true, name: finalName, path: finalPath, sourceName: path.basename(pngPath) });
    } catch (e) {
      results.push({ success: false, name: path.basename(pngPath), error: e.message, sourceName: path.basename(pngPath) });
    }
  }

  return results;
});

// === OPEN FOLDER ===
ipcMain.handle('shell:openFolder', async (event, folderPath) => {
  try {
    await execAsync(`explorer "${folderPath}"`);
    return true;
  } catch (e) { return false; }
});

// === APP LOGO ===
ipcMain.handle('app:getLogo', () => {
  const assetsDir = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, 'assets');
  const pngPath = path.join(assetsDir, 'colocolo.png');
  try {
    const raw = fs.readFileSync(pngPath);
    return `data:image/png;base64,${raw.toString('base64')}`;
  } catch (e) { return null; }
});
