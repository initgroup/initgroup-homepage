const fs = require('fs');
const os = require('os');
const path = require('path');

const playwrightModule = process.env.PLAYWRIGHT_MODULE || 'D:/work/Playwright/node_modules/playwright';
const { chromium } = require(playwrightModule);

const baseUrl = process.env.VISUAL_AUDIT_URL || 'http://127.0.0.1:8200/';
const outputDir = process.env.VISUAL_AUDIT_OUTPUT || path.join(os.tmpdir(), 'initgroup-homepage-visual-audit');
const viewports = [
    { name: 'desktop-1920', width: 1920, height: 1080 },
    { name: 'desktop-1440', width: 1440, height: 1000 },
    { name: 'tablet-1024', width: 1024, height: 1366 },
    { name: 'tablet-768', width: 768, height: 1024 },
    { name: 'mobile-430', width: 430, height: 932 },
    { name: 'mobile-390', width: 390, height: 844 },
    { name: 'mobile-360', width: 360, height: 800 }
];
const siteRoutes = [
    ['home', '/'],
    ['company', '/company/'],
    ['services', '/services/'],
    ['solutions', '/solutions/'],
    ['data-editing-system', '/solutions/data-editing-system/'],
    ['inbups', '/solutions/inbups/'],
    ['in-surveyone', '/solutions/in-surveyone/'],
    ['projects', '/projects/'],
    ['insights', '/insights/'],
    ['data-quality-rules', '/insights/data-quality-rules/'],
    ['human-in-the-loop', '/insights/human-in-the-loop/'],
    ['reproducible-analysis', '/insights/reproducible-analysis/'],
    ['contact', '/contact/'],
    ['careers', '/careers/'],
    ['privacy', '/privacy/'],
    ['not-found', '/404.html']
];
const siteViewports = [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'mobile', width: 390, height: 844 }
];

function intersection(a, b) {
    const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
    const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    return { width, height, area: Math.round(width * height) };
}

