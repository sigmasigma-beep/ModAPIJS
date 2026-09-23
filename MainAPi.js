// Lunar API made by Elctro and cluade ai lol
// its cool
// -- restyled: flat violet "tabs" look --

(function () {
    const state = {
        theme: "Violet",
        size: "Mid",
        title: "Menu Title",
        creator: "Unknown",
        credits: "",
        minimized: false,
        borderGlow: "#8a5cf6",
        accentColor: "#8a5cf6",
        font: "Arial, sans-serif",
        radius: 14,

        rootItems: [],
        categories: [],
        contextStack: null,
        currentCategory: null, // null = "Main" tab

        searchEnabled: false,
        searchQuery: "",

        rainbow: { title: false, background: false, text: false, border: false },

        opacity: 1,
        closeConfirm: false,
        pendingClose: false,
        toggleKey: null,
        statusEls: {},
        _bottomNoteTimer: null,
        _fpsRaf: null,
        _fpsLast: 0,
        _fpsFrames: 0,
        _fpsValue: 60,
    };
    state.contextStack = [state.rootItems];

    let menu, header, headerIcons, statsBox, pgText, fpsText, tabBar, content, searchBox, creditsEl, bottomNote;

    function injectStyles() {
        if (document.getElementById("modmenu-styles")) return;
        const style = document.createElement("style");
        style.id = "modmenu-styles";
        style.textContent = `
            @keyframes modmenu-rainbow { 0%{filter:hue-rotate(0deg)} 100%{filter:hue-rotate(360deg)} }
            .modmenu-rainbow-bg { animation: modmenu-rainbow 4s linear infinite; }
            .modmenu-rainbow-text { animation: modmenu-rainbow 3s linear infinite; }
            .modmenu-rainbow-border { animation: modmenu-rainbow 2.5s linear infinite; }
            .modmenu-content::-webkit-scrollbar { width: 10px; }
            .modmenu-content::-webkit-scrollbar-track { background: transparent; }
            .modmenu-content::-webkit-scrollbar-thumb { background: rgba(255,255,255,.55); border-radius: 8px; }
        `;
        document.head.appendChild(style);
    }

    function currentContext() { return state.contextStack[state.contextStack.length - 1]; }
    function pushItem(type, data) { const item = { type, data }; currentContext().push(item); return item; }

    function collectAllItems() {
        const out = [];
        const walk = arr => arr.forEach(it => { out.push(it); if (it.type === "group") walk(it.data.items); });
        walk(state.rootItems);
        state.categories.forEach(c => walk(c.items));
        return out;
    }

    // ---------- shades ----------
    function shade(hex, amt) {
        const c = hex.replace("#", "");
        const num = parseInt(c.length === 3 ? c.split("").map(x => x + x).join("") : c, 16);
        let r = (num >> 16) + amt, g = ((num >> 8) & 0xff) + amt, b = (num & 0xff) + amt;
        r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
    function palette() {
        const base = state.accentColor;
        return {
            body: shade(base, 35),
            tabbarBg: shade(base, 10),
            tabActive: shade(base, -35),
            tabInactive: "transparent",
            itemBg: shade(base, -45),
            itemBgHover: shade(base, -60),
            iconBg: shade(base, 10),
        };
    }

    function createMenu() {
        injectStyles();
        const pal = palette();

        menu = document.createElement("div");
        Object.assign(menu.style, {
            position: "fixed",
            top: "80px",
            left: "80px",
            background: pal.body,
            border: `3px solid ${state.borderGlow}`,
            boxShadow: `0 8px 24px rgba(0,0,0,.35)`,
            zIndex: "99999",
            color: "#fff",
            fontFamily: state.font,
            padding: "0",
            minWidth: "300px",
            borderRadius: "var(--mm-radius)",
            overflow: "hidden",
            userSelect: "none",
            opacity: String(state.opacity),
        });
        menu.style.setProperty("--mm-radius", state.radius + "px");
        document.body.appendChild(menu);

        // ---------- Header ----------
        header = document.createElement("div");
        header.style.cssText = `
            padding: 14px 16px 10px 16px;
            display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;
            cursor: move;
        `;
        const titleWrap = document.createElement("div");
        titleWrap.style.cssText = "min-width:0; overflow:hidden;";
        const titleEl = document.createElement("div");
        titleEl.id = "modmenu-title-text";
        titleEl.textContent = state.title;
        titleEl.style.cssText = "font-weight:800; font-size:1.7em; line-height:1.1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;";
        const creatorTag = document.createElement("div");
        creatorTag.style.cssText = "opacity:0.75; font-size:0.7em; margin-top:2px;";
        creatorTag.textContent = "by " + state.creator;
        titleWrap.append(titleEl, creatorTag);
        header.appendChild(titleWrap);

        const rightGroup = document.createElement("div");
        rightGroup.style.cssText = "display:flex; flex-direction:column; align-items:flex-end; gap:6px; flex-shrink:0;";

        statsBox = document.createElement("div");
        statsBox.style.cssText = "text-align:right; font-size:0.72em; font-weight:700; opacity:0.9; line-height:1.3;";
        pgText = document.createElement("div"); pgText.textContent = "Pg:1";
        fpsText = document.createElement("div"); fpsText.textContent = "FPS:60";
        statsBox.append(pgText, fpsText);

        headerIcons = document.createElement("div");
        headerIcons.style.cssText = "display:flex; gap:6px;";

        const minBtn = document.createElement("button");
        minBtn.title = "Minimize";
        minBtn.style.cssText = controlBtnStyle(pal.iconBg);
        minBtn.innerHTML = `<span style="display:block; width:12px; height:2px; background:currentColor;"></span>`;
        minBtn.onclick = toggleMinimize;

        const homeBtn = document.createElement("button");
        homeBtn.textContent = "\u2302";
        homeBtn.title = "Home";
        homeBtn.style.cssText = controlBtnStyle(pal.iconBg);
        homeBtn.onclick = () => { state.currentCategory = null; buildPage(); };

        const closeBtn = document.createElement("button");
        closeBtn.textContent = "\u2715";
        closeBtn.title = "Close";
        closeBtn.style.cssText = controlBtnStyle("#e04444");
        closeBtn.onclick = handleClose;

        headerIcons.append(minBtn, homeBtn, closeBtn);
        rightGroup.append(statsBox, headerIcons);
        header.appendChild(rightGroup);
        menu.appendChild(header);

        // ---------- Tab bar (categories) ----------
        tabBar = document.createElement("div");
        tabBar.style.cssText = `
            display:flex; flex-wrap:wrap; gap:8px; padding:8px 12px;
            background:${pal.tabbarBg};
        `;
        menu.appendChild(tabBar);

        // ---------- Search ----------
        searchBox = document.createElement("input");
        searchBox.type = "text";
        searchBox.placeholder = "Search...";
        Object.assign(searchBox.style, {
            width: "calc(100% - 24px)", margin: "10px 12px 0", boxSizing: "border-box", padding: "8px 10px",
            background: "rgba(0,0,0,.25)", color: "#fff", border: "none", borderRadius: "var(--mm-radius)",
            display: state.searchEnabled ? "" : "none",
        });
        searchBox.oninput = () => { state.searchQuery = searchBox.value.toLowerCase(); buildPage(); };
        menu.appendChild(searchBox);

        // ---------- Content ----------
        content = document.createElement("div");
        content.className = "modmenu-content";
        content.style.cssText = "padding:12px; max-height:320px; overflow-y:auto; scrollbar-color: rgba(255,255,255,.55) transparent; scrollbar-width: thin;";
        menu.appendChild(content);

        // ---------- Bottom note ----------
        bottomNote = document.createElement("div");
        bottomNote.style.cssText = "margin:0 12px 8px; padding:8px; font-size:0.8em; text-align:center; border:1px dashed rgba(255,255,255,.4); border-radius:var(--mm-radius); display:none;";
        menu.appendChild(bottomNote);

        // ---------- Credits ----------
        creditsEl = document.createElement("div");
        creditsEl.style.cssText = "text-align:center; font-size:0.75em; opacity:0.6; padding-bottom:10px;";
        creditsEl.textContent = state.credits;
        menu.appendChild(creditsEl);

        // ---------- Drag ----------
        let offsetX, offsetY, dragging = false;
        header.onpointerdown = e => { dragging = true; offsetX = e.clientX - menu.offsetLeft; offsetY = e.clientY - menu.offsetTop; };
        document.onpointerup = () => dragging = false;
        document.onpointermove = e => {
            if (!dragging) return;
            menu.style.left = (e.clientX - offsetX) + "px";
            menu.style.top = (e.clientY - offsetY) + "px";
        };

        startFpsCounter();
        if (state.toggleKey) attachToggleKey();
    }

    function startFpsCounter() {
        stopFpsCounter();
        state._fpsLast = performance.now();
        state._fpsFrames = 0;
        const loop = now => {
            state._fpsFrames++;
            if (now - state._fpsLast >= 500) {
                state._fpsValue = Math.round((state._fpsFrames * 1000) / (now - state._fpsLast));
                state._fpsFrames = 0; state._fpsLast = now;
                if (fpsText) fpsText.textContent = "FPS:" + state._fpsValue;
            }
            state._fpsRaf = requestAnimationFrame(loop);
        };
        state._fpsRaf = requestAnimationFrame(loop);
    }
    function stopFpsCounter() { if (state._fpsRaf) cancelAnimationFrame(state._fpsRaf); state._fpsRaf = null; }

    function handleClose() {
        if (state.closeConfirm && !state.pendingClose) {
            state.pendingClose = true;
            const closeBtn = headerIcons.lastChild;
            closeBtn.textContent = "SURE?";
            closeBtn.style.width = "auto";
            closeBtn.style.padding = "0 8px";
            setTimeout(() => { state.pendingClose = false; closeBtn.textContent = "\u2715"; closeBtn.style.width = "28px"; closeBtn.style.padding = ""; }, 2500);
            return;
        }
        stopFpsCounter();
        menu.remove();
        menu = null;
    }

    function controlBtnStyle(bg = "#444") {
        return `background:${bg}; color:#fff; border:none; width:28px; height:28px; border-radius:var(--mm-radius); font-size:1.1em; cursor:pointer; display:flex; align-items:center; justify-content:center; line-height:1; padding:0;`;
    }

    const THEME_COLORS = {
        Violet: "#8a5cf6", Classic: "#00ff99", Blue: "#00aaff", Red: "#ff3366", Purple: "#bb66ff",
        Green: "#33ffaa", Orange: "#ffaa33", Pink: "#ff66cc", Cyan: "#22e0e0",
        Yellow: "#ffee44", Teal: "#22bbaa", White: "#eeeeee", Mono: "#999999",
    };

    function applyTheme() {
        state.borderGlow = THEME_COLORS[state.theme] || state.borderGlow;
        state.accentColor = state.borderGlow;
        if (!menu) return;
        const pal = palette();
        menu.style.borderColor = state.borderGlow;
        menu.style.background = pal.body;
        tabBar.style.background = pal.tabbarBg;
        menu.classList.toggle("modmenu-rainbow-border", state.rainbow.border);
        buildPage();
    }

    function applySize() {
        const sizes = { Small: "280px", Mid: "380px", Big: "500px", Huge: "640px" };
        if (menu) menu.style.width = sizes[state.size] || "380px";
    }

    function applyFont() { if (menu) menu.style.fontFamily = state.font; }
    function applyRadius() { if (menu) menu.style.setProperty("--mm-radius", state.radius + "px"); }

    function toggleMinimize() {
        state.minimized = !state.minimized;
        const d = state.minimized ? "none" : "";
        tabBar.style.display = d;
        content.style.display = d;
        if (searchBox) searchBox.style.display = state.minimized ? "none" : (state.searchEnabled ? "" : "none");
        if (bottomNote && state.minimized) bottomNote.style.display = "none";
        if (creditsEl) creditsEl.style.display = d;
    }

    function tabList() {
        const tabs = [];
        if (state.rootItems.length) tabs.push({ name: null, label: "Main" });
        state.categories.forEach(c => tabs.push({ name: c.name, label: c.name }));
        return tabs;
    }

    function currentViewItems() {
        if (state.currentCategory === null) return state.rootItems;
        const cat = state.categories.find(c => c.name === state.currentCategory);
        return cat ? cat.items : [];
    }

    function buildTabs() {
        tabBar.innerHTML = "";
        const tabs = tabList();
        const pal = palette();
        tabs.forEach((tab, idx) => {
            const btn = document.createElement("button");
            btn.textContent = tab.label;
            const active = state.currentCategory === tab.name;
            Object.assign(btn.style, {
                padding: "7px 16px", borderRadius: "var(--mm-radius)", fontWeight: "700", fontSize: "0.85em",
                cursor: "pointer", border: `2px solid ${state.borderGlow}`,
                background: active ? pal.tabActive : pal.tabInactive,
                color: "#fff",
            });
            btn.onclick = () => { state.currentCategory = tab.name; buildPage(); };
            tabBar.appendChild(btn);
        });
        const activeIdx = Math.max(0, tabs.findIndex(t => t.name === state.currentCategory));
        pgText.textContent = "Pg:" + (activeIdx + 1);
    }

    function buildPage() {
        buildTabs();
        content.innerHTML = "";

        let items = currentViewItems();
        if (state.searchEnabled && state.searchQuery) {
            items = items.filter(item => {
                const label = (item.data.text || item.data.label || item.data.name || item.data.title || "").toLowerCase();
                return label.includes(state.searchQuery);
            });
        }
        items.forEach(item => content.appendChild(renderItem(item)));
    }

    function styledBox(el) {
        Object.assign(el.style, {
            width: "100%", boxSizing: "border-box", padding: "10px", background: "rgba(0,0,0,.25)", color: "#fff",
            border: "none", borderRadius: "var(--mm-radius)", fontFamily: "inherit",
        });
        return el;
    }

    function fireToggle(item, on) {
        if (item.data.onEnable || item.data.onDisable) {
            (on ? item.data.onEnable : item.data.onDisable)?.();
        } else {
            item.data.callback?.(on);
        }
    }

    function buildCustomSlider({ label, min, max, step = 1, value, onChange, formatValue }) {
        const wrap = document.createElement("div");
        const labelRow = document.createElement("div");
        labelRow.style.cssText = "display:flex; justify-content:space-between; margin-bottom:6px; font-size:0.9em;";
        const nameSpan = document.createElement("span"); nameSpan.textContent = label;
        const valSpan = document.createElement("span"); valSpan.style.cssText = `font-weight:bold;`;
        labelRow.append(nameSpan, valSpan);

        const track = document.createElement("div");
        Object.assign(track.style, {
            position: "relative", width: "100%", height: "10px", background: "rgba(0,0,0,.25)",
            borderRadius: "var(--mm-radius)", cursor: "pointer", touchAction: "none",
        });
        const fill = document.createElement("div");
        Object.assign(fill.style, { position: "absolute", top: "0", left: "0", bottom: "0", background: "#fff", borderRadius: "var(--mm-radius)" });
        const thumb = document.createElement("div");
        Object.assign(thumb.style, {
            position: "absolute", top: "50%", width: "16px", height: "16px", borderRadius: "50%",
            background: "#fff", transform: "translate(-50%, -50%)", boxShadow: "0 0 4px rgba(0,0,0,.6)",
        });
        track.append(fill, thumb);
        wrap.append(labelRow, track);

        function setVal(v, fire = true) {
            v = Math.min(max, Math.max(min, Math.round(v / step) * step));
            const pct = ((v - min) / (max - min || 1)) * 100;
            fill.style.width = pct + "%";
            thumb.style.left = pct + "%";
            valSpan.textContent = formatValue ? formatValue(v) : v;
            if (fire) onChange?.(v);
            return v;
        }
        setVal(value, false);

        function posToVal(clientX) {
            const rect = track.getBoundingClientRect();
            const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
            return min + pct * (max - min);
        }
        track.onpointerdown = e => { track.setPointerCapture(e.pointerId); setVal(posToVal(e.clientX)); };
        track.onpointermove = e => { if (e.buttons === 1) setVal(posToVal(e.clientX)); };

        return wrap;
    }

    function itemRowStyle() {
        const pal = palette();
        return `width:100%; padding:13px 14px; background:${pal.itemBg}; border:none; border-radius:var(--mm-radius); color:#fff; font-size:1em; cursor:pointer; font-weight:700; display:flex; justify-content:space-between; align-items:center;`;
    }

    function renderItem(item) {
        const row = document.createElement("div");
        row.style.margin = "8px 0";
        const pal = palette();

        switch (item.type) {
            case "button": {
                const btn = document.createElement("button");
                btn.style.cssText = itemRowStyle();
                const label = document.createElement("span");
                label.textContent = item.data.icon ? item.data.icon + " " + item.data.text : item.data.text;
                btn.appendChild(label);
                btn.onpointerenter = () => btn.style.background = pal.itemBgHover;
                btn.onpointerleave = () => btn.style.background = pal.itemBg;
                btn.onclick = item.data.callback;
                row.appendChild(btn);
                break;
            }

            case "confirmButton": {
                const btn = document.createElement("button");
                let armed = false;
                const label = item.data.icon ? item.data.icon + " " + item.data.text : item.data.text;
                btn.style.cssText = itemRowStyle();
                const span = document.createElement("span"); span.textContent = label;
                btn.appendChild(span);
                btn.onclick = () => {
                    if (!armed) {
                        armed = true;
                        span.textContent = "CONFIRM?";
                        btn.style.background = "#e04444";
                        setTimeout(() => { armed = false; span.textContent = label; btn.style.background = pal.itemBg; }, 2500);
                    } else {
                        armed = false;
                        span.textContent = label; btn.style.background = pal.itemBg;
                        item.data.callback?.();
                    }
                };
                row.appendChild(btn);
                break;
            }

            // Flat row + right-aligned checkmark (matches target look)
            case "toggleButton":
            case "toggleCheckbox": {
                let on = !!item.data.default;
                const tbtn = document.createElement("button");
                tbtn.style.cssText = itemRowStyle();
                const labelSpan = document.createElement("span"); labelSpan.textContent = item.data.text;
                const check = document.createElement("span");
                check.textContent = "\u2713";
                check.style.cssText = "font-size:1.1em; font-weight:900; color:#fff;";
                const paint = () => { check.style.visibility = on ? "visible" : "hidden"; };
                paint();
                tbtn.append(labelSpan, check);
                tbtn.onclick = () => { on = !on; item.data.default = on; paint(); fireToggle(item, on); };
                row.appendChild(tbtn);
                break;
            }

            case "toggleSwitch": {
                let on = !!item.data.default;
                const wrap = document.createElement("div");
                wrap.style.cssText = `display:flex; justify-content:space-between; align-items:center; padding:13px 14px; background:${pal.itemBg}; border-radius:var(--mm-radius); cursor:pointer;`;
                const label = document.createElement("span"); label.textContent = item.data.text; label.style.fontWeight = "700";
                const track = document.createElement("div");
                Object.assign(track.style, { width: "42px", height: "22px", borderRadius: "var(--mm-radius)", position: "relative", flexShrink: "0", background: "rgba(0,0,0,.3)" });
                const knob = document.createElement("div");
                Object.assign(knob.style, { width: "18px", height: "18px", borderRadius: "50%", background: "#fff", position: "absolute", top: "2px", left: "2px", transition: "left .2s" });
                track.appendChild(knob);
                const paintTrack = () => { knob.style.left = on ? "22px" : "2px"; track.style.background = on ? "rgba(255,255,255,.35)" : "rgba(0,0,0,.3)"; };
                paintTrack();
                wrap.onclick = () => { on = !on; item.data.default = on; paintTrack(); fireToggle(item, on); };
                wrap.append(label, track);
                row.appendChild(wrap);
                break;
            }

            case "dropdown": {
                const dlabel = document.createElement("div");
                dlabel.textContent = item.data.label || "Dropdown";
                dlabel.style.marginBottom = "4px";
                const sel = styledBox(document.createElement("select"));
                item.data.options.forEach(opt => {
                    const o = document.createElement("option");
                    o.value = opt.value ?? opt; o.text = opt.label ?? opt;
                    sel.appendChild(o);
                });
                if (item.data.onChange) sel.onchange = e => item.data.onChange(e.target.value);
                row.append(dlabel, sel);
                break;
            }

            case "multiSelect": {
                const mlabel = document.createElement("div");
                mlabel.textContent = item.data.label || "Select";
                mlabel.style.marginBottom = "4px";
                row.appendChild(mlabel);
                const selected = new Set(item.data.default || []);
                item.data.options.forEach(opt => {
                    const val = opt.value ?? opt, text = opt.label ?? opt;
                    const line = document.createElement("div");
                    line.style.cssText = "display:flex; align-items:center; gap:8px; padding:3px 0; cursor:pointer;";
                    const box = document.createElement("div");
                    Object.assign(box.style, { width: "16px", height: "16px", border: "2px solid rgba(255,255,255,.5)", borderRadius: "4px", flexShrink: "0" });
                    const setBox = () => { box.style.background = selected.has(val) ? "#fff" : "transparent"; };
                    setBox();
                    const span = document.createElement("span"); span.textContent = text; span.style.fontSize = "0.9em";
                    line.onclick = () => { selected.has(val) ? selected.delete(val) : selected.add(val); setBox(); item.data.onChange([...selected]); };
                    line.append(box, span);
                    row.appendChild(line);
                });
                break;
            }

            case "radioGroup": {
                const rlabel = document.createElement("div");
                rlabel.textContent = item.data.label || "Choose";
                rlabel.style.marginBottom = "4px";
                row.appendChild(rlabel);
                let selectedVal = item.data.default ?? (item.data.options[0]?.value ?? item.data.options[0]);
                const circles = [];
                item.data.options.forEach(opt => {
                    const val = opt.value ?? opt, text = opt.label ?? opt;
                    const line = document.createElement("div");
                    line.style.cssText = "display:flex; align-items:center; gap:8px; padding:3px 0; cursor:pointer;";
                    const circle = document.createElement("div");
                    Object.assign(circle.style, { width: "16px", height: "16px", borderRadius: "50%", border: "2px solid rgba(255,255,255,.5)", flexShrink: "0", position: "relative" });
                    const dot = document.createElement("div");
                    Object.assign(dot.style, { width: "8px", height: "8px", borderRadius: "50%", background: "#fff", position: "absolute", top: "2px", left: "2px", display: val === selectedVal ? "" : "none" });
                    circle.appendChild(dot);
                    circles.push({ val, circle, dot });
                    const span = document.createElement("span"); span.textContent = text; span.style.fontSize = "0.9em";
                    line.onclick = () => {
                        selectedVal = val;
                        circles.forEach(c => { c.dot.style.display = c.val === val ? "" : "none"; });
                        item.data.onChange(val);
                    };
                    line.append(circle, span);
                    row.appendChild(line);
                });
                break;
            }

            case "slider": {
                row.appendChild(buildCustomSlider({
                    label: item.data.text, min: item.data.min, max: item.data.max, step: item.data.step ?? 1,
                    value: item.data.default ?? item.data.min,
                    onChange: v => { item.data.default = v; item.data.callback?.(v); },
                }));
                break;
            }

            case "opacityControl": {
                row.appendChild(buildCustomSlider({
                    label: "Menu Opacity", min: 20, max: 100, step: 1, value: Math.round(state.opacity * 100),
                    formatValue: v => v + "%",
                    onChange: v => { state.opacity = v / 100; menu.style.opacity = String(state.opacity); },
                }));
                break;
            }

            case "progressBar": {
                const plabel = document.createElement("div");
                plabel.style.cssText = "display:flex; justify-content:space-between; margin-bottom:4px; font-size:0.9em;";
                const valSpan = document.createElement("span"); valSpan.textContent = `${item.data.value}/${item.data.max}`;
                plabel.innerHTML = `<span>${item.data.label}</span>`;
                plabel.appendChild(valSpan);
                const track = document.createElement("div");
                track.style.cssText = "width:100%; height:12px; background:rgba(0,0,0,.25); border-radius:var(--mm-radius);";
                const fill = document.createElement("div");
                const pct = Math.max(0, Math.min(100, (item.data.value / item.data.max) * 100));
                fill.style.cssText = `height:100%; background:#fff; width:${pct}%; border-radius:var(--mm-radius); transition:width .2s;`;
                track.appendChild(fill);
                row.append(plabel, track);
                item._els = { fill, valSpan };
                break;
            }

            case "text":
            case "number": {
                const ilabel = document.createElement("div");
                ilabel.textContent = item.data.label;
                ilabel.style.marginBottom = "4px";
                const iinput = styledBox(document.createElement("input"));
                iinput.type = item.type;
                iinput.value = item.data.default || "";
                if (item.data.placeholder) iinput.placeholder = item.data.placeholder;
                if (item.type === "number") { iinput.min = item.data.min ?? 0; iinput.max = item.data.max ?? 9999; }
                iinput.onchange = () => { item.data.default = iinput.value; item.data.callback?.(item.type === "number" ? Number(iinput.value) : iinput.value); };
                if (item.data.liveCallback) iinput.oninput = () => item.data.liveCallback(iinput.value);
                row.append(ilabel, iinput);
                break;
            }

            case "textarea": {
                const talabel = document.createElement("div");
                talabel.textContent = item.data.label;
                talabel.style.marginBottom = "4px";
                const ta = styledBox(document.createElement("textarea"));
                ta.rows = 3;
                ta.value = item.data.default || "";
                ta.onchange = () => item.data.callback?.(ta.value);
                row.append(talabel, ta);
                break;
            }

            case "colorPicker": {
                const wrap = document.createElement("div");
                wrap.style.cssText = "display:flex; justify-content:space-between; align-items:center;";
                const clabel = document.createElement("span"); clabel.textContent = item.data.label;
                const cinput = document.createElement("input");
                cinput.type = "color";
                cinput.value = item.data.default || "#8a5cf6";
                cinput.style.cssText = "width:44px; height:30px; border:none; border-radius:var(--mm-radius); background:transparent; padding:0; cursor:pointer;";
                cinput.oninput = () => item.data.callback?.(cinput.value);
                wrap.append(clabel, cinput);
                row.appendChild(wrap);
                break;
            }

            case "keybind": {
                const wrap = document.createElement("div");
                wrap.style.cssText = "display:flex; justify-content:space-between; align-items:center;";
                const klabel = document.createElement("span"); klabel.textContent = item.data.label;
                const kbtn = document.createElement("button");
                let current = item.data.default || "None";
                kbtn.textContent = current;
                Object.assign(kbtn.style, { padding: "6px 14px", background: "rgba(0,0,0,.25)", border: "none", borderRadius: "var(--mm-radius)", color: "#fff", fontWeight: "bold", cursor: "pointer", minWidth: "80px" });
                kbtn.onclick = () => {
                    kbtn.textContent = "PRESS KEY";
                    const handler = e => {
                        e.preventDefault();
                        current = e.key.length === 1 ? e.key.toUpperCase() : e.key;
                        kbtn.textContent = current;
                        item.data.callback?.(current);
                        document.removeEventListener("keydown", handler, true);
                    };
                    document.addEventListener("keydown", handler, true);
                };
                wrap.append(klabel, kbtn);
                row.appendChild(wrap);
                break;
            }

            case "statusIndicator": {
                const wrap = document.createElement("div");
                wrap.style.cssText = "display:flex; align-items:center; gap:8px;";
                const dot = document.createElement("div");
                Object.assign(dot.style, { width: "10px", height: "10px", borderRadius: "50%", background: item.data.default ? "#fff" : "rgba(255,255,255,.3)" });
                const slabel = document.createElement("span"); slabel.textContent = item.data.label;
                wrap.append(dot, slabel);
                row.appendChild(wrap);
                state.statusEls[item.data.label] = dot;
                break;
            }

            case "font": {
                const flabel = document.createElement("div");
                flabel.textContent = item.data.label || "Font";
                flabel.style.marginBottom = "4px";
                const fsel = styledBox(document.createElement("select"));
                ["Arial", "Courier New", "Georgia", "Impact", "Tahoma", "Verdana", "system-ui"].forEach(f => {
                    const opt = document.createElement("option"); opt.value = f; opt.text = f; opt.style.fontFamily = f;
                    fsel.appendChild(opt);
                });
                fsel.onchange = e => { item.data.callback?.(e.target.value); if (item.data.applyToMenu) { state.font = e.target.value; applyFont(); } };
                row.append(flabel, fsel);
                break;
            }

            case "label": {
                const l = document.createElement("div");
                l.textContent = item.data.text;
                l.style.cssText = `font-weight:800; font-size:1em; letter-spacing:0.5px; padding-bottom:6px; margin-top:4px;`;
                if (state.rainbow.text) l.classList.add("modmenu-rainbow-text");
                row.appendChild(l);
                break;
            }

            case "paragraph": {
                const p = document.createElement("div");
                p.textContent = item.data.text;
                p.style.cssText = "font-size:0.85em; opacity:0.85; line-height:1.4; padding:2px 0;";
                row.appendChild(p);
                break;
            }

            case "divider": {
                const hr = document.createElement("div");
                hr.style.cssText = "height:1px; background:rgba(255,255,255,.25); margin:6px 0;";
                row.appendChild(hr);
                break;
            }

            case "spacer": {
                row.style.height = (item.data.px || 10) + "px";
                row.style.margin = "0";
                break;
            }

            case "group": {
                const box = document.createElement("div");
                box.style.cssText = `border-radius:var(--mm-radius); overflow:hidden; background:${pal.itemBg};`;
                const head = document.createElement("div");
                head.style.cssText = "padding:12px 14px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; font-weight:700;";
                const titleSpan = document.createElement("span"); titleSpan.textContent = item.data.title;
                const chev = document.createElement("span"); chev.textContent = item.data.expanded ? "\u25BE" : "\u25B8";
                head.append(titleSpan, chev);
                head.onclick = () => { item.data.expanded = !item.data.expanded; buildPage(); };
                box.appendChild(head);
                if (item.data.expanded) {
                    const body = document.createElement("div");
                    body.style.cssText = "padding:4px 14px 10px;";
                    item.data.items.forEach(sub => body.appendChild(renderItem(sub)));
                    box.appendChild(body);
                }
                row.appendChild(box);
                break;
            }
        }

        return row;
    }

    function applyRainbowFlags() {
        if (!menu) return;
        header.querySelector("#modmenu-title-text").classList.toggle("modmenu-rainbow-text", state.rainbow.title);
        menu.classList.toggle("modmenu-rainbow-bg", state.rainbow.background);
        menu.classList.toggle("modmenu-rainbow-border", state.rainbow.border);
        buildPage();
    }

    let toggleKeyHandler = null;
    function attachToggleKey() {
        if (toggleKeyHandler) document.removeEventListener("keydown", toggleKeyHandler);
        toggleKeyHandler = e => {
            if (e.key === state.toggleKey || e.code === state.toggleKey) {
                if (!menu) return;
                menu.style.display = menu.style.display === "none" ? "" : "none";
            }
        };
        document.addEventListener("keydown", toggleKeyHandler);
    }

    function showToast(text, duration = 3000, type = "info") {
        injectStyles();
        const colors = { info: state.accentColor, success: "#33ffaa", error: "#ff3366", warn: "#ffaa33" };
        const toast = document.createElement("div");
        Object.assign(toast.style, {
            position: "fixed", bottom: "24px", right: "24px", background: "#1a1a1a",
            border: `2px solid ${colors[type] || colors.info}`, borderRadius: "var(--mm-radius)", color: "#fff", padding: "10px 16px",
            fontFamily: state.font, fontSize: "0.9em", zIndex: "999999", opacity: "0",
            transform: "translateY(10px)", transition: "opacity .3s, transform .3s",
        });
        toast.textContent = text;
        document.body.appendChild(toast);
        requestAnimationFrame(() => { toast.style.opacity = "1"; toast.style.transform = "translateY(0)"; });
        setTimeout(() => { toast.style.opacity = "0"; toast.style.transform = "translateY(10px)"; setTimeout(() => toast.remove(), 300); }, duration);
    }

    function showSlideNotify(text, duration = 3000) {
        const el = document.createElement("div");
        Object.assign(el.style, {
            position: "fixed", top: "24px", right: "24px", background: "#1a1a1a",
            border: `2px solid ${state.accentColor}`, borderRadius: "var(--mm-radius)", color: "#fff", padding: "12px 16px",
            fontFamily: state.font, fontSize: "0.9em", zIndex: "999999", transform: "translateX(140%)",
            transition: "transform .35s ease",
        });
        el.textContent = text;
        document.body.appendChild(el);
        requestAnimationFrame(() => { el.style.transform = "translateX(0)"; });
        setTimeout(() => { el.style.transform = "translateX(140%)"; setTimeout(() => el.remove(), 350); }, duration);
    }

    function showBottomNote(text, duration = 4000) {
        if (!bottomNote) return;
        bottomNote.textContent = text;
        bottomNote.style.display = "";
        clearTimeout(state._bottomNoteTimer);
        state._bottomNoteTimer = setTimeout(() => { bottomNote.style.display = "none"; }, duration);
    }

    function showPopup(title, message) {
        injectStyles();
        const overlay = document.createElement("div");
        Object.assign(overlay.style, { position: "fixed", inset: "0", background: "rgba(0,0,0,0.6)", zIndex: "999998", display: "flex", alignItems: "center", justifyContent: "center" });
        const box = document.createElement("div");
        Object.assign(box.style, { background: palette().body, border: `3px solid ${state.accentColor}`, borderRadius: "var(--mm-radius)", padding: "20px", minWidth: "260px", maxWidth: "80vw", color: "#fff", fontFamily: state.font, position: "relative" });
        box.style.setProperty("--mm-radius", state.radius + "px");
        const closeX = document.createElement("button");
        closeX.textContent = "\u2715";
        closeX.style.cssText = "position:absolute; top:8px; right:8px; background:#e04444; color:#fff; border:none; width:26px; height:26px; border-radius:var(--mm-radius); cursor:pointer; font-size:1.1em; display:flex; align-items:center; justify-content:center;";
        closeX.onclick = () => overlay.remove();
        const h = document.createElement("div"); h.textContent = title;
        h.style.cssText = `font-weight:bold; font-size:1.1em; margin-bottom:10px; padding-right:24px;`;
        const p = document.createElement("div"); p.textContent = message; p.style.cssText = "font-size:0.9em; line-height:1.4;";
        box.append(closeX, h, p);
        overlay.appendChild(box);
        overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
        document.body.appendChild(overlay);
    }

    // public api
    window.ModMenu = {
        vars: {},

        title(str) { state.title = str; if (header) header.querySelector("#modmenu-title-text").textContent = str; return this; },
        creator(str) { state.creator = str; if (header) header.querySelector("div > div").textContent = "by " + str; return this; },
        setCredits(str) { state.credits = str; if (creditsEl) creditsEl.textContent = str; return this; },
        glow(color) { state.borderGlow = color; applyTheme(); return this; },
        objectsPerPage() { return this; }, // kept for backward compatibility (unused: content now scrolls)

        setTheme(name) { state.theme = name; applyTheme(); return this; },
        setSize(name) { state.size = name; applySize(); return this; },
        setFont(name) { state.font = name; applyFont(); return this; },
        setRadius(px) { state.radius = px; applyRadius(); return this; },
        setNavStyle() { return this; }, // kept for backward compatibility (unused: tabs replace nav)

        customTheme(borderColor, accentColor) {
            state.theme = "Custom"; state.borderGlow = borderColor; state.accentColor = accentColor || borderColor;
            applyTheme();
            return this;
        },

        theme: (() => {
            const t = { custom: (c) => { state.theme = "Custom"; state.borderGlow = c; applyTheme(); return window.ModMenu; } };
            Object.keys(THEME_COLORS).forEach(name => { t[name] = () => { state.theme = name; applyTheme(); return window.ModMenu; }; });
            return t;
        })(),

        size: {
            Small() { state.size = "Small"; applySize(); return window.ModMenu; },
            Mid() { state.size = "Mid"; applySize(); return window.ModMenu; },
            Big() { state.size = "Big"; applySize(); return window.ModMenu; },
            Huge() { state.size = "Huge"; applySize(); return window.ModMenu; },
        },

        rainbowTitle(on = true) { state.rainbow.title = on; applyRainbowFlags(); return this; },
        rainbowBackground(on = true) { state.rainbow.background = on; applyRainbowFlags(); return this; },
        rainbowText(on = true) { state.rainbow.text = on; applyRainbowFlags(); return this; },
        rainbowBorder(on = true) { state.rainbow.border = on; applyRainbowFlags(); return this; },

        category(name, icon = "\u25A0") {
            if (!state.categories.find(c => c.name === name)) state.categories.push({ name, icon, items: [] });
            const cat = state.categories.find(c => c.name === name);
            state.contextStack = [cat.items];
            return this;
        },

        group(title) {
            const item = pushItem("group", { title, items: [], expanded: false });
            state.contextStack.push(item.data.items);
            return this;
        },
        endGroup() { if (state.contextStack.length > 1) state.contextStack.pop(); return this; },

        button(text, icon = "") { return { action: fn => { pushItem("button", { text, icon, callback: fn }); return window.ModMenu; } }; },
        confirmButton(text, icon = "") { return { action: fn => { pushItem("confirmButton", { text, icon, callback: fn }); return window.ModMenu; } }; },

        toggle(text) { return this.toggleButton(text); },
        toggleButton(text, def = false) {
            const item = pushItem("toggleButton", { text, default: def });
            return {
                action: fn => { item.data.callback = fn; return window.ModMenu; },
                onToggle: (onFn, offFn) => { item.data.onEnable = onFn; item.data.onDisable = offFn; return window.ModMenu; },
            };
        },
        toggleSwitch(text, def = false) {
            const item = pushItem("toggleSwitch", { text, default: def });
            return {
                action: fn => { item.data.callback = fn; return window.ModMenu; },
                onToggle: (onFn, offFn) => { item.data.onEnable = onFn; item.data.onDisable = offFn; return window.ModMenu; },
            };
        },
        toggleCheckbox(text, def = false) {
            const item = pushItem("toggleCheckbox", { text, default: def });
            return {
                action: fn => { item.data.callback = fn; return window.ModMenu; },
                onToggle: (onFn, offFn) => { item.data.onEnable = onFn; item.data.onDisable = offFn; return window.ModMenu; },
            };
        },

        dropdown(label) { return { options: arr => ({ onChange: fn => { pushItem("dropdown", { label, options: arr, onChange: fn }); return window.ModMenu; } }) }; },
        multiSelect(label, def = []) { return { options: arr => ({ onChange: fn => { pushItem("multiSelect", { label, options: arr, default: def, onChange: fn }); return window.ModMenu; } }) }; },
        radioGroup(label, def) { return { options: arr => ({ onChange: fn => { pushItem("radioGroup", { label, options: arr, default: def, onChange: fn }); return window.ModMenu; } }) }; },

        slider(text, min, max, step = 1, defaultVal) { return { action: fn => { pushItem("slider", { text, min, max, step, default: defaultVal, callback: fn }); return window.ModMenu; } }; },
        opacityControl() { pushItem("opacityControl", {}); return this; },
        progressBar(label, value, max = 100) { pushItem("progressBar", { label, value, max }); return this; },

        textInput(label, defaultVal = "", placeholder = "") {
            return {
                onChange: fn => { pushItem("text", { label, default: defaultVal, placeholder, callback: fn }); return window.ModMenu; },
                onInput: fn => { pushItem("text", { label, default: defaultVal, placeholder, liveCallback: fn }); return window.ModMenu; },
            };
        },
        numberInput(label, min = 0, max = 9999, step = 1, defaultVal = 0) { return { action: fn => { pushItem("number", { label, min, max, step, default: defaultVal, callback: fn }); return window.ModMenu; } }; },
        textarea(label, defaultVal = "") { return { action: fn => { pushItem("textarea", { label, default: defaultVal, callback: fn }); return window.ModMenu; } }; },
        colorPicker(label, defaultVal = "#8a5cf6") { return { action: fn => { pushItem("colorPicker", { label, default: defaultVal, callback: fn }); return window.ModMenu; } }; },
        keybind(label, defaultVal = "None") { return { action: fn => { pushItem("keybind", { label, default: defaultVal, callback: fn }); return window.ModMenu; } }; },
        statusIndicator(label, def = false) { pushItem("statusIndicator", { label, default: def }); return this; },
        fontSelector(label = "Font", applyToMenu = false) { return { action: fn => { pushItem("font", { label, callback: fn, applyToMenu }); return window.ModMenu; } }; },

        varInput(varName, label, defaultVal = "") {
            window.ModMenu.vars[varName] = defaultVal;
            pushItem("text", {
                label, default: defaultVal,
                liveCallback: v => { window.ModMenu.vars[varName] = v; },
                callback: v => { window.ModMenu.vars[varName] = v; },
            });
            return this;
        },

        label(text) { pushItem("label", { text }); return this; },
        paragraph(text) { pushItem("paragraph", { text }); return this; },
        divider() { pushItem("divider", {}); return this; },
        spacer(px = 10) { pushItem("spacer", { px }); return this; },

        enableSearch() { state.searchEnabled = true; if (menu) buildPage(); return this; },
        setOpacity(v) { state.opacity = Math.max(0.2, Math.min(1, v)); if (menu) menu.style.opacity = String(state.opacity); return this; },
        makeResizable(on = true) { if (menu) { menu.style.resize = on ? "both" : "none"; menu.style.overflow = on ? "auto" : "hidden"; } return this; },
        setCloseConfirm(on = true) { state.closeConfirm = on; return this; },
        enableToggleKey(key = "Insert") { state.toggleKey = key; if (menu) attachToggleKey(); return this; },
        addHeaderIcon(icon, onClick) {
            if (!headerIcons) return this;
            const btn = document.createElement("button");
            btn.textContent = icon;
            btn.style.cssText = controlBtnStyle(palette().iconBg);
            btn.onclick = onClick;
            headerIcons.insertBefore(btn, headerIcons.firstChild);
            return this;
        },

        notify(text, duration = 3000, type = "info") { showToast(text, duration, type); return this; },
        slideNotify(text, duration = 3000) { showSlideNotify(text, duration); return this; },
        notifyBottom(text, duration = 4000) { showBottomNote(text, duration); return this; },
        popup(title, message) { showPopup(title, message); return this; },

        updateProgress(label, value) {
            const item = collectAllItems().find(it => it.type === "progressBar" && it.data.label === label);
            if (!item) return this;
            item.data.value = value;
            if (item._els) {
                const pct = Math.max(0, Math.min(100, (value / item.data.max) * 100));
                item._els.fill.style.width = pct + "%";
                item._els.valSpan.textContent = `${value}/${item.data.max}`;
            }
            return this;
        },

        setStatus(label, on) {
            const dot = state.statusEls[label];
            if (dot) dot.style.background = on ? "#fff" : "rgba(255,255,255,.3)";
            return this;
        },

        saveConfig(key = "modmenu-config") {
            const dump = {};
            collectAllItems().forEach(item => {
                if (["toggleButton", "toggleSwitch", "toggleCheckbox"].includes(item.type)) dump[item.data.text] = !!item.data.default;
            });
            dump.__vars = { ...window.ModMenu.vars };
            try { localStorage.setItem(key, JSON.stringify(dump)); showToast("Config saved", 1500, "success"); }
            catch (e) { showToast("Save failed", 1500, "error"); }
            return this;
        },
        loadConfig(key = "modmenu-config") {
            let raw;
            try { raw = localStorage.getItem(key); } catch (e) { showToast("Load failed", 1500, "error"); return this; }
            if (!raw) { showToast("No saved config found", 1500, "warn"); return this; }
            const dump = JSON.parse(raw);
            collectAllItems().forEach(item => {
                if (["toggleButton", "toggleSwitch", "toggleCheckbox"].includes(item.type) && Object.prototype.hasOwnProperty.call(dump, item.data.text)) {
                    const val = !!dump[item.data.text];
                    item.data.default = val;
                    fireToggle(item, val);
                }
            });
            if (dump.__vars) Object.assign(window.ModMenu.vars, dump.__vars);
            if (menu) buildPage();
            showToast("Config loaded", 1500, "success");
            return this;
        },

        show() {
            if (!menu) { createMenu(); applyTheme(); applySize(); applyFont(); applyRadius(); applyRainbowFlags(); }
            menu.style.display = "";
            buildPage();
            return this;
        },
        hide() {
            if (menu) menu.style.display = "none";
            return this;
        },
        destroy() {
            stopFpsCounter();
            if (menu) { menu.remove(); menu = null; }
            return this;
        },

        demo() {
            return this
                .button("Button", "").action(() => console.log("Button"))
                .toggle("Toggle").action(() => console.log("toggled"))
                .dropdown("Drop Down").options(["dih", "2", "other option", "idk"]).onChange(v => console.log("Option:", v))
                .slider("Slider", 1, 50, 1, 10).action(v => console.log("Slider 1:", v))
                .textInput("Input", "", "Type here...").onChange(v => console.log("Input:", v))
                .numberInput("Reach", 1, 20, 0.5, 3.5).action(v => console.log("Reach:", v))
                .fontSelector("UI Font", true).action(f => console.log("Font:", f))
                .show();
        },

        testAll() {
            this.title("Menu Title").creator("Elctro").setCredits("Lunar UI made with luv 🩵");
            this.setTheme("Violet").setSize("Big").setRadius(16);
            this.enableSearch().setCloseConfirm(true).enableToggleKey("Insert");
            this.addHeaderIcon("\uD83D\uDCBE", () => this.saveConfig());

            this.button("Button", "").action(() => this.notify("Quick action fired!", 2000, "success"))
                .toggle("Toggle", true).onToggle(
                    () => this.notify("ENABLED", 1500, "success"),
                    () => this.notify("DISABLED", 1500, "warn")
                );

            this.category("Buttons", "")
                .button("Simple Button", "\u{1F449}").action(() => console.log("simple button clicked"))
                .confirmButton("Think twice Button", "").action(() => this.notify("Yuh u clicked me", 2000, "error"))
                .label("More")
                .button("Another Button").action(() => console.log("another button clicked"));

            this.category("Toggles", "")
                .toggleButton("Toggle", false).onToggle(
                    () => { console.log("Toggled!"); this.notify("ENABLED", 1500, "success"); },
                    () => { console.log("DISABLED"); this.notify("u KILLED me", 1500, "warn"); }
                )
                .toggleSwitch("Cool Switch", false).action(v => console.log(":", v))
                .toggleCheckbox("Cool checkbox", true).action(v => console.log(":", v));

            this.category("Sliders & Progress", "")
                .slider("Field of View", 60, 120, 1, 90).action(v => console.log("fov", v))
                .slider("Volume", 0, 100, 1, 50).action(v => console.log("volume", v))
                .opacityControl()
                .label("Static examples")
                .progressBar("EXAMPLE: Likes till Update", 420, 1000)
                .progressBar("EXAMPLE: Subs till update", 80, 100);

            this.category("Inputs & Vars", "")
                .paragraph("varInput binds a text field straight to ModMenu.vars — read it anywhere in your script.")
                .varInput("playerName", "name", "Guest")
                .button("Log ModMenu.vars.playerName").action(() => this.notify("vars.playerName = " + window.ModMenu.vars.playerName, 2500, "info"))
                .numberInput("Age", 1, 100, 1, 10).action(v => console.log("Age", v))
                .textarea("Notes", "Write something...").action(v => console.log("notes", v))
                .colorPicker("Accent Color", "#8a5cf6").action(v => this.customTheme(v, v))
                .keybind("Toggle Menu Key", "Insert").action(k => this.enableToggleKey(k));

            this.category("Selectors", "")
                .dropdown("Dropdown").options(["Hi", "im", "a", "dropdown!"]).onChange(v => console.log("weapon", v))
                .radioGroup("Difficulty", "Normal").options(["Easy", "Normal", "Hard", "Nightmare"]).onChange(v => console.log("difficulty", v))
                .fontSelector("Menu Font", true).action(f => console.log("font", f));

            this.category("Groups", "")
                .paragraph("A group can hold buttons, toggles, sliders — anything collapsed under one title.")
                .group("Combat Settings")
                    .button("Reset Combat Stats").action(() => console.log("combat stats reset"))
                    .toggleSwitch("Auto-Block", false).action(v => console.log("auto-block", v))
                    .slider("Damage Multiplier", 1, 10, 1, 1).action(v => console.log("dmg mult", v))
                .endGroup()
                .group("Movement Settings")
                    .toggleCheckbox("Bunny Hop", false).action(v => console.log("bhop", v))
                    .slider("Move Speed", 1, 20, 1, 6).action(v => console.log("move speed", v))
                .endGroup();

            this.category("Visual", "")
                .label("Theme, size, corner radius")
                .dropdown("Theme").options(Object.keys(THEME_COLORS)).onChange(v => this.setTheme(v))
                .dropdown("Size").options(["Small", "Mid", "Big", "Huge"]).onChange(v => this.setSize(v))
                .slider("Corner Radius", 0, 24, 1, 16).action(v => this.setRadius(v))
                .toggleSwitch("Rainbow Title", false).action(v => this.rainbowTitle(v))
                .toggleSwitch("Rainbow Background", false).action(v => this.rainbowBackground(v))
                .toggleSwitch("Rainbow Text", false).action(v => this.rainbowText(v))
                .toggleSwitch("Rainbow Border", false).action(v => this.rainbowBorder(v));

            this.category("Notifi Lib", "")
                .paragraph("Three distinct notification types.")
                .button("Corner Toast", "").action(() => this.notify("Bottom-right toast", 2500, "info"))
                .button("Side Slide In", "").action(() => this.slideNotify("Slides in from the right, then back out", 2500))
                .button("Bottom Note", "").action(() => this.notifyBottom("Pinned note inside the menu itself", 4000))
                .button("Popup Dialog", "").action(() => this.popup("WAIT!", "This is a popup dialog with its own close button — use it for important info or news."));

            this.category("Utility", "")
                .button("Save Config", "\uD83D\uDCBE").action(() => this.saveConfig())
                .button("Load Config", "\uD83D\uDCC2").action(() => this.loadConfig())
                .toggleCheckbox("Resizable Menu", false).action(v => this.makeResizable(v))
                .spacer(6);

            return this.show();
        },
    };
})();
