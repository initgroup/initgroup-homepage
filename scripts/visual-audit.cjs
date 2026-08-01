const fs = require('fs');
const os = require('os');
const path = require('path');

const playwrightModule = process.env.PLAYWRIGHT_MODULE || 'D:/work/Playwright/node_modules/playwright';
const { chromium } = require(playwrightModule);

const baseUrl = process.env.VISUAL_AUDIT_URL || 'http://127.0.0.1:8200/';
const outputDir = process.env.VISUAL_AUDIT_OUTPUT || path.join(os.tmpdir(), 'init-homepage-visual-audit');
const viewports = [
    { name: 'desktop-1920', width: 1920, height: 1080 },
    { name: 'desktop-1440', width: 1440, height: 1000 },
    { name: 'tablet-1024', width: 1024, height: 1366 },
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
        await page.evaluate(() => window.scrollTo(0, 0));
        const screenshot = path.join(outputDir, `${viewport.name}.png`);
        await page.screenshot({ path: screenshot, fullPage: true });
        const focusScreenshots = {};
        if (viewport.name === 'desktop-1440' || viewport.name === 'mobile-390') {
            for (const [name, selector] of Object.entries({
                hero: '.hero',
                decision: '.thesis-section',
                product: '.product-section',
                principles: '.principles-section'
            })) {
                const target = page.locator(selector);
                const targetScreenshot = path.join(outputDir, `${viewport.name}-${name}.png`);
                await target.screenshot({ path: targetScreenshot });
                focusScreenshots[name] = targetScreenshot;
            }
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
            await page.evaluate(() => window.scrollTo(0, 0));
            const screenshot = path.join(siteOutputDir, `${viewport.name}-${name}.png`);
            await page.screenshot({ path: screenshot, fullPage: true });
            const metrics = await page.evaluate(() => ({
                title: document.title,
                lang: document.documentElement.lang,
                viewportWidth: document.documentElement.clientWidth,
                documentWidth: document.documentElement.scrollWidth,
                documentHeight: document.documentElement.scrollHeight,
                h1: document.querySelector('h1')?.innerText || '',
                mainSections: document.querySelectorAll('main > section').length,
                images: [...document.images].map((image) => ({
                    src: image.currentSrc || image.src,
                    complete: image.complete,
                    naturalWidth: image.naturalWidth
                })).filter((image) => !image.complete || image.naturalWidth === 0)
            }));
            siteResults.push({ name, route, url, viewport, status: response?.status(), screenshot, consoleErrors, requestFailures, metrics });
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
