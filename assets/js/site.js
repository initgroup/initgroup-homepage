(function() {
    "use strict";

    const header = document.querySelector("[data-site-header]");
    const progress = document.querySelector("[data-scroll-progress]");
    const menu = document.querySelector("[data-mobile-menu]");
    const menuToggle = document.querySelector("[data-menu-toggle]");
    const menuClose = document.querySelector("[data-menu-close]");
    const menuBackdrop = document.querySelector("[data-menu-backdrop]");
    const headerInner = document.querySelector(".header-inner");
    const main = document.querySelector("main");
    const footer = document.querySelector(".site-footer");
    const mobileActionBar = document.querySelector(".mobile-action-bar");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktopNavigation = window.matchMedia("(min-width: 72.01rem)");
    let menuReturnFocus = null;
    let frameRequested = false;

    function updateScrollUi() {
        frameRequested = false;
        const scrollTop = Math.max(window.scrollY, document.documentElement.scrollTop);
        const scrollRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        header?.classList.toggle("is-scrolled", scrollTop > 12);
        if (progress) progress.style.transform = `scaleX(${Math.min(1, scrollTop / scrollRange)})`;
    }

    function requestScrollUiUpdate() {
        if (frameRequested) return;
        frameRequested = true;
        window.requestAnimationFrame(updateScrollUi);
    }

    function focusableElements(container) {
        if (!container) return [];
        return Array.from(container.querySelectorAll(
            'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )).filter((element) => !element.hidden && element.getClientRects().length > 0);
    }

    function setPageInert(value) {
        if (headerInner) headerInner.inert = value;
        if (main) main.inert = value;
        if (footer) footer.inert = value;
        if (mobileActionBar) mobileActionBar.inert = value;
    }

    function openMenu() {
        if (!menu || !menuToggle || !menuBackdrop || !header) return;
        menuReturnFocus = document.activeElement;
        menu.hidden = false;
        menuBackdrop.hidden = false;
        menuToggle.setAttribute("aria-expanded", "true");
        menuToggle.setAttribute("aria-label", "메뉴 닫기");
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
        menuToggle.setAttribute("aria-label", "메뉴 열기");
        document.body.classList.remove("menu-open");
        header.classList.remove("is-menu-open");
        setPageInert(false);
        if (options.restoreFocus !== false) {
            const target = menuReturnFocus instanceof HTMLElement ? menuReturnFocus : menuToggle;
            target.focus();
        }
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
        document.querySelectorAll(`.desktop-nav [data-nav="${page}"], .mobile-navigation a[href="/${page}/"]`).forEach((link) => {
            link.setAttribute("aria-current", "page");
        });
    }

    function handleNavigationViewport(event) {
        if (event.matches) closeMenu({ restoreFocus: false });
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
            dialogImage.alt = `확대된 ${productImage.alt}`;
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
        if (menu?.hidden) openMenu();
        else closeMenu();
    });
    menuClose?.addEventListener("click", () => closeMenu());
    menuBackdrop?.addEventListener("click", () => closeMenu());
    menu?.addEventListener("keydown", trapMenuFocus);
    menu?.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => closeMenu({ restoreFocus: false })));
    window.addEventListener("scroll", requestScrollUiUpdate, { passive: true });
    window.addEventListener("resize", requestScrollUiUpdate, { passive: true });
    desktopNavigation.addEventListener?.("change", handleNavigationViewport);
    document.querySelectorAll("[data-current-year]").forEach((element) => {
        element.textContent = String(new Date().getFullYear());
    });

    setActiveNavigation();
    initProductGallery();
    initLightbox();
    initReveals();
    updateScrollUi();
})();
