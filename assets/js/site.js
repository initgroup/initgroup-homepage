(function() {
    "use strict";

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
    const desktopHoverNavigation = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 72.01rem)");
    const desktopNavLinks = Array.from(document.querySelectorAll(".desktop-nav [data-nav]"));
    const navigationHoverGuardKey = "init:navigation-hover-guard";
    let menuReturnFocus = null;
    let hoverCloseTimer = null;
    let hoverMenuPinned = false;
    let hoverReturnFocus = null;
    let navigationHoverGuarded = consumeNavigationHoverGuard();
    let activePageSubLink = pageSubLinks.find((link) => link.classList.contains("is-current")) || null;
    let frameRequested = false;
    let readableTypeFrameRequested = false;

    function consumeNavigationHoverGuard() {
        try {
            const guarded = window.sessionStorage.getItem(navigationHoverGuardKey) === "1";
            if (guarded) window.sessionStorage.removeItem(navigationHoverGuardKey);
            return guarded;
        } catch (_error) {
            return false;
        }
    }

    function guardNavigationHoverForNextPage() {
        navigationHoverGuarded = true;
        try {
            window.sessionStorage.setItem(navigationHoverGuardKey, "1");
        } catch (_error) {
            // Navigation still works when storage access is unavailable.
        }
    }

    function releaseNavigationHoverGuard() {
        navigationHoverGuarded = false;
    }

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
        const currentPath = window.location.pathname;
        const localTargets = pageSubLinks.map((link) => {
            const url = new URL(link.href, document.baseURI);
            const target = url.pathname === currentPath && url.hash ? document.getElementById(decodeURIComponent(url.hash.slice(1))) : null;
            return { link, url, target };
        });
        if (!localTargets.some(({ url }) => url.pathname === currentPath)) {
            syncCurrentNavigation(activePageSubLink);
            revealActivePageSubLink(activePageSubLink);
            return;
        }
        let activeLink = localTargets.find(({ url }) => url.pathname === currentPath && !url.hash)?.link || null;
        const threshold = Math.max(
            (pageSubNavigation?.getBoundingClientRect().bottom || 0) + 80,
            window.innerHeight * 0.48
        );
        localTargets.forEach(({ link, target }) => {
            if (target && target.getBoundingClientRect().top <= threshold) activeLink = link;
        });
        if (!activeLink) activeLink = localTargets.find(({ url }) => url.pathname === currentPath)?.link || null;
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
        const isClipped = linkBounds.left < railBounds.left || linkBounds.right > railBounds.right;
        if (isClipped) activeLink.scrollIntoView({ block: "nearest", inline: "center" });
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
        window.requestAnimationFrame(updateScrollUi);
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
        window.requestAnimationFrame(enforceReadableTypeFloor);
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

    function clearHoverCloseTimer() {
        if (!hoverCloseTimer) return;
        window.clearTimeout(hoverCloseTimer);
        hoverCloseTimer = null;
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
            const isCurrent = url.pathname === currentUrl.pathname && url.hash === currentUrl.hash;
            link.classList.toggle("is-current", isCurrent);
            if (isCurrent) link.setAttribute("aria-current", "page");
            else link.removeAttribute("aria-current");
        });
    }

    function setHoveredMenuSection(key) {
        desktopNavLinks.forEach((link) => {
            link.classList.toggle("is-menu-target", link.dataset.nav === key);
            link.setAttribute("aria-expanded", String(
                !hoverMenuPinned && link.dataset.nav === key && !hoverMenu?.hidden
            ));
        });
        hoverSections.forEach((section) => {
            section.classList.toggle("is-hovered", section.dataset.hoverSection === key);
        });
    }

    function openHoverMenu(key, options = {}) {
        if (!hoverMenu || !header || !desktopNavigation.matches) return;
        if (!menu?.hidden) closeMenu({ restoreFocus: false });
        clearHoverCloseTimer();
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
        if (!hoverMenu || (hoverMenuPinned && !options.force)) return;
        clearHoverCloseTimer();
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
        window.requestAnimationFrame(() => focusableElements(menu)[0]?.focus());
    }

    function closeMenu(options = {}) {
        if (!menu || !menuToggle || !menuBackdrop || !header || menu.hidden) return;
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

    function scheduleHoverMenuClose() {
        if (!hoverMenu || hoverMenu.hidden || hoverMenuPinned) return;
        clearHoverCloseTimer();
        hoverCloseTimer = window.setTimeout(() => closeHoverMenu({ force: true }), 320);
    }

    function closeHoverMenuAfterFocusLeaves() {
        window.requestAnimationFrame(() => {
            if (!hoverMenu || hoverMenu.hidden) return;
            const activeElement = document.activeElement;
            if (
                headerInner?.contains(activeElement)
                || pageSubNavigation?.contains(activeElement)
                || hoverMenu.contains(activeElement)
            ) return;
            closeHoverMenu({ force: true });
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
        document.querySelectorAll(`.desktop-nav [data-nav="${page}"], .full-navigation a[href="/${page}/"]`).forEach((link) => {
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
            image.src = tab.dataset.image || image.src;
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
        document.addEventListener("init:languagechange", () => {
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
        document.documentElement.classList.add("reveal-enabled");
        if (reducedMotion.matches || !("IntersectionObserver" in window)) {
            elements.forEach((element) => element.classList.add("is-visible"));
            return;
        }
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add("is-visible");
                observer.unobserve(entry.target);
            });
        }, { rootMargin: "0px 0px -8%", threshold: 0.08 });
        elements.forEach((element) => observer.observe(element));
    }

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
    headerInner?.addEventListener("pointerenter", clearHoverCloseTimer);
    headerInner?.addEventListener("focusout", closeHoverMenuAfterFocusLeaves);
    headerInner?.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeHoverMenu({ force: true, restoreFocus: true });
    });
    header?.addEventListener("pointerleave", () => {
        releaseNavigationHoverGuard();
        scheduleHoverMenuClose();
    });
    pageSubNavigation?.addEventListener("pointerenter", clearHoverCloseTimer);
    pageSubNavigation?.addEventListener("pointerleave", scheduleHoverMenuClose);
    pageSubNavigation?.addEventListener("focusout", closeHoverMenuAfterFocusLeaves);
    hoverMenu?.addEventListener("pointerenter", clearHoverCloseTimer);
    hoverMenu?.addEventListener("pointerleave", scheduleHoverMenuClose);
    hoverMenu?.addEventListener("focusout", closeHoverMenuAfterFocusLeaves);
    hoverMenu?.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeHoverMenu({ force: true, restoreFocus: true });
    });
    desktopNavLinks.forEach((link) => {
        const openLinkedMenu = () => {
            if (!desktopHoverNavigation.matches || navigationHoverGuarded) return;
            openHoverMenu(link.dataset.nav);
        };
        link.addEventListener("pointerenter", openLinkedMenu);
        link.addEventListener("focus", () => {
            if (!desktopNavigation.matches) return;
            openHoverMenu(link.dataset.nav, { returnFocus: link });
        });
        link.addEventListener("click", (event) => {
            const url = new URL(link.href, document.baseURI);
            const isPrimaryPointerNavigation = event.detail > 0
                && event.button === 0
                && !event.ctrlKey
                && !event.metaKey
                && !event.shiftKey
                && !event.altKey;
            if (isPrimaryPointerNavigation && url.origin === window.location.origin) {
                guardNavigationHoverForNextPage();
            }
            closeHoverMenu({ force: true });
        });
    });
    hoverSections.forEach((section) => {
        section.addEventListener("pointerenter", () => {
            clearHoverCloseTimer();
            setHoveredMenuSection(section.dataset.hoverSection);
        });
    });
    hoverMenu?.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => closeHoverMenu({ force: true }));
    });
    menu?.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => closeMenu({ restoreFocus: false })));
    historyBackButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const fallback = button.dataset.historyFallback || "/insights/";
            let sameOriginReferrer = false;
            try {
                sameOriginReferrer = Boolean(document.referrer)
                    && new URL(document.referrer, document.baseURI).origin === window.location.origin;
            } catch (_error) {
                sameOriginReferrer = false;
            }
            if (sameOriginReferrer && window.history.length > 1) window.history.back();
            else window.location.assign(fallback);
        });
    });
    document.addEventListener("pointerdown", (event) => {
        if (hoverMenu?.hidden || header?.contains(event.target)) return;
        closeHoverMenu({ force: true });
    });
    document.addEventListener("pointermove", (event) => {
        if (navigationHoverGuarded && !header?.contains(event.target)) releaseNavigationHoverGuard();
    }, { passive: true });
    window.addEventListener("scroll", requestScrollUiUpdate, { passive: true });
    window.addEventListener("resize", () => {
        requestScrollUiUpdate();
        requestReadableTypeFloor();
        revealDetailNavigationLocation();
    }, { passive: true });
    window.addEventListener("load", () => {
        enforceReadableTypeFloor();
        revealDetailNavigationLocation();
    }, { once: true });
    document.fonts?.ready.then(() => {
        enforceReadableTypeFloor();
        revealDetailNavigationLocation();
    });
    document.addEventListener("init:languagechange", () => {
        requestReadableTypeFloor();
        window.requestAnimationFrame(revealDetailNavigationLocation);
    });
    desktopNavigation.addEventListener?.("change", handleNavigationViewport);
    document.querySelectorAll("[data-current-year]").forEach((element) => {
        element.textContent = String(new Date().getFullYear());
    });

    handleNavigationViewport();
    setActiveNavigation();
    initProductGallery();
    initLightbox();
    initReveals();
    enforceReadableTypeFloor();
    updateScrollUi();
    revealDetailNavigationLocation();
})();
