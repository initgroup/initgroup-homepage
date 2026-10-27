(function () {
    "use strict";
    const engine=window.INIT_SITE_ENGINE;
    if(!engine || window.INIT_PAGE_NAVIGATION)return;
    let activeUrl=new URL(location.href);
    let index=0;
    let pending=null;
    let refreshController=null;
    let refreshPromise=null;
    let refreshTimer=0;
    const refreshInterval=60000;
    let scrollFrame=0;
    const stateKey="initStaticPage";
    function position(){return {x:scrollX,y:scrollY};}
    function stateAt(file,scroll,currentIndex) {
        return {...history.state,[stateKey]:{file,scroll,index:currentIndex}};
    }
    function busy(value) {
        if(value)document.documentElement.dataset.navigationPending="true";
        else delete document.documentElement.dataset.navigationPending;
        const main=document.querySelector("main");
        if(value)main?.setAttribute("aria-busy","true");
        else main?.removeAttribute("aria-busy");
    }
    function status(message="") {
        const node=document.querySelector("[data-page-status]");
        if(node)node.textContent=message;
    }
    function rememberScroll() {
        if(pending || location.href!==activeUrl.href)return;
        history.replaceState(stateAt(engine.file,position(),index),"",location.href);
    }
    function restorePosition(url,scroll) {
        if(url.hash) {
            let target;
            try {target=document.getElementById(decodeURIComponent(url.hash.slice(1)));}catch(_){}
            target?.scrollIntoView({behavior:"instant",block:"start"});
        } else window.scrollTo({top:scroll?.y || 0,left:scroll?.x || 0,behavior:"instant"});
    }
    async function navigate(value,options={}) {
        const url=new URL(value,activeUrl);
        const file=engine.pageFor(url);
        if(file && !url.pathname.endsWith("/") && !url.pathname.split("/").pop().includes("."))url.pathname+="/";
        if(!file){location.assign(url.href);return false;}
        if(pending?.url===url.href && pending.pop===!!options.pop)return pending.promise;
        refreshController?.abort();
        const previous=pending;
        previous?.controller.abort();
        previous?.prepared?.discard?.();
        const task={controller:new AbortController(),prepared:null,pop:!!options.pop,url:url.href};
        pending=task;
        busy(true);status(window.INIT_I18N.t("ui.page.loading"));
        const timeout=setTimeout(()=>task.controller.abort(new Error("Page loading timed out")),12000);
        const promise=(async()=>{
            try {
                const prepared=await engine.prepare(url,task.controller.signal);
                task.prepared=prepared;
                if(pending!==task || task.controller.signal.aborted){prepared.discard?.();return false;}
                if(prepared.reload) {
                    if(options.replace && url.href===location.href) {
                        history.replaceState(stateAt(engine.file,position(),index),"",activeUrl.href);
                        location.reload();
                    } else location.assign(url.href);
                    return false;
                }
                const outgoing=position();
                await engine.activate(prepared,()=>{
                    if(options.pop) {
                        index=options.state?.index ?? index;
                    } else if(!options.replace) {
                        history.replaceState(stateAt(engine.file,outgoing,index),"",activeUrl.href);
                        index++;
                        history.pushState(stateAt(file,{x:0,y:0},index),"",url.href);
                    }
                    activeUrl=new URL(url);
                },options.state?.scroll,task.controller.signal);
                if(pending===task) {
                    pending=null;
                    busy(false);status();
                    history.replaceState(stateAt(engine.file,position(),index),"",activeUrl.href);
                }
                return true;
            } catch(error) {
                task.prepared?.discard?.();
                if(pending!==task)return false;
                pending=null;busy(false);
                if(options.pop)history.replaceState(stateAt(engine.file,position(),index),"",activeUrl.href);
                if(error.name!=="AbortError" || task.controller.signal.reason?.message==="Page loading timed out") {
                    status(window.INIT_I18N.t("ui.page.loadError"));
                    console.warn("Page preparation failed; current page retained.",error.message);
                }
                return false;
            } finally {clearTimeout(timeout);}
        })();
        task.promise=promise;
        window.INIT_SITE_READY=promise;
        return promise;
    }
    function localNavigation(url) {
        pending?.controller.abort();pending?.prepared?.discard?.();pending=null;busy(false);status();
        rememberScroll();
        if(url.href!==activeUrl.href) {
            index++;
            history.pushState(stateAt(engine.file,{x:0,y:0},index),"",url.href);
        }
        activeUrl=url;
        document.dispatchEvent(new CustomEvent("init:close-menus"));
        let target=document.querySelector("main");
        if(url.hash) {
            try {target=document.getElementById(decodeURIComponent(url.hash.slice(1))) || target;}catch(_){}
        }
        const behavior=matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth";
        if(url.hash)target?.scrollIntoView({behavior,block:"start"});
        else window.scrollTo({top:0,left:0,behavior});
        window.INIT_PAGE.focus(target);
        window.INIT_SITE_READY=Promise.resolve(true);
        refreshCurrent();
    }
    function refreshCurrent() {
        if(pending || document.hidden)return;
        if(refreshPromise && !refreshController?.signal.aborted)return refreshPromise;
        const controller=new AbortController();
        refreshController=controller;
        const before=activeUrl.href;
        const timeout=setTimeout(()=>controller.abort(),4000);
        const promise=(async()=>{
            try {
                const changed=await engine.hasUpdate(controller.signal);
                const interacting=[...document.querySelectorAll('dialog[open], [role="dialog"]:not([hidden]), [data-mobile-menu]:not([hidden]), [data-hover-menu]:not([hidden])')].some(node=>node.getClientRects().length)
                    || document.activeElement?.matches('input, textarea, select, [contenteditable="true"]')
                    || [...document.querySelectorAll('video')].some(video=>!video.paused);
                if(changed && !interacting && !pending && !document.hidden && activeUrl.href===before && !controller.signal.aborted) {
                    await navigate(before,{replace:true,state:{scroll:position()}});
                }
            } catch(_) {
                // Offline tabs keep their cached page; the next check retries.
            } finally {
                clearTimeout(timeout);
                if(refreshController===controller)refreshPromise=null;
            }
        })();
        refreshPromise=promise;
        return promise;
    }
    function scheduleRefresh() {
        clearTimeout(refreshTimer);
        if(!document.hidden)refreshTimer=setTimeout(()=>{
            Promise.resolve(refreshCurrent()).finally(scheduleRefresh);
        },refreshInterval);
    }
    window.INIT_PAGE_NAVIGATION=Object.freeze({
        navigate,
        refresh:refreshCurrent,
        get pending(){return !!pending;}
    });
    window.INIT_SITE_READY.then(()=>{
        history.scrollRestoration="manual";
        const restored=history.state?.[stateKey];
        index=restored?.index || 0;
        if(restored?.file===engine.file) {
            window.scrollTo({top:restored.scroll?.y || 0,left:restored.scroll?.x || 0,behavior:"instant"});
        }
        history.replaceState(stateAt(engine.file,position(),index),"",activeUrl.href);
        document.addEventListener("click",event=>{
            if(event.defaultPrevented || event.button!==0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey)return;
            const link=event.target.closest?.("a[href]");
            if(!link || link.hasAttribute("download") || (link.target && link.target!=="_self"))return;
            const url=new URL(link.getAttribute("href"),activeUrl);
            const file=engine.pageFor(url);
            if(!file)return;
            event.preventDefault();
            event.stopImmediatePropagation();
            if(file===engine.file && url.search===activeUrl.search)localNavigation(url);
            else navigate(url);
        });
        window.addEventListener("popstate",event=>{
            const url=new URL(location.href);
            if(engine.pageFor(url)===engine.file && url.search===activeUrl.search) {
                pending?.controller.abort();pending?.prepared?.discard?.();pending=null;busy(false);
                activeUrl=url;
                index=event.state?.[stateKey]?.index ?? index;
                restorePosition(url,event.state?.[stateKey]?.scroll);
                window.INIT_SITE_READY=Promise.resolve(true);
                document.dispatchEvent(new CustomEvent("init:close-menus"));
                refreshCurrent();
                return;
            }
            navigate(url,{pop:true,state:event.state?.[stateKey]});
        });
        window.addEventListener("hashchange",()=>{
            if(!pending && engine.pageFor(new URL(location.href))===engine.file)activeUrl=new URL(location.href);
        });
        window.addEventListener("pageshow",event=>{
            if(event.persisted)refreshCurrent();
            scheduleRefresh();
        });
        document.addEventListener("visibilitychange",()=>{
            if(!document.hidden)refreshCurrent();
            else refreshController?.abort();
            scheduleRefresh();
        });
        window.addEventListener("online",()=>{refreshCurrent();scheduleRefresh();});
        window.addEventListener("pagehide",()=>{clearTimeout(refreshTimer);refreshController?.abort();});
        scheduleRefresh();
        window.addEventListener("scroll",()=>{
            if(scrollFrame)return;
            scrollFrame=requestAnimationFrame(()=>{scrollFrame=0;rememberScroll();});
        },{passive:true});
        window.addEventListener("keydown",event=>{
            if(event.key!=="Escape" || !pending)return;
            const cancelled=pending;
            cancelled.controller.abort();cancelled.prepared?.discard?.();pending=null;busy(false);status();
            if(cancelled.pop)history.replaceState(stateAt(engine.file,position(),index),"",activeUrl.href);
            window.INIT_SITE_READY=Promise.resolve(true);
        },true);
    });
}());
