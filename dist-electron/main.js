import { BrowserWindow, screen, ipcMain, globalShortcut, app } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { exec } from "child_process";
import path$1 from "path";
import { fileURLToPath as fileURLToPath$1 } from "url";
const WindowBaseConfig = {
  width: 600,
  height: 62
};
const WindowSettingConfig = {
  width: 600,
  height: 400
};
const __dirname$2 = path.dirname(fileURLToPath(import.meta.url));
function getOpenWindowBound() {
  const currentDisplay = screen.getCursorScreenPoint();
  const displays = screen.getAllDisplays();
  const display = displays.find((display2) => {
    return currentDisplay.x >= display2.bounds.x && currentDisplay.x <= display2.bounds.x + display2.bounds.width && currentDisplay.y >= display2.bounds.y && currentDisplay.y <= display2.bounds.y + display2.bounds.height;
  });
  return {
    x: display.bounds.x + display.bounds.width / 2 - WindowBaseConfig.width / 2,
    // 窗口居中
    y: display.bounds.y + display.bounds.height / 3
  };
}
function showWindow(mainWindow2) {
  const { x, y } = getOpenWindowBound();
  mainWindow2.setBounds({ x, y });
  mainWindow2.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true,
    skipTransformProcessType: false
  });
  mainWindow2.show();
  mainWindow2.focus();
}
function createSettingWindow() {
  const settingWindow2 = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "logo.png"),
    webPreferences: {
      preload: path.join(__dirname$2, "preload.mjs")
    },
    resizable: false,
    frame: false,
    alwaysOnTop: true,
    // width: WindowBaseConfig.width,
    // height: WindowBaseConfig.height,
    width: WindowSettingConfig.width,
    height: WindowSettingConfig.height,
    show: false
  });
  settingWindow2.webContents.on("did-finish-load", () => {
    settingWindow2.webContents.executeJavaScript(
      `window.location.hash = '#/setting';`
    );
    const { x, y } = getOpenWindowBound();
    settingWindow2.setBounds({ x, y });
  });
  if (VITE_DEV_SERVER_URL) {
    settingWindow2.loadURL(VITE_DEV_SERVER_URL);
  } else {
    settingWindow2.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
  return settingWindow2;
}
const __filename = fileURLToPath$1(import.meta.url);
const __dirname$1 = path$1.dirname(__filename);
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
          exec(`defaults read "${appPath}" CFBundleIconFile`, (iconError) => {
            if (iconError) {
              processedCount++;
              if (processedCount === apps.length) resolve(iconsData);
              return;
            }
            const iconPath = `/Applications/${app2}/Contents/Resources/AppIcon.icns`;
            const pngPath = path$1.join(__dirname$1, `${app2}.png`);
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
          });
        });
      });
    });
  });
}
function routerEvent(routerMap) {
  ipcMain.on(
    "window-page-event",
    (_, {
      routerName,
      type
    }) => {
      const routerScreen = routerMap[routerName];
      if (type === "show") {
        routerScreen.setOpacity(1);
        routerScreen == null ? void 0 : routerScreen.focus();
        routerScreen == null ? void 0 : routerScreen.show();
      } else {
        routerScreen.setOpacity(0);
        routerScreen == null ? void 0 : routerScreen.hide();
      }
    }
  );
}
const NORMAL_SCREEN_SIZE = {
  width: 600,
  height: 62
};
const COMMAND_INPUTTING_SCREEN_SIZE = {
  width: 600,
  height: 300
};
const FANYI_SETTING_SCREEN_SIZE = {
  width: 600,
  height: 300
};
const SYSTEM_SETTING_SCREEN_SIZE = {
  width: 600,
  height: 500
};
const SCREEN_SIZE_MAP = {
  NORMAL: NORMAL_SCREEN_SIZE,
  INPUTTING: COMMAND_INPUTTING_SCREEN_SIZE,
  FANYI_SETTING: FANYI_SETTING_SCREEN_SIZE,
  SYSTEM_SETTING: SYSTEM_SETTING_SCREEN_SIZE
};
function screenEvent(mainWindow2) {
  ipcMain.on("screen_size_event", (_, type) => {
    mainWindow2.setResizable(true);
    const screen2 = SCREEN_SIZE_MAP[type];
    mainWindow2.setSize(screen2.width, screen2.height);
    mainWindow2.setResizable(false);
  });
}
const HOT_KEY_EVENT_NAME = "HOT_KEY_EVENT";
let currentHotkey = "";
let isEditHotKey = false;
function registerHotKey(mainWindow2) {
  updateHotkeyFromStorage(mainWindow2);
  ipcMain.on(HOT_KEY_EVENT_NAME, (_, type) => {
    if (type === "EDITING_OPEN_HOT_KEY") {
      isEditHotKey = true;
      currentHotkey = "";
      unregisterAllHotkeys();
    } else {
      isEditHotKey = false;
      updateHotkeyFromStorage(mainWindow2);
    }
  });
}
function updateHotkeyFromStorage(mainWindow2) {
  mainWindow2.webContents.executeJavaScript(
    `localStorage.getItem('snow-tools-hotkey') || (navigator.platform.includes('Mac') ? 'Command+K' : 'Ctrl+K')`
  ).then((hotkey) => {
    if (hotkey === currentHotkey) return;
    if (currentHotkey) {
      globalShortcut.unregister(currentHotkey);
    }
    try {
      globalShortcut.register(hotkey, () => {
        if (mainWindow2.isVisible()) {
          if (isEditHotKey) return;
          mainWindow2.setOpacity(0);
          mainWindow2.hide();
        } else {
          mainWindow2.setOpacity(1);
          mainWindow2.focus();
          showWindow(mainWindow2);
          mainWindow2.webContents.send("window-shown");
        }
      });
      currentHotkey = hotkey;
      console.log(`Hotkey updated to: ${hotkey}`);
    } catch (error) {
      console.error("Failed to register hotkey:", error);
      mainWindow2.webContents.send("hotkey-register-failed", hotkey);
    }
  });
}
function unregisterAllHotkeys() {
  globalShortcut.unregisterAll();
}
const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let mainWindow;
let settingWindow;
function createWindow() {
  const { x, y } = getOpenWindowBound();
  mainWindow = new BrowserWindow({
    // icon: path.join(process.env.VITE_PUBLIC, 'logo.png'),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs")
    },
    resizable: false,
    frame: false,
    alwaysOnTop: true,
    width: WindowBaseConfig.width,
    height: WindowBaseConfig.height,
    x,
    y,
    show: false,
    fullscreenable: true
  });
  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow == null ? void 0 : mainWindow.webContents.send(
      "main-process-message",
      (/* @__PURE__ */ new Date()).toLocaleString()
    );
    mainWindow == null ? void 0 : mainWindow.webContents.openDevTools();
    showWindow(mainWindow);
    screenEvent(mainWindow);
    registerHotKey(mainWindow);
    init();
    mainWindow == null ? void 0 : mainWindow.on("blur", () => {
      mainWindow == null ? void 0 : mainWindow.setOpacity(0);
      mainWindow == null ? void 0 : mainWindow.hide();
    });
    mainWindow == null ? void 0 : mainWindow.on("focus", () => {
      mainWindow == null ? void 0 : mainWindow.setOpacity(1);
      mainWindow == null ? void 0 : mainWindow.show();
    });
  });
  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(RENDERER_DIST, "index.html"));
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
app.whenReady().then(() => {
  createWindow();
  settingWindow = createSettingWindow();
  routerEvent({
    base: mainWindow,
    setting: settingWindow
  });
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
