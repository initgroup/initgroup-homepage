(function () {
    "use strict";

    const script = document.currentScript;
    const configUrl = script?.dataset.i18nConfig
        ? new URL(script.dataset.i18nConfig, document.baseURI).href
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
    const translatableMetaKeys = new Set(["description", "og:title", "og:description", "og:image:alt"]);
    const registry = [];
    const state = {
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
        return new URL(config.catalogs[language], configUrl).href;
    }

    function registerTextNodes() {
        const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                const parent = node.parentElement;
                if (!parent || parent.closest("script, style, noscript, template, [data-i18n-ignore]")) {
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
        document.querySelectorAll("*").forEach((element) => {
            translatableAttributes.forEach((name) => {
                const value = element.getAttribute(name);
                const key = state.sourceIndex.get(normalize(value));
                if (key) registry.push({ type: "attribute", element, name, key });
            });

            if (element.tagName !== "META") return;
            const metaKey = (element.getAttribute("name") || element.getAttribute("property") || "").toLowerCase();
            if (!translatableMetaKeys.has(metaKey)) return;
            const key = state.sourceIndex.get(normalize(element.getAttribute("content")));
            if (key) registry.push({ type: "attribute", element, name: "content", key });
        });
    }

    function updateLanguageControls() {
        document.querySelectorAll("[data-language]").forEach((button) => {
            const active = button.dataset.language === state.language;
            button.classList.toggle("is-active", active);
            button.setAttribute("aria-pressed", String(active));
        });
    }

    function syncLocalizedImages(languageConfig) {
        const suffix = languageConfig?.imageSuffix;
        if (!suffix) return;

        document.querySelectorAll("[data-i18n-image-base]").forEach((element) => {
            const base = element.dataset.i18nImageBase;
            const extension = element.dataset.i18nImageExtension || "png";
            if (!base) return;
            const source = `${base}_${suffix}.${extension}`;

            if (element instanceof HTMLImageElement) {
                if (element.getAttribute("src") !== source) element.setAttribute("src", source);
            } else if (element.dataset.image !== source) {
                element.dataset.image = source;
            }
        });
    }

    function syncRuntimeContent() {
        const menuToggle = document.querySelector("[data-menu-toggle]");
        if (menuToggle) {
            const key = menuToggle.getAttribute("aria-expanded") === "true" ? "ui.menu.close" : "ui.menu.open";
            const label = translate(key);
            if (menuToggle.getAttribute("aria-label") !== label) menuToggle.setAttribute("aria-label", label);
        }

        const selectedTab = document.querySelector('[data-product-tab][aria-selected="true"]');
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

        const lightboxImage = document.querySelector("[data-lightbox-image]");
        const productImage = document.querySelector("[data-product-image]");
        if (lightboxImage && productImage && document.body.classList.contains("lightbox-open")) {
            const alt = translate("ui.product.zoomed", { alt: productImage.alt });
            if (lightboxImage.alt !== alt) lightboxImage.alt = alt;
        }
    }

    function observeRuntimeContent() {
        const menuToggle = document.querySelector("[data-menu-toggle]");
        if (menuToggle) {
            new MutationObserver(syncRuntimeContent).observe(menuToggle, {
                attributes: true,
                attributeFilter: ["aria-expanded"]
            });
        }
        const lightboxImage = document.querySelector("[data-lightbox-image]");
        if (lightboxImage) {
            new MutationObserver(syncRuntimeContent).observe(lightboxImage, {
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
        window.INIT_LANGUAGE = language;

        const languageConfig = state.config.languages.find((item) => item.code === language);
        document.documentElement.lang = languageConfig?.htmlLang || language;
        document.documentElement.dataset.language = language;
        document.querySelector('meta[property="og:locale"]')?.setAttribute("content", languageConfig?.ogLocale || "");

        registry.forEach((entry) => {
            const value = translate(entry.key);
            if (entry.type === "text") {
                entry.node.nodeValue = `${entry.leading}${value}${entry.trailing}`;
            } else {
                entry.element.setAttribute(entry.name, value);
            }
        });

        syncLocalizedImages(languageConfig);
        syncRuntimeContent();
        updateLanguageControls();
        if (options.persist !== false) persistLanguage(state.config, language);
        document.dispatchEvent(new CustomEvent("init:languagechange", { detail: { language } }));
    }

    async function setLanguage(candidate) {
        if (!state.config) return;
        const language = supportedLanguage(state.config, candidate);
        if (!state.catalogs[language]) {
            state.catalogs[language] = await fetchJson(catalogUrl(state.config, language));
        }
        applyLanguage(language);
    }

    function bindLanguageControls() {
        document.querySelectorAll("[data-language]").forEach((button) => {
            button.addEventListener("click", () => setLanguage(button.dataset.language));
        });
    }

    async function initialize() {
        if (!configUrl) throw new Error("Missing i18n configuration URL.");
        const config = await fetchJson(configUrl);
        state.config = config;
        state.language = supportedLanguage(config, storedLanguage(config));
        state.catalogs.ko = await fetchJson(catalogUrl(config, "ko"));
        if (state.language !== "ko") {
            state.catalogs[state.language] = await fetchJson(catalogUrl(config, state.language));
        }
        Object.entries(state.catalogs.ko).forEach(([key, value]) => state.sourceIndex.set(normalize(value), key));
        registerTextNodes();
        registerAttributes();
        bindLanguageControls();
        observeRuntimeContent();
        applyLanguage(state.language, { persist: false });
        return state.language;
    }

    const ready = initialize().catch((error) => {
        document.documentElement.dataset.language = "ko";
        console.warn(error.message);
        return "ko";
    });

    window.INIT_LANGUAGE = "ko";
    window.INIT_I18N = Object.freeze({
        ready,
        setLanguage,
        t: translate,
        getLanguage: () => state.language
    });
}());
