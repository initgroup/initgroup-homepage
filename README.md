# INIT Homepage

인아이티 기업 홈페이지의 정적 HTML MPA 프로젝트입니다. 카페24에 정적 파일을 업로드하면 브라우저에서 동작합니다. 홈페이지 운영·로컬 미리보기·검증·업로드 패키징에는 Python, PHP 실행, DB, Node.js 또는 npm이 필요하지 않습니다.

## 카페24 업로드

```powershell
.\scripts\package-static.ps1
```

`dist/site/` **안의 내용 전체**를 카페24 계정의 웹 공개 디렉터리에 업로드합니다. 또는 `dist/cafe24-static.zip`을 압축 해제해 같은 내용을 업로드합니다. 루트 `index.html`, 각 메뉴의 `index.html`, `assets/`, `robots.txt`, `sitemap.xml`, `.htaccess`가 포함됩니다. `dist`나 `site` 폴더 자체가 아니라 그 안의 내용을 옮깁니다. 기존 기본 시작 파일이 있다면 호스팅에서 `index.html`이 시작 문서로 선택되는지 확인합니다.

`scripts/`, `.git/`, 디자인 참고 자료 및 운영 캡처 원본은 업로드 대상이 아닙니다. 패키지는 `static-files.json`의 공개 파일만 복사합니다. 이 목록에는 페이지, CSS 배경, 언어별 이미지와 공유용 이미지가 등록되어 있습니다. 공개 파일을 추가하거나 삭제할 때 이 목록도 함께 수정합니다.

모든 내부 링크·이미지·CSS·JS·다국어 JSON은 문서 또는 CSS 파일 위치를 기준으로 한 상대경로입니다. 예를 들어 솔루션 상세 페이지는 `../../assets/`를 사용하므로 도메인의 루트뿐 아니라 하위 디렉터리에서도 동작합니다. canonical·OG·JSON-LD의 같은 사이트 주소도 현재 문서 기준 상대경로입니다. 도메인이나 하위 폴더가 바뀌어도 페이지 메타 설정을 바꿀 필요가 없습니다. 외부 사이트·메일·전화·schema.org 어휘 식별자는 원래 형식을 유지합니다. sitemap·robots의 검색 안내 주소만 별도의 sitemapBaseUrl을 변경하고 갱신합니다. 공개 index.html의 제목·description은 2026-10-21 수정 제안서의 공통 회사 소개 문구를 사용하고 OG·페이지 JSON-LD에도 일치시킵니다. 페이지별 canonical과 본문 구조는 유지하며, 제품 공유 이미지는 현재 공개 화면을 사용합니다. 영문 선택 시 OG 사이트명·이미지 설명과 JSON-LD의 문구·제품 이미지도 함께 전환합니다. 별도 언어 URL이 없으므로 가상의 `hreflang` URL을 만들지 않습니다.

