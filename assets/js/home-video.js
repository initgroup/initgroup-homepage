(function () {
    "use strict";
    window.INIT_PAGE.register("assets/js/home-video.js", function (context = {}) {
    const scope = window.INIT_PAGE.scope();
    const listen = scope.listen;



    const trigger = document.querySelector("[data-promo-open]");
    const dialog = document.querySelector("[data-promo-dialog]");
    if (!trigger || !dialog || typeof dialog.showModal !== "function") return;

    const video = dialog.querySelector("video");
    const error = dialog.querySelector("[data-promo-error]");
    const fallback = dialog.querySelector(".promo-video-fallback");
    const expand = dialog.querySelector("[data-promo-expand]");
    const surface = dialog.querySelector("[data-promo-surface]");
    const retry = dialog.querySelector("[data-promo-retry]");
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
        // Select the relative, versioned source explicitly before requesting playback.
        // load() also clears a failed network/decoder state when the user retries.
        video.setAttribute("src", trigger.getAttribute("href"));
        video.load();
        if (!autoplay) return;
        const playRequest = video.play();
        playRequest?.catch(() => {
            // Policy rejection has no MediaError: still offer a fresh user action.
            if (dialog.open && currentSession === session) error.hidden = false;
        });
    }

    function syncFilmSource() {
        const language = window.INIT_I18N?.getLanguage() || window.INIT_LANGUAGE || "ko";
        const configured = language === "en" ? trigger.dataset.promoSrcEn : trigger.dataset.promoSrcKo;
        const source = window.INIT_ASSETS?.url(configured) || configured;
        if (trigger.getAttribute("href") !== source) trigger.setAttribute("href", source);
        if (fallback.getAttribute("href") !== source) fallback.setAttribute("href", source);
        // Updating the links does not fetch the film until the viewer opens it.
        const selected = video.getAttribute("src");
        if (dialog.open && (!selected || new URL(selected, document.baseURI).href !== trigger.href)) loadFilm(!video.paused);
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

    retry?.addEventListener("click", () => loadFilm(true));
    video.addEventListener("playing", () => { error.hidden = true; });

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
    listen(document,"fullscreenchange", syncLabels);
    listen(document,"init:languagechange", syncLanguage);
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
    listen(document,"visibilitychange", () => {
        if (document.hidden) video.pause();
    });
    listen(window,"pagehide", () => {
        if (dialog.open) dialog.close();
        stopVideo();
    });

    return () => { if (dialog.open) dialog.close(); stopVideo(); scope.dispose(); };
    });
}());
