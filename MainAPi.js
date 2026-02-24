(function () {
    const state = {
        theme: "Classic",
        size: "Mid",
        title: "Menu",
        creator: "Unknown",
        objectsPerPage: 8,           // increased so you see pages easier
        currentPage: 0,
        minimized: false,
        borderGlow: "#00ff99",
        accentColor: "#00ff99",
        buttons: [],
        toggles: [],
        dropdowns: [],
        sliders: [],
        textInputs: [],
        numberInputs: [],
        fontSelectors: []
    };

    let menu, header, content, pageInfo, arrows, prevBtn, nextBtn;

    // ====================== CORE ======================
    function createMenu() {
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
            fontFamily: "Arial, sans-serif",
            padding: "10px",
            minWidth: "280px",
            borderRadius: "0px",           // ← SHARP
            overflow: "hidden",
            userSelect: "none",
        });
        document.body.appendChild(menu);

        // Header
        header = document.createElement("div");
        header.style.cssText = `
            font-weight: bold; font-size: 1.2em; padding: 8px 12px;
            background: #111; margin: -10px -10px 10px -10px;
            border-bottom: 2px solid ${state.borderGlow};
            cursor: move; display: flex; justify-content: space-between; align-items: center;
        `;
        header.innerHTML = `${state.title} <small style="opacity:0.6; font-size:0.8em;">by ${state.creator}</small>`;
        menu.appendChild(header);

        // Controls
        const controls = document.createElement("div");
        controls.style.cssText = "display:flex; gap:6px;";
        const minBtn = document.createElement("button");
        minBtn.textContent = "–";
        minBtn.style.cssText = controlBtnStyle();
        minBtn.onclick = toggleMinimize;

        const closeBtn = document.createElement("button");
        closeBtn.textContent = "×";
        closeBtn.style.cssText = controlBtnStyle("#e04444");
        closeBtn.onclick = () => menu.remove();

        controls.append(minBtn, closeBtn);
        header.appendChild(controls);

        // Content
        content = document.createElement("div");
        content.style.padding = "4px 0";
        menu.appendChild(content);

        // Page info
        pageInfo = document.createElement("div");
        pageInfo.style.cssText = "text-align:center; font-size:0.85em; opacity:0.8; margin:10px 0 6px; font-weight:bold;";
        menu.appendChild(pageInfo);

        // Arrows (sharp)
        arrows = document.createElement("div");
        arrows.style.cssText = "display:flex; justify-content:center; gap:12px; margin-top:8px;";

        prevBtn = document.createElement("button");
        prevBtn.textContent = "← PREV";
        prevBtn.style.cssText = navBtnStyle();
        prevBtn.onclick = prevPage;

        nextBtn = document.createElement("button");
        nextBtn.textContent = "NEXT →";
        nextBtn.style.cssText = navBtnStyle();
        nextBtn.onclick = nextPage;

        arrows.append(prevBtn, nextBtn);
        menu.appendChild(arrows);

        // Drag
        let offsetX, offsetY, dragging = false;
        header.onpointerdown = e => { dragging = true; offsetX = e.clientX - menu.offsetLeft; offsetY = e.clientY - menu.offsetTop; };
        document.onpointerup = () => dragging = false;
        document.onpointermove = e => {
            if (!dragging) return;
            menu.style.left = (e.clientX - offsetX) + "px";
            menu.style.top  = (e.clientY - offsetY) + "px";
        };
    }

    function controlBtnStyle(bg = "#444") {
        return `background:${bg}; color:#fff; border:none; width:28px; height:28px; border-radius:0px; font-size:1.3em; cursor:pointer;`;
    }

    function navBtnStyle() {
        return `background:#222; color:#fff; border:2px solid #555; padding:6px 16px; font-weight:bold; border-radius:0px; cursor:pointer; transition:none;`;
    }

    function applyTheme() {
        const colors = { Classic: "#00ff99", Blue: "#00aaff", Red: "#ff3366", Purple: "#bb66ff", Green: "#33ffaa", Orange: "#ffaa33" };
        state.borderGlow = colors[state.theme] || "#00ff99";
        state.accentColor = state.borderGlow;
        if (menu) {
            menu.style.border = `2px solid ${state.borderGlow}`;
            menu.style.boxShadow = `0 0 20px ${state.borderGlow}`;
            header.style.borderBottom = `2px solid ${state.borderGlow}`;
        }
    }

    function applySize() {
        const sizes = { Small: "260px", Mid: "360px", Big: "480px", Huge: "620px" };
        if (menu) menu.style.width = sizes[state.size] || "360px";
    }

    function toggleMinimize() {
        state.minimized = !state.minimized;
        const d = state.minimized ? "none" : "";
        content.style.display = pageInfo.style.display = arrows.style.display = d;
    }

    // ====================== BUILD PAGE (with sharp elements) ======================
    function buildPage() {
        content.innerHTML = "";

        const allItems = [
            ...state.buttons.map(b => ({type:"button", data:b})),
            ...state.toggles.map(t => ({type:"toggle", data:t})),
            ...state.dropdowns.map(d => ({type:"dropdown", data:d})),
            ...state.sliders.map(s => ({type:"slider", data:s})),
            ...state.textInputs.map(i => ({type:"text", data:i})),
            ...state.numberInputs.map(n => ({type:"number", data:n})),
            ...state.fontSelectors.map(f => ({type:"font", data:f}))
        ];

        const start = state.currentPage * state.objectsPerPage;
        const pageItems = allItems.slice(start, start + state.objectsPerPage);

        pageItems.forEach(item => {
            const row = document.createElement("div");
            row.style.margin = "8px 0";

            switch (item.type) {
                case "button":
                    const btn = document.createElement("button");
                    btn.textContent = item.data.icon ? item.data.icon + " " + item.data.text : item.data.text;
                    Object.assign(btn.style, {
                        width: "100%", padding: "11px", background: "#222", 
                        border: `2px solid #555`, borderRadius: "0px",   // ← SHARP
                        color: "#fff", fontSize: "1em", cursor: "pointer", fontWeight: "bold"
                    });
                    btn.onpointerenter = () => btn.style.background = "#333";
                    btn.onpointerleave = () => btn.style.background = "#222";
                    btn.onclick = item.data.callback;
                    row.appendChild(btn);
                    break;

                case "toggle":
                    const tbtn = document.createElement("button");
                    tbtn.dataset.on = "false";
                    tbtn.textContent = item.data.text;
                    Object.assign(tbtn.style, {
                        width: "100%", padding: "11px", background: "#222", 
                        border: `2px solid #555`, borderRadius: "0px",   // ← SHARP
                        color: "#fff", fontWeight: "bold", transition: "none"
                    });
                    const update = () => {
                        const active = tbtn.dataset.on === "true";
                        tbtn.style.borderColor = active ? state.accentColor : "#555";
                        tbtn.style.color = active ? state.accentColor : "#fff";
                        tbtn.style.background = active ? "#111" : "#222";
                    };
                    tbtn.onclick = () => { item.data.callback(); tbtn.dataset.on = (tbtn.dataset.on !== "true").toString(); update(); };
                    update();
                    row.appendChild(tbtn);
                    break;

                case "dropdown":
                    const dlabel = document.createElement("div");
                    dlabel.textContent = item.data.label || "Dropdown";
                    dlabel.style.marginBottom = "4px";
                    const sel = document.createElement("select");
                    Object.assign(sel.style, {
                        width: "100%", padding: "10px", background: "#222", color: "#fff",
                        border: `2px solid #555`, borderRadius: "0px"     // ← SHARP
                    });
                    item.data.options.forEach(opt => {
                        const o = document.createElement("option");
                        o.value = opt.value ?? opt; o.text = opt.label ?? opt;
                        sel.appendChild(o);
                    });
                    if (item.data.onChange) sel.onchange = e => item.data.onChange(e.target.value);
                    row.append(dlabel, sel);
                    break;

                case "slider":
                    const sw = document.createElement("div");
                    const slabel = document.createElement("div");
                    slabel.style.cssText = "display:flex; justify-content:space-between; margin-bottom:4px;";
                    slabel.innerHTML = `<span>${item.data.text}</span><span>${item.data.default ?? item.data.min}</span>`;
                    const sinput = document.createElement("input");
                    sinput.type = "range"; sinput.min = item.data.min; sinput.max = item.data.max;
                    sinput.step = item.data.step ?? 1; sinput.value = item.data.default ?? item.data.min;
                    sinput.style.width = "100%"; sinput.style.accentColor = state.accentColor;
                    sinput.oninput = () => {
                        slabel.children[1].textContent = sinput.value;
                        item.data.callback?.(Number(sinput.value));
                    };
                    sw.append(slabel, sinput);
                    row.appendChild(sw);
                    break;

                case "text":
                case "number":
                    const ilabel = document.createElement("div");
                    ilabel.textContent = item.data.label;
                    ilabel.style.marginBottom = "4px";
                    const iinput = document.createElement("input");
                    iinput.type = item.type;
                    iinput.value = item.data.default || "";
                    if (item.type === "number") { iinput.min = item.data.min ?? 0; iinput.max = item.data.max ?? 9999; }
                    Object.assign(iinput.style, {
                        width: "100%", padding: "10px", background: "#222", color: "#fff",
                        border: `2px solid #555`, borderRadius: "0px"     // ← SHARP
                    });
                    iinput.onchange = () => item.data.callback?.(item.type === "number" ? Number(iinput.value) : iinput.value);
                    row.append(ilabel, iinput);
                    break;

                case "font":
                    const flabel = document.createElement("div");
                    flabel.textContent = item.data.label || "Font";
                    flabel.style.marginBottom = "4px";
                    const fsel = document.createElement("select");
                    Object.assign(fsel.style, {
                        width: "100%", padding: "10px", background: "#222", color: "#fff",
                        border: `2px solid #555`, borderRadius: "0px"     // ← SHARP
                    });
                    ["Arial","Courier New","Georgia","Impact","Tahoma","Verdana","system-ui"].forEach(f => {
                        const opt = document.createElement("option"); opt.value = f; opt.text = f; opt.style.fontFamily = f;
                        fsel.appendChild(opt);
                    });
                    fsel.onchange = e => { item.data.callback?.(e.target.value); if (item.data.applyToMenu) menu.style.fontFamily = e.target.value; };
                    row.append(flabel, fsel);
                    break;
            }
            content.appendChild(row);
        });

        // Update page info + disable arrows when needed
        const totalItems = allItems.length;
        const totalPages = Math.ceil(totalItems / state.objectsPerPage) || 1;
        pageInfo.textContent = `PAGE ${state.currentPage + 1} / ${totalPages}  (${totalItems} ITEMS)`;

        prevBtn.disabled = state.currentPage === 0;
        nextBtn.disabled = state.currentPage >= totalPages - 1;

        prevBtn.style.opacity = prevBtn.disabled ? "0.4" : "1";
        nextBtn.style.opacity = nextBtn.disabled ? "0.4" : "1";
        prevBtn.style.cursor = prevBtn.disabled ? "not-allowed" : "pointer";
        nextBtn.style.cursor = nextBtn.disabled ? "not-allowed" : "pointer";
    }

    function nextPage() { if (!nextBtn.disabled) { state.currentPage++; buildPage(); } }
    function prevPage() { if (!prevBtn.disabled) { state.currentPage--; buildPage(); } }

    // ====================== PUBLIC API ======================
    window.ModMenu = {
        title(str)        { state.title = str; if (header) header.firstChild.textContent = str; return this; },
        creator(str)      { state.creator = str; if (header) header.querySelector("small").textContent = "by " + str; return this; },
        glow(color)       { state.borderGlow = color; applyTheme(); return this; },
        objectsPerPage(n) { state.objectsPerPage = n; return this; },

        theme: {
            Classic() { state.theme = "Classic"; applyTheme(); return window.ModMenu; },
            Blue()    { state.theme = "Blue";    applyTheme(); return window.ModMenu; },
            Red()     { state.theme = "Red";     applyTheme(); return window.ModMenu; },
            Purple()  { state.theme = "Purple";  applyTheme(); return window.ModMenu; },
            Green()   { state.theme = "Green";   applyTheme(); return window.ModMenu; },
            Orange()  { state.theme = "Orange";  applyTheme(); return window.ModMenu; },
            custom(c) { state.theme = "Custom"; state.borderGlow = c; applyTheme(); return window.ModMenu; }
        },

        size: {
            Small() { state.size = "Small"; applySize(); return window.ModMenu; },
            Mid()   { state.size = "Mid";   applySize(); return window.ModMenu; },
            Big()   { state.size = "Big";   applySize(); return window.ModMenu; },
            Huge()  { state.size = "Huge";  applySize(); return window.ModMenu; }
        },

        button(text, icon = "") { return { action: fn => { state.buttons.push({text, icon, callback: fn}); return window.ModMenu; } }; },
        toggle(text)            { return { action: fn => { state.toggles.push({text, callback: fn}); return window.ModMenu; } }; },

        dropdown(label) {
            return { options: arr => ({ onChange: fn => { state.dropdowns.push({label, options: arr, onChange: fn}); return window.ModMenu; } }) };
        },

        slider(text, min, max, step = 1, defaultVal) {
            return { action: fn => { state.sliders.push({text, min, max, step, default: defaultVal, callback: fn}); return window.ModMenu; } };
        },

        textInput(label, defaultVal = "", placeholder = "") {
            return {
                onChange: fn => { state.textInputs.push({label, default: defaultVal, placeholder, callback: fn}); return window.ModMenu; },
                onInput:  fn => { state.textInputs.push({label, default: defaultVal, placeholder, liveCallback: fn}); return window.ModMenu; }
            };
        },

        numberInput(label, min = 0, max = 9999, step = 1, defaultVal = 0) {
            return { action: fn => { state.numberInputs.push({label, min, max, step, default: defaultVal, callback: fn}); return window.ModMenu; } };
        },

        fontSelector(label = "Font", applyToMenu = false) {
            return { action: fn => { state.fontSelectors.push({label, callback: fn, applyToMenu}); return window.ModMenu; } };
        },

        show() {
            if (!menu) {
                createMenu();
                applyTheme();
                applySize();
            }
            buildPage();
            return this;
        },

        demo() {
            return this
                .button("Godmode", "⚡").action(() => console.log("Godmode ON"))
                .toggle("ESP").action(() => console.log("ESP toggled"))
                .dropdown("Weapon").options(["AK47", "M4", "Knife", "Sniper"]).onChange(v => console.log("Weapon:", v))
                .slider("Speed", 1, 50, 1, 10).action(v => console.log("Speed:", v))
                .textInput("Name", "Eevee", "Type here...").onChange(v => console.log("Name:", v))
                .numberInput("Reach", 1, 20, 0.5, 3.5).action(v => console.log("Reach:", v))
                .fontSelector("UI Font", true).action(f => console.log("Font:", f))
                .show();
        }
    };
})();
