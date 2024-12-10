import { BrowserWindow as g, ipcMain as b, screen as P, globalShortcut as v, app as f } from "electron";
import { fileURLToPath as C } from "node:url";
import i from "node:path";
import { exec as u } from "child_process";
import E from "path";
import { fileURLToPath as L } from "url";
const d = {
  width: 600,
  height: 62
}, m = {
  width: 600,
  height: 400
}, D = i.dirname(C(import.meta.url));
function U(e) {
  b.on("search-input-event", (n, s) => {
    s === "show" ? (e.setResizable(!0), e.setSize(600, 300), e.setResizable(!1)) : (e.setResizable(!0), e.setSize(600, 62), e.setResizable(!1));
  });
}
function w() {
  const e = P.getCursorScreenPoint(), s = P.getAllDisplays().find((c) => e.x >= c.bounds.x && e.x <= c.bounds.x + c.bounds.width && e.y >= c.bounds.y && e.y <= c.bounds.y + c.bounds.height);
  return {
    x: s.bounds.x + s.bounds.width / 2 - d.width / 2,
    // 窗口居中
    y: s.bounds.y + s.bounds.height / 3
  };
}
function T(e) {
  const { x: n, y: s } = w();
  e.setBounds({ x: n, y: s }), e.show();
}
function V() {
  const e = new g({
    icon: i.join(process.env.VITE_PUBLIC, "logo.png"),
    webPreferences: {
      preload: i.join(D, "preload.mjs")
    },
    resizable: !1,
    frame: !1,
    alwaysOnTop: !0,
    // width: WindowBaseConfig.width,
    // height: WindowBaseConfig.height,
    width: m.width,
    height: m.height,
    show: !1
  });
  return e.webContents.on("did-finish-load", () => {
    e.webContents.executeJavaScript(
      "window.location.hash = '#/setting';"
    );
    const { x: n, y: s } = w();
    e.setBounds({ x: n, y: s });
  }), a ? e.loadURL(a) : e.loadFile(i.join(R, "index.html")), e;
}
function z(e) {
  const s = process.platform === "darwin" ? "Command+K" : "Ctrl+K";
  v.register(s, () => {
    e.isVisible() ? (e.setOpacity(0), e.hide()) : (e.setOpacity(1), e.focus(), T(e), e.webContents.send("window-shown"));
  });
}
const B = L(import.meta.url), S = E.dirname(B);
function F() {
  b.handle("get-app-icons", async () => new Promise((e, n) => {
    u("ls /Applications", (s, c, o) => {
      if (s) {
        console.error(`执行错误: ${s.message}`), n(s.message);
        return;
      }
      if (o) {
        console.error(`错误: ${o}`), n(o);
        return;
      }
      const h = c.split(`
`).filter((r) => r.endsWith(".app")), p = [];
      let l = 0;
      h.forEach((r) => {
        const I = `/Applications/${r}/Contents/Info.plist`;
        u(`defaults read "${I}" CFBundleIconFile`, (j) => {
          if (j) {
            l++, l === h.length && e(p);
            return;
          }
          const A = `/Applications/${r}/Contents/Resources/AppIcon.icns`, _ = E.join(S, `${r}.png`);
          u(
            `sips -s format png "${A}" --out "${_}"`,
            (y) => {
              if (y) {
                console.error(`转换错误: ${y.message}`), l++, l === h.length && e(p);
                return;
              }
              p.push({ app: r, pngPath: _ }), l++, l === h.length && e(p);
            }
          );
        });
      });
    });
  }));
}
function M(e) {
  b.on(
    "window-page-event",
    (n, {
      routerName: s,
      type: c
    }) => {
      const o = e[s];
      c === "show" ? (o.setOpacity(1), o == null || o.focus(), o == null || o.show()) : (o.setOpacity(0), o == null || o.hide());
    }
  );
}
const x = i.dirname(C(import.meta.url));
process.env.APP_ROOT = i.join(x, "..");
const a = process.env.VITE_DEV_SERVER_URL, G = i.join(process.env.APP_ROOT, "dist-electron"), R = i.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = a ? i.join(process.env.APP_ROOT, "public") : R;
let t, O;
function $() {
  const { x: e, y: n } = w();
  t = new g({
    // icon: path.join(process.env.VITE_PUBLIC, 'logo.png'),
    webPreferences: {
      preload: i.join(x, "preload.mjs")
    },
    resizable: !1,
    frame: !1,
    alwaysOnTop: !0,
    width: d.width,
    height: d.height,
    x: e,
    y: n,
    show: !1
  }), t.webContents.on("did-finish-load", () => {
    t == null || t.webContents.send(
      "main-process-message",
      (/* @__PURE__ */ new Date()).toLocaleString()
    ), T(t), U(t), z(t), F(), t == null || t.on("blur", () => {
      t == null || t.setOpacity(0), t == null || t.hide();
    }), t == null || t.on("focus", () => {
      t == null || t.setOpacity(1), t == null || t.show();
    });
  }), a ? t.loadURL(a) : t.loadFile(i.join(R, "index.html"));
}
f.on("window-all-closed", () => {
  process.platform !== "darwin" && (f.quit(), t = null);
});
f.on("activate", () => {
  g.getAllWindows().length === 0 && $();
});
f.whenReady().then(() => {
  $(), O = V(), M({
    base: t,
    setting: O
  });
});
export {
  G as MAIN_DIST,
  R as RENDERER_DIST,
  a as VITE_DEV_SERVER_URL
};
