(function () {
    "use strict";
    const siteRootUrl = new URL("../../", document.currentScript.src);
    window.INIT_PAGE.register("assets/js/site.js", function (context = {}) {
    const scope = window.INIT_PAGE.scope();
    const listen = scope.listen;




    const normalizedPath = (path) => path.replace(/index\.html$/, "");
    const header = document.querySelector("[data-site-header]");
    const progress = document.querySelector("[data-scroll-progress]");
    const menu = document.querySelector("[data-mobile-menu]");
    const menuToggle = document.querySelector("[data-menu-toggle]");
    const menuClose = document.querySelector("[data-menu-close]");
    const menuBackdrop = document.querySelector("[data-menu-backdrop]");
    const headerInner = document.querySelector(".header-inner");
    const hoverMenu = document.querySelector("[data-hover-menu]");
    const hoverSections = Array.from(hoverMenu?.querySelectorAll("[data-hover-section]") || []);
    const pageSubNavigation = document.querySelector("[data-page-sub-navigation]");
    const detailNavigation = document.querySelector("[data-detail-navigation]");
    const historyBackButtons = Array.from(document.querySelectorAll("[data-history-back]"));
    const pageSubLinks = Array.from(document.querySelectorAll("[data-page-sub-link]"));
    const main = document.querySelector("main");
    const footer = document.querySelector(".site-footer");
    const mobileActionBar = document.querySelector(".mobile-action-bar");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktopNavigation = window.matchMedia("(min-width: 72.01rem)");
    const desktopNavLinks = Array.from(document.querySelectorAll(".desktop-nav [data-nav]"));
    let menuReturnFocus = null;
    let hoverMenuPinned = false;
    let hoverReturnFocus = null;
    let activePageSubLink = pageSubLinks.find((link) => link.classList.contains("is-current")) || null;
    let frameRequested = false;
    let readableTypeFrameRequested = false;
    let viewportFrameRequested = false;
    const visualViewport = window.visualViewport;

    function isPageNavigation(event, link) {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
        if (link.hasAttribute("download") || (link.target && link.target !== "_self")) return false;
        const target = new URL(link.href,document.baseURI);
        if (target.origin !== location.origin || !/^https?:$/.test(target.protocol)) return false;
        return normalizedPath(target.pathname) !== normalizedPath(location.pathname) || target.search !== location.search;
    }
    listen(document,"click",event => {
        const link = event.target.closest?.("a[href]");
        if (link && isPageNavigation(event,link)) {
            document.documentElement.dataset.navigationPending = "true";
            // Dialogs and other local handlers may cancel the browser's default navigation.
            queueMicrotask(() => {
                if (event.defaultPrevented && !window.INIT_PAGE_NAVIGATION?.pending) delete document.documentElement.dataset.navigationPending;
            });
        }
    },true);
    listen(window,"pageshow",event => {
        delete document.documentElement.dataset.navigationPending;
        if (event.persisted) {
            closeMenu({restoreFocus:false});
            closeHoverMenu({force:true});
            requestScrollUiUpdate();
        }
    });

    function updateScrollUi() {
        frameRequested = false;
        const scrollTop = Math.max(window.scrollY, document.documentElement.scrollTop);
        const scrollRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        header?.classList.toggle("is-scrolled", scrollTop > 12);
        if (progress) progress.style.transform = `scaleX(${Math.min(1, scrollTop / scrollRange)})`;
        updatePageSubNavigation();
    }

    function updatePageSubNavigation() {
        if (!pageSubLinks.length) return;
        const currentPath = normalizedPath(window.location.pathname);
        const localTargets = pageSubLinks.map((link) => {
            const url = new URL(link.href, document.baseURI);
            const target = normalizedPath(url.pathname) === currentPath && url.hash ? document.getElementById(decodeURIComponent(url.hash.slice(1))) : null;
            return { link, url, target };
        });
        if (!localTargets.some(({ url }) => normalizedPath(url.pathname) === currentPath)) {
            syncCurrentNavigation(activePageSubLink);
            revealActivePageSubLink(activePageSubLink);
            return;
        }
        let activeLink = localTargets.find(({ url }) => normalizedPath(url.pathname) === currentPath && !url.hash)?.link || null;
        const threshold = Math.max(
            (pageSubNavigation?.getBoundingClientRect().bottom || 0) + 80,
            window.innerHeight * 0.48
        );
        localTargets.forEach(({ link, target }) => {
            if (target && target.getBoundingClientRect().top <= threshold) activeLink = link;
        });
        if (!activeLink) activeLink = localTargets.find(({ url }) => normalizedPath(url.pathname) === currentPath)?.link || null;
        if (activeLink === activePageSubLink) {
            syncCurrentNavigation(activeLink);
            revealActivePageSubLink(activeLink);
            return;
        }
        activePageSubLink = activeLink;
        pageSubLinks.forEach((link) => {
            const active = link === activeLink;
            link.classList.toggle("is-current", active);
            if (active) link.setAttribute("aria-current", "page");
            else link.removeAttribute("aria-current");
        });
        syncCurrentNavigation(activeLink);
        revealActivePageSubLink(activeLink);
    }

    function revealActivePageSubLink(activeLink) {
        const linkRail = activeLink?.closest(".page-sub-navigation-links");
        if (!linkRail) return;
        const linkBounds = activeLink.getBoundingClientRect();
        const railBounds = linkRail.getBoundingClientRect();
        const isClipped = linkBounds.left < railBounds.left - 1 || linkBounds.right > railBounds.right + 1;
        if (!isClipped) return;
        // Only move this horizontal rail. scrollIntoView also scrolls the page,
        // including its viewport padding, and can undo the destination position.
        const centered = linkRail.scrollLeft + linkBounds.left - railBounds.left
            - Math.max(0, (linkRail.clientWidth - linkBounds.width) / 2);
        const left = Math.max(0, Math.min(centered, linkRail.scrollWidth - linkRail.clientWidth));
        if (Math.abs(left - linkRail.scrollLeft) > 1) {
            linkRail.scrollTo({left, top:linkRail.scrollTop, behavior:"instant"});
        }
    }

    function revealDetailNavigationLocation() {
        const currentLocation = detailNavigation?.querySelector('[aria-current="page"]');
        const locationRail = currentLocation?.closest(".insight-detail-location");
        if (!locationRail) return;
        const currentBounds = currentLocation.getBoundingClientRect();
        const railBounds = locationRail.getBoundingClientRect();
        if (currentBounds.right > railBounds.right) {
            locationRail.scrollLeft += currentBounds.right - railBounds.right + 8;
        } else if (currentBounds.left < railBounds.left) {
            locationRail.scrollLeft -= railBounds.left - currentBounds.left + 8;
        }
    }

    function requestScrollUiUpdate() {
        if (frameRequested) return;
        frameRequested = true;
        scope.frame(updateScrollUi);
    }

    function enforceReadableTypeFloor() {
        readableTypeFrameRequested = false;
        const undersized = Array.from(document.querySelectorAll("body *")).filter((element) => {
            if (element.closest('[aria-hidden="true"], .visually-hidden, svg, script, style')) return false;
            if (!element.getClientRects().length) return false;
            const hasDirectText = Array.from(element.childNodes).some(
                (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim()
            );
            return hasDirectText && Number.parseFloat(window.getComputedStyle(element).fontSize) < 16;
        });
        undersized.forEach((element) => element.classList.add("minimum-font-size"));
    }

    function requestReadableTypeFloor() {
        if (readableTypeFrameRequested) return;
        readableTypeFrameRequested = true;
        scope.frame(enforceReadableTypeFloor);
    }

    function updateMobileActionViewport() {
        viewportFrameRequested = false;
        if (!mobileActionBar?.isConnected) return;
        const set = (element, name, value) => {
            const next = Math.max(0, value).toFixed(3) + "px";
            if (element.style.getPropertyValue(name) !== next) element.style.setProperty(name, next);
        };
        let bounds = mobileActionBar.getBoundingClientRect();
        if (!bounds.height) {
            document.body.style.removeProperty("--mobile-action-height");
            return;
        }
        const inset = name => Number.parseFloat(mobileActionBar.style.getPropertyValue(name)) || 0;
        // Fixed positioning follows the layout viewport; zoom/device mode/keyboard
        // can leave a smaller visible viewport. Measure the neutral fixed edges
        // rather than assuming innerHeight and the painted bottom are identical.
        const bottom = visualViewport ? bounds.bottom + inset("--mobile-action-bottom") - visualViewport.offsetTop - visualViewport.height : 0;
        const right = visualViewport ? bounds.right + inset("--mobile-action-right") - visualViewport.offsetLeft - visualViewport.width : 0;
        set(mobileActionBar, "--mobile-action-bottom", bottom);
        set(mobileActionBar, "--mobile-action-right", right);
        set(mobileActionBar, "--mobile-action-left", visualViewport?.offsetLeft || 0);
        bounds = mobileActionBar.getBoundingClientRect();
        set(document.body, "--mobile-action-height", bounds.height);
    }

    function requestViewportUpdate() {
        if (viewportFrameRequested) return;
        viewportFrameRequested = true;
        scope.frame(() => {
            updateMobileActionViewport();
            // A responsive reflow may bring a previously hidden reveal into view.
            // Finish it in this frame instead of requiring a scroll or reload.
            document.querySelectorAll(".reveal:not(.is-visible)").forEach(element => {
                const bounds = element.getBoundingClientRect();
                if (bounds.bottom > 0 && bounds.top < innerHeight) window.INIT_PAGE.reveal(element);
            });
        });
    }

    function focusableElements(container) {
        if (!container) return [];
        return Array.from(container.querySelectorAll(
            'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )).filter((element) => !element.hidden && element.getClientRects().length > 0);
    }

    function setPageInert(value) {
        if (headerInner) headerInner.inert = value;
        if (hoverMenu) hoverMenu.inert = value;
        if (pageSubNavigation) pageSubNavigation.inert = value;
        if (detailNavigation) detailNavigation.inert = value;
        if (main) main.inert = value;
        if (footer) footer.inert = value;
        if (mobileActionBar) mobileActionBar.inert = value;
    }

    function syncCurrentNavigation(activeLink = activePageSubLink) {
        const pageKey = document.body.dataset.page;
        hoverSections.forEach((section) => {
            section.classList.toggle("is-current", section.dataset.hoverSection === pageKey);
        });

        const currentUrl = activeLink ? new URL(activeLink.href, document.baseURI) : new URL(window.location.href);
        const links = [
            ...Array.from(hoverMenu?.querySelectorAll("li a") || []),
            ...Array.from(menu?.querySelectorAll("li a") || [])
        ];
        links.forEach((link) => {
            const url = new URL(link.href, document.baseURI);
            const isCurrent = normalizedPath(url.pathname) === normalizedPath(currentUrl.pathname) && url.hash === currentUrl.hash;
            link.classList.toggle("is-current", isCurrent);
            if (isCurrent) link.setAttribute("aria-current", "page");
            else link.removeAttribute("aria-current");
        });
    }

    function setHoveredMenuSection(key) {
        desktopNavLinks.forEach((link) => {
            link.classList.toggle("is-menu-target", link.dataset.nav === key);
        });
        hoverSections.forEach((section) => {
            section.classList.toggle("is-hovered", section.dataset.hoverSection === key);
        });
    }

    function openHoverMenu(key, options = {}) {
        if (!hoverMenu || !header || !desktopNavigation.matches) return;
        if (!menu?.hidden) closeMenu({ restoreFocus: false });
        if (options.pinned !== undefined) hoverMenuPinned = options.pinned;
        if (options.returnFocus instanceof HTMLElement) hoverReturnFocus = options.returnFocus;
        hoverMenu.hidden = false;
        header.classList.add("is-hover-open");
        header.classList.toggle("is-menu-pinned", hoverMenuPinned);
        menuToggle?.setAttribute("aria-expanded", String(hoverMenuPinned));
        if (hoverMenuPinned) {
            menuToggle?.setAttribute(
                "aria-label",
                window.INIT_I18N?.t("ui.menu.close") || menuClose?.getAttribute("aria-label") || ""
            );
        }
        setHoveredMenuSection(key || null);
        syncCurrentNavigation();
    }

    function closeHoverMenu(options = {}) {
        if ((options.navigation && document.documentElement.dataset.navigationPending) || !hoverMenu || (hoverMenuPinned && !options.force)) return;
        hoverMenu.hidden = true;
        hoverMenuPinned = false;
        header?.classList.remove("is-hover-open");
        header?.classList.remove("is-menu-pinned");
        menuToggle?.setAttribute("aria-expanded", "false");
        menuToggle?.setAttribute("aria-label", window.INIT_I18N?.t("ui.menu.open") || "");
        setHoveredMenuSection(null);
        if (options.restoreFocus) (hoverReturnFocus || menuToggle)?.focus();
        hoverReturnFocus = null;
    }

    function openMenu() {
        if (!menu || !menuToggle || !menuBackdrop || !header) return;
        if (!menu.hidden) return;
        closeHoverMenu({ force: true });
        menuReturnFocus = document.activeElement;
        menu.hidden = false;
        menuBackdrop.hidden = false;
        menuToggle.setAttribute("aria-expanded", "true");
        menuToggle.setAttribute("aria-label", window.INIT_I18N?.t("ui.menu.close") || menuClose?.getAttribute("aria-label") || "");
        document.body.classList.add("menu-open");
        header.classList.add("is-menu-open");
        setPageInert(true);
        scope.frame(() => focusableElements(menu)[0]?.focus());
    }

    function closeMenu(options = {}) {
        if ((options.navigation && document.documentElement.dataset.navigationPending) || !menu || !menuToggle || !menuBackdrop || !header || menu.hidden) return;
        menu.hidden = true;
        menuBackdrop.hidden = true;
        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.setAttribute("aria-label", window.INIT_I18N?.t("ui.menu.open") || "");
        document.body.classList.remove("menu-open");
        header.classList.remove("is-menu-open");
        setPageInert(false);
        const restoreFocus = options.restoreFocus ?? true;
        if (restoreFocus) {
            const target = menuReturnFocus instanceof HTMLElement ? menuReturnFocus : menuToggle;
            target.focus();
        }
        menuReturnFocus = null;
    }

    function closeHoverMenuAfterFocusLeaves() {
        scope.frame(() => {
            if (!hoverMenu || hoverMenu.hidden) return;
            const activeElement = document.activeElement;
            if (
                headerInner?.contains(activeElement)
                || pageSubNavigation?.contains(activeElement)
                || hoverMenu.contains(activeElement)
            ) return;
            closeHoverMenu({ force: true, navigation: true });
        });
    }

    function trapMenuFocus(event) {
        if (event.key === "Escape") {
            closeMenu();
            return;
        }
        if (event.key !== "Tab" || !menu || menu.hidden) return;
        const elements = focusableElements(menu);
        if (!elements.length) return;
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    function setActiveNavigation() {
        const page = document.body.dataset.page;
        if (!page) return;
        document.querySelectorAll(`.desktop-nav [data-nav="${page}"]`).forEach((link) => {
            link.setAttribute("aria-current", "page");
        });
        syncCurrentNavigation();
    }

    function handleNavigationViewport(event) {
        closeMenu({ restoreFocus: false });
        closeHoverMenu({ force: true });
        menuToggle?.setAttribute("aria-controls", desktopNavigation.matches ? "hoverNavigation" : "siteNavigation");
    }

    function initProductGallery() {
        const gallery = document.querySelector("[data-product-gallery]");
        if (!gallery) return;
        const tabs = Array.from(gallery.querySelectorAll("[data-product-tab]"));
        const panel = gallery.querySelector("[role='tabpanel']");
        const image = gallery.querySelector("[data-product-image]");
        const kicker = gallery.querySelector("[data-product-kicker]");
        const title = gallery.querySelector("[data-product-title]");
        const description = gallery.querySelector("[data-product-description]");

        function activateTab(tab, options = {}) {
            if (!tab || !image || !panel) return;
            tabs.forEach((item) => {
                const selected = item === tab;
                item.setAttribute("aria-selected", String(selected));
                item.tabIndex = selected ? 0 : -1;
            });
            const source = tab.dataset.image || image.getAttribute("src");
            image.src = window.INIT_ASSETS?.url(source) || source;
            image.alt = tab.dataset.alt || image.alt;
            if (kicker) kicker.textContent = tab.dataset.kicker || "";
            if (title) title.textContent = tab.dataset.title || "";
            if (description) description.textContent = tab.dataset.description || "";
            panel.setAttribute("aria-labelledby", tab.id);
            if (options.focus) tab.focus();
        }

        tabs.forEach((tab, index) => {
            tab.tabIndex = tab.getAttribute("aria-selected") === "true" ? 0 : -1;
            tab.addEventListener("click", () => activateTab(tab));
            tab.addEventListener("keydown", (event) => {
                if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                event.preventDefault();
                let nextIndex = index;
                if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
                if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
                if (event.key === "Home") nextIndex = 0;
                if (event.key === "End") nextIndex = tabs.length - 1;
                activateTab(tabs[nextIndex], { focus: true });
            });
        });
        listen(document,"init:languagechange", () => {
            activateTab(tabs.find((tab) => tab.getAttribute("aria-selected") === "true") || tabs[0]);
        });
    }

    function initLightbox() {
        const dialog = document.querySelector("[data-lightbox]");
        const openButton = document.querySelector("[data-lightbox-open]");
        const closeButton = dialog?.querySelector("[data-lightbox-close]");
        const dialogImage = dialog?.querySelector("[data-lightbox-image]");
        const productImage = document.querySelector("[data-product-image]");
        if (!dialog || !openButton || !dialogImage || !productImage) return;

        function open() {
            dialogImage.src = productImage.currentSrc || productImage.src;
            dialogImage.alt = window.INIT_I18N?.t("ui.product.zoomed", { alt: productImage.alt }) || productImage.alt;
            document.body.classList.add("lightbox-open");
            if (typeof dialog.showModal === "function") dialog.showModal();
            else dialog.setAttribute("open", "");
            closeButton?.focus();
        }

        function close() {
            if (typeof dialog.close === "function" && dialog.open) dialog.close();
            else dialog.removeAttribute("open");
            document.body.classList.remove("lightbox-open");
            openButton.focus();
        }

        openButton.addEventListener("click", open);
        closeButton?.addEventListener("click", close);
        dialog.addEventListener("cancel", (event) => {
            event.preventDefault();
            close();
        });
        dialog.addEventListener("click", (event) => {
            if (event.target === dialog) close();
        });
    }

    function initReveals() {
        const elements = Array.from(document.querySelectorAll(".reveal"));
        if (!elements.length) return;
        // Mark the initial viewport before enabling reveal CSS, so its opacity never starts at zero.
        elements.forEach(element=>{if(element.getBoundingClientRect().top < innerHeight)element.classList.add("is-visible");});
        document.documentElement.classList.add("reveal-enabled");
        if (reducedMotion.matches || !("IntersectionObserver" in window)) {
            elements.forEach((element) => element.classList.add("is-visible"));
            return;
        }
        const observer = scope.observe(new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add("is-visible");
                observer.unobserve(entry.target);
            });
        }, { rootMargin: "0px 0px -8%", threshold: 0.08 }));
        elements.forEach((element) => {
            observer.observe(element);
        });
    }

    listen(document,"init:close-menus",()=>{ closeMenu({restoreFocus:false}); closeHoverMenu({force:true}); });
    menuToggle?.addEventListener("click", () => {
        if (desktopNavigation.matches) {
            if (!hoverMenu?.hidden && hoverMenuPinned) {
                closeHoverMenu({ force: true });
            } else {
                openHoverMenu(null, { pinned: true, returnFocus: menuToggle });
            }
            return;
        }
        if (menu?.hidden) openMenu();
        else closeMenu();
    });
    menuClose?.addEventListener("click", () => closeMenu());
    menuBackdrop?.addEventListener("click", () => closeMenu());
    menu?.addEventListener("keydown", trapMenuFocus);
    headerInner?.addEventListener("focusout", closeHoverMenuAfterFocusLeaves);
    headerInner?.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeHoverMenu({ force: true, restoreFocus: true });
    });
    pageSubNavigation?.addEventListener("focusout", closeHoverMenuAfterFocusLeaves);
    hoverMenu?.addEventListener("focusout", closeHoverMenuAfterFocusLeaves);
    hoverMenu?.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeHoverMenu({ force: true, restoreFocus: true });
    });
    desktopNavLinks.forEach((link) => {
        link.addEventListener("click", () => closeHoverMenu({ force: true, navigation: true }));
    });
    hoverSections.forEach((section) => {
        section.addEventListener("pointerenter", () => {
            setHoveredMenuSection(section.dataset.hoverSection);
        });
    });
    hoverMenu?.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => closeHoverMenu({ force: true, navigation: true }));
    });
    menu?.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => closeMenu({ restoreFocus: false, navigation: true })));
    historyBackButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const fallback = button.dataset.historyFallback || new URL("index.html", siteRootUrl).href;
            let sameOriginReferrer = false;
            try {
                sameOriginReferrer = Boolean(document.referrer)
                    && new URL(document.referrer, document.baseURI).origin === window.location.origin;
            } catch (_error) {
                sameOriginReferrer = false;
            }
            if (sameOriginReferrer && window.history.length > 1) window.history.back();
            else if (window.INIT_PAGE_NAVIGATION) window.INIT_PAGE_NAVIGATION.navigate(fallback);
            else window.location.assign(fallback);
        });
    });
    listen(document,"pointerdown", (event) => {
        if (hoverMenu?.hidden || header?.contains(event.target)) return;
        closeHoverMenu({ force: true });
    });
    listen(window,"scroll", requestScrollUiUpdate, { passive: true });
    listen(window,"resize", () => {
        requestScrollUiUpdate();
        requestReadableTypeFloor();
        requestViewportUpdate();
        revealDetailNavigationLocation();
    }, { passive: true });
    listen(visualViewport,"resize", requestViewportUpdate, { passive: true });
    listen(visualViewport,"scroll", requestViewportUpdate, { passive: true });
    listen(window,"pageshow", requestViewportUpdate);
    if (mobileActionBar && window.ResizeObserver) {
        scope.observe(new ResizeObserver(requestViewportUpdate)).observe(mobileActionBar);
    }
    listen(window,"load", () => {
        enforceReadableTypeFloor();
        revealDetailNavigationLocation();
    }, { once: true });
    document.fonts?.ready.then(() => {
        enforceReadableTypeFloor();
        updateMobileActionViewport();
        revealDetailNavigationLocation();
    });
    listen(document,"init:languagechange", () => {
        requestReadableTypeFloor();
        requestViewportUpdate();
        requestScrollUiUpdate();
        scope.frame(revealDetailNavigationLocation);
    });
    listen(desktopNavigation,"change", handleNavigationViewport);
    document.querySelectorAll("[data-current-year]").forEach((element) => {
        element.textContent = String(new Date().getFullYear());
    });

    handleNavigationViewport();
    setActiveNavigation();
    initProductGallery();
    initLightbox();
    enforceReadableTypeFloor();
    updateMobileActionViewport();
    function finishLayout() {
        initReveals();
        updateScrollUi();
        revealDetailNavigationLocation();
    }
    if (context.navigation) listen(document,"init:site-ready",finishLayout,{once:true});
    else finishLayout();

    return scope.dispose;
    });
}());
