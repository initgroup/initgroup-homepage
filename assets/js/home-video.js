(function () {
    "use strict";

    const trigger = document.querySelector("[data-promo-open]");
    const dialog = document.querySelector("[data-promo-dialog]");
    if (!trigger || !dialog || typeof dialog.showModal !== "function") return;

    const video = dialog.querySelector("video");
    const error = dialog.querySelector("[data-promo-error]");
    const fallback = dialog.querySelector(".promo-video-fallback");
    const expand = dialog.querySelector("[data-promo-expand]");
    const surface = dialog.querySelector("[data-promo-surface]");
    const promo = trigger.closest(".hero-promo");
    const preview = promo.querySelector("[data-promo-preview]");
    const motion = promo.querySelector("[data-promo-motion]");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = navigator.connection;
    let session = 0;
    let previewSession = 0;
    let inView = false;
    let pageLoaded = document.readyState === "complete";
    let manuallyStarted = false;
    let userPaused = false;
    let previewFailed = false;

    function syncLabels() {
        if (!window.INIT_I18N) return;
        const playing = promo.hasAttribute("data-preview-playing");
        const label = window.INIT_I18N.t(playing ? "home.promo.preview.pause" : "home.promo.preview.play");
        motion.setAttribute("aria-label", label);
        motion.title = label;
        expand.querySelector("[data-promo-expand-label]").textContent = window.INIT_I18N.t(
            document.fullscreenElement ? "home.promo.fullscreen.exit" : "home.promo.fullscreen.enter"
        );
    }

    function previewAllowed() {
        const constrained = connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || "");
        return pageLoaded && inView && !document.hidden && !dialog.open && !userPaused && !previewFailed &&
            (manuallyStarted || (!reducedMotion.matches && !constrained));
    }

    function syncPreview() {
        const currentSession = ++previewSession;
        if (!previewAllowed()) {
            preview.pause();
            return;
        }
        if (!preview.hasAttribute("src")) preview.src = preview.dataset.src;
        preview.muted = true;
        preview.play().catch(() => {
            if (currentSession !== previewSession) return;
            promo.removeAttribute("data-preview-playing");
            syncLabels();
        });
    }

    motion.hidden = false;
    motion.addEventListener("click", () => {
        if (!preview.paused) {
            userPaused = true;
        } else {
            userPaused = false;
            manuallyStarted = true;
        }
        syncPreview();
    });
    preview.addEventListener("playing", () => {
        // A play promise can settle after the modal or another tab has opened.
        if (!previewAllowed()) { preview.pause(); return; }
        promo.setAttribute("data-preview-ready", "");
        promo.setAttribute("data-preview-playing", "");
        syncLabels();
    });
    preview.addEventListener("pause", () => {
        promo.removeAttribute("data-preview-playing");
        syncLabels();
    });
    preview.addEventListener("error", () => {
        previewFailed = true;
        promo.removeAttribute("data-preview-ready");
        promo.removeAttribute("data-preview-playing");
        motion.hidden = true;
        // The still image and full-film link remain usable if the preview fails.
    });
    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(([entry]) => {
            inView = entry.isIntersecting && entry.intersectionRatio >= 0.2;
            syncPreview();
        }, { threshold: [0, 0.2] });
        observer.observe(promo);
    }
    // Without an observer the poster remains available; an explicit preview click can play it.
    motion.addEventListener("click", () => {
        if (!("IntersectionObserver" in window)) { inView = true; syncPreview(); }
    });
    reducedMotion.addEventListener("change", () => {
        manuallyStarted = false;
        syncPreview();
    });
    connection?.addEventListener("change", syncPreview);
    window.addEventListener("load", () => { pageLoaded = true; syncPreview(); }, { once: true });

    function stopVideo() {
        session += 1;
        video.pause();
        video.removeAttribute("src");
        video.load();
        document.body.classList.remove("promo-video-open");
    }

    function loadFilm(autoplay) {
        const currentSession = ++session;
        error.hidden = true;
        video.pause();
        video.src = trigger.href;
        if (!autoplay) return;
        video.play().catch(() => {
            if (dialog.open && currentSession === session && video.error) error.hidden = false;
        });
    }

    function syncFilmSource() {
        const language = window.INIT_I18N?.getLanguage() || window.INIT_LANGUAGE || "ko";
        const source = language === "en" ? trigger.dataset.promoSrcEn : trigger.dataset.promoSrcKo;
        trigger.setAttribute("href", source);
        fallback.setAttribute("href", source);
        // Updating the links does not fetch the film until the viewer opens it.
        if (dialog.open && video.src !== trigger.href) loadFilm(!video.paused);
    }

    function syncLanguage() {
        syncFilmSource();
        syncLabels();
    }

    trigger.addEventListener("click", (event) => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        if (dialog.open) return;
        syncFilmSource();
        dialog.showModal();
        document.body.classList.add("promo-video-open");
        syncPreview();
        // Load the original film, with sound and controls, only on this explicit action.
        loadFilm(true);
    });

    async function closeDialog() {
        if (document.fullscreenElement && dialog.contains(document.fullscreenElement)) {
            try { await document.exitFullscreen(); } catch (_) { /* Closing still stops playback. */ }
        }
        dialog.close();
    }

    expand.hidden = !(surface.requestFullscreen && document.fullscreenEnabled) && !video.webkitEnterFullscreen;
    expand.addEventListener("click", async () => {
        try {
            if (document.fullscreenElement) await document.exitFullscreen();
            else if (surface.requestFullscreen && document.fullscreenEnabled) await surface.requestFullscreen();
            else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
        } catch (_) {
            // Native video controls remain available when fullscreen is denied.
        }
        syncLabels();
    });
    document.addEventListener("fullscreenchange", syncLabels);
    document.addEventListener("init:languagechange", syncLanguage);
    window.INIT_I18N?.ready.then(syncLanguage);
    syncFilmSource();
    dialog.querySelector("[data-promo-close]").addEventListener("click", closeDialog);
    dialog.addEventListener("close", () => {
        stopVideo();
        trigger.focus({ preventScroll: true });
        syncPreview();
    });
    let pointerStartedOutside = false;
    function outside(event) {
        const bounds = dialog.getBoundingClientRect();
        return event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right ||
            event.clientY < bounds.top || event.clientY > bounds.bottom);
    }
    dialog.addEventListener("pointerdown", (event) => { pointerStartedOutside = outside(event); });
    dialog.addEventListener("click", (event) => {
        if (pointerStartedOutside && outside(event)) closeDialog();
        pointerStartedOutside = false;
    });
    video.addEventListener("error", () => {
        if (dialog.open && video.hasAttribute("src")) error.hidden = false;
    });
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) video.pause();
        syncPreview();
    });
    window.addEventListener("pagehide", () => {
        inView = false;
        preview.pause();
        if (dialog.open) dialog.close();
        stopVideo();
    });
}());