(async () => {
    fs.mkdirSync(outputDir, { recursive: true });
    const browser = await chromium.launch({ headless: true });
    const results = [];

    for (const viewport of viewports) {
        const context = await browser.newContext({
            viewport: { width: viewport.width, height: viewport.height },
            deviceScaleFactor: 1,
            reducedMotion: 'reduce'
        });
        const page = await context.newPage();
        const consoleErrors = [];
        const requestFailures = [];
        page.on('console', (message) => {
            if (message.type() === 'error') consoleErrors.push(message.text());
        });
        page.on('requestfailed', (request) => requestFailures.push(`${request.method()} ${request.url()}`));

        await page.goto(baseUrl, { waitUntil: 'networkidle' });
        await page.locator('img[loading="lazy"]').evaluateAll((images) => images.forEach((image) => { image.loading = 'eager'; }));
        await page.waitForLoadState('networkidle');
        await page.evaluate(() => window.scrollTo(0, 0));
        const screenshot = path.join(outputDir, `${viewport.name}.png`);
        await page.screenshot({ path: screenshot, fullPage: true });
        const focusScreenshots = {};
        if (viewport.name === 'desktop-1440') {
            await page.locator('.desktop-nav [data-nav="services"]').hover();
            await page.waitForFunction(() => !document.querySelector('[data-hover-menu]').hidden);
            await page.waitForFunction(() => {
                const hoverLinkCount = document.querySelectorAll('[data-hover-section] li a').length;
                const fullMenuLinkCount = document.querySelectorAll('[data-menu-section] li a').length;
                return hoverLinkCount > 0 && hoverLinkCount === fullMenuLinkCount;
            });
            await page.locator('[data-hover-section="projects"]').hover();
            await page.waitForTimeout(400);
            await page.waitForFunction(() => {
                const menu = document.querySelector('[data-hover-menu]');
                const section = document.querySelector('[data-hover-section="projects"]');
                return !menu.hidden && section.classList.contains('is-hovered');
            });
            await page.locator('[data-hover-section="services"] a[href="/services/#quality"]').hover();
            const hoverMenuScreenshot = path.join(outputDir, `${viewport.name}-hover-menu.png`);
            await page.screenshot({ path: hoverMenuScreenshot, fullPage: false });
            focusScreenshots.hoverMenu = hoverMenuScreenshot;
            await page.locator('[data-hover-section="services"] a[href="/services/#quality"]').click();
            await page.waitForURL('**/services/#quality');
            await page.waitForLoadState('networkidle');
            await page.waitForFunction(() => document.querySelector('[data-hover-menu]').hidden);
            await page.goto(baseUrl, { waitUntil: 'networkidle' });
            await page.mouse.move(10, viewport.height - 10);
            await page.waitForFunction(() => document.querySelector('[data-hover-menu]').hidden);
            await page.locator('[data-menu-toggle]').click();
            await page.waitForFunction(() => {
                const menu = document.querySelector('[data-hover-menu]');
                return !menu.hidden && document.querySelector('[data-site-header]').classList.contains('is-menu-pinned');
            });
            await page.waitForTimeout(300);
            const menuScreenshot = path.join(outputDir, `${viewport.name}-menu.png`);
            await page.screenshot({ path: menuScreenshot, fullPage: false });
            focusScreenshots.menu = menuScreenshot;
            await page.locator('[data-menu-toggle]').click();
            await page.waitForFunction(() => document.querySelector('[data-hover-menu]').hidden);
        }
        if (viewport.name === 'mobile-390') {
            await page.locator('[data-menu-toggle]').click();
            await page.waitForFunction(() => !document.querySelector('[data-mobile-menu]').hidden);
            await page.waitForFunction(() => {
                const sections = [...document.querySelectorAll('[data-menu-section]')];
                return sections.length > 0 && sections.every((section) => Number.parseFloat(getComputedStyle(section).opacity) > 0.9);
            });
            const menuScreenshot = path.join(outputDir, `${viewport.name}-menu.png`);
            await page.screenshot({ path: menuScreenshot, fullPage: false });
            focusScreenshots.menu = menuScreenshot;
            await page.locator('[data-menu-close]').click();
        }
        if (viewport.name === 'desktop-1440' || viewport.name === 'mobile-390') {
            for (const [name, selector] of Object.entries({
                hero: '.summary-hero',
                company: '.home-company-strip',
                capabilities: '.capability-summary',
                solutions: '.solution-summary',
                experience: '.experience-summary',
                insights: '.insight-summary'
            })) {
                const target = page.locator(selector);
                const targetScreenshot = path.join(outputDir, `${viewport.name}-${name}.png`);
                await target.screenshot({ path: targetScreenshot });
                focusScreenshots[name] = targetScreenshot;
            }
            await page.locator('[data-language="en"]').click();
            await page.waitForFunction(() => document.documentElement.lang === 'en');
            const englishScreenshot = path.join(outputDir, `${viewport.name}-english.png`);
            await page.screenshot({ path: englishScreenshot, fullPage: true });
            focusScreenshots.english = englishScreenshot;
            await page.locator('[data-language="ko"]').click();
            await page.waitForFunction(() => document.documentElement.lang === 'ko');
        }

        const metrics = await page.evaluate(() => {
            const rect = (selector) => {
                const element = document.querySelector(selector);
                if (!element) return null;
                const value = element.getBoundingClientRect();
                return {
                    left: Math.round(value.left),
                    top: Math.round(value.top),
                    right: Math.round(value.right),
                    bottom: Math.round(value.bottom),
                    width: Math.round(value.width),
                    height: Math.round(value.height)
                };
            };
            const overflow = [...document.querySelectorAll('body *')]
                .map((element) => {
                    const value = element.getBoundingClientRect();
                    return { element, value };
                })
                .filter(({ value }) => value.width > 0 && (value.left < -1 || value.right > document.documentElement.clientWidth + 1))
                .slice(0, 12)
                .map(({ element, value }) => ({
                    tag: element.tagName.toLowerCase(),
                    className: String(element.className || '').slice(0, 100),
                    left: Math.round(value.left),
                    right: Math.round(value.right)
                }));
            return {
                title: document.title,
                viewportWidth: document.documentElement.clientWidth,
                documentWidth: document.documentElement.scrollWidth,
                documentHeight: document.documentElement.scrollHeight,
                bodyOverflowX: getComputedStyle(document.body).overflowX,
                overflow,
                heroFrame: rect('.hero-product-frame'),
                heroWorkflow: rect('.hero-workflow'),
                floatTop: rect('.evidence-float-top'),
                floatBottom: rect('.evidence-float-bottom'),
                decisionGrid: rect('.decision-steps'),
                decisionCards: [...document.querySelectorAll('.decision-steps > li')].map((element) => {
                    const value = element.getBoundingClientRect();
                    return { width: Math.round(value.width), height: Math.round(value.height) };
                }),
                sections: [...document.querySelectorAll('main > section')].map((section) => ({
                    className: section.className,
                    height: Math.round(section.getBoundingClientRect().height)
                }))
            };
        });

        metrics.floatTopFrameOverlap = metrics.floatTop && metrics.heroFrame ? intersection(metrics.floatTop, metrics.heroFrame) : null;
        metrics.floatBottomWorkflowOverlap = metrics.floatBottom && metrics.heroWorkflow ? intersection(metrics.floatBottom, metrics.heroWorkflow) : null;
        results.push({ viewport, screenshot, focusScreenshots, consoleErrors, requestFailures, metrics });
        await context.close();
    }

    const siteResults = [];
    const siteOutputDir = path.join(outputDir, 'site');
    fs.mkdirSync(siteOutputDir, { recursive: true });
    for (const viewport of siteViewports) {
        for (const [name, route] of siteRoutes) {
            const context = await browser.newContext({
                viewport: { width: viewport.width, height: viewport.height },
                deviceScaleFactor: 1,
                reducedMotion: 'reduce'
            });
            const page = await context.newPage();
            const consoleErrors = [];
            const requestFailures = [];
            page.on('console', (message) => {
                if (message.type() === 'error') consoleErrors.push(message.text());
            });
            page.on('requestfailed', (request) => requestFailures.push(`${request.method()} ${request.url()}`));
            const url = new URL(route, baseUrl).toString();
            const response = await page.goto(url, { waitUntil: 'networkidle' });
            await page.locator('img[loading="lazy"]').evaluateAll((images) => images.forEach((image) => { image.loading = 'eager'; }));
            await page.waitForLoadState('networkidle');
            await page.evaluate(() => window.scrollTo(0, 0));
            const screenshot = path.join(siteOutputDir, `${viewport.name}-${name}.png`);
            await page.screenshot({ path: screenshot, fullPage: true });
            let focusScreenshot = null;
            if (name === 'contact') {
                focusScreenshot = path.join(siteOutputDir, `${viewport.name}-${name}-cards.png`);
                await page.locator('.corp-contact-card-grid').screenshot({ path: focusScreenshot });
            }
            const metrics = await page.evaluate(() => ({
                title: document.title,
                lang: document.documentElement.lang,
                viewportWidth: document.documentElement.clientWidth,
                documentWidth: document.documentElement.scrollWidth,
                documentHeight: document.documentElement.scrollHeight,
                h1: document.querySelector('h1')?.innerText || '',
                mainSections: document.querySelectorAll('main > section').length,
                persistentSubmenu: Boolean(document.querySelector('[data-page-sub-navigation]')),
                navigationMode: document.querySelector('[data-page-sub-navigation]')?.dataset.navigationMode || '',
                navigationLinkModes: [...new Set(
                    [...document.querySelectorAll('[data-page-sub-navigation] [data-link-mode]')]
                        .map((link) => link.dataset.linkMode)
                )],
                activeTopNavigation: document.querySelector('.desktop-nav [aria-current="page"]')?.textContent.trim() || '',
                hoverMenuInitiallyHidden: document.querySelector('[data-hover-menu]')?.hidden ?? true,
                fullMenuInitiallyHidden: document.querySelector('[data-mobile-menu]')?.hidden ?? true,
                largestText: [...document.querySelectorAll('body *')]
                    .filter((element) => {
                        if (element.closest('[aria-hidden="true"]')) return false;
                        if (!element.getClientRects().length) return false;
                        return [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
                    })
                    .map((element) => ({
                        tag: element.tagName.toLowerCase(),
                        className: String(element.className || '').slice(0, 100),
                        text: element.textContent.trim().replace(/\s+/g, ' ').slice(0, 80),
                        fontSize: Number.parseFloat(getComputedStyle(element).fontSize)
                    }))
                    .sort((left, right) => right.fontSize - left.fontSize)
                    .slice(0, 10),
                contactCards: [...document.querySelectorAll('.corp-contact-card-grid article')].map((card) => {
                    const index = card.querySelector(':scope > span');
                    const label = card.querySelector(':scope > small');
                    const heading = card.querySelector(':scope > h3');
                    const rect = (element) => {
                        const value = element.getBoundingClientRect();
                        return { top: Math.round(value.top * 10) / 10, left: Math.round(value.left * 10) / 10 };
                    };
                    return {
                        index: index?.textContent.trim() || '',
                        label: label?.textContent.trim() || '',
                        indexPosition: index ? rect(index) : null,
                        labelPosition: label ? rect(label) : null,
                        headingPosition: heading ? rect(heading) : null,
                        indexFontSize: index ? getComputedStyle(index).fontSize : '',
                        labelFontSize: label ? getComputedStyle(label).fontSize : '',
                        fontFamily: label ? getComputedStyle(label).fontFamily : ''
                    };
                }),
                images: [...document.images].map((image) => ({
                    src: image.currentSrc || image.src,
                    complete: image.complete,
                    naturalWidth: image.naturalWidth
                })).filter((image) => !image.complete || image.naturalWidth === 0),
                smallText: [...document.querySelectorAll('body *')]
                    .filter((element) => {
                        if (element.closest('[aria-hidden="true"]')) return false;
                        if (!element.getClientRects().length) return false;
                        return [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
                    })
                    .map((element) => ({
                        tag: element.tagName.toLowerCase(),
                        className: String(element.className || '').slice(0, 100),
                        text: element.textContent.trim().replace(/\s+/g, ' ').slice(0, 80),
                        fontSize: Number.parseFloat(getComputedStyle(element).fontSize)
                    }))
                    .filter((item) => item.fontSize < 16)
                    .slice(0, 40),
                contrastFailures: (() => {
                    const parseColor = (value) => {
                        const channels = String(value).match(/[\d.]+/g)?.map(Number) || [];
                        if (channels.length < 3) return null;
                        return [channels[0], channels[1], channels[2], channels[3] ?? 1];
                    };
                    const composite = (foreground, background) => {
                        const alpha = foreground[3] + background[3] * (1 - foreground[3]);
                        if (alpha === 0) return [0, 0, 0, 0];
                        return [
                            (foreground[0] * foreground[3] + background[0] * background[3] * (1 - foreground[3])) / alpha,
                            (foreground[1] * foreground[3] + background[1] * background[3] * (1 - foreground[3])) / alpha,
                            (foreground[2] * foreground[3] + background[2] * background[3] * (1 - foreground[3])) / alpha,
                            alpha
                        ];
                    };
                    const luminance = (color) => {
                        const channels = color.slice(0, 3).map((channel) => {
                            const value = channel / 255;
                            return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
                        });
                        return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
                    };
                    const contrast = (foreground, background) => {
                        const foregroundLuminance = luminance(foreground);
                        const backgroundLuminance = luminance(background);
                        return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05)
                            / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
                    };
                    const resolveBackground = (element) => {
                        const translucentLayers = [];
                        let current = element;
                        let hasImage = false;
                        while (current instanceof Element) {
                            const style = getComputedStyle(current);
                            if (style.backgroundImage !== 'none') hasImage = true;
                            if (getComputedStyle(current, '::before').backgroundImage !== 'none'
                                || getComputedStyle(current, '::after').backgroundImage !== 'none') {
                                hasImage = true;
                            }
                            const color = parseColor(style.backgroundColor);
                            if (color && color[3] > 0) {
                                if (color[3] >= 0.999) {
                                    let resolved = color;
                                    for (const layer of translucentLayers.reverse()) resolved = composite(layer, resolved);
                                    return { color: resolved, hasImage };
                                }
                                translucentLayers.push(color);
                            }
                            current = current.parentElement;
                        }
                        let resolved = [255, 255, 255, 1];
                        for (const layer of translucentLayers.reverse()) resolved = composite(layer, resolved);
                        return { color: resolved, hasImage };
                    };
                    const identify = (element) => {
                        if (element.id) return `#${element.id}`;
                        const classes = [...element.classList].slice(0, 3).join('.');
                        return `${element.tagName.toLowerCase()}${classes ? `.${classes}` : ''}`;
                    };

                    return [...document.querySelectorAll('body *')]
                        .filter((element) => {
                            if (element.closest('[aria-hidden="true"]')) return false;
                            if (!element.getClientRects().length) return false;
                            const style = getComputedStyle(element);
                            if (style.visibility === 'hidden' || Number.parseFloat(style.opacity) === 0) return false;
                            return [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
                        })
                        .map((element) => {
                            if (element.closest('.summary-hero-signature')) return null;
                            const style = getComputedStyle(element);
                            const background = resolveBackground(element);
                            const foreground = parseColor(style.color);
                            if (!foreground || background.hasImage) return null;
                            const renderedForeground = composite(foreground, background.color);
                            const fontSize = Number.parseFloat(style.fontSize);
                            const fontWeight = Number.parseInt(style.fontWeight, 10) || 400;
                            const required = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700) ? 3 : 4.5;
                            const ratio = contrast(renderedForeground, background.color);
                            if (ratio + 0.05 >= required) return null;
                            return {
                                selector: identify(element),
                                text: element.textContent.trim().replace(/\s+/g, ' ').slice(0, 80),
                                foreground: style.color,
                                background: `rgb(${background.color.slice(0, 3).map((channel) => Math.round(channel)).join(', ')})`,
                                fontSize,
                                fontWeight,
                                ratio: Math.round(ratio * 100) / 100,
                                required
                            };
                        })
                        .filter(Boolean)
                        .slice(0, 100);
                })()
            }));
            siteResults.push({ name, route, url, viewport, status: response?.status(), screenshot, focusScreenshot, consoleErrors, requestFailures, metrics });
            await context.close();
        }
    }

    await browser.close();
    const report = path.join(outputDir, 'report.json');
    fs.writeFileSync(report, JSON.stringify(results, null, 2));
    const siteReport = path.join(outputDir, 'site-report.json');
    fs.writeFileSync(siteReport, JSON.stringify(siteResults, null, 2));
    process.stdout.write(`${report}\n${siteReport}\n`);
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
