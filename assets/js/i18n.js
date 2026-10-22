(function () {
    "use strict";

    let pageDocument = document;
    const script = pageDocument.currentScript;
    const configUrl = script?.dataset.i18nConfig
        ? new URL(script.dataset.i18nConfig, pageDocument.baseURI).href
        : "";
    const translatableAttributes = [
        "alt",
        "aria-label",
        "data-alt",
        "data-description",
        "data-title",
        "placeholder",
        "title"
    ];
    const translatableMetaKeys = new Set(["description", "og:site_name", "og:title", "og:description", "og:image:alt"]);
    let registry = [];
    let structuredData = [];
    let localizedMetaImages = [];
    let state = {
        catalogs: {},
        config: null,
        language: "ko",
        sourceIndex: new Map()
    };

    function normalize(value) {
        return String(value || "").replace(/\s+/g, " ").trim();
    }

    async function fetchJson(url) {
        const response = await fetch(url, { credentials: "same-origin" });
        if (!response.ok) throw new Error(`Unable to load language resource: ${response.status}`);
        return response.json();
    }

    function storedLanguage(config) {
        try {
            return window.localStorage.getItem(config.storageKey);
        } catch (_) {
            return null;
        }
    }

    function persistLanguage(config, language) {
        try {
            window.localStorage.setItem(config.storageKey, language);
        } catch (_) {
            // Language still remains available on window when storage is unavailable.
        }
    }

    function supportedLanguage(config, candidate) {
        return config.languages.some((language) => language.code === candidate)
            ? candidate
            : config.defaultLanguage;
    }

    function catalogUrl(config, language) {
        const url = new URL(config.catalogs[language], configUrl).href;
        return window.INIT_ASSETS?.url(url) || url;
    }

    function localizedContent(value) {
        const fragment = pageDocument.createDocumentFragment();
        const company = /(?:㈜|\(주\))\s*인아이티/g;
        let offset = 0;
        for (const match of value.matchAll(company)) {
            fragment.append(pageDocument.createTextNode(value.slice(offset, match.index)));
            const name = pageDocument.createElement("span");
            name.className = "company-name";
            name.textContent = match[0];
            fragment.append(name);
            offset = match.index + match[0].length;
        }
        fragment.append(pageDocument.createTextNode(value.slice(offset)));
        return fragment;
    }

    function registerExplicitContent() {
        pageDocument.querySelectorAll("[data-i18n]").forEach((element) => {
            const key = element.dataset.i18n;
            if (!Object.prototype.hasOwnProperty.call(state.catalogs.ko, key)) {
                throw new Error(`Unknown translation key: ${key}`);
            }
            registry.push({ type: "content", element, key });
        });
    }

    function registerTextNodes() {
        const walker = pageDocument.createTreeWalker(pageDocument.documentElement, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                const parent = node.parentElement;
                if (!parent || parent.closest("script, style, noscript, template, [data-i18n-ignore], [data-i18n]")) {
                    return NodeFilter.FILTER_REJECT;
                }
                return state.sourceIndex.has(normalize(node.nodeValue))
                    ? NodeFilter.FILTER_ACCEPT
                    : NodeFilter.FILTER_REJECT;
            }
        });

        let node = walker.nextNode();
        while (node) {
            const original = node.nodeValue;
            registry.push({
                type: "text",
                node,
                key: state.sourceIndex.get(normalize(original)),
                leading: original.match(/^\s*/)?.[0] || "",
                trailing: original.match(/\s*$/)?.[0] || ""
            });
            node = walker.nextNode();
        }
    }

    function registerAttributes() {
        pageDocument.querySelectorAll("*").forEach((element) => {
            translatableAttributes.forEach((name) => {
                const value = element.getAttribute(name);
                const key = state.sourceIndex.get(normalize(value));
                if (key) registry.push({ type: "attribute", element, name, key });
            });

            if (element.tagName !== "META") return;
            const metaKey = (element.getAttribute("name") || element.getAttribute("property") || "").toLowerCase();
            if (metaKey === "og:image" && /_kor\.png$/.test(element.content)) {
                localizedMetaImages.push({ element, source: element.content });
            }
            if (!translatableMetaKeys.has(metaKey)) return;
            const key = state.sourceIndex.get(normalize(element.getAttribute("content")));
            if (key) registry.push({ type: "attribute", element, name: "content", key });
        });
    }

    function registerStructuredData() {
        pageDocument.querySelectorAll('script[type="application/ld+json"]').forEach((element) => {
            try {
                structuredData.push({ element, source: JSON.parse(element.textContent) });
            } catch (_) {
                // Static validation reports malformed data; language controls still work.
            }
        });
    }

    function syncStructuredData(languageConfig) {
        function localize(value, property) {
            if (Array.isArray(value)) return value.map((item) => localize(item, property));
            if (value && typeof value === "object") {
                return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, localize(item, key)]));
            }
            if (typeof value !== "string") return value;
            // Arrays describe all supported languages; a page's scalar tracks its displayed language.
            if (property === "inLanguage") return value;
            if (property === "image" && /_kor\.png$/.test(value)) {
                return value.replace(/_kor\.png$/, `_${languageConfig.imageSuffix}.png`);
            }
            const key = state.sourceIndex.get(normalize(value));
            return key ? translate(key) : value;
        }
        structuredData.forEach(({ element, source }) => {
            const data = localize(source);
            (data["@graph"] || [data]).forEach((node) => {
                if (typeof node.inLanguage === "string") node.inLanguage = languageConfig.htmlLang;
            });
            element.textContent = JSON.stringify(data);
        });
        localizedMetaImages.forEach(({ element, source }) => {
            element.content = source.replace(/_kor\.png$/, `_${languageConfig.imageSuffix}.png`);
        });
    }

    function updateLanguageControls() {
        pageDocument.querySelectorAll(".language-switcher [data-language]").forEach((button) => {
            const active = button.dataset.language === state.language;
            button.classList.toggle("is-active", active);
            button.setAttribute("aria-pressed", String(active));
        });
    }

    function syncLocalizedImages(languageConfig) {
        const suffix = languageConfig?.imageSuffix;
        if (!suffix) return;

        pageDocument.querySelectorAll("[data-i18n-image-base]").forEach((element) => {
            const base = element.dataset.i18nImageBase;
            const extension = element.dataset.i18nImageExtension || "png";
            if (!base) return;
            const localized = `${base}_${suffix}.${extension}`;

            const source = window.INIT_ASSETS?.url(localized) || localized;
            if (element instanceof HTMLImageElement) {
                if (element.getAttribute("src") !== source) element.setAttribute("src", source);
            } else if (element.dataset.image !== source) {
                element.dataset.image = source;
            }
        });
    }

    function syncRuntimeContent() {
        const menuToggle = pageDocument.querySelector("[data-menu-toggle]");
        if (menuToggle) {
            const key = menuToggle.getAttribute("aria-expanded") === "true" ? "ui.menu.close" : "ui.menu.open";
            const label = translate(key);
            if (menuToggle.getAttribute("aria-label") !== label) menuToggle.setAttribute("aria-label", label);
        }

        const selectedTab = pageDocument.querySelector('[data-product-tab][aria-selected="true"]');
        const gallery = selectedTab?.closest("[data-product-gallery]");
        if (selectedTab && gallery) {
            const image = gallery.querySelector("[data-product-image]");
            const kicker = gallery.querySelector("[data-product-kicker]");
            const title = gallery.querySelector("[data-product-title]");
            const description = gallery.querySelector("[data-product-description]");
            if (image && selectedTab.dataset.image && image.getAttribute("src") !== selectedTab.dataset.image) {
                image.setAttribute("src", selectedTab.dataset.image);
            }
            if (image && selectedTab.dataset.alt) image.alt = selectedTab.dataset.alt;
            if (kicker) kicker.textContent = selectedTab.dataset.kicker || "";
            if (title) title.textContent = selectedTab.dataset.title || "";
            if (description) description.textContent = selectedTab.dataset.description || "";
        }

        const lightboxImage = pageDocument.querySelector("[data-lightbox-image]");
        const productImage = pageDocument.querySelector("[data-product-image]");
        if (lightboxImage && productImage && pageDocument.body.classList.contains("lightbox-open")) {
            const alt = translate("ui.product.zoomed", { alt: productImage.alt });
            if (lightboxImage.alt !== alt) lightboxImage.alt = alt;
        }
    }

    const runtimeObservers = [];
    function observeRuntimeContent() {
        const menuToggle = pageDocument.querySelector("[data-menu-toggle]");
        if (menuToggle) {
            const observer = new MutationObserver(syncRuntimeContent);
            runtimeObservers.push(observer);
            observer.observe(menuToggle, {
                attributes: true,
                attributeFilter: ["aria-expanded"]
            });
        }
        const lightboxImage = pageDocument.querySelector("[data-lightbox-image]");
        if (lightboxImage) {
            const observer = new MutationObserver(syncRuntimeContent);
            runtimeObservers.push(observer);
            observer.observe(lightboxImage, {
                attributes: true,
                attributeFilter: ["alt"]
            });
        }
    }

    function translate(key, replacements = {}) {
        const catalog = state.catalogs[state.language] || state.catalogs.ko || {};
        let value = catalog[key] ?? state.catalogs.ko?.[key] ?? key;
        Object.entries(replacements).forEach(([name, replacement]) => {
            value = value.replaceAll(`{${name}}`, replacement);
        });
        return value;
    }

    function applyLanguage(language, options = {}) {
        if (!state.config || !state.catalogs[language]) return;
        state.language = language;
        if (!options.silent) window.INIT_LANGUAGE = language;

        const languageConfig = state.config.languages.find((item) => item.code === language);
        pageDocument.documentElement.lang = languageConfig?.htmlLang || language;
        pageDocument.documentElement.dataset.language = language;
        pageDocument.querySelector('meta[property="og:locale"]')?.setAttribute("content", languageConfig?.ogLocale || "");

        registry.forEach((entry) => {
            const value = translate(entry.key);
            if (entry.type === "text") {
                entry.node.nodeValue = `${entry.leading}${value}${entry.trailing}`;
            } else if (entry.type === "content") {
                entry.element.replaceChildren(localizedContent(value));
            } else {
                entry.element.setAttribute(entry.name, value);
            }
        });

        syncLocalizedImages(languageConfig);
        syncStructuredData(languageConfig);
        syncRuntimeContent();
        updateLanguageControls();
        if (options.persist !== false) persistLanguage(state.config, language);
        if (!options.silent) pageDocument.dispatchEvent(new CustomEvent("init:languagechange", { detail: { language } }));
    }

    async function setLanguage(candidate) {
        if (!state.config) return;
        const language = supportedLanguage(state.config, candidate);
        if (!state.catalogs[language]) {
            state.catalogs[language] = withNavigation(language, await fetchJson(catalogUrl(state.config, language)));
        }
        applyLanguage(language);
    }

    function bindLanguageControls() {
        pageDocument.querySelectorAll(".language-switcher [data-language]").forEach((button) => {
            button.addEventListener("click", () => setLanguage(button.dataset.language));
        });
    }

    function withNavigation(language, catalog) {
        return {...catalog, ...(window.INIT_NAVIGATION_CATALOGS?.[language] || {})};
    }

    async function initialize() {
        if (!configUrl) throw new Error("Missing i18n configuration URL.");
        const config = window.INIT_I18N_PRELOAD?.config || await fetchJson(configUrl);
        state.config = config;
        state.language = supportedLanguage(config, storedLanguage(config));
        state.catalogs.ko = withNavigation("ko", window.INIT_I18N_PRELOAD?.catalogs?.ko || await fetchJson(catalogUrl(config, "ko")));
        if (state.language !== "ko") {
            state.catalogs[state.language] = withNavigation(state.language, await fetchJson(catalogUrl(config, state.language)));
        }
        Object.entries(state.catalogs.ko).forEach(([key, value]) => state.sourceIndex.set(normalize(value), key));
        registerExplicitContent();
        registerTextNodes();
        registerAttributes();
        registerStructuredData();
        bindLanguageControls();
        observeRuntimeContent();
        applyLanguage(state.language, { persist: false });
        return state.language;
    }

    function prepare(targetDocument, preload) {
        const saved = {pageDocument,state,registry,structuredData,localizedMetaImages};
        const next = {
            pageDocument:targetDocument,
            state:{
                config:preload.config,
                catalogs:Object.fromEntries(["ko","en"].map(language=>[language,{...preload.catalogs[language],...preload.navigation[language]}])),
                language:window.INIT_LANGUAGE,
                sourceIndex:new Map()
            },
            registry:[],structuredData:[],localizedMetaImages:[]
        };
        function use(value) {
            ({pageDocument,state,registry,structuredData,localizedMetaImages}=value);
        }
        function localized(language) {
            const active = {pageDocument,state,registry,structuredData,localizedMetaImages};
            use(next);
            applyLanguage(supportedLanguage(state.config,language),{persist:false,silent:true});
            use(active);
        }
        try {
            use(next);
            Object.entries(state.catalogs.ko).forEach(([key,value])=>state.sourceIndex.set(normalize(value),key));
            registerExplicitContent(); registerTextNodes(); registerAttributes(); registerStructuredData();
            applyLanguage(supportedLanguage(state.config,window.INIT_LANGUAGE),{persist:false,silent:true});
        } finally { use(saved); }
        return {
            localize:localized,
            get language(){return next.state.language;},
            activate() {
                runtimeObservers.splice(0).forEach(observer=>observer.disconnect());
                use({...next,pageDocument:document});
                bindLanguageControls(); observeRuntimeContent();
                applyLanguage(state.language,{persist:false});
            }
        };
    }

    const ready = initialize().catch((error) => {
        pageDocument.documentElement.dataset.language = "ko";
        console.warn(error.message);
        return "ko";
    });

    window.INIT_LANGUAGE = "ko";
    window.INIT_I18N = Object.freeze({
        ready,
        setLanguage,
        prepare,
        t: translate,
        getLanguage: () => state.language
    });
}());