sitemap에는 검색 대상 canonical URL만 등록합니다. 실제 변경 이력이 확인되지 않은 `lastmod`와 불필요한 `changefreq`·`priority`는 넣지 않습니다. `robots.txt`는 삭제된 URL도 크롤러가 404/410을 확인하도록 허용합니다. [Google robots.txt 안내](https://developers.google.com/search/docs/crawling-indexing/robots/intro)와 [sitemap 기준](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)을 따릅니다.

`.htaccess`는 UTF-8, `index.html`, 디렉터리 목록 차단, 기존 보안 헤더와 캐시 정책을 설정합니다. Apache `mod_rewrite`가 활성화되면 예전 `/insights/` 경로 전체와 보관한 미사용 자산 9개의 이전 경로는 HTTP 410 Gone으로 응답합니다. 새 패키지를 덮어쓸 때 이전 업로드의 `insights/` 디렉터리와 보관한 미사용 자산 9개도 제거하고, `/insights/`와 예전 보고서 주소가 404 또는 410인지 확인합니다. 새 패키지에서 빠졌다는 사실만으로 운영 서버의 이전 파일이 삭제되지는 않습니다. [Apache G 플래그](https://httpd.apache.org/docs/2.4/rewrite/flags.html#flag_g)를 기준으로 설정했습니다. 존재하지 않는 URL은 호스팅의 기본 HTTP 404로 응답하며, 홈으로 보내는 rewrite는 없습니다. `404.html`은 직접 열 수 있는 안내 페이지입니다. 하위 경로 오류를 이 파일로 내부 rewrite하면 상대 자산 경로가 달라지므로 기본 오류 응답을 사용합니다. 설정 기준은 [Apache DirectoryIndex](https://httpd.apache.org/docs/2.4/mod/mod_dir.html#directoryindex)와 [ErrorDocument](https://httpd.apache.org/docs/2.4/mod/core.html#errordocument)를 참고합니다.

## 로컬 미리보기와 검증

```powershell
.\scripts\serve.ps1 -Port 8200
.\scripts\validate.ps1
```

`http://127.0.0.1:8200/`에서 PowerShell의 정적 파일 서버로 확인합니다. VS Code 기본 빌드 작업이나 `scripts/start-homepage.cmd`도 같은 서버를 실행하며 Python을 시작하지 않습니다. 이미 실행 중인 서버는 자동으로 재시작하지 않습니다. 포트 점유 시 프로세스를 확인하며, 사용자가 재시작을 명시한 경우에만 `-Restart`를 사용합니다. 하위 디렉터리를 함께 검증하려면 `-PreviewSubdirectory`로 시작한 뒤 `http://127.0.0.1:8200/preview/`를 확인합니다.

검증은 공통 로더 참조와 중복 head·서버 코드 금지, 명시적 번역 key, 완성 HTML의 문서 계약, 템플릿 미해석 여부, 상대 링크·앵커·CSS 자산·언어 이미지 쌍, sitemap의 검색 대상 누락·중복·비공개 URL, canonical·OG·JSON-LD와 실제 배포 파일의 일치, 언어 사전의 key·번역 누락을 검사합니다. 실제 조합된 메타·메뉴·화면은 브라우저 테스트에서 확인합니다. Node가 이미 설치되어 있으면 JavaScript 구문 검사도 추가합니다. 로컬 파일 더블클릭(`file://`)은 브라우저가 JSON 로딩을 제한할 수 있으므로 HTTP 미리보기로 확인합니다.

Playwright가 설치된 개발 환경에서는 `node scripts/static-smoke.cjs`로 실제 브라우저 회귀 검증을 실행할 수 있습니다. 먼저 `serve.ps1 -PreviewSubdirectory`로 서버를 시작합니다. Playwright가 별도 위치에 있으면 `PLAYWRIGHT_MODULE` 환경변수로 지정합니다. 브라우저 번들 대신 설치된 Edge를 사용하려면 실행 전에 `$env:PLAYWRIGHT_CHANNEL = "msedge"`를 설정합니다. 회귀 검증은 공개 페이지를 한국어·영어의 데스크톱·모바일에서 열어 검색 메타·JSON-LD·가로 넘침과 공개 종료 경로를 함께 검사합니다. 이 도구와 Node는 운영·일반 검증에 필요하지 않습니다.

## 2026-10-21 수정 제안 반영

회사 소개·연혁과 사업분야 4개 영역의 개요·상세·문의 문구를 한국어·영어로 함께 갱신했습니다. 서비스 화면의 중복 바로가기와 도메인 소개 블록은 제거했으며 상단 메뉴와 각 서비스 상세 앵커는 유지합니다. 사이트맵은 캡처의 7개 주소를 홈 → 회사 → 서비스 → 솔루션 → 사업분야 → 채용 → 문의 순서로 등록하며, 확인되지 않은 변경 날짜·우선순위·빈도는 추가하지 않습니다.

## 2026-10-22 수정 제안 반영

홈의 주요 사업분야 설명과 네 카드의 소개·목록을 제안서 화살표 대상에 맞춰 한국어·영어로 갱신했습니다. 사업분야 명칭은 메뉴·홈 카드·개요 카드·상세 제목에서 `금융·핀테크`, `스마트 제조·인텔리전스 마켓`, `R&D·정책`으로 통일합니다. 영문은 `Finance & FinTech`, `Smart Manufacturing & Market Intelligence`, `R&D & Policy`를 사용합니다.

설명 글자색은 `assets/css/site.css`의 `:root`에 있는 `--text-description` 하나로 관리하며 기본값은 `#000000`입니다. 공통 보조색과 디자인 테마의 `--init-body`, 제품·개인정보·오류 페이지의 설명 규칙도 이 변수를 참조합니다. 제목·강조색과 어두운 제품 도식·영상 모달의 대비색은 해당 용도에 맞게 유지합니다. 공통 스타일을 바꿀 때 페이지별 색상 override를 추가하지 않고 원본 규칙에서 공통 변수를 참조합니다.

회사 로고 심벌을 사용한 SVG 파비콘과 ICO·Apple 터치 아이콘을 모든 공개 HTML에 연결합니다. `sitemap.xml`은 2026-10-22 재확인한 캡처와 동일한 7개 주소만 포함합니다. `assets/shared/site.json`의 `sitemapPages`가 등록 대상과 순서의 편집 원본이며, 제품 상세 3개는 자동 추가하지 않습니다.

## 2026-10-24 솔루션·사업분야 구성

솔루션 하위 메뉴는 업무 목적을 기준으로 `통합 데이터 의사결정 솔루션 → 인법스(IN-BAPS)`, `통합 설문조사 운영 솔루션 → 인서베이원(IN-SURVEYONE)`, `AI 데이터 품질 거버넌스 → 인에디타원(IN-EDITAONE)` 순서로 연결합니다. 기존 상세 URL과 제품 기능·화면을 유지하며, 솔루션 개요와 각 상세의 활용 분야 설명에서 고객 업무와 제품의 연결을 안내합니다. 사업분야는 네 분야의 12개 상세 업무를 아이콘·요약·수행 항목으로 표시하고 관련 솔루션으로 연결합니다. 활용 설명은 고객 업무에 대한 적용 방향이며 특정 고객의 도입 실적을 의미하지 않습니다.

홈 메인·전체 메뉴·하위 메뉴·솔루션 개요·사업분야의 관련 솔루션 링크와 소개 문장은 위 순서를 함께 따릅니다. 솔루션 개요의 카드 크기는 제품 구분과 독립된 `--compact`·`--wide` 클래스로 관리하며, 제품별 강조색은 위치와 관계없이 유지합니다. 데스크톱에서 메인 3개 카드와 솔루션 개요의 첫 2개 카드는 CSS subgrid로 제목·설명·활용 분야·이미지의 행 높이를 공유하며, 좁은 화면에서는 기존 세로·좌우 배치를 사용합니다.

서비스 첫 하위 메뉴는 `navigation.links.services-overview`에서 한국어·영어 이름을 관리합니다. 대메뉴와 푸터 사업 영역의 `services` 항목은 기존 서비스 명칭을 유지합니다. 이번 추가 문구는 두 언어 사전의 `solutions20261024.*`·`business20261024.*`에서 관리합니다.

## 2026-10-26 솔루션 수정 제안 반영

홈의 솔루션 제목·소개와 제품 3개의 설명·활용 분야·핵심 기능, 솔루션 개요 상단 소개 3줄을 PPT 화살표 대상에 맞춰 한국어·영어로 갱신했습니다. 명칭은 `통합 데이터 의사결정 플랫폼`, `통합 리서치 프로세스 자동화 솔루션`, `AI 기반 데이터 품질 거버넌스 솔루션`으로 메뉴·관련 링크·상세 제목에 함께 반영합니다. 설문 핵심 기능은 제안서의 네 항목을 모두 표시합니다. 공개 URL과 제품명은 유지합니다.

## 2026-10-26 제품 구명칭 검색 노출 정리

현재 제품 표기는 한국어 `인에디타원`, 영어 `IN-EDITAONE`, 영문명 `INIT-Data Editing Solution`입니다. 공개 HTML·CSS 식별자와 두 언어 번역 key, 참고 HTML·사전도 같은 명칭으로 맞춥니다. `scripts/validate.ps1`은 공개 배포 목록과 텍스트 자산에 구명칭이 다시 포함되면 실패합니다. 참고 템플릿은 실행·배포 원본으로 사용하지 않습니다.

이전 상표 로고 12개와 미사용 영상 참고 이미지 1개는 `templates/disabled-content/assets/`로 옮겨 원본을 보존하며 배포하지 않습니다. `.htaccess`의 이전 자산 URL 410 응답을 유지합니다. `sitemap.xml`에는 제품명이 들어가지 않으며, 승인된 7개 URL과 순서를 유지합니다.

로컬 수정이나 ZIP 생성만으로 운영 서버·검색 색인이 바뀌지는 않습니다. `scripts/package-static.ps1`으로 만든 `dist/site/` 내용 전체(숨김 파일 `.htaccess` 포함)를 업로드하고, 이전 로고·영상 참고 파일은 운영 공개 폴더에서도 제거합니다. `initgroup.kr`과 `www.initgroup.kr` 모두 최신 HTML·`assets/shared/site.json`·언어 사전을 제공하는지 확인합니다. 네이버 서치어드바이저에서 홈·솔루션 개요·제품 상세의 웹페이지 수집을 요청하고 `sitemap.xml`을 제출할 수 있습니다. 재수집 및 검색 링크 갱신은 즉시 반영되지 않으며 사이트맵만 바꿔 메뉴명을 강제할 수 없습니다. [검색 정보 갱신 안내](https://searchadvisor.naver.com/guide/faq-serpedit)와 [수집 요청 안내](https://searchadvisor.naver.com/guide/request-crawl)를 참고합니다.

## 공통 파일과 HTML include 방식 (2026-10-22 최종 기준)

홈페이지는 **HTML·CSS·JavaScript와 정적 JSON·이미지 파일만으로 동작**합니다. PHP·Python·서버 애플리케이션·DB·Node.js 실행이나 HTML 생성 과정에 의존하지 않습니다. 카페24는 파일만 제공하고 브라우저의 공통 JavaScript가 공통 영역을 구성합니다.

각 공개 `index.html`과 `404.html`이 페이지 본문의 편집 원본입니다. 각 head에는 다음과 같이 공통 로더 참조 **한 줄만** 둡니다. 메타·CSS 링크·아이콘·JSON-LD·추가 스크립트 목록을 각 페이지에 복사하지 않습니다.

```html
<head>
    <script src="../assets/js/common.js?v=0123456789abcdef" data-page-file="projects/index.html"></script>
</head>
```

본문에서 반복되는 영역은 다음처럼 공통 HTML을 참조합니다.

```html
<template data-site-include="header"></template>
<main id="mainContent">페이지 고유 본문</main>
<template data-site-include="footer"></template>
<template data-site-include="mobile-actions"></template>
```

| 수정할 내용 | 편집 파일 |
| --- | --- |
| 공통 메타·CSS·JS·아이콘 목록, 검색 기준주소와 페이지별 예외 | `assets/shared/site.json` |
| 대메뉴·서브메뉴·전체 메뉴·모바일 버튼의 이름·경로·순서 | 같은 파일의 `navigation` |
| 헤더·푸터·메뉴 구조 등 재사용 HTML | `assets/shared/layout.html`의 이름 있는 `template` |
| 공통 파일 로딩·초기화·문서 준비 | `assets/js/common.js` |
| 내부 링크·주소·뒤로 가기 제어 | `assets/js/navigation.js` |
| 페이지 고유 본문 | 공개 디렉터리별 `index.html`, `404.html` |
| 공통 스타일·기능 코드 | `assets/css/`, `assets/js/`, `assets/brand-2026/` |
| 일반 본문·메타 번역 | `assets/i18n/ko.json`, `en.json` |
| 카페24 제공 파일 목록 | `static-files.json` |

예를 들어 메뉴 이름은 `site.json`의 `navigation.links.services.label.ko`·`.en`만 바꾸면 됩니다. 같은 항목을 참조하는 모든 메뉴에 새로고침만으로 반영됩니다. `navigation.*` 번역은 로더가 이 정의에서 읽으며 일반 언어 사전에 복제하지 않습니다. 본문 제목·설명은 해당 HTML과 일반 번역 key에서 별도로 관리합니다.

`layout.html`의 `{{include:header-bar}}`는 다른 공통 템플릿을, `{{root}}`는 현재 공개 문서에서 사이트 루트까지의 상대경로를 뜻합니다. `{{path:services}}`·`{{text:services}}`·`{{link:services}}`는 공통 메뉴 항목을 참조합니다. 공통 로더는 템플릿을 모두 확인한 후 페이지에 넣으며 누락·알 수 없는 변수·순환 include를 오류로 처리합니다.

로딩 순서는 공통 설정 → CSS·HTML 모듈·기본 사전 → 메타와 공통 HTML → 공통 스크립트입니다. 스크립트는 `site.json` 순서대로 한 번씩 실행하고 초기 언어·글꼴·첫 화면 이미지까지 준비되면 `window.INIT_SITE_READY`가 완료됩니다. 페이지 하단에도 공통 스크립트를 다시 넣지 않습니다. HTML과 공통 site.json은 캐시를 재검증하고, 내용 해시가 붙은 자산은 캐시를 재사용합니다. HTML 파일별 캐시 버전을 수동 수정하지 않습니다.

이 방식은 브라우저 JavaScript가 공통 내용을 구성합니다. JavaScript를 끈 경우 고유 한국어 본문은 남지만 공통 메뉴·스타일·검색 메타는 구성되지 않습니다. JavaScript를 실행하지 않는 공유 수집기의 미리보기는 보장할 수 없습니다. **초기 HTML에 공통 태그를 다시 펼쳐 넣거나 PHP include로 바꾸지 않습니다.** 순수 정적 파일과 실제 공통 참조 구조를 유지하라는 최신 요청을 따른 기준입니다.

문의 마지막 제목은 `.heading-lines > .heading-line`의 네 문맥 구간을 유지합니다. 한국어 PC에서는 네 줄, 좁은 화면에서는 구간 안의 추가 줄바꿈을 허용합니다. `㈜인아이티`와 `(주) 인아이티`는 공통 `.company-name { white-space: nowrap; }`으로 묶습니다. 회사명이 포함된 문장은 `data-i18n="key"`와 해당 span을 함께 사용하고 한국어·영어 사전을 갱신합니다.

## 캐시 버전과 페이지 전환 (2026-10-22)

배포 전 `scripts/package-static.ps1`을 실행하면 `update-asset-versions.ps1`이 파일 내용의 SHA-256 앞 16자리로 자산별 버전을 계산합니다. `site.json`의 `assetVersions`는 자동 관리 영역입니다. 날짜·난수·접속 횟수·파일 수정 시각을 버전으로 쓰지 않으며, 내용이 같으면 주소·파일·버전이 그대로 유지됩니다.

공통 CSS·JS·JSON·HTML 모듈·이미지·영상·폰트는 `?v=내용해시`를 사용합니다. CSS 이미지·폰트가 바뀌면 해당 CSS의 참조와 CSS 해시도 바뀝니다. 부트스트랩 common.js 내용이 바뀔 때만 각 공개 HTML의 로더 참조가 자동 갱신되며, 본문이나 공통 include 구조는 생성·복제하지 않습니다. 동적 자산은 `window.INIT_ASSETS.url(상대경로)`로 연결합니다.

`.htaccess`는 HTML·site.json·버전 없는 주소를 `no-cache, must-revalidate`로 제공하고, 해시가 붙은 공개 자산만 장기 캐시합니다. 변경된 자산은 새 주소로 받아오며 변경 없는 재방문은 같은 캐시 주소를 사용합니다. 기존 방문자가 강력 새로고침을 할 필요가 없도록 HTML과 공통 설정도 함께 업로드합니다. 카페24에 자산을 먼저 올리고 공개 HTML·site.json을 마지막에 갱신하며, 숨김 파일인 .htaccess를 포함합니다. 운영 호스팅이 제공하는 Apache 모듈·응답 헤더는 업로드 후 확인합니다. [HTTP 캐시 기준](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching)을 따릅니다.

내부 메뉴 이동은 현재 문서를 비우지 않고 다음 정적 HTML·공통 모듈·번역·스타일·이미지를 별도 DOM에서 준비한 뒤 한 번에 교체합니다. 헤더·본문이 준비 중에 사라지거나 페이지 전체가 투명해지는 효과를 넣지 않습니다. 각 URL 직접 접속·새로고침은 원래 정적 HTML로 동작하며, 외부 링크·새 탭·수정 키·다운로드는 브라우저의 기본 동작을 유지합니다. 같은 페이지 메뉴·앵커도 불필요하게 문서를 다시 열지 않습니다. 주소·뒤로/앞으로 가기·스크롤·언어·포커스를 함께 갱신합니다.

전환 코드는 `assets/js/navigation.js`에서 링크·히스토리를, `common.js`에서 다음 문서와 자산 준비·교체를 관리합니다. 지원 브라우저의 `document.startViewTransition`은 준비된 화면의 교체만 보호하며 전환 애니메이션은 사용하지 않습니다. 해당 API가 없어도 준비 후 DOM 교체 방식은 동일하게 동작합니다. `prefers-reduced-motion`도 유지합니다. 실패·취소·시간 초과 시에는 현재 화면을 남기고 다시 시도할 수 있게 합니다.

페이지별 동작은 `INIT_PAGE.register("자산 경로", mount)`로 등록하고 정리 함수를 반환합니다. 전환 시 이전 이벤트·관찰자·예약 프레임을 정리한 뒤 새 문서에 한 번만 연결합니다. 전역 이벤트는 `INIT_PAGE.scope()`의 listen·frame·observe를 사용하고 dispose로 정리합니다. 번역은 `INIT_I18N.prepare`로 현재 화면을 건드리지 않고 준비합니다. 새 페이지 동작을 즉시 실행하는 전역 이벤트로 누적하지 않습니다.


스타일은 다음 페이지 준비 중에만 계산된 URL로 임시 로드하며, 최종 DOM에는 현재 문서 기준 상대경로만 남깁니다. 활성 CSS 링크의 href 변경이나 재삽입으로 스타일을 잠깐 해제하지 않고, 상대경로 링크도 로딩이 끝난 뒤 기존 시트를 넘겨줍니다. CSSStyleSheet.media.mediaText로 준비된 시트를 활성화해 link.media 속성 변경에 따른 재요청을 피합니다. 캐시가 꺼진 경우에도 준비된 스타일을 유지합니다.
캐시 버전에서 JavaScript 프로그램 자체의 변경이 감지되면 호환성을 위해 한 번 새 문서를 엽니다. 일반 메뉴 이동에서는 문서를 다시 열지 않습니다. 이 기능은 자체 호스팅 JavaScript와 정적 파일만 사용하며 서버 프로그램·프레임워크·서비스 워커를 추가하지 않습니다.

`validate.ps1`은 버전의 최신 여부도 검사합니다. 소스 수정 후 미리보기 전에 `scripts/update-asset-versions.ps1`을 실행하거나 패키징합니다. 이 도구들은 로컬 배포 준비용이며 홈페이지 실행에는 HTML·CSS·JavaScript와 정적 데이터만 필요합니다.

## 상대경로와 배포 위치

내부 메뉴·본문 링크·CSS·JS·이미지·사전은 현재 문서나 자산 기준 상대경로를 사용합니다. 공통 설정의 내부 경로는 사이트 루트 기준 상대경로이며 로더가 각 문서 깊이에 맞게 변환합니다. 같은 사이트의 도메인 절대 주소, `//도메인/...`, `/assets/...` 같은 도메인 루트 고정 경로를 넣지 않습니다. 외부 사이트·메일·전화 링크와 쿼리·앵커는 유지합니다.

canonical의 href, og:url·og:image의 content, JSON-LD의 같은 사이트 URL·이미지·@id는 모두 **현재 문서 기준 상대경로 문자열**로 만듭니다. 예를 들어 제품 상세의 공유 이미지는 `../../assets/...`, 홈 canonical은 `./`입니다. 빈 주소로 쿼리·앵커가 canonical에 따라붙지 않게 하며, 회사·사이트 식별자는 현재 페이지가 아닌 사이트 루트를 가리킵니다. `canonicalPath`·`ogImage`·`{"sitePath":"경로#식별자"}`는 계속 공통 JSON의 사이트 루트 기준 상대경로로 관리합니다. 브라우저가 href 프로퍼티를 절대 URL로 반환하더라도 저장한 속성값은 상대경로여야 합니다.

도메인·배포 폴더 이동 시 페이지 메타를 위한 기준주소 변경은 필요 없습니다. 사용자의 2026-10-22 최신 요청에 따라 이전의 메타 절대 URL 생성 예외는 폐기했습니다. HTML 생성·서버 프로그램·Python·PHP를 연동하지 않으며 기존 JavaScript 공통 include 방식으로 동작합니다.

`sitemap.xml`의 loc와 `robots.txt`의 Sitemap 지시문은 페이지 메타가 아닌 검색 안내 파일이며, 규격상 절대 URL을 사용합니다. 이 두 파일만 `assets/shared/site.json`의 `sitemapBaseUrl`을 참조합니다. 브라우저 로더는 이 값을 사용하지 않습니다.

```json
"sitemapBaseUrl": "https://new.example/company/site/"
```

실제 운영 위치를 옮기면 sitemapBaseUrl을 변경하고 `scripts/build-site.ps1` 또는 패키징 명령으로 검색 안내 파일을 갱신합니다. 이 스크립트는 **HTML을 생성하거나 수정하지 않으며 사이트 실행에 필요하지 않습니다.** 하위 경로 배포 시 도메인 루트 robots.txt의 Sitemap 연결도 확인합니다. [사이트맵 loc 규격](https://www.sitemaps.org/protocol.html#xmlTagDefinitions)을 따릅니다.

상대 canonical은 Google이 지원하지만 절대 URL을 권장하며, 상대 OG 주소와 JavaScript로 생성한 메타의 인식은 수집기별로 다를 수 있습니다. 브라우저 경로 검증은 검색 반영·공유 미리보기 보장과 구분합니다. 참고: [Google canonical 안내](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), [Open Graph 형식](https://ogp.me/).

## 검증과 카페24 패키징

공통 파일이나 본문을 저장하고 새로고침하면 됩니다. 새 페이지는 해당 공개 HTML, `site.json`의 `pages`와 필요한 메뉴, `static-files.json`에 등록합니다. 공개 파일과 공통 모듈은 모두 패키지에 포함하고 도구·참고 자료·비공개 보관본은 제외합니다.

```powershell
.\scripts\update-asset-versions.ps1
.\scripts\validate.ps1
.\scripts\package-static.ps1
```

PowerShell은 로컬 정적 미리보기·소스 검사·ZIP 작성 도구이며 카페24에서 실행하지 않습니다. Node.js·Playwright가 있는 개발 환경에서는 다음 선택적 브라우저 검증도 실행합니다. 홈페이지 운영 의존성은 아닙니다.

```powershell
.\scripts\test-relative-paths.ps1
node scripts/test-asset-versions.cjs
node scripts/test-cache-transition.cjs
node scripts/test-prepared-navigation.cjs
node scripts/test-navigation-video.cjs
node scripts/test-navigation-styles.cjs
node scripts/test-common-loader.cjs
node scripts/static-smoke.cjs
node scripts/test-relocation.cjs
```

공통 변경의 전체 전파와 HTML 파일 불변, ko/en, CSS·JS 중복 로딩 방지와 순서, 메뉴 열기·닫기, 회사명 줄바꿈, 문의 문맥 줄바꿈, 두 화면 크기, 루트·다단계 하위 경로와 도메인 이동을 검사합니다. `test-shared-head.ps1`은 새 공통 로더 테스트를 호출하는 호환 명령입니다. `sync-head.ps1`도 검색 안내 파일 갱신만 수행합니다.

현재 공개 페이지는 12개이며 사이트맵 등록 주소는 7개입니다. 제품 상세 페이지의 공개·canonical 설정은 유지하면서 사이트맵 등록 목록에서 제외합니다. 개인정보·404는 noindex와 사이트맵 제외를 유지합니다. 폐기된 인사이트·미사용 자산은 `templates/disabled-content/`에 보관하며 배포하지 않습니다. 기존 `templates/pages/`·`templates/partials/` 등은 과거 보존 자료이며 현재 편집 원본이 아닙니다.

## 한국어·영어와 브라우저 기능

기본 언어는 한국어입니다. `assets/js/i18n.js`가 `assets/i18n/config.json`, `ko.json`, `en.json`을 로드해 본문·접근성 속성·메타데이터와 제품 이미지를 전환합니다. 선택 언어는 `localStorage`에 저장하고 `window.INIT_LANGUAGE`와 `window.INIT_I18N`으로 공유합니다. 서버 API·세션·DB를 사용하지 않습니다.

언어별 캡처는 `_kor.png`, `_eng.png` 쌍으로 관리하고 `data-i18n-image-base`도 현재 페이지 기준 상대경로를 사용합니다. 실행 중 생성하는 문구는 `window.INIT_I18N.t("key")`를 사용합니다. 키보드 메뉴·갤러리·라이트박스·skip link·`prefers-reduced-motion`을 유지하며, JavaScript 없이도 고유 한국어 본문과 본문 링크는 남지만 공통 메뉴·스타일·메타 구성에는 JavaScript가 필요합니다.

## 선택적 Render 정적 호스팅

카페24에는 Render 설정이 필요 없습니다. 다른 호스팅에서도 사용할 수 있도록 `render.yaml`은 별도 Static Site 구성으로 전환했습니다. `bash scripts/build-render-static.sh`는 완성된 공개 파일만 `.render-static/`에 복사하며 Python을 실행하지 않습니다. 기존 Render Python 서비스는 자동 전환되지 않으며 실제 배포 작업도 수행하지 않습니다. 구성은 [Render Static Site 설정](https://render.com/docs/blueprint-spec#static-sites)을 따릅니다.

## Git·백업 자동화

이 폴더는 `main` 브랜치 Git 저장소로 사용하며 `origin`은 [initgroup/initgroup-homepage](https://github.com/initgroup/initgroup-homepage)에 연결합니다. 소스를 수정해도 자동으로 stage, commit 또는 push하지 않습니다. 수정 파일은 VS Code 소스 제어에 계속 표시되며 사용자가 배포 명령을 직접 실행할 때만 커밋합니다.

```powershell
.\scripts\git-publish-main.ps1
```

Codex가 소스를 수정한 직후에는 자동으로 stage, commit 또는 push하지 않으며 변경 파일은 VS Code에 `M`으로 남습니다. 사용자가 `git-publish-main.ps1` 명령이나 `Commit & Push` 작업을 직접 실행하면 그 실행 자체를 명시적인 커밋 지시로 간주하여, 원격을 확인하고 전체 변경을 stage한 뒤 검증·commit·pull --rebase·push합니다. 기본 커밋 메시지는 일련번호로 생성되며 `-MessagePrefix "접두사"`로 접두사를 지정할 수 있습니다. `-Message`와 `-DryRun` 옵션은 없으므로 변경 없이 점검하려면 `git status`와 `git diff`를 사용합니다.

별도 창에서 실행 결과와 오류를 계속 확인하려면 `scripts\publish-homepage.cmd`를 실행합니다. 일반 PowerShell 터미널에서는 새 `powershell -File` 프로세스를 만들지 말고 위의 `.\scripts\git-publish-main.ps1` 명령을 직접 사용합니다.

백업 기본 위치는 프로젝트와 같은 상위 폴더의 `backup\`입니다.

```powershell
.\scripts\backup-source.ps1 -Mode Working
.\scripts\backup-source.ps1 -Mode Git
```

`Working`은 미커밋 파일을 포함하되 Git 메타데이터·생성 결과물·비밀 파일을 제외합니다. `Git`은 커밋된 소스와 복구용 `repository.bundle`을 만듭니다.

## 배포 전 확인

- 대표 이메일·전화·주소와 사업자 표기의 최신 정보
- ISO 9001, Inno-Biz, 기업부설연구소 등 인증·선정의 현재 유효 범위
- 회사 연혁의 2016·2018·2021·2023·2024 세부 항목, 인재육성형 중소기업과 SAS 협약 이력의 원문 증빙
- 프로젝트 사례 문구의 공개 가능 범위와 고객명 사용 승인
- `sitemap.xml`의 운영 도메인 및 최종 URL
- `/privacy/` 검토본의 개인정보 보호책임자, 문의 정보·접속 로그 보유 기간, 호스팅 처리위탁·국외 이전 여부와 법률 검토

제품 이미지는 직원명·권한·DB·스키마 같은 운영 식별자가 없는 공개 후보 화면만 `assets/images/product/`에 포함합니다. 남아 있는 규칙 ID·컬럼명·예시 지표 역시 데이터 소유자의 공개 승인을 받은 뒤 배포하며, 원본 운영 캡처를 추가할 때도 같은 기준으로 먼저 검수해야 합니다.

인서베이원 원본 검토 자료는 `assets/images/reference/in-surveyone/`에만 두고 `.gitignore`로 Git 기반 배포 소스에서 제외합니다. 미리보기와 업로드 패키지는 `static-files.json`에 등록된 공개 파일만 제공합니다. 운영 캡처 원본은 이 목록에 추가하지 않습니다. 홈페이지에는 비식별 처리와 공개 승인을 마친 결과물만 `assets/images/product/in-surveyone/`에 복사해 사용합니다.

홍보영상은 현재 문서 기준 상대경로와 내용 해시를 사용하며 운영 도메인을 고정하지 않습니다. 사용자 클릭 안에서 소스 선택 → load() → play() 순서로 재생하고, 정책 차단·미디어 오류는 한국어/영어 재시도 버튼과 새 창 링크로 복구합니다. 영상 검증은 메타데이터뿐 아니라 실제 재생 시간 증가, 언어 전환, 재시도 및 페이지 이동 후 정리까지 확인합니다.

문의 마지막 제목은 corporate.css의 제목·이메일 칸 비율과 text-wrap: balance로 문맥별 줄바꿈을 유지합니다. 72rem 이하에서는 이메일 영역을 아래에 배치합니다. 네 문맥 구간과 회사명 묶음을 보존하고 한국어·영어 및 좁은 화면을 함께 확인합니다.

## 2026-10-26 제품 명칭

- 인에디타원 `IN-EDITAONE`: 정식 명칭은 `INIT-Data Editing Solution`, 로고 세부 명칭은 `INIT One-Stop Data Editing&Imputation Solution`입니다. 기존 `solutions/data-editing-system/` URL은 유지합니다.
- 인서베이원 `IN-SURVEYONE`: 로고 세부 명칭은 `INIT One-Stop Survey Integrated Solution`입니다.
- 제품 상세 로고는 `assets/images/product/ineditaone-logo-white.png`와 `inSurveyOneLogoW.png`의 워드마크를 사용하고, 기존 이미지 하단 문구는 CSS로 표시 영역에서 제외합니다. 새 세부 명칭은 HTML 텍스트로 조합하여 한국어·영어에서 동일하게 표시합니다. 원본 PNG와 비공개 과거 상표 시안은 보존합니다.
