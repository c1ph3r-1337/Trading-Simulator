const { app, BrowserWindow, shell } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const http = require("http");

const isDev = !!process.env.ELECTRON_START_URL;
const devUrl = process.env.ELECTRON_START_URL || "http://127.0.0.1:3000";
const port = process.env.PORT || "3000";

let mainWindow = null;
let nextProcess = null;

function waitForServer(url, timeoutMs = 30000) {
    const startedAt = Date.now();

    return new Promise((resolve, reject) => {
        const attempt = () => {
            const req = http.get(url, (res) => {
                res.resume();
                resolve();
            });

            req.on("error", () => {
                if (Date.now() - startedAt >= timeoutMs) {
                    reject(new Error(`Timed out waiting for ${url}`));
                    return;
                }

                setTimeout(attempt, 500);
            });
        };

        attempt();
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1600,
        height: 1000,
        minWidth: 1200,
        minHeight: 760,
        backgroundColor: "#050505",
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, "preload.cjs"),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
        },
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: "deny" };
    });

    mainWindow.webContents.on("will-navigate", (event, url) => {
        const allowedOrigin = new URL(isDev ? devUrl : `http://127.0.0.1:${port}`).origin;
        if (!url.startsWith(allowedOrigin)) {
            event.preventDefault();
            shell.openExternal(url);
        }
    });

    const targetUrl = isDev ? devUrl : `http://127.0.0.1:${port}`;
    void mainWindow.loadURL(targetUrl);

    if (isDev) {
        mainWindow.webContents.openDevTools({ mode: "detach" });
    }
}

function startNextServer() {
    if (isDev || nextProcess) return;

    const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
    nextProcess = spawn(npmCmd, ["run", "start", "--", "-p", port], {
        cwd: path.join(__dirname, ".."),
        stdio: "inherit",
        env: {
            ...process.env,
            PORT: port,
        },
    });

    nextProcess.on("exit", () => {
        nextProcess = null;
        if (!app.isQuitting) {
            app.quit();
        }
    });
}

app.on("before-quit", () => {
    app.isQuitting = true;
    if (nextProcess) {
        nextProcess.kill();
    }
});

app.whenReady().then(async () => {
    startNextServer();
    if (!isDev) {
        await waitForServer(`http://127.0.0.1:${port}`);
    }
    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
}).catch((error) => {
    console.error("Failed to start desktop app:", error);
    app.quit();
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
