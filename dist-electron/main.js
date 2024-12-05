import { ipcMain, globalShortcut, app, BrowserWindow, screen } from "electron";
import { fileURLToPath as fileURLToPath$1 } from "node:url";
import path$1 from "node:path";
import { exec } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
function screenEvent(mainWindow2) {
  ipcMain.on("search-input-event", (_, type) => {
    if (type === "show") {
      mainWindow2.setSize(600, 300);
    } else {
      mainWindow2.setSize(600, 62);
    }
  });
}
function registerHotKey(mainWindow2) {
  const isMac = process.platform === "darwin";
  const toggleScreen = isMac ? "Command+J" : "Ctrl+J";
  globalShortcut.register(toggleScreen, () => {
    if (mainWindow2.isVisible()) {
      mainWindow2.hide();
    } else {
      mainWindow2.show();
      mainWindow2.webContents.send("window-shown");
    }
  });
}
const __filename = fileURLToPath(import.meta.url);
const __dirname$1 = path.dirname(__filename);
console.log("ddd");
function init() {
  ipcMain.handle("get-app-icons", async () => {
    return new Promise((resolve, reject) => {
      exec("ls /Applications", (error, stdout, stderr) => {
        if (error) {
          console.error(`执行错误: ${error.message}`);
          reject(error.message);
          return;
        }
        if (stderr) {
          console.error(`错误: ${stderr}`);
          reject(stderr);
          return;
        }
        const apps = stdout.split("\n").filter((app2) => app2.endsWith(".app"));
        const iconsData = [];
        let processedCount = 0;
        apps.forEach((app2) => {
          const appPath = `/Applications/${app2}/Contents/Info.plist`;
          exec(
            `defaults read "${appPath}" CFBundleIconFile`,
            (err, iconName, iconError) => {
              if (iconError) {
                processedCount++;
                if (processedCount === apps.length) resolve(iconsData);
                return;
              }
              const iconPath = `/Applications/${app2}/Contents/Resources/AppIcon.icns`;
              const pngPath = path.join(__dirname$1, `${app2}.png`);
              exec(
                `sips -s format png "${iconPath}" --out "${pngPath}"`,
                (convertErr) => {
                  if (convertErr) {
                    console.error(`转换错误: ${convertErr.message}`);
                    processedCount++;
                    if (processedCount === apps.length) resolve(iconsData);
                    return;
                  }
                  iconsData.push({ app: app2, pngPath });
                  processedCount++;
                  if (processedCount === apps.length) resolve(iconsData);
                }
              );
            }
          );
        });
      });
    });
  });
}
const __dirname = path$1.dirname(fileURLToPath$1(import.meta.url));
process.env.APP_ROOT = path$1.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path$1.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path$1.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path$1.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let mainWindow;
function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const x = Math.round((width - 600) / 2);
  const y = Math.round(height / 3);
  mainWindow = new BrowserWindow({
    icon: path$1.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path$1.join(__dirname, "preload.mjs")
    },
    resizable: false,
    frame: false,
    width: 600,
    height: 62,
    x,
    y
  });
  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow == null ? void 0 : mainWindow.webContents.send(
      "main-process-message",
      (/* @__PURE__ */ new Date()).toLocaleString()
    );
    screenEvent(mainWindow);
    registerHotKey(mainWindow);
    init();
  });
  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path$1.join(RENDERER_DIST, "index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    mainWindow = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(createWindow);
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
