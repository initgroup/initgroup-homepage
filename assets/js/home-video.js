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
    let session = 0;

    function syncLabels() {
        if (!window.INIT_I18N) return;
        expand.querySelector("[data-promo-expand-label]").textContent = window.INIT_I18N.t(
            document.fullscreenElement ? "home.promo.fullscreen.exit" : "home.promo.fullscreen.enter"
        );
    }

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
    });
    window.addEventListener("pagehide", () => {
        if (dialog.open) dialog.close();
        stopVideo();
    });
}());
