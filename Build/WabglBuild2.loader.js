function createUnityInstance(t, n, c) {
    // Helper function for logging messages
    function s(e, t) {
        if (!s.aborted && n.showBanner) {
            if (t === "error") s.aborted = true;
            n.showBanner(e, t);
        }
        switch (t) {
            case "error":
                console.error(e);
                break;
            case "warning":
                console.warn(e);
                break;
            default:
                console.log(e);
        }
    }

    // Global error handler
    function r(e) {
        const t = e.reason || e.error;
        let n = t ? t.toString() : e.message || e.reason || "";
        let r = t && t.stack ? t.stack.toString() : "";
        n += "\n" + (r = r.startsWith(n) ? r.substring(n.length) : r).trim();
        if (n && l.stackTraceRegExp && l.stackTraceRegExp.test(n)) {
            D(n, e.filename || t && (t.fileName || t.sourceURL) || "", e.lineno || t && (t.lineNumber || t.line) || 0);
        }
    }

    // Helper function to check if config is missing or empty
    function e(e, t, n) {
        const r = e[t];
        if (r === undefined || r === "") {
            console.warn(`Config option "${t}" is missing or empty. Falling back to default value: "${n}". Consider updating your WebGL template to include the missing config option.`);
            e[t] = n;
        }
    }

    // Default function if no callback is passed
    c = c || function() {};

    // WebGL settings
    const l = {
        canvas: t,
        webglContextAttributes: { preserveDrawingBuffer: false, powerPreference: 2 },
        cacheControl: function(e) {
            return e === l.dataUrl || e.match(/\.bundle/) ? "must-revalidate" : "no-store";
        },
        streamingAssetsUrl: "StreamingAssets",
        downloadProgress: {},
        deinitializers: [],
        intervals: {},
        setInterval: function(e, t) {
            e = window.setInterval(e, t);
            this.intervals[e] = true;
            return e;
        },
        clearInterval: function(e) {
            delete this.intervals[e];
            window.clearInterval(e);
        },
        preRun: [],
        postRun: [],
        print: function(e) {
            console.log(e);
        },
        printErr: function(e) {
            console.error(e);
            if (typeof e === "string" && e.includes("wasm streaming compile failed")) {
                if (e.toLowerCase().includes("mime")) {
                    s(`HTTP Response Header "Content-Type" configured incorrectly on the server for file ${l.codeUrl}, should be "application/wasm". Startup time performance will suffer.`, "warning");
                } else {
                    s(`WebAssembly streaming compilation failed! Check if "Content-Encoding" HTTP header is misconfigured on the server for file ${l.codeUrl}.`, "warning");
                }
            }
        },
        locateFile: function(e) {
            return e === "build.wasm" ? this.codeUrl : e;
        },
        disabledCanvasEvents: ["contextmenu", "dragstart"]
    };

    // Configuring options based on user input or defaults
    for (const o in n) {
        e(n, "companyName", "Unity");
        e(n, "productName", "WebGL Player");
        e(n, "productVersion", "1.0");
        l[o] = n[o];
    }

    l.streamingAssetsUrl = new URL(l.streamingAssetsUrl, document.URL).href;

    // Disable canvas events to prevent context menu and drag start
    const a = l.disabledCanvasEvents.slice();
    function i(e) {
        e.preventDefault();
    }
    a.forEach(function(e) {
        t.addEventListener(e, i);
    });

    // Add global error listeners
    window.addEventListener("error", r);
    window.addEventListener("unhandledrejection", r);

    // Fullscreen toggle function
    let u = "", d = "";
    function h(e) {
        if (document.webkitCurrentFullScreenElement === t) {
            if (t.style.width) {
                u = t.style.width;
                d = t.style.height;
                t.style.width = "100%";
                t.style.height = "100%";
            }
        } else if (u) {
            t.style.width = u;
            t.style.height = d;
            d = u = "";
        }
    }

    // Handling fullscreen change
    document.addEventListener("webkitfullscreenchange", h);

    // Deinitializers to clean up events
    l.deinitializers.push(function() {
        a.forEach(function(e) {
            t.removeEventListener(e, i);
        });
        window.removeEventListener("error", r);
        window.removeEventListener("unhandledrejection", r);
        document.removeEventListener("webkitfullscreenchange", h);
        for (const e in l.intervals) {
            window.clearInterval(e);
        }
        l.intervals = {};
    });

    // Cleanup when quitting the application
    l.QuitCleanup = function() {
        l.deinitializers.forEach(function(e) {
            e();
        });
        l.deinitializers = [];
        if (typeof l.onQuit === "function") l.onQuit();
    };

    // Function to handle Unity errors
    function D(e, t, n) {
        if (!e.includes("fullscreen error")) {
            if (l.startupErrorHandler) {
                l.startupErrorHandler(e, t, n);
            } else if (l.errorHandler) {
                l.errorHandler(e, t, n);
            } else {
                console.log("Invoking error handler due to\n" + e);
                if (typeof dump === "function") {
                    dump("Invoking error handler due to\n" + e);
                }
                if (!D.didShowErrorMessage) {
                    e = `An error occurred running the Unity content on this page. See your browser JavaScript console for more info. The error was:\n${e}`;
                    alert(e);
                    D.didShowErrorMessage = true;
                }
            }
        }
    }

    // Track download progress
    function P(e, t) {
        if (e === "symbolsUrl") return;
        let n = l.downloadProgress[e] || (l.downloadProgress[e] = { started: false, finished: false, lengthComputable: false, total: 0, loaded: 0 });
        if (typeof t === "object" && (t.type === "progress" || t.type === "load")) {
            if (!n.started) {
                n.started = true;
                n.lengthComputable = t.lengthComputable;
                n.total = t.total;
            }
            if (t.type === "load") {
                n.finished = true;
            }
            n.loaded = t.loaded;
        }
    }

    // Utility to format URLs
    function U(e) {
        U.link = U.link || document.createElement("a");
        U.link.href = e;
        return U.link.href;
    }

    // Load Unity Framework script
    function T() {
        return new Promise(function(a, e) {
            const i = document.createElement("script");
            i.src = l.frameworkUrl;
            i.onload = function() {
                if (typeof unityFramework === "undefined" || !unityFramework) {
                    e(`Unable to parse ${l.frameworkUrl}! The file is corrupt, or compression was misconfigured?`);
                    return;
                }
                s("Unable to parse " + l.frameworkUrl, "error");
            };
            i.onerror = function() {
                s(`Unable to load file ${l.frameworkUrl}! Check that the file exists on the remote server.`, "error");
            };
            document.body.appendChild(i);
            l.deinitializers.push(function() {
                document.body.removeChild(i);
            });
        }).then(function(e) {
            e(l);
        });
    }

    // Fetch Unity WebGL data with progress tracking
    l.cachedFetch = function(o, a) {
        const e = w.getInstance();
        const s = U(o.url || o);
        let c = {
            enabled: (function() {
                if (!a || !a.method || a.method === "GET") {
                    return !(a && ["must-revalidate", "immutable"].includes(a.control)) || !s.match("^https?://");
                }
                return false;
            })()
        };
        function u(n, r) {
            return fetch(n, r).then(function(e) {
                return e.status === 304
                    ? (c.revalidated = true, i.updateRequestMetaData(c.metaData).then(() => {
                        E(`'${c.metaData.url}' successfully revalidated and served from the indexedDB cache`);
                    }).catch(e => {
                        E(`'${c.metaData.url}' successfully revalidated but not stored in the indexedDB cache due to the error: ${e}`);
                    }), S(c.response, r.onProgress, r.enableStreamingDownload))
                    : (e.status === 200 && i.updateRequestMetaData(c.metaData).then(() => {
                        E(`'${c.metaData.url}' successfully cached`);
                    }).catch(e => {
                        E(`'${c.metaData.url}' successfully cached but not stored in the indexedDB cache due to the error: ${e}`);
                    }));
        }
    }
}
