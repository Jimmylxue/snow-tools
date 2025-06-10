import { BrowserWindow as w, screen as y, ipcMain as d, globalShortcut as _, app as p } from "electron";
import { fileURLToPath as C } from "node:url";
import r from "node:path";
import { exec as g } from "child_process";
import A from "path";
import { fileURLToPath as j } from "url";
const E = {
  width: 600,
  height: 62
}, O = {
  width: 600,
  height: 400
}, D = r.dirname(C(import.meta.url));
function b() {
  const e = y.getCursorScreenPoint(), s = y.getAllDisplays().find((i) => e.x >= i.bounds.x && e.x <= i.bounds.x + i.bounds.width && e.y >= i.bounds.y && e.y <= i.bounds.y + i.bounds.height);
  return {
    x: s.bounds.x + s.bounds.width / 2 - E.width / 2,
    // 窗口居中
    y: s.bounds.y + s.bounds.height / 3
  };
}
function m(e) {
  const { x: o, y: s } = b();
  e.setBounds({ x: o, y: s }), e.setVisibleOnAllWorkspaces(!0, {
    visibleOnFullScreen: !0,
    skipTransformProcessType: !1
  }), setTimeout(() => {
    e.show(), e.focus();
  }, 100);
}
function M() {
  const e = new w({
    icon: r.join(process.env.VITE_PUBLIC, "logo.png"),
    webPreferences: {
      preload: r.join(D, "preload.mjs")
    },
    resizable: !1,
    frame: !1,
    alwaysOnTop: !0,
    // width: WindowBaseConfig.width,
    // height: WindowBaseConfig.height,
    width: O.width,
    height: O.height,
    show: !1
  });
  return e.webContents.on("did-finish-load", () => {
    e.webContents.executeJavaScript(
      "window.location.hash = '#/setting';"
    );
    const { x: o, y: s } = b();
    e.setBounds({ x: o, y: s });
  }), h ? e.loadURL(h) : e.loadFile(r.join(I, "index.html")), e;
}
const U = j(import.meta.url), F = A.dirname(U);
function H() {
  d.handle("get-app-icons", async () => new Promise((e, o) => {
    g("ls /Applications", (s, i, n) => {
      if (s) {
        console.error(`执行错误: ${s.message}`), o(s.message);
        return;
      }
      if (n) {
        console.error(`错误: ${n}`), o(n);
        return;
      }
      const f = i.split(`
`).filter((c) => c.endsWith(".app")), u = [];
      let l = 0;
      f.forEach((c) => {
        const v = `/Applications/${c}/Contents/Info.plist`;
        g(`defaults read "${v}" CFBundleIconFile`, (L) => {
          if (L) {
            l++, l === f.length && e(u);
            return;
          }
          const V = `/Applications/${c}/Contents/Resources/AppIcon.icns`, R = A.join(F, `${c}.png`);
          g(
            `sips -s format png "${V}" --out "${R}"`,
            (S) => {
              if (S) {
                console.error(`转换错误: ${S.message}`), l++, l === f.length && e(u);
                return;
              }
              u.push({ app: c, pngPath: R }), l++, l === f.length && e(u);
            }
          );
        });
      });
    });
  }));
}
function B(e) {
  d.on(
    "window-page-event",
    (o, {
      routerName: s,
      type: i
    }) => {
      const n = e[s];
      i === "show" ? (n.setOpacity(1), n == null || n.focus(), n == null || n.show()) : (n.setOpacity(0), n == null || n.hide());
    }
  );
}
const G = {
  width: 600,
  height: 62
}, K = {
  width: 600,
  height: 300
}, Y = {
  width: 600,
  height: 300
}, z = {
  width: 600,
  height: 500
}, k = {
  NORMAL: G,
  INPUTTING: K,
  FANYI_SETTING: Y,
  SYSTEM_SETTING: z
};
function Z(e) {
  d.on("screen_size_event", (o, s) => {
    e.setResizable(!0);
    const i = k[s];
    e.setSize(i.width, i.height), e.setResizable(!1);
  });
}
const J = "HOT_KEY_EVENT";
let a = "", T = !1;
function q(e) {
  N(e), d.on(J, (o, s) => {
    s === "EDITING_OPEN_HOT_KEY" ? (T = !0, a = "", Q()) : (T = !1, N(e));
  });
}
function N(e) {
  e.webContents.executeJavaScript(
    "localStorage.getItem('snow-tools-hotkey') || (navigator.platform.includes('Mac') ? 'Command+K' : 'Ctrl+K')"
  ).then((o) => {
    if (o !== a) {
      a && _.unregister(a);
      try {
        _.register(o, () => {
          if (e.isVisible()) {
            if (T) return;
            e.setOpacity(0), e.hide();
          } else
            e.setOpacity(1), e.focus(), m(e), e.webContents.send("window-shown");
        }), a = o, console.log(`Hotkey updated to: ${o}`);
      } catch (s) {
        console.error("Failed to register hotkey:", s), e.webContents.send("hotkey-register-failed", o);
      }
    }
  });
}
function Q() {
  _.unregisterAll();
}
const x = r.dirname(C(import.meta.url));
process.env.APP_ROOT = r.join(x, "..");
const h = process.env.VITE_DEV_SERVER_URL, ne = r.join(process.env.APP_ROOT, "dist-electron"), I = r.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = h ? r.join(process.env.APP_ROOT, "public") : I;
let t, P;
function $() {
  const { x: e, y: o } = b();
  t = new w({
    // icon: path.join(process.env.VITE_PUBLIC, 'logo.png'),
    webPreferences: {
      preload: r.join(x, "preload.mjs")
    },
    resizable: !1,
    frame: !1,
    alwaysOnTop: !0,
    width: E.width,
    height: E.height,
    x: e,
    y: o,
    show: !1,
    fullscreenable: !0
  }), t.webContents.on("did-finish-load", () => {
    t == null || t.webContents.send(
      "main-process-message",
      (/* @__PURE__ */ new Date()).toLocaleString()
    ), m(t), Z(t), q(t), H(), t == null || t.on("blur", () => {
      t == null || t.setOpacity(0), t == null || t.hide();
    }), t == null || t.on("focus", () => {
      t == null || t.setOpacity(1), t == null || t.show();
    });
  }), h ? t.loadURL(h) : t.loadFile(r.join(I, "index.html"));
}
p.on("window-all-closed", () => {
  process.platform !== "darwin" && (p.quit(), t = null);
});
p.on("activate", () => {
  w.getAllWindows().length === 0 && $();
});
p.whenReady().then(() => {
  $(), P = M(), B({
    base: t,
    setting: P
  });
});
export {
  ne as MAIN_DIST,
  I as RENDERER_DIST,
  h as VITE_DEV_SERVER_URL
};
