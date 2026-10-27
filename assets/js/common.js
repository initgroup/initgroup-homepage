(function () {
    "use strict";
    if (window.INIT_SITE_READY) return;
    const loader = document.currentScript;
    let pageFile = loader.dataset.pageFile;
    let activeConfig;
    const behaviors = new Map();
    const loadedScripts = new Map();
    const fontCache = new Map();
    let activeFonts = new Set();
    let pageCleanups = [];
    let keyboardInput = false;
    document.addEventListener("pointerdown",()=>{
        keyboardInput=false;document.documentElement.dataset.inputModality="pointer";
    },true);
    document.addEventListener("keydown",event=>{
        if(!["Shift","Control","Alt","Meta"].includes(event.key)) {
            keyboardInput=true;document.documentElement.dataset.inputModality="keyboard";
        }
    },true);
    function focusDestination(target) {
        if(!target)return;
        const previous=target.getAttribute("tabindex");
        const alreadyManaged=target.hasAttribute("data-navigation-focus");
        target.tabIndex=-1;
        target.dataset.navigationFocus=keyboardInput?"keyboard":"pointer";
        target.focus({preventScroll:true});
        if(!alreadyManaged)target.addEventListener("blur",()=>{
            delete target.dataset.navigationFocus;
            if(previous===null)target.removeAttribute("tabindex");
            else target.setAttribute("tabindex",previous);
        },{once:true});
    }
    function revealDestination(target) {
        // Measure the final heading position, not a moving reveal transform.
        for(let element=target;element;element=element.parentElement) {
            if(!element.classList.contains("reveal"))continue;
            element.classList.add("is-visible");
            for(const animation of element.getAnimations?.() || []) {
                if(["opacity","transform"].includes(animation.transitionProperty))animation.finish();
            }
        }
    }
    window.INIT_PAGE = Object.freeze({
        register(path,mount) { behaviors.set(path,mount); },
        focus:focusDestination,
        reveal:revealDestination,
        scope() {
            const controller = new AbortController(), frames = new Set(), observers = [];
            return {
                listen(target,type,listener,options = {}) { target?.addEventListener?.(type,listener,{...(typeof options === "boolean"?{capture:options}:options),signal:controller.signal}); },
                frame(callback) { const id=requestAnimationFrame(time=>{frames.delete(id);if(!controller.signal.aborted)callback(time);});frames.add(id);return id; },
                observe(observer) { observers.push(observer);return observer; },
                dispose() { controller.abort();frames.forEach(cancelAnimationFrame);observers.forEach(observer=>observer.disconnect()); }
            };
        }
    });
    function mountBehavior(path,navigation = false) {
        const cleanup = behaviors.get(path)?.({navigation});
        if (typeof cleanup === "function") pageCleanups.push(cleanup);
    }
    const requests = new AbortController();
    const root = document.documentElement;
    let pageLeaving = false;
    let versions = {};
    // This synchronous loader runs in head, before any authored body can be painted.
    root.hidden = true;
    root.dataset.siteLoading = "true";
    root.setAttribute("aria-busy", "true");
    function releasePage(failed = false) {
        clearTimeout(watchdog);
        root.hidden = false;
        delete root.dataset.siteLoading;
        root.removeAttribute("aria-busy");
        if (document.body) document.body.inert = false;
        if (failed) {
            root.classList.remove("js");
            root.dataset.siteError = "true";
        }
    }
    const watchdog = setTimeout(() => { requests.abort(); releasePage(true); }, 12000);
    window.addEventListener("pagehide", () => { pageLeaving = true; requests.abort(); }, {once:true});
    const rootUrl = new URL("../../", loader.src);
    let prefix = "../".repeat(pageFile.split("/").length - 1);
    const domReady = document.readyState === "loading"
        ? new Promise(resolve => document.addEventListener("DOMContentLoaded", resolve, {once: true}))
        : Promise.resolve();
    const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
    const assertPath = path => {
        if (typeof path !== "string" || /(^\/|\\|(^|\/)\.\.(\/|$)|:)/.test(path)) throw new Error("Expected site-relative path: " + path);
        return path;
    };
    function assetUrl(value, base = document.baseURI, assetVersions = versions) {
        if (!value || /^(?:data:|blob:|#)/i.test(value)) return value;
        const url = new URL(value, base);
        if (url.origin !== rootUrl.origin || !url.pathname.startsWith(rootUrl.pathname)) return value;
        const path = decodeURIComponent(url.pathname.slice(rootUrl.pathname.length));
        const version = assetVersions[path];
        if (!version) return value;
        url.searchParams.set("v", version);
        const relative = /^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith("/")
            ? "../".repeat(new URL(".",base).pathname.slice(rootUrl.pathname.length).split("/").filter(Boolean).length) + path : value.split(/[?#]/, 1)[0];
        return relative + url.search + url.hash;
    }
    const local = (path,assetVersions = versions) => assetUrl(new URL(assertPath(path),rootUrl).href,document.baseURI,assetVersions);
    function versionDomAssets(scope = document, assetVersions = versions) {
        const attributes = ["src","href","poster","data-image","data-promo-src-ko","data-promo-src-en"];
        for (const node of (scope.body || scope).querySelectorAll("[src],[href],[poster],[data-image],[data-promo-src-ko],[data-promo-src-en]")) {
            for (const name of attributes) {
                const value = node.getAttribute(name);
                if (!value) continue;
                const updated = assetUrl(value,scope.baseURI,assetVersions);
                if (updated !== value) node.setAttribute(name,updated);
            }
        }
    }
    async function resource(path, json = true, assetVersions = versions, signal = requests.signal) {
        const url = new URL(assertPath(path), rootUrl);
        if (assetVersions[path]) url.searchParams.set("v",assetVersions[path]);
        const response = await fetch(url, {credentials:"same-origin", cache:assetVersions[path]?"default":"no-cache", signal});
        if (!response.ok) throw new Error("Shared resource failed: " + path + " (" + response.status + ")");
        return json ? response.json() : response.text();
    }
    function appendElement(tag, attributes, parent = document.head, node = parent.ownerDocument.createElement(tag)) {
        for(const attribute of [...node.attributes]) {
            if(attribute.name!=="data-site-meta" && !Object.hasOwn(attributes,attribute.name))node.removeAttribute(attribute.name);
        }
        for (const [name, value] of Object.entries(attributes)) {
            if (!/^[a-z][a-z0-9:-]*$/.test(name) || name.startsWith("on")) throw new Error("Invalid shared attribute: " + name);
            if (value === false || value == null) continue;
            const content=value === true ? "" : String(value);
            if(node.getAttribute(name)!==content)node.setAttribute(name,content);
        }
        if(!node.parentNode)parent.append(node);
        return node;
    }
    function loadStyle(definition) {
        return new Promise((resolve, reject) => {
            const link = document.createElement("link");
            link.rel = "stylesheet"; link.href = local(definition.path);
            link.dataset.siteStyle = definition.path;
            for (const [name,value] of Object.entries(definition.attributes || {})) link.setAttribute(name,value === true ? "" : value);
            link.onload = resolve;
            link.onerror = () => reject(new Error("Stylesheet failed: " + definition.path));
            document.head.append(link);
        });
    }
    function loadScript(definition, tokens) {
        if (loadedScripts.has(definition.path)) return loadedScripts.get(definition.path);
        const pending = new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.async = false; script.src = local(definition.path);
            script.dataset.siteRuntime = definition.path;
            for (const [name,value] of Object.entries(definition.attributes || {})) {
                if (name.startsWith("on")) throw new Error("Inline event handlers are not allowed.");
                script.setAttribute(name, value === true ? "" : String(value).replace(/\{(\w+)\}/g, (_,key) => tokens[key] ?? ""));
            }
            script.onload = resolve;
            script.onerror = () => reject(new Error("Script failed: " + definition.path));
            document.head.append(script);
        });
        pending.catch(()=>loadedScripts.delete(definition.path));
        loadedScripts.set(definition.path,pending);
        return pending;
    }
    function renderHead(config, page, ko, targetDocument = document, file = pageFile) {
        const element = (tag,attributes) => {
            const existing=[...targetDocument.head.querySelectorAll("[data-site-meta]")].find(node=>{
                if(node.localName!==tag)return false;
                if(tag==="meta" && attributes.charset)return node.hasAttribute("charset");
                const keys=tag==="meta"?[attributes.name?"name":"property"]:tag==="link"?["rel","type","sizes"]:["type"];
                return keys.every(key=>node.getAttribute(key)===(attributes[key] ?? null));
            });
            const node = appendElement(tag,attributes,targetDocument.head,existing);
            node.dataset.siteMeta = "true";
            return node;
        };
        const defaults = config.defaults;
        const t = key => {
            if (!Object.hasOwn(ko, key)) throw new Error("Missing metadata translation: " + key);
            return ko[key];
        };
        // Search metadata uses the one official HTTPS base; UI links/assets stay portable.
        const metadataPrefix = "../".repeat(file.split("/").length-1);
        const metadataPath = path => new URL(assertPath(path),config.sitemapBaseUrl).href;
        const assetPath = path => assetUrl(metadataPrefix+assertPath(path),targetDocument.baseURI,config.assetVersions);
        const tokens = {
            themeColor: defaults.themeColor, colorScheme: defaults.colorScheme,
            pageTitle: t(page.titleKey || defaults.titleKey),
            pageDescription: t(page.descriptionKey || defaults.descriptionKey),
            canonical: metadataPath(page.canonicalPath),
            i18nConfig: assetPath(config.i18n)
        };
        for (const meta of config.meta) element("meta", Object.fromEntries(Object.entries(meta).map(([key,value]) => [key,String(value).replace(/\{(\w+)\}/g, (_,name) => tokens[name] ?? "")])));
        targetDocument.title = tokens.pageTitle;
        targetDocument.querySelector("title").dataset.siteMeta = "true";
        element("meta", {name:"description",content:tokens.pageDescription});
        element("link", {rel:"canonical",href:tokens.canonical});
        if (page.robots) element("meta", {name:"robots",content:page.robots});
        if (page.openGraph) {
            const og = {
                type: defaults.ogType, locale: defaults.ogLocale, site_name: t(defaults.siteNameKey),
                title: tokens.pageTitle, description: tokens.pageDescription, url: tokens.canonical,
                image: metadataPath(page.ogImage || defaults.ogImage),
                "image:alt": t(page.ogImageAltKey || defaults.ogImageAltKey)
            };
            for (const [name,content] of Object.entries(og)) element("meta", {property:"og:"+name,content});
        }
        for (const icon of config.icons) element("link", {...icon.attributes,href:assetPath(icon.path)});
        function resolve(value) {
            if (typeof value === "string") return tokens[value.slice(1,-1)] !== undefined && /^\{\w+\}$/.test(value) ? tokens[value.slice(1,-1)] : value;
            if (Array.isArray(value)) return value.map(resolve);
            if (value && typeof value === "object") {
                if (Object.hasOwn(value,"sitePath")) return metadataPath(value.sitePath);
                return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,resolve(item)]));
            }
            return value;
        }
        if (page.schemas?.length) {
            const schemas = page.schemas.map(schema => {
                const node = schema.shared ? config.sharedSchemas[schema.shared] : schema;
                if (!node) throw new Error("Unknown shared schema.");
                return resolve(node);
            });
            const script = element("script", {type:"application/ld+json"});
            script.textContent = JSON.stringify({"@context":"https://schema.org","@graph":schemas});
        }
        return tokens;
    }
    function createLayout(config, source, targetDocument = document, file = pageFile) {
        const pageFile = file;
        const prefix = "../".repeat(file.split("/").length-1);
        const nav = config.navigation;
        const templates = new Map([...source.matchAll(/<template id="([a-z][a-z0-9-]*)">([\s\S]*?)<\/template>/g)].map(match => [match[1],match[2]]));
        const catalogs = {ko:{},en:{}};
        for (const [id,item] of Object.entries(nav.links)) {
            for (const language of ["ko","en"]) {
                if (!item.label?.[language]) throw new Error("Missing bilingual menu label: " + id);
                catalogs[language]["navigation."+id] = item.label[language];
            }
        }
        for (const group of nav.groups) for (const language of ["ko","en"]) {
            catalogs[language]["navigation.submenu."+group.id] = nav.submenuLabelFormat[language].replace("{label}",nav.links[group.root].label[language]);
        }
        if (targetDocument === document) window.INIT_NAVIGATION_CATALOGS = catalogs;
        const current = targetDocument.body.dataset.page;
        const compact = pageFile === "404.html";
        function navPath(id) {
            const item = nav.links[id];
            if (!item) throw new Error("Unknown navigation link: " + id);
            const target = item.path;
            if (/^(https?:\/\/|mailto:|tel:|#)/.test(target)) return escape(target);
            assertPath(target);
            const from = pageFile.split("/").slice(0,-1), to = target.split("/");
            while (from.length && from[0] === to[0]) { from.shift(); to.shift(); }
            return escape("../".repeat(from.length) + to.join("/"));
        }
        function fragment(name, values = {}, stack = []) {
            if (!templates.has(name)) throw new Error("Missing HTML include: " + name);
            if (stack.includes(name) || stack.length >= 12) throw new Error("Recursive HTML include: " + name);
            return templates.get(name).replace(/\{\{([^{}]+)\}\}/g, (_,token) => {
                const [kind,id] = token.split(":");
                if (id) {
                    if (kind === "include") return fragment(id,values,[...stack,name]);
                    if (kind === "path") return navPath(id);
                    if (kind === "text") return escape(nav.links[id].label.ko);
                    if (kind === "link") return link(id);
                }
                if (Object.hasOwn(values, token)) return values[token];
                if (Object.hasOwn(context, token)) return context[token];
                throw new Error("Unknown HTML include token: " + token);
            });
        }
        function link(id, attributes = "") {
            return fragment("navigation-link",{href:navPath(id),attributes,labelKey:"navigation."+id,label:escape(nav.links[id].label.ko)});
        }
        function menuItems(group, sub) {
            return group.items.map((id,index) => {
                const item = nav.links[id];
                let attributes = (sub ? " data-page-sub-link" : "") + ' data-navigation-item="'+(index ? "product":"overview")+'" data-link-mode="'+(item.path.includes("#")?"section":"page")+'"';
                if (item.path === pageFile) attributes += ' class="is-current" aria-current="page"';
                const html = link(id,attributes);
                return sub ? html : "<li>"+html+"</li>";
            }).join("\n");
        }
        function sections(mobile) {
            return nav.groups.map((group,index) => fragment("navigation-section",{
                sectionAttributes:(mobile?"data-menu-section":"data-hover-section")+'="'+group.id+'" data-navigation-mode="'+group.mode+'"'+(group.id===current?' class="is-current"':""),
                rootClass: mobile?"site-map-root":"hover-navigation-root",href:navPath(group.root),number:String(index+1).padStart(2,"0"),
                labelKey:"navigation."+group.root,label:escape(nav.links[group.root].label.ko),links:menuItems(group,false)
            })).join("\n");
        }
        const context = {root:prefix,pageFile};
        context.desktopLinks = nav.groups.map(group => link(group.root,' data-nav="'+group.id+'"'+(!compact?' aria-controls="hoverNavigation" aria-haspopup="true" aria-expanded="false"':"")+(group.id===current?' aria-current="page"':""))).join("\n");
        const group = nav.groups.find(item => item.id===current);
        context.subNavigation = group ? fragment("sub-navigation",{
            mode:group.mode,href:navPath(group.root),labelKey:"navigation."+group.root,label:escape(nav.links[group.root].label.ko),
            ariaLabel:escape(catalogs.ko["navigation.submenu."+group.id]),links:menuItems(group,true)
        }) : '<div class="page-sub-navigation page-sub-navigation--empty" data-page-sub-navigation aria-hidden="true"></div>';
        context.hoverSections = sections(false);
        context.mobileSections = sections(true);
        context.menuToggle = compact ? "" : fragment("menu-toggle");
        context.footerLead = compact ? link("footer-privacy") : fragment("footer-tagline");
        function include(name) {
            if (name !== "mobile-actions") return fragment(name);
            const entry = nav.mobileActions[pageFile];
            if (!entry || entry.links.length !== 2) throw new Error("Expected two mobile action links.");
            const [first,second] = entry.links;
            return fragment(name,{
                ariaLabel:escape(entry.ariaLabel),
                firstHref:navPath(first),firstKey:"navigation."+first,firstLabel:escape(nav.links[first].label.ko),
                secondHref:navPath(second),secondKey:"navigation."+second,secondLabel:escape(nav.links[second].label.ko)
            });
        }
        // Prepare all fragments before replacing any placeholder.
        const replacements = [...targetDocument.querySelectorAll("[data-site-include]")].map(node => [node,include(node.dataset.siteInclude)]);
        for (const [node,html] of replacements) {
            const template = targetDocument.createElement("template");
            template.innerHTML = html;
            node.replaceWith(template.content);
        }
        return catalogs;
    }
    function publicPage(url, config = activeConfig) {
        if (!config || url.origin !== rootUrl.origin || !url.pathname.startsWith(rootUrl.pathname)) return null;
        let file = decodeURIComponent(url.pathname.slice(rootUrl.pathname.length));
        if (!file || file.endsWith("/")) file += "index.html";
        if (!config.pages[file] && config.pages[file+"/index.html"]) file += "/index.html";
        return Object.hasOwn(config.pages,file) ? file : null;
    }
    function stagedStyle(definition,href,signal,created,before = null) {
        return new Promise((resolve,reject)=>{
            const node=document.createElement("link");
            node.rel="stylesheet";node.media="not all";node.href=href;
            node.dataset.siteStyle=definition.path;node.dataset.siteStaged="true";
            for(const [name,value] of Object.entries(definition.attributes || {})) {
                if(name!=="media")node.setAttribute(name,value===true?"":value);
            }
            created.push(node);
            const abort=()=>{node.remove();reject(new DOMException("Navigation cancelled","AbortError"));};
            node.onload=()=>{signal.removeEventListener("abort",abort);resolve({node,definition,staged:true});};
            node.onerror=()=>{signal.removeEventListener("abort",abort);reject(new Error("Stylesheet failed: "+definition.path));};
            signal.addEventListener("abort",abort,{once:true});
            if(signal.aborted)return abort();
            document.head.insertBefore(node,before);
        });
    }
    async function prepareStyles(config,page,signal,url) {
        const created=[];
        try {
            const planned=config.styles.filter(item=>!item.group || item.group===page.group).map(definition=>{
                // A temporary computed URL keeps the loaded sheet stable when history changes depth.
                const href=new URL(local(definition.path,config.assetVersions),document.baseURI).href;
                const existing=[...document.querySelectorAll("link[data-site-style]:not([data-site-staged])")].find(node=>
                    node.dataset.siteStyle===definition.path && node.href===href && new URL(node.getAttribute("href"),url).href===href);
                return {node:existing,definition,href,staged:false};
            });
            return await Promise.all(planned.map((item,index)=>{
                if(item.node)return item;
                // Keep the configured cascade even when only some sheets are reused.
                const before=planned.slice(index+1).find(next=>next.node)?.node || null;
                return stagedStyle(item.definition,item.href,signal,created,before);
            }));
        } catch(error){created.forEach(node=>node.remove());throw error;}
    }
    async function prepareFonts(styles,signal) {
        if(!window.FontFace || !document.fonts)return [];
        const selected=new Map();
        const descriptors={style:"font-style",weight:"font-weight",stretch:"font-stretch",unicodeRange:"unicode-range",featureSettings:"font-feature-settings",variationSettings:"font-variation-settings",display:"font-display",ascentOverride:"ascent-override",descentOverride:"descent-override",lineGapOverride:"line-gap-override",sizeAdjust:"size-adjust"};
        function walk(rules,base) {
            for(const rule of rules) {
                if(rule.cssRules)walk(rule.cssRules,base);
                if(rule.type!==CSSRule.FONT_FACE_RULE)continue;
                const family=rule.style.getPropertyValue("font-family").replace(/^(["'])(.*)\1$/,"$2");
                const source=rule.style.getPropertyValue("src").replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/g,(_,quote,path)=>"url("+JSON.stringify(new URL(path,base).href)+")");
                const options=Object.fromEntries(Object.entries(descriptors).map(([name,css])=>[name,rule.style.getPropertyValue(css)]).filter(([,value])=>value));
                const key=JSON.stringify([family,source,options]);
                if(!fontCache.has(key)) {
                    const face=new FontFace(family,source,options);
                    const ready=face.load();
                    fontCache.set(key,{face,ready});
                    ready.catch(()=>fontCache.delete(key));
                }
                selected.set(key,fontCache.get(key));
            }
        }
        for(const {node} of styles)walk(node.sheet.cssRules,node.href);
        await Promise.all([...selected.values()].map(({ready})=>new Promise((resolve,reject)=>{
            const abort=()=>reject(new DOMException("Font preparation cancelled","AbortError"));
            signal.addEventListener("abort",abort,{once:true});
            if(signal.aborted)abort();
            ready.then(resolve,reject).finally(()=>signal.removeEventListener("abort",abort));
        })));
        signal.throwIfAborted();
        return [...selected.values()].map(({face})=>face);
    }
    function activateFonts(fonts) {
        if(!document.fonts)return;
        // Loaded faces survive CSS URL handovers; no temporary fallback/reflow.
        const next=new Set(fonts);
        next.forEach(face=>document.fonts.add(face));
        activeFonts.forEach(face=>{if(!next.has(face))document.fonts.delete(face);});
        activeFonts=next;
    }
    async function normalizeStyles(styles,signal) {
        const created=[];
        const pending=styles.filter(({node,definition})=>node.getAttribute("href")!==local(definition.path));
        try {
            const relative=await Promise.all(pending.map(({node,definition})=>stagedStyle(definition,local(definition.path),signal,created,node)));
            signal.throwIfAborted();
            // Both sets are ready. Hand over without mutating or reinserting any active stylesheet.
            for(const {node,definition} of relative) {
                node.sheet.media.mediaText=definition.attributes?.media || "all";
                delete node.dataset.siteStaged;
            }
            pending.forEach(({node})=>node.remove());
        } catch(error) {
            created.forEach(node=>node.remove());
            if(error.name!=="AbortError")console.warn("Prepared styles retained while relative references are unavailable.",error.message);
        }
    }
    function imageUrls(target,styles) {
        const urls=new Set();
        for (const image of target.images) {
            // Below-the-fold screenshots keep native lazy loading on mobile connections.
            if(image.loading==="lazy")continue;
            const source=image.getAttribute("src");
            if(source)urls.add(new URL(source,target.baseURI).href);
        }
        function walk(rules,base) {
            for (const rule of rules) {
                if (rule.type===CSSRule.MEDIA_RULE && !matchMedia(rule.conditionText).matches) continue;
                // Style rules also expose cssRules for CSS nesting; inspect their own declarations too.
                if (rule.cssRules?.length) walk(rule.cssRules,base);
                if (!rule.selectorText || !rule.style) continue;
                let matches=false;
                try {matches=!!target.querySelector(rule.selectorText.replace(/::[\w-]+(?:\([^)]*\))?/g,"").replace(/:(?:hover|focus-visible|focus|active)\b/g,""));} catch (_) {}
                if(!matches)continue;
                for(const match of rule.style.cssText.matchAll(/url\(\s*(["']?)([^"')\s]+)\1\s*\)/g)) {
                    const value=match[2];
                    if(!/^(?:#|data:)/i.test(value))urls.add(new URL(value,base).href);
                }
            }
        }
        for(const {node} of styles)walk(node.sheet.cssRules,node.href);
        return urls;
    }
    async function preloadImages(target,styles,signal) {
        // Images are optional: one slow or missing image must not block the whole page.
        const controller=new AbortController();
        const cancel=()=>controller.abort();
        signal.addEventListener("abort",cancel,{once:true});
        const timer=setTimeout(cancel,700);
        const imageSignal=controller.signal;
        try {
            await Promise.all([...imageUrls(target,styles)].map(url=>new Promise(resolve=>{
                const image=new Image();
                const finish=()=>{imageSignal.removeEventListener("abort",abort);image.onload=null;image.onerror=null;resolve();};
                const abort=()=>{image.removeAttribute("src");finish();};
                image.onload=()=>image.decode().catch(()=>{}).then(finish);
                image.onerror=finish;
                imageSignal.addEventListener("abort",abort,{once:true});
                if(imageSignal.aborted || signal.aborted)return abort();
                image.src=url;
            })));
        } finally {clearTimeout(timer);signal.removeEventListener("abort",cancel);}
        signal.throwIfAborted();
    }
    async function preparePage(url,signal) {
        const config=await resource("assets/shared/site.json",true,{},signal);
        const file=publicPage(url,config);
        if(!file)throw new Error("Unknown public page.");
        const scriptPaths=["assets/js/common.js",...config.scripts.map(item=>item.path)];
        if(scriptPaths.some(path=>config.assetVersions?.[path]!==versions[path]))return {reload:true,url};
        const page=config.pages[file];
        let styles=[], preparationFailed=false;
        const stylesReady=prepareStyles(config,page,signal,url).then(value=>{
            styles=value;
            if(preparationFailed)styles.filter(item=>item.staged).forEach(item=>item.node.remove());
            return value;
        });
        try {
            const [response,layout,languageConfig,ko,en,selectedStyles]=await Promise.all([
                fetch(url,{credentials:"same-origin",cache:"no-cache",signal}),
                resource(config.components,false,config.assetVersions,signal),
                resource(config.i18n,true,config.assetVersions,signal),
                resource("assets/i18n/ko.json",true,config.assetVersions,signal),
                resource("assets/i18n/en.json",true,config.assetVersions,signal),
                stylesReady
            ]);
            styles=selectedStyles;
            if(!response.ok)throw new Error("Page failed: "+response.status);
            const source=await response.text();
            const match=source.match(/<body\b([^>]*)>([\s\S]*?)<\/body>/i);
            if(!match || !source.includes('data-page-file="'+file+'"') || /<script\b/i.test(match[2]))throw new Error("Invalid static page.");
            const target=document.implementation.createHTMLDocument("");
            const base=target.createElement("base");base.href=url.href;target.head.append(base);
            target.body.outerHTML="<body"+match[1]+">"+match[2]+"</body>";
            renderHead(config,page,ko,target,file);
            const navigation=createLayout(config,layout,target,file);
            versionDomAssets(target,config.assetVersions);
            const decorationCleanup=behaviors.get("assets/brand-2026/design.js")?.({preparing:true,document:target,catalog:ko,assetUrl:value=>assetUrl(value,target.baseURI,config.assetVersions)});
            decorationCleanup?.();
            const translation=window.INIT_I18N.prepare(target,{config:languageConfig,catalogs:{ko,en},navigation});
            const tokens={i18nConfig:local(config.i18n,config.assetVersions)};
            const [fonts]=await Promise.all([prepareFonts(styles,signal),...config.scripts.filter(item=>!item.group || item.group===page.group).map(item=>loadScript(item,tokens))]);
            do {
                translation.localize(window.INIT_LANGUAGE);
                versionDomAssets(target,config.assetVersions);
                await preloadImages(target,styles,signal);
            } while(translation.language!==window.INIT_LANGUAGE);
            signal.throwIfAborted();
            let committed=false;
            return {
                url,file,config,page,target,navigation,translation,styles,fonts,
                markCommitted(){committed=true;},
                discard(){if(!committed)styles.filter(item=>item.staged).forEach(item=>item.node.remove());}
            };
        } catch(error) {
            preparationFailed=true;
            styles.filter(item=>item.staged).forEach(item=>item.node.remove());
            throw error;
        }
    }
    async function activatePage(prepared,updateUrl,position,signal) {
        const update=()=>{
            signal?.throwIfAborted();
            updateUrl();
            pageCleanups.splice(0).reverse().forEach(dispose=>dispose());
            pageFile=prepared.file;
            prefix="../".repeat(pageFile.split("/").length-1);
            activeConfig=prepared.config;
            versions=activeConfig.assetVersions;
            window.INIT_SITE_CONFIG=activeConfig;
            window.INIT_NAVIGATION_CATALOGS=prepared.navigation;
            activateFonts(prepared.fonts);
            const keep=new Set(prepared.styles.map(item=>item.node));
            document.querySelectorAll("link[data-site-style]").forEach(node=>{if(!keep.has(node))node.remove();});
            for(const {node,definition} of prepared.styles) {
                node.sheet.media.mediaText=definition.attributes?.media || "all";
                delete node.dataset.siteStaged;
            }
            // Viewport and browser appearance settings belong to the document lifetime.
            // Removing them during navigation can reset the mobile viewport/zoom.
            const settings='meta[charset],meta[name="viewport"],meta[name="theme-color"],meta[name="color-scheme"]';
            const retained=new Set();
            const incoming=[...prepared.target.head.querySelectorAll("[data-site-meta]")];
            for(const node of incoming.filter(node=>node.matches(settings))) {
                const current=[...document.head.querySelectorAll(settings)].find(item=>
                    item.getAttribute("name")===node.getAttribute("name"));
                if(!current)continue;
                for(const attr of [...current.attributes])if(!node.hasAttribute(attr.name))current.removeAttribute(attr.name);
                for(const attr of node.attributes)if(current.getAttribute(attr.name)!==attr.value)current.setAttribute(attr.name,attr.value);
                retained.add(current);
                node.remove();
            }
            document.querySelectorAll("[data-site-meta]").forEach(node=>{if(!retained.has(node))node.remove();});
            for(const node of [...prepared.target.head.querySelectorAll("[data-site-meta]")])document.head.append(node);
            for(const attribute of [...document.body.attributes])document.body.removeAttribute(attribute.name);
            for(const attribute of prepared.target.body.attributes)document.body.setAttribute(attribute.name,attribute.value);
            document.body.replaceChildren(...prepared.target.body.childNodes);
            root.lang=prepared.target.documentElement.lang;
            root.classList.remove("reveal-enabled");
            delete root.dataset.navigationPending;
            document.body.inert=false;
            prepared.translation.activate();
            loader.dataset.pageFile=pageFile;
            loader.setAttribute("src",local("assets/js/common.js"));
            document.querySelectorAll("script[data-site-runtime]").forEach(node=>node.setAttribute("src",local(node.dataset.siteRuntime)));
            // Finish layout-affecting page setup before measuring/restoring a position.
            for(const script of activeConfig.scripts.filter(item=>!item.group || item.group===prepared.page.group))mountBehavior(script.path,true);
            versionDomAssets();
            const hash=prepared.url.hash;
            if(position) window.scrollTo({top:position.y || 0,left:position.x || 0,behavior:"instant"});
            else if(hash) {
                let target;
                try {target=document.getElementById(decodeURIComponent(hash.slice(1)));}catch(_){}
                if(target)target.scrollIntoView({behavior:"instant",block:"start"});
                else window.scrollTo({top:0,left:0,behavior:"instant"});
            } else window.scrollTo({top:position?.y || 0,left:position?.x || 0,behavior:"instant"});
            prepared.markCommitted();
            focusDestination(document.querySelector("h1"));
        };
        // A synchronous swap paints once. Browser snapshot overlays can intercept taps
        // while CSS/font/image promises are pending, even with animations disabled.
        update();
        document.dispatchEvent(new CustomEvent("init:site-ready"));
        document.dispatchEvent(new CustomEvent("init:pagechange",{detail:{file:pageFile}}));
        await normalizeStyles(prepared.styles,signal);
        return true;
    }
    window.INIT_SITE_ENGINE=Object.freeze({
        rootUrl,
        pageFor:url=>publicPage(url),
        get file(){return pageFile;},
        async hasUpdate(signal) {
            const latest=await resource("assets/shared/site.json",true,{},signal);
            const {pageVersions:nextPages,...nextShared}=latest;
            const {pageVersions:currentPages,...currentShared}=activeConfig;
            return nextPages?.[pageFile]!==currentPages?.[pageFile]
                || JSON.stringify(nextShared)!==JSON.stringify(currentShared);
        },
        prepare:preparePage,
        activate:activatePage
    });
    window.INIT_SITE_READY = (async () => {
        const config = await resource("assets/shared/site.json");
        const page = config.pages[pageFile];
        if (!page) throw new Error("Unknown public page: " + pageFile);
        for (const kind of ["styles","scripts"]) {
            const paths = config[kind].map(item=>item.path);
            if (new Set(paths).size !== paths.length) throw new Error("Duplicate shared "+kind);
        }
        window.INIT_SITE_CONFIG = config;
        activeConfig = config;
        versions = config.assetVersions || {};
        window.INIT_ASSETS = Object.freeze({url:assetUrl});
        const styleReady = Promise.all(config.styles.filter(item=>!item.group || item.group===page.group).map(loadStyle));
        const [layout, languageConfig, ko] = await Promise.all([
            resource(config.components,false),resource(config.i18n),resource("assets/i18n/ko.json"),styleReady
        ]);
        const initialFonts=await prepareFonts([...document.querySelectorAll("link[data-site-style]")].map(node=>({node})),requests.signal).catch(error=>{
            if(error.name!=="AbortError")console.warn("Font preload unavailable; CSS fallback retained.",error.message);
            return [];
        });
        activateFonts(initialFonts);
        const tokens = renderHead(config,page,ko);
        await domReady;
        createLayout(config,layout);
        versionDomAssets();
        window.INIT_I18N_PRELOAD = {config:languageConfig,catalogs:{ko}};
        // CSS keeps the page transparent while scripts measure the real layout.
        document.body.inert = true;
        root.hidden = false;
        root.classList.add("js");
        for (const script of config.scripts.filter(item=>!item.group || item.group===page.group)) {
            await loadScript(script,tokens);
            if (script.path === "assets/js/i18n.js") await window.INIT_I18N.ready;
            mountBehavior(script.path);
        }
        versionDomAssets();
        const assetObserver = new MutationObserver(() => versionDomAssets());
        assetObserver.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["src","href","poster","data-image","data-promo-src-ko","data-promo-src-en"]});
        await document.fonts?.ready;
        const visibleImages = [...document.images].filter(image => {
            const rect = image.getBoundingClientRect();
            return rect.width && rect.height && rect.top < innerHeight && rect.bottom > 0;
        });
        visibleImages.forEach(image => { image.loading = "eager"; });
        let imageTimer;
        await Promise.race([
            Promise.all(visibleImages.map(image => image.decode?.().catch(() => {}))),
            new Promise(resolve => { imageTimer = setTimeout(resolve,1500); })
        ]);
        clearTimeout(imageTimer);
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        if (root.dataset.siteError) return false;
        root.dataset.siteReady = "true";
        releasePage();
        document.dispatchEvent(new CustomEvent("init:site-ready"));
        return true;
    })();
    window.INIT_SITE_READY.catch(error => {
        if (pageLeaving) return;
        releasePage(true);
        console.error(error);
    });
}());
