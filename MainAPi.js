// Lunar API made by Kyoshade and cluade ai lol
// its cool

(function () {
    const state = {
        theme: "Classic",
        size: "Mid",
        title: "Menu",
        creator: "Unknown",
        credits: "",
        objectsPerPage: 8,
        currentPage: 0,
        minimized: false,
        borderGlow: "#00ff99",
        accentColor: "#00ff99",
        font: "Arial, sans-serif",
        radius: 0,         
        navStyle: "attached", 

       
        rootItems: [],
        categories: [],
        contextStack: null,   
        currentCategory: null,

        searchEnabled: false,
        searchQuery: "",

        // rainbow shit
        rainbow: { title: false, background: false, text: false, border: false },

    
        opacity: 1,
        closeConfirm: false,
        pendingClose: false,
        toggleKey: null,
        statusEls: {},
        _bottomNoteTimer: null,
    };
    state.contextStack = [state.rootItems];

    let menu, header, headerIcons, content, pageInfo, arrows, prevBtn, nextBtn, backBtn, searchBox, creditsEl;
    let sidesLeft, sidesRight, sideBadge, cornerPrev, cornerNext, bottomNote, attachedBadge;
    let menuResizeObserver = null;

 
    function injectStyles() {
        if (document.getElementById("modmenu-styles")) return;
        const style = document.createElement("style");
        style.id = "modmenu-styles";
        style.textContent = `
            @keyframes modmenu-rainbow { 0%{filter:hue-rotate(0deg)} 100%{filter:hue-rotate(360deg)} }
            .modmenu-rainbow-bg { animation: modmenu-rainbow 4s linear infinite; }
            .modmenu-rainbow-text { animation: modmenu-rainbow 3s linear infinite; }
            .modmenu-rainbow-border { animation: modmenu-rainbow 2.5s linear infinite; }
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

    // ---------- Detached nav positioning ----------
    // sidesLeft/sidesRight/sideBadge/cornerPrev/cornerNext live on document.body,
    // not inside `menu`, so menu's overflow:hidden can no longer clip them.
    // This keeps them glued to the menu's current position/size instead.
    function syncDetachedNav() {
        if (!menu) return;
        const rect = menu.getBoundingClientRect();

        Object.assign(sidesLeft.style, {
            position: "fixed",
            top: (rect.top + 40) + "px",
            left: (rect.left - 30) + "px",
            height: Math.max(20, rect.height - 80) + "px",
            bottom: "",
        });
        Object.assign(sidesRight.style, {
            position: "fixed",
            top: (rect.top + 40) + "px",
            left: (rect.right + 4) + "px",
            height: Math.max(20, rect.height - 80) + "px",
            bottom: "",
        });
        Object.assign(sideBadge.style, {
            position: "fixed",
            top: (rect.top - 14) + "px",
            left: (rect.left + 12) + "px",
        });
        Object.assign(cornerPrev.style, {
            position: "fixed",
            top: (rect.bottom + 8) + "px",
            left: rect.left + "px",
            bottom: "",
        });
        Object.assign(cornerNext.style, {
            position: "fixed",
            top: (rect.bottom + 8) + "px",
            left: (rect.right - cornerNext.offsetWidth) + "px",
            bottom: "",
        });
    }

    // core classes cuh
    function createMenu() {
        injectStyles();

        menu = document.createElement("div");
        Object.assign(menu.style, {
            position: "fixed",
            top: "80px",
            left: "80px",
            background: "#1a1a1a",
            border: `2px solid ${state.borderGlow}`,
            boxShadow: `0 0 20px ${state.borderGlow}`,
            zIndex: "99999",
            color: "#fff",
            fontFamily: state.font,
            padding: "10px",
            minWidth: "280px",
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
            font-weight: bold; font-size: 1.2em; padding: 8px 12px;
            background: #111; margin: -10px -10px 10px -10px;
            border-bottom: 2px solid ${state.borderGlow};
            cursor: move; display: flex; justify-content: space-between; align-items: center; gap: 10px;
        `;
        const titleGroup = document.createElement("span");
        titleGroup.style.cssText = "min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;";
        const titleWrap = document.createElement("span");
        titleWrap.id = "modmenu-title-text";
        titleWrap.textContent = state.title;
        const creatorTag = document.createElement("small");
        creatorTag.style.cssText = "opacity:0.6; font-size:0.8em; margin-left:6px;";
        creatorTag.textContent = "by " + state.creator;
        titleGroup.append(titleWrap, creatorTag);
        header.appendChild(titleGroup);

        headerIcons = document.createElement("div");
        headerIcons.style.cssText = "display:flex; gap:6px; flex-shrink:0;";

        const homeBtn = document.createElement("button");
        homeBtn.textContent = "\u2302"; // house-ish glyph, plain & reliable
        homeBtn.title = "Home";
        homeBtn.style.cssText = controlBtnStyle("#333");
        homeBtn.onclick = () => { state.currentCategory = null; state.currentPage = 0; buildPage(); };

        const minBtn = document.createElement("button");
        minBtn.title = "Minimize";
        minBtn.style.cssText = controlBtnStyle();
        minBtn.innerHTML = `<span style="display:block; width:12px; height:2px; background:currentColor;"></span>`;
        minBtn.onclick = toggleMinimize;

        const closeBtn = document.createElement("button");
        closeBtn.textContent = "\u2715";
        closeBtn.title = "Close";
        closeBtn.style.cssText = controlBtnStyle("#e04444");
        closeBtn.onclick = handleClose;

        headerIcons.append(homeBtn, minBtn, closeBtn);
        header.appendChild(headerIcons);
        menu.appendChild(header);

        // ---------- Search ----------
        searchBox = document.createElement("input");
        searchBox.type = "text";
        searchBox.placeholder = "Search...";
        Object.assign(searchBox.style, {
            width: "100%", boxSizing: "border-box", padding: "8px", marginBottom: "6px",
            background: "#222", color: "#fff", border: "2px solid #555", borderRadius: "var(--mm-radius)",
            display: state.searchEnabled ? "" : "none",
        });
        searchBox.oninput = () => { state.searchQuery = searchBox.value.toLowerCase(); state.currentPage = 0; buildPage(); };
        menu.appendChild(searchBox);

        // ---------- Back button ----------
        backBtn = document.createElement("button");
        backBtn.textContent = "\u2190 BACK";
        backBtn.style.cssText = navBtnStyle() + "width:100%; margin-bottom:8px; display:none;";
        backBtn.onclick = () => { state.currentCategory = null; state.currentPage = 0; buildPage(); };
        menu.appendChild(backBtn);

        // ---------- Content ----------
        content = document.createElement("div");
        content.style.padding = "4px 0";
        menu.appendChild(content);

        // ---------- Location label ----------
        pageInfo = document.createElement("div");
        pageInfo.style.cssText = "text-align:center; font-size:0.8em; opacity:0.7; margin:8px 0 6px; font-weight:bold; letter-spacing:0.5px;";
        menu.appendChild(pageInfo);

        // ---------- Attached nav (default) ----------
        arrows = document.createElement("div");
        arrows.style.cssText = "display:flex; justify-content:center; align-items:center; gap:12px; margin-top:4px;";

        prevBtn = document.createElement("button");
        prevBtn.textContent = "\u2190 PREV";
        prevBtn.style.cssText = navBtnStyle();
        prevBtn.onclick = prevPage;

        attachedBadge = document.createElement("span");
        attachedBadge.style.cssText = "font-size:0.85em; opacity:0.8; min-width:40px; text-align:center;";

        nextBtn = document.createElement("button");
        nextBtn.textContent = "NEXT \u2192";
        nextBtn.style.cssText = navBtnStyle();
        nextBtn.onclick = nextPage;

        arrows.append(prevBtn, attachedBadge, nextBtn);
        menu.appendChild(arrows);

        // ---------- Sides nav (detached, flush to left/right edges) ----------
        // NOTE: appended to document.body (not `menu`) so menu's overflow:hidden
        // can't clip them — they're kept glued to the menu via syncDetachedNav().
        sidesLeft = document.createElement("button");
        sidesLeft.textContent = "\u2039";
        Object.assign(sidesLeft.style, {
            position: "fixed", width: "26px",
            background: "#1a1a1a", border: `2px solid ${state.borderGlow}`, borderRadius: "var(--mm-radius)",
            color: "#fff", fontSize: "1.4em", cursor: "pointer", display: "none",
            zIndex: "99999",
        });
        sidesLeft.onclick = prevPage;

        sidesRight = document.createElement("button");
        sidesRight.textContent = "\u203a";
        Object.assign(sidesRight.style, {
            position: "fixed", width: "26px",
            background: "#1a1a1a", border: `2px solid ${state.borderGlow}`, borderRadius: "var(--mm-radius)",
            color: "#fff", fontSize: "1.4em", cursor: "pointer", display: "none",
            zIndex: "99999",
        });
        sidesRight.onclick = nextPage;

        sideBadge = document.createElement("div");
        Object.assign(sideBadge.style, {
            position: "fixed", background: state.borderGlow, color: "#111",
            fontSize: "0.7em", fontWeight: "bold", padding: "2px 8px", borderRadius: "var(--mm-radius)", display: "none",
            zIndex: "99999",
        });

        document.body.append(sidesLeft, sidesRight, sideBadge);

        // ---------- Corners nav (detached, bottom corners) ----------
        cornerPrev = document.createElement("button");
        cornerPrev.textContent = "\u2190";
        Object.assign(cornerPrev.style, {
            position: "fixed", padding: "8px 14px",
            background: "#1a1a1a", border: `2px solid ${state.borderGlow}`, borderRadius: "var(--mm-radius)",
            color: "#fff", fontWeight: "bold", cursor: "pointer", display: "none",
            zIndex: "99999",
        });
        cornerPrev.onclick = prevPage;

        cornerNext = document.createElement("button");
        cornerNext.textContent = "\u2192";
        Object.assign(cornerNext.style, {
            position: "fixed", padding: "8px 14px",
            background: "#1a1a1a", border: `2px solid ${state.borderGlow}`, borderRadius: "var(--mm-radius)",
            color: "#fff", fontWeight: "bold", cursor: "pointer", display: "none",
            zIndex: "99999",
        });
        cornerNext.onclick = nextPage;

        document.body.append(cornerPrev, cornerNext);

        // ---------- Bottom note (persistent inline notification) ----------
        bottomNote = document.createElement("div");
        bottomNote.style.cssText = "margin-top:8px; padding:8px; font-size:0.8em; text-align:center; border:1px dashed #555; border-radius:var(--mm-radius); display:none;";
        menu.appendChild(bottomNote);

        // ---------- Credits ----------
        creditsEl = document.createElement("div");
        creditsEl.style.cssText = "text-align:center; font-size:0.75em; opacity:0.5; margin-top:8px;";
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
            syncDetachedNav();
        };

        // keep detached nav glued to the menu across manual resize (makeResizable)
        // and any other size change (font/theme swaps, content growth, etc.)
        if (window.ResizeObserver) {
            menuResizeObserver = new ResizeObserver(() => syncDetachedNav());
            menuResizeObserver.observe(menu);
        }

        if (state.toggleKey) attachToggleKey();
        updateNavVisibility();
        syncDetachedNav();
    }

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
        if (menuResizeObserver) { menuResizeObserver.disconnect(); menuResizeObserver = null; }
        menu.remove();
        [sidesLeft, sidesRight, sideBadge, cornerPrev, cornerNext].forEach(el => el && el.remove());
        menu = null;
    }

    function controlBtnStyle(bg = "#444") {
        return `background:${bg}; color:#fff; border:none; width:28px; height:28px; border-radius:var(--mm-radius); font-size:1.1em; cursor:pointer; display:flex; align-items:center; justify-content:center; line-height:1; padding:0;`;
    }

    function navBtnStyle() {
        return `background:#222; color:#fff; border:2px solid #555; padding:6px 16px; font-weight:bold; border-radius:var(--mm-radius); cursor:pointer;`;
    }

    function updateNavVisibility() {
        if (!menu) return;
        const showAttached = state.navStyle === "attached" && !state.minimized;
        const showSides = state.navStyle === "sides" && !state.minimized;
        const showCorners = state.navStyle === "corners" && !state.minimized;
        arrows.style.display = showAttached ? "flex" : "none";
        sidesLeft.style.display = showSides ? "flex" : "none";
        sidesLeft.style.alignItems = "center"; sidesLeft.style.justifyContent = "center";
        sidesRight.style.display = showSides ? "flex" : "none";
        sidesRight.style.alignItems = "center"; sidesRight.style.justifyContent = "center";
        sideBadge.style.display = showSides ? "" : "none";
        cornerPrev.style.display = showCorners ? "" : "none";
        cornerNext.style.display = showCorners ? "" : "none";
        if (showSides || showCorners) syncDetachedNav();
    }

  
    const THEME_COLORS = {
        Classic: "#00ff99", Blue: "#00aaff", Red: "#ff3366", Purple: "#bb66ff",
        Green: "#33ffaa", Orange: "#ffaa33", Pink: "#ff66cc", Cyan: "#22e0e0",
        Yellow: "#ffee44", Teal: "#22bbaa", White: "#eeeeee", Mono: "#999999",
    };

    function applyTheme() {
        state.borderGlow = THEME_COLORS[state.theme] || state.borderGlow;
        state.accentColor = state.borderGlow;
        if (!menu) return;
        menu.style.borderColor = state.borderGlow;
        menu.style.boxShadow = `0 0 20px ${state.borderGlow}`;
        header.style.borderBottomColor = state.borderGlow;
        [sidesLeft, sidesRight, cornerPrev, cornerNext].forEach(el => el.style.borderColor = state.borderGlow);
        sideBadge.style.background = state.borderGlow;
        menu.classList.toggle("modmenu-rainbow-border", state.rainbow.border);
        buildPage();
    }

    function applySize() {
        const sizes = { Small: "260px", Mid: "360px", Big: "480px", Huge: "620px" };
        if (menu) menu.style.width = sizes[state.size] || "360px";
        syncDetachedNav();
    }

    function applyFont() { if (menu) menu.style.fontFamily = state.font; }
    function applyRadius() { if (menu) menu.style.setProperty("--mm-radius", state.radius + "px"); }

    function toggleMinimize() {
        state.minimized = !state.minimized;
        const d = state.minimized ? "none" : "";
        content.style.display = pageInfo.style.display = d;
        if (backBtn) backBtn.style.display = state.minimized ? "none" : (state.currentCategory ? "" : "none");
        if (searchBox) searchBox.style.display = state.minimized ? "none" : (state.searchEnabled ? "" : "none");
        if (bottomNote) bottomNote.style.display = state.minimized ? "none" : bottomNote.style.display;
        if (creditsEl) creditsEl.style.display = d;
        updateNavVisibility();
        syncDetachedNav();
    }


    function currentViewItems() {
        if (state.currentCategory === null) {
            const navItems = state.categories.map(cat => ({
                type: "categoryNav",
                data: { name: cat.name, icon: cat.icon || "\u25A0", count: cat.items.length }
            }));
            return [...state.rootItems, ...navItems];
        }
        const cat = state.categories.find(c => c.name === state.currentCategory);
        return cat ? cat.items : [];
    }

    function buildPage() {
        content.innerHTML = "";
        backBtn.style.display = state.currentCategory !== null && !state.minimized ? "" : "none";
        searchBox.style.display = state.searchEnabled && !state.minimized ? "" : "none";
        updateNavVisibility();

        let allItems = currentViewItems();
        if (state.searchEnabled && state.searchQuery) {
            allItems = allItems.filter(item => {
                const label = (item.data.text || item.data.label || item.data.name || item.data.title || "").toLowerCase();
                return label.includes(state.searchQuery);
            });
        }

        const start = state.currentPage * state.objectsPerPage;
        const pageItems = allItems.slice(start, start + state.objectsPerPage);
        pageItems.forEach(item => content.appendChild(renderItem(item)));

        const totalItems = allItems.length;
        const totalPages = Math.ceil(totalItems / state.objectsPerPage) || 1;
        const location = state.currentCategory ? state.currentCategory.toUpperCase() : "MAIN";
        pageInfo.textContent = location;

        attachedBadge.textContent = `(${state.currentPage + 1}/${totalPages})`;
        sideBadge.textContent = `(${state.currentPage + 1})`;

        prevBtn.disabled = state.currentPage === 0;
        nextBtn.disabled = state.currentPage >= totalPages - 1;
        cornerPrev.disabled = prevBtn.disabled;
        cornerNext.disabled = nextBtn.disabled;
        sidesLeft.disabled = prevBtn.disabled;
        sidesRight.disabled = nextBtn.disabled;
        [prevBtn, nextBtn, cornerPrev, cornerNext, sidesLeft, sidesRight].forEach(b => {
            b.style.opacity = b.disabled ? "0.4" : "1";
            b.style.cursor = b.disabled ? "not-allowed" : "pointer";
        });

        // content height (and thus menu height) can change per page/category —
        // keep the detached nav glued to the new bounds.
        syncDetachedNav();
    }

    function styledBox(el) {
        Object.assign(el.style, {
            width: "100%", boxSizing: "border-box", padding: "10px", background: "#222", color: "#fff",
            border: "2px solid #555", borderRadius: "var(--mm-radius)", fontFamily: "inherit",
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
        const valSpan = document.createElement("span"); valSpan.style.cssText = `font-weight:bold; color:${state.accentColor};`;
        labelRow.append(nameSpan, valSpan);

        const track = document.createElement("div");
        Object.assign(track.style, {
            position: "relative", width: "100%", height: "10px", background: "#222",
            border: "2px solid #555", borderRadius: "var(--mm-radius)", cursor: "pointer", touchAction: "none",
        });
        const fill = document.createElement("div");
        Object.assign(fill.style, { position: "absolute", top: "0", left: "0", bottom: "0", background: state.accentColor, borderRadius: "var(--mm-radius)" });
        const thumb = document.createElement("div");
        Object.assign(thumb.style, {
            position: "absolute", top: "50%", width: "16px", height: "16px", borderRadius: "50%",
            background: "#fff", border: `2px solid ${state.accentColor}`, transform: "translate(-50%, -50%)",
            boxShadow: "0 0 4px rgba(0,0,0,.6)",
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

    function renderItem(item) {
        const row = document.createElement("div");
        row.style.margin = "8px 0";

        switch (item.type) {
            case "button": {
                const btn = document.createElement("button");
                btn.textContent = item.data.icon ? item.data.icon + " " + item.data.text : item.data.text;
                Object.assign(btn.style, { width: "100%", padding: "11px", background: "#222", border: "2px solid #555", borderRadius: "var(--mm-radius)", color: "#fff", fontSize: "1em", cursor: "pointer", fontWeight: "bold" });
                btn.onpointerenter = () => btn.style.background = "#333";
                btn.onpointerleave = () => btn.style.background = "#222";
                btn.onclick = item.data.callback;
                row.appendChild(btn);
                break;
            }

            case "confirmButton": {
                const btn = document.createElement("button");
                let armed = false;
                const label = item.data.icon ? item.data.icon + " " + item.data.text : item.data.text;
                btn.textContent = label;
                Object.assign(btn.style, { width: "100%", padding: "11px", background: "#222", border: "2px solid #555", borderRadius: "var(--mm-radius)", color: "#fff", fontSize: "1em", cursor: "pointer", fontWeight: "bold" });
                btn.onclick = () => {
                    if (!armed) {
                        armed = true;
                        btn.textContent = "CONFIRM?";
                        btn.style.borderColor = "#e04444"; btn.style.color = "#e04444";
                        setTimeout(() => { armed = false; btn.textContent = label; btn.style.borderColor = "#555"; btn.style.color = "#fff"; }, 2500);
                    } else {
                        armed = false;
                        btn.textContent = label; btn.style.borderColor = "#555"; btn.style.color = "#fff";
                        item.data.callback?.();
                    }
                };
                row.appendChild(btn);
                break;
            }

            case "toggleButton": {
                let on = !!item.data.default;
                const tbtn = document.createElement("button");
                Object.assign(tbtn.style, { width: "100%", padding: "11px", borderRadius: "var(--mm-radius)", fontWeight: "bold", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" });
                const labelSpan = document.createElement("span"); labelSpan.textContent = item.data.text;
                const tagSpan = document.createElement("span"); tagSpan.style.fontSize = "0.8em"; tagSpan.style.fontWeight = "900";
                tbtn.append(labelSpan, tagSpan);
                const paint = () => {
                    tbtn.style.background = on ? "#132a1c" : "#2a1414";
                    tbtn.style.border = `2px solid ${on ? state.accentColor : "#663333"}`;
                    tbtn.style.color = on ? state.accentColor : "#ff9999";
                    tagSpan.textContent = on ? "\u25CF ON" : "\u25CB OFF";
                    tagSpan.style.color = on ? state.accentColor : "#ff5555";
                };
                paint();
                tbtn.onclick = () => { on = !on; item.data.default = on; paint(); fireToggle(item, on); };
                row.appendChild(tbtn);
                break;
            }

            case "toggleSwitch": {
                let on = !!item.data.default;
                const wrap = document.createElement("div");
                wrap.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:6px 2px;";
                const label = document.createElement("span"); label.textContent = item.data.text;
                const right = document.createElement("div"); right.style.cssText = "display:flex; align-items:center; gap:8px;";
                const stateText = document.createElement("span"); stateText.style.cssText = "font-size:0.75em; font-weight:900;";
                const track = document.createElement("div");
                const paintTrack = () => {
                    track.style.background = on ? state.accentColor : "#552222";
                    knob.style.left = on ? "22px" : "2px";
                    stateText.textContent = on ? "ON" : "OFF";
                    stateText.style.color = on ? state.accentColor : "#ff6666";
                };
                Object.assign(track.style, { width: "42px", height: "22px", borderRadius: "var(--mm-radius)", position: "relative", cursor: "pointer", transition: "background .2s", flexShrink: "0" });
                const knob = document.createElement("div");
                Object.assign(knob.style, { width: "18px", height: "18px", borderRadius: "50%", background: "#fff", position: "absolute", top: "2px", left: "2px", transition: "left .2s" });
                track.appendChild(knob);
                paintTrack();
                track.onclick = () => { on = !on; item.data.default = on; paintTrack(); fireToggle(item, on); };
                right.append(stateText, track);
                wrap.append(label, right);
                row.appendChild(wrap);
                break;
            }

            case "toggleCheckbox": {
                let on = !!item.data.default;
                const wrap = document.createElement("div");
                wrap.style.cssText = "display:flex; align-items:center; justify-content:space-between; padding:6px 2px; cursor:pointer;";
                const left = document.createElement("div"); left.style.cssText = "display:flex; align-items:center; gap:10px;";
                const box = document.createElement("div");
                Object.assign(box.style, { width: "20px", height: "20px", border: "2px solid #555", borderRadius: "var(--mm-radius)", flexShrink: "0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8em", fontWeight: "bold" });
                const label = document.createElement("span"); label.textContent = item.data.text;
                const stateText = document.createElement("span"); stateText.style.cssText = "font-size:0.75em; font-weight:900;";
                const paint = () => {
                    box.textContent = on ? "\u2713" : "";
                    box.style.borderColor = on ? state.accentColor : "#663333";
                    box.style.color = state.accentColor;
                    stateText.textContent = on ? "ON" : "OFF";
                    stateText.style.color = on ? state.accentColor : "#ff6666";
                };
                paint();
                left.append(box, label);
                wrap.append(left, stateText);
                wrap.onclick = () => { on = !on; item.data.default = on; paint(); fireToggle(item, on); };
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
                    Object.assign(box.style, { width: "16px", height: "16px", border: "2px solid #555", borderRadius: "var(--mm-radius)", flexShrink: "0" });
                    const setBox = () => { box.style.borderColor = selected.has(val) ? state.accentColor : "#555"; box.style.background = selected.has(val) ? state.accentColor : "transparent"; };
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
                    Object.assign(circle.style, { width: "16px", height: "16px", borderRadius: "50%", border: "2px solid #555", flexShrink: "0", position: "relative" });
                    const dot = document.createElement("div");
                    Object.assign(dot.style, { width: "8px", height: "8px", borderRadius: "50%", background: state.accentColor, position: "absolute", top: "2px", left: "2px", display: val === selectedVal ? "" : "none" });
                    circle.appendChild(dot);
                    circle.style.borderColor = val === selectedVal ? state.accentColor : "#555";
                    circles.push({ val, circle, dot });
                    const span = document.createElement("span"); span.textContent = text; span.style.fontSize = "0.9em";
                    line.onclick = () => {
                        selectedVal = val;
                        circles.forEach(c => { c.dot.style.display = c.val === val ? "" : "none"; c.circle.style.borderColor = c.val === val ? state.accentColor : "#555"; });
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
                track.style.cssText = "width:100%; height:12px; background:#222; border:2px solid #555; border-radius:var(--mm-radius);";
                const fill = document.createElement("div");
                const pct = Math.max(0, Math.min(100, (item.data.value / item.data.max) * 100));
                fill.style.cssText = `height:100%; background:${state.accentColor}; width:${pct}%; border-radius:var(--mm-radius); transition:width .2s;`;
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
                cinput.value = item.data.default || "#00ff99";
                cinput.style.cssText = "width:44px; height:30px; border:2px solid #555; border-radius:var(--mm-radius); background:#222; padding:0; cursor:pointer;";
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
                Object.assign(kbtn.style, { padding: "6px 14px", background: "#222", border: "2px solid #555", borderRadius: "var(--mm-radius)", color: "#fff", fontWeight: "bold", cursor: "pointer", minWidth: "80px" });
                kbtn.onclick = () => {
                    kbtn.textContent = "PRESS KEY";
                    kbtn.style.borderColor = state.accentColor;
                    const handler = e => {
                        e.preventDefault();
                        current = e.key.length === 1 ? e.key.toUpperCase() : e.key;
                        kbtn.textContent = current;
                        kbtn.style.borderColor = "#555";
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
                Object.assign(dot.style, { width: "10px", height: "10px", borderRadius: "50%", background: item.data.default ? state.accentColor : "#555" });
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
                l.style.cssText = `font-weight:bold; font-size:0.95em; letter-spacing:0.5px; padding-bottom:4px; margin-top:6px; border-bottom:1px solid #444; color:${state.accentColor};`;
                if (state.rainbow.text) l.classList.add("modmenu-rainbow-text");
                row.appendChild(l);
                break;
            }

            case "paragraph": {
                const p = document.createElement("div");
                p.textContent = item.data.text;
                p.style.cssText = "font-size:0.85em; opacity:0.75; line-height:1.4; padding:2px 0;";
                row.appendChild(p);
                break;
            }

            case "divider": {
                const hr = document.createElement("div");
                hr.style.cssText = "height:1px; background:#444; margin:6px 0;";
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
                box.style.cssText = "border:2px solid #555; border-radius:var(--mm-radius); overflow:hidden;";
                const head = document.createElement("div");
                head.style.cssText = "padding:10px; background:#222; display:flex; justify-content:space-between; align-items:center; cursor:pointer; font-weight:bold;";
                const titleSpan = document.createElement("span"); titleSpan.textContent = item.data.title;
                const chev = document.createElement("span"); chev.textContent = item.data.expanded ? "\u25BE" : "\u25B8"; chev.style.color = state.accentColor;
                head.append(titleSpan, chev);
                head.onclick = () => { item.data.expanded = !item.data.expanded; buildPage(); };
                box.appendChild(head);
                if (item.data.expanded) {
                    const body = document.createElement("div");
                    body.style.cssText = "padding:8px 10px; background:#1c1c1c;";
                    item.data.items.forEach(sub => body.appendChild(renderItem(sub)));
                    box.appendChild(body);
                }
                row.appendChild(box);
                break;
            }

            case "categoryNav": {
                const btn = document.createElement("button");
                btn.textContent = `${item.data.icon}  ${item.data.name}   (${item.data.count})`;
                Object.assign(btn.style, { width: "100%", padding: "12px", background: "#222", border: `2px solid ${state.accentColor}`, borderRadius: "var(--mm-radius)", color: "#fff", fontSize: "1em", cursor: "pointer", fontWeight: "bold", textAlign: "left" });
                btn.onclick = () => { state.currentCategory = item.data.name; state.currentPage = 0; buildPage(); };
                row.appendChild(btn);
                break;
            }
        }

        return row;
    }

    function nextPage() { if (!nextBtn.disabled) { state.currentPage++; buildPage(); } }
    function prevPage() { if (!prevBtn.disabled) { state.currentPage--; buildPage(); } }

   
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
                const nowHidden = menu.style.display === "none" ? "" : "none";
                menu.style.display = nowHidden;
                [sidesLeft, sidesRight, sideBadge, cornerPrev, cornerNext].forEach(el => {
                    if (!el) return;
                    if (nowHidden === "none") { el.style.display = "none"; }
                    else { updateNavVisibility(); }
                });
                if (nowHidden === "") syncDetachedNav();
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
        bottomNote.style.borderColor = state.accentColor;
        bottomNote.style.color = state.accentColor;
        clearTimeout(state._bottomNoteTimer);
        state._bottomNoteTimer = setTimeout(() => { bottomNote.style.display = "none"; }, duration);
    }

    function showPopup(title, message) {
        injectStyles();
        const overlay = document.createElement("div");
        Object.assign(overlay.style, { position: "fixed", inset: "0", background: "rgba(0,0,0,0.6)", zIndex: "999998", display: "flex", alignItems: "center", justifyContent: "center" });
        const box = document.createElement("div");
        Object.assign(box.style, { background: "#1a1a1a", border: `2px solid ${state.accentColor}`, borderRadius: "var(--mm-radius)", padding: "20px", minWidth: "260px", maxWidth: "80vw", color: "#fff", fontFamily: state.font, position: "relative" });
        box.style.setProperty("--mm-radius", state.radius + "px");
        const closeX = document.createElement("button");
        closeX.textContent = "\u2715";
        closeX.style.cssText = "position:absolute; top:8px; right:8px; background:#e04444; color:#fff; border:none; width:26px; height:26px; border-radius:var(--mm-radius); cursor:pointer; font-size:1.1em; display:flex; align-items:center; justify-content:center;";
        closeX.onclick = () => overlay.remove();
        const h = document.createElement("div"); h.textContent = title;
        h.style.cssText = `font-weight:bold; font-size:1.1em; margin-bottom:10px; color:${state.accentColor}; padding-right:24px;`;
        const p = document.createElement("div"); p.textContent = message; p.style.cssText = "font-size:0.9em; line-height:1.4;";
        box.append(closeX, h, p);
        overlay.appendChild(box);
        overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
        document.body.appendChild(overlay);
    }

    //public api for menu devs that are cool
    window.ModMenu = {
        vars: {},

        title(str) { state.title = str; if (header) header.querySelector("#modmenu-title-text").textContent = str; return this; },
        creator(str) { state.creator = str; if (header) header.querySelector("small").textContent = "by " + str; return this; },
        setCredits(str) { state.credits = str; if (creditsEl) creditsEl.textContent = str; return this; },
        glow(color) { state.borderGlow = color; applyTheme(); return this; },
        objectsPerPage(n) { state.objectsPerPage = n; return this; },

        setTheme(name) { state.theme = name; applyTheme(); return this; },
        setSize(name) { state.size = name; applySize(); return this; },
        setFont(name) { state.font = name; applyFont(); return this; },
        setRadius(px) { state.radius = px; applyRadius(); return this; },
        setNavStyle(styleName) { state.navStyle = styleName; if (menu) buildPage(); return this; },

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
        colorPicker(label, defaultVal = "#00ff99") { return { action: fn => { pushItem("colorPicker", { label, default: defaultVal, callback: fn }); return window.ModMenu; } }; },
        keybind(label, defaultVal = "None") { return { action: fn => { pushItem("keybind", { label, default: defaultVal, callback: fn }); return window.ModMenu; } }; },
        statusIndicator(label, def = false) { pushItem("statusIndicator", { label, default: def }); return this; },
        fontSelector(label = "Font", applyToMenu = false) { return { action: fn => { pushItem("font", { label, callback: fn, applyToMenu }); return window.ModMenu; } }; },

        // text input bound directly to a global var: ModMenu.vars[varName]
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
            btn.style.cssText = controlBtnStyle("#333");
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
            if (dot) dot.style.background = on ? state.accentColor : "#555";
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
            [sidesLeft, sidesRight, sideBadge, cornerPrev, cornerNext].forEach(el => { if (el) el.style.display = "none"; });
            return this;
        },
        destroy() {
            if (menuResizeObserver) { menuResizeObserver.disconnect(); menuResizeObserver = null; }
            if (menu) { menu.remove(); menu = null; }
            [sidesLeft, sidesRight, sideBadge, cornerPrev, cornerNext].forEach(el => el && el.remove());
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

        // Full feature showcase — every widget, every effect, organized into categories.

        testAll() {
            this.title("Demo Menu").creator("Kyoshade").setCredits("Lunar UI made with luv 🩵");
            this.setTheme("Purple").setSize("Big").objectsPerPage(6).setRadius(8);
            this.enableSearch().setCloseConfirm(true).enableToggleKey("Insert");
            this.addHeaderIcon("\uD83D\uDCBE", () => this.saveConfig());
			this.popup("Wait... ", "This is the test menu not a real mod menu use this for testing features n/ and as a guide when makeing your own menu");

            this.label("MAIN MENU")
                .button("Button", "").action(() => this.notify("Quick action fired!", 2000, "success"))
                .divider();

            this.category("Buttons", "")
                .button("Simple Button", "\u{1F449}").action(() => console.log("simple button clicked"))
                .confirmButton("Think twice Button", "").action(() => this.notify("Yuh u clicked me", 2000, "error"))
                .label("More")
                .button("Another Button").action(() => console.log("another button clicked"));

            this.category("Toggles", "")
                .label("Devs If you toggle something of it kill the methoad so just keep that in mind")
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
				.label("u cant move these⬇️ there static just use for like menu updates or update goals ")
                .progressBar("EXAMPLE:Likes till Update", 420, 1000)
                .progressBar("EXAMPLE:Subs till update", 80, 100);

            this.category("Inputs & Vars", "")
                .paragraph("varInput binds a text field straight to ModMenu.vars read it from anywhere in your script or like yea")
                .varInput("playerName", "name", "Guest")
                .button("Log ModMenu.vars.playerName").action(() => this.notify("vars.playerName = " + window.ModMenu.vars.playerName, 2500, "info"))
                .numberInput("Age", 1, 100, 1, 10).action(v => console.log("Age", v))
                .textarea("Notes", "Write something...").action(v => console.log("notes", v))
                .colorPicker("Accent Color", "#bb66ff").action(v => this.customTheme(v, v))
                .keybind("Toggle Menu Key", "Insert").action(k => this.enableToggleKey(k));

            this.category("Selectors", "")
                .dropdown("Dropdown").options(["Hi", "im", "a", "dropdown!"]).onChange(v => console.log("weapon", v))
                .radioGroup("Difficulty", "Normal").options(["Easy", "Normal", "Hard", "Nightmare"]).onChange(v => console.log("difficulty", v))
                .multiSelect("Enabled Cheats", ["ESP"]).options(["ESP", "Aimbot", "Speedhack", "NoClip"]).onChange(v => console.log("cheats", v))
                .fontSelector("Menu Font", true).action(f => console.log("font", f));

            this.category("Groups", "")
                .paragraph("A dropdown group can hold buttons, toggles, sliders anything collapsed under one title")
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
                .label("Theme, size, corner radius, nav position")
                .dropdown("Theme").options(Object.keys(THEME_COLORS)).onChange(v => this.setTheme(v))
                .dropdown("Size").options(["Small", "Mid", "Big", "Huge"]).onChange(v => this.setSize(v))
                .slider("Corner Radius", 0, 24, 1, 8).action(v => this.setRadius(v))
                .dropdown("Nav Button Position").options([
                    { value: "attached", label: "Attached (bottom, together)" },
                    { value: "sides", label: "Sides (detached, edges)" },
                    { value: "corners", label: "Corners (detached, bottom L/R)" },
                ]).onChange(v => this.setNavStyle(v))
                .toggleSwitch("Rainbow Title", false).action(v => this.rainbowTitle(v))
                .toggleSwitch("Rainbow Background", false).action(v => this.rainbowBackground(v))
                .toggleSwitch("Rainbow Text", false).action(v => this.rainbowText(v))
                .toggleSwitch("Rainbow Border", false).action(v => this.rainbowBorder(v));

            this.category("Notifi Lib", "")
                .paragraph("Three distinct notification types, none of them faking a status.")
                .button("Corner Toast", "").action(() => this.notify("Bottom-right toast", 2500, "info"))
                .button("Side Slide In", "").action(() => this.slideNotify("Slides in from the right, then back out", 2500))
                .button("Bottom Note", "").action(() => this.notifyBottom("Pinned note inside the menu itself", 4000))
                .button("Popup Dialog", "").action(() => this.popup("WAIT!", "This is a popup thing with its own X close button u can use it for displaying inportant info or just News"));

            this.category("Utility", "")
                .button("Save Config", "\uD83D\uDCBE").action(() => this.saveConfig())
                .button("Load Config", "\uD83D\uDCC2").action(() => this.loadConfig())
                .toggleCheckbox("Resizable Menu", false).action(v => this.makeResizable(v))
                .spacer(6)
               

            return this.show();
        },
    };
})();
