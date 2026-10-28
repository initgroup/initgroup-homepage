# INIT Homepage

인아이티 기업 홈페이지의 정적 HTML MPA 프로젝트입니다. 카페24에 정적 파일을 업로드하면 브라우저에서 동작합니다. 홈페이지 운영·로컬 미리보기·검증·업로드 패키징에는 Python, PHP 실행, DB, Node.js 또는 npm이 필요하지 않습니다.

**실제 운영 환경은 카페24 정적 호스팅입니다.** 이 로컬 PC와 `http://127.0.0.1:8200/`은 개발·미리보기·검증 용도입니다. 버전 해시 계산과 ZIP 작성은 로컬에서 배포 전에 수행하며, 카페24는 업로드한 HTML·CSS·JS·JSON·자산과 `.htaccess` 설정을 제공합니다. 방문자 브라우저가 정적 설정의 변경을 확인하고 화면을 갱신하므로 카페24의 서버 프로그램·예약 작업이나 로컬 PC의 상시 실행에 의존하지 않습니다.

운영 적용 여부는 카페24 공개 주소에서 별도로 확인합니다. HTML·`assets/shared/site.json`의 `Cache-Control`, 설정의 ETag·조건부 304 응답, 해시 자산의 장기 캐시·보안 헤더 및 직접 URL 접근을 확인하고, 운영 `site.json`의 `assetVersions`·`pageVersions`를 배포할 파일과 비교합니다. HTML의 ETag·Last-Modified 제공 여부는 실제 응답에 따라 다르며 모든 HTML이 304를 반환한다고 가정하지 않습니다. 로컬 검사 통과나 ZIP 생성은 운영 업로드·운영 검증 완료를 뜻하지 않습니다.

## 카페24 업로드

```powershell
.\scripts\package-static.ps1
```

`dist/site/` **안의 내용 전체**를 카페24 계정의 웹 공개 디렉터리에 업로드합니다. 또는 `dist/cafe24-static.zip`을 압축 해제해 같은 내용을 업로드합니다. 루트 `index.html`, 각 메뉴의 `index.html`, `assets/`, `robots.txt`, `sitemap.xml`, `.htaccess`가 포함됩니다. `dist`나 `site` 폴더 자체가 아니라 그 안의 내용을 옮깁니다. 기존 기본 시작 파일이 있다면 호스팅에서 `index.html`이 시작 문서로 선택되는지 확인합니다.

`scripts/`, `.git/`, 디자인 참고 자료 및 운영 캡처 원본은 업로드 대상이 아닙니다. 패키지는 `static-files.json`의 공개 파일만 복사합니다. 이 목록에는 페이지, CSS 배경, 언어별 이미지와 공유용 이미지가 등록되어 있습니다. 공개 파일을 추가하거나 삭제할 때 이 목록도 함께 수정합니다.

모든 화면 이동 링크·이미지·CSS·JS·다국어 JSON은 문서 또는 CSS 파일 위치를 기준으로 한 상대경로입니다. 예를 들어 솔루션 상세는 `../../assets/`를 사용해 하위 폴더에서도 동작합니다. 2026-10-27 SEO 요청에 따라 canonical·OG·JSON-LD·사이트맵·robots의 검색 주소는 `site.json.sitemapBaseUrl`의 공식 HTTPS 절대주소를 사용합니다. 미리보기의 UI·자산 요청은 미리보기 주소에 남고 검색 메타만 공식 주소를 유지합니다. 실제 대표 도메인을 변경할 때는 이 기준주소와 서버 호스트 규칙을 함께 점검합니다. 페이지별 고유 제목·설명을 한국어·영어로 관리하며 현재 제품 이미지·명칭을 사용합니다. 별도 언어 URL이 없으므로 가상의 `hreflang`은 만들지 않습니다.

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

## 2026-10-28 수정 제안 반영

PPT의 제목 30곳을 명사형 표현으로 정리하고 한국어·영어 및 문맥별 줄바꿈을 함께 반영했습니다. 채용 강조색과 지정된 다운로드·상담 버튼은 공통 브랜드 파란색을 사용합니다. 슬라이드별 대응 위치는 [반영 내역](references/revisions/20261028.md)에서 확인할 수 있습니다. 기존 본문 설명과 공개 URL, 제품 기능은 유지합니다.

## 2026-10-21 수정 제안 반영

회사 소개·연혁과 사업분야 4개 영역의 개요·상세·문의 문구를 한국어·영어로 함께 갱신했습니다. 서비스 화면의 중복 바로가기와 도메인 소개 블록은 제거했으며 상단 메뉴와 각 서비스 상세 앵커는 유지합니다. 사이트맵의 기존 홈→회사→서비스→솔루션→사업분야→채용→문의 순서는 유지하고, 2026-10-27 요청으로 제품 상세 3개를 추가했습니다. 확인되지 않은 변경 날짜·우선순위·빈도는 넣지 않습니다.

## 2026-10-22 수정 제안 반영

홈의 주요 사업분야 설명과 네 카드의 소개·목록을 제안서 화살표 대상에 맞춰 한국어·영어로 갱신했습니다. 사업분야 명칭은 메뉴·홈 카드·개요 카드·상세 제목에서 `금융·핀테크`, `스마트 제조·인텔리전스 마켓`, `R&D·정책`으로 통일합니다. 영문은 `Finance & FinTech`, `Smart Manufacturing & Market Intelligence`, `R&D & Policy`를 사용합니다.

설명 글자색은 `assets/css/site.css`의 `:root`에 있는 `--text-description` 하나로 관리하며 기본값은 `#000000`입니다. 공통 보조색과 디자인 테마의 `--init-body`, 제품·개인정보·오류 페이지의 설명 규칙도 이 변수를 참조합니다. 제목·강조색과 어두운 제품 도식·영상 모달의 대비색은 해당 용도에 맞게 유지합니다. 공통 스타일을 바꿀 때 페이지별 색상 override를 추가하지 않고 원본 규칙에서 공통 변수를 참조합니다.

회사 로고 심벌을 사용한 SVG 파비콘과 ICO·Apple 터치 아이콘을 모든 공개 HTML에 연결합니다. `assets/shared/site.json.sitemapPages`가 사이트맵 대상·순서의 원본이며 현재는 기존 7개에 인에디타원·인법스·인서베이원 상세를 더한 10개입니다.

## 2026-10-24 솔루션·사업분야 구성

솔루션 하위 메뉴는 업무 목적을 기준으로 `통합 데이터 의사결정 솔루션 → 인법스(IN-BAPS)`, `통합 설문조사 운영 솔루션 → 인서베이원(IN-SURVEYONE)`, `AI 데이터 품질 거버넌스 → 인에디타원(IN-EDITAONE)` 순서로 연결합니다. 기존 상세 URL과 제품 기능·화면을 유지하며, 솔루션 개요와 각 상세의 활용 분야 설명에서 고객 업무와 제품의 연결을 안내합니다. 사업분야는 네 분야의 12개 상세 업무를 아이콘·요약·수행 항목으로 표시하고 관련 솔루션으로 연결합니다. 활용 설명은 고객 업무에 대한 적용 방향이며 특정 고객의 도입 실적을 의미하지 않습니다.

홈 메인·전체 메뉴·하위 메뉴·솔루션 개요·사업분야의 관련 솔루션 링크와 소개 문장은 위 순서를 함께 따릅니다. 솔루션 개요의 카드 크기는 제품 구분과 독립된 `--compact`·`--wide` 클래스로 관리하며, 제품별 강조색은 위치와 관계없이 유지합니다. 데스크톱에서 메인 3개 카드와 솔루션 개요의 첫 2개 카드는 CSS subgrid로 제목·설명·활용 분야·이미지의 행 높이를 공유하며, 좁은 화면에서는 기존 세로·좌우 배치를 사용합니다.

서비스 첫 하위 메뉴는 `navigation.links.services-overview`에서 한국어·영어 이름을 관리합니다. 대메뉴와 푸터 사업 영역의 `services` 항목은 기존 서비스 명칭을 유지합니다. 이번 추가 문구는 두 언어 사전의 `solutions20261024.*`·`business20261024.*`에서 관리합니다.

솔루션 첫 제목은 `solutions.hero.heading.flow`·`solutions.hero.heading.platform`의 두 문맥으로 구성합니다. 한국어는 수집부터 인사이트까지의 범위와 통합 플랫폼 설명을 구분하고, 각 문맥 안에서는 화면 너비에 맞춰 균형 있게 줄바꿈합니다. 영어는 같은 두 번역을 이어 자연스럽게 흐르게 합니다. 원본은 `solutions/index.html`, 줄바꿈은 `menu-hero.css`의 `#solutionHubTitle`에서 관리합니다.

## 2026-10-26 솔루션 수정 제안 반영

홈의 솔루션 제목·소개와 제품 3개의 설명·활용 분야·핵심 기능, 솔루션 개요 상단 소개 3줄을 PPT 화살표 대상에 맞춰 한국어·영어로 갱신했습니다. 명칭은 `통합 데이터 의사결정 플랫폼`, `통합 리서치 프로세스 자동화 솔루션`, `AI 기반 데이터 품질 거버넌스 솔루션`으로 메뉴·관련 링크·상세 제목에 함께 반영합니다. 설문 핵심 기능은 제안서의 네 항목을 모두 표시합니다. 공개 URL과 제품명은 유지합니다.

## 2026-10-26 제품 구명칭 검색 노출 정리

현재 제품 표기는 한국어 `인에디타원`, 영어 `IN-EDITAONE`, 영문명 `INIT-Data Editing Solution`입니다. 공개 HTML·CSS 식별자와 두 언어 번역 key, 참고 HTML·사전도 같은 명칭으로 맞춥니다. `scripts/validate.ps1`은 공개 배포 목록과 텍스트 자산에 구명칭이 다시 포함되면 실패합니다. 참고 템플릿은 실행·배포 원본으로 사용하지 않습니다.

이전 상표 로고 12개와 미사용 영상 참고 이미지 1개는 `templates/disabled-content/assets/`에 원본으로 보존하며 배포하지 않습니다. `.htaccess`의 이전 자산 URL 410을 유지합니다. 사이트맵은 최신 승인 10개 URL을 사용하고 검색용 정적 헤더에는 현재 제품명과 정확한 상세 경로를 제공합니다.

로컬 수정이나 ZIP 생성만으로 운영 서버·검색 색인이 바뀌지는 않습니다. `scripts/package-static.ps1`의 `dist/site/` 내용 전체(숨김 파일 `.htaccess` 포함)를 올리고 이전 비공개 자산은 운영에서도 제거합니다. HTTP·www 변형은 대표 HTTPS 비www로 path/query를 보존해 301 이동해야 하며, 대표주소에서 최신 HTML·설정·사전을 확인합니다. 업로드 후 `scripts/test-production-seo.ps1`을 실행하고 네이버에서 홈·솔루션·인에디타원 상세 수집 요청과 사이트맵 제출을 진행합니다. 계정 권한 없이 수집 요청을 완료했다고 보고하지 않습니다. [구현·운영 절차](references/seo/IMPLEMENTATION.md), [서브링크 안내](https://searchadvisor.naver.com/guide/faq-sublink), [수집 요청 안내](https://searchadvisor.naver.com/guide/request-crawl)를 참고합니다.

## 공통 파일과 정적 SEO (2026-10-27 기준)

홈페이지는 **HTML·CSS·JavaScript와 정적 JSON·이미지만으로 동작**합니다. 카페24에서 PHP·Python·Node.js·서버 애플리케이션이나 DB를 실행하지 않습니다. 배포 준비 시 로컬 PowerShell이 정적 SEO·검색용 헤더 블록만 동기화하고, 기존 공통 JavaScript가 화면 UI를 구성합니다.

각 공개 `index.html`과 `404.html`이 고유 본문의 편집 원본입니다. head의 `site:seo` 생성 블록은 `site.json`과 두 언어 사전에서 만든 한국어 기본 title·description·canonical·OG·JSON-LD를 담습니다. 실행 JavaScript는 내용 해시가 붙은 공통 로더 한 개이며 CSS·아이콘·추가 실행 스크립트 목록은 계속 공통 설정에서 관리합니다. 생성 블록은 수동 편집하지 않습니다.

```html
<head>
    <!-- site:seo:start -->
    <!-- scripts/sync-seo.ps1이 관리하는 정적 SEO 태그 -->
    <!-- site:seo:end -->
    <script src="../assets/js/common.js?v=0123456789abcdef" data-page-file="projects/index.html"></script>
</head>
```

새 페이지의 헤더 자리표시자는 빌드 시 `site:header` 생성 블록으로 바뀝니다. 그 안에는 검색로봇과 JavaScript를 끈 사용자를 위한 10개 일반 링크가 있고, 실행 시 동일한 include 이름을 사용해 기존 공통 UI 헤더로 한 번 교체합니다. 그 외 공통 영역은 template 참조를 유지합니다.

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
| 원본 응답의 SEO·검색용 헤더 생성 | `scripts/sync-seo.ps1` |
| 내부 링크·주소·뒤로 가기 제어 | `assets/js/navigation.js` |
| 페이지 고유 본문 | 공개 디렉터리별 `index.html`, `404.html` |
| 공통 스타일·기능 코드 | `assets/css/`, `assets/js/`, `assets/brand-2026/` |
| 일반 본문·메타 번역 | `assets/i18n/ko.json`, `en.json` |
| 카페24 제공 파일 목록 | `static-files.json` |

메뉴 이름은 `site.json.navigation.links.services.label.ko`·`.en` 등 기존 정의를 편집합니다. 검색용 헤더의 `navigation.searchLabels`는 같은 메뉴 또는 기존 제품명 번역 키를 참조합니다. 브라우저 UI는 새로고침으로 갱신되며, 배포 전 빌드로 정적 원본도 동기화합니다. `navigation.*` 번역을 사전에 중복 저장하지 않고 고유 본문은 계속 해당 HTML에서 편집합니다.

`layout.html`의 `{{include:header-bar}}`는 다른 공통 템플릿을, `{{root}}`는 현재 공개 문서에서 사이트 루트까지의 상대경로를 뜻합니다. `{{path:services}}`·`{{text:services}}`·`{{link:services}}`는 공통 메뉴 항목을 참조합니다. 공통 로더는 템플릿을 모두 확인한 후 페이지에 넣으며 누락·알 수 없는 변수·순환 include를 오류로 처리합니다.

원본 응답에 정적 SEO·검색 링크가 먼저 존재합니다. 이후 공통 설정→CSS·모듈·사전→메타 upsert·UI 헤더 교체→공통 스크립트 순서로 초기화합니다. 스크립트는 설정 순서대로 한 번 실행하며 언어·글꼴·첫 화면 이미지까지 준비되면 `INIT_SITE_READY`가 완료됩니다. 기존 메타 노드를 갱신해 중복을 막고 viewport 수명을 유지합니다. HTML·site.json은 재검증하고 해시 자산은 기존 캐시를 재사용합니다.

JavaScript가 꺼져도 정적 검색 메타·주요 페이지 링크·고유 한국어 본문이 남습니다. 전체 UI 메뉴·스타일·언어 전환은 JavaScript가 구성합니다. 정적 생성기는 검색 블록만 관리하며 고유 본문·전체 UI 메뉴를 펼쳐 쓰거나 서버 include를 추가하지 않습니다. `build-site.ps1`, `sync-head.ps1`, `update-asset-versions.ps1`에서 같은 생성기를 호출하고 검사 모드에서는 오래된 블록을 오류로 보고합니다.

문의 마지막 제목은 `.heading-lines > .heading-line`의 네 문맥 구간을 유지합니다. 한국어 PC에서는 네 줄, 좁은 화면에서는 구간 안의 추가 줄바꿈을 허용합니다. `㈜인아이티`와 `(주) 인아이티`는 공통 `.company-name { white-space: nowrap; }`으로 묶습니다. 회사명이 포함된 문장은 `data-i18n="key"`와 해당 span을 함께 사용하고 한국어·영어 사전을 갱신합니다.

## 캐시 버전과 페이지 전환 (2026-10-22)

배포 전 `scripts/package-static.ps1`을 실행하면 `update-asset-versions.ps1`이 파일 내용의 SHA-256 앞 16자리로 자산별 버전과 공개 HTML별 버전을 계산합니다. `site.json`의 `assetVersions`와 `pageVersions`는 자동 관리 영역입니다. 날짜·난수·접속 횟수·파일 수정 시각을 버전으로 쓰지 않으며, 내용이 같으면 주소·파일·버전이 그대로 유지됩니다. HTML 본문만 수정해도 해당 페이지의 변경을 감지하며, 다른 페이지나 자산의 버전을 불필요하게 바꾸지 않습니다.

공통 CSS·JS·JSON·HTML 모듈·이미지·영상·폰트는 `?v=내용해시`를 사용합니다. CSS 의존 이미지·폰트가 바뀌면 해당 CSS의 참조·해시도 바뀝니다. SEO 블록을 먼저 동기화하고 common.js 내용이 바뀔 때만 공개 HTML의 bootstrap 쿼리를 갱신합니다. 고유 본문이나 전체 UI include는 생성·복제하지 않습니다. 동적 자산은 `INIT_ASSETS.url(상대경로)`로 연결합니다.

`.htaccess`는 HTML·site.json·버전 없는 주소를 `no-cache, must-revalidate`로 제공하고, 해시가 붙은 공개 자산만 장기 캐시합니다. 변경된 자산은 새 주소로 받아오며 변경 없는 재방문은 같은 캐시 주소를 사용합니다. 기존 방문자가 강력 새로고침을 할 필요가 없도록 HTML과 공통 설정도 함께 업로드합니다. 카페24에 자산을 먼저 올리고 공개 HTML·site.json을 마지막에 갱신하며, 숨김 파일인 .htaccess를 포함합니다. 운영 호스팅이 제공하는 Apache 모듈·응답 헤더는 업로드 후 확인합니다. [HTTP 캐시 기준](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching)을 따릅니다.

내부 메뉴 이동은 현재 문서를 비우지 않고 다음 정적 HTML·공통 모듈·번역·스타일·이미지를 별도 DOM에서 준비한 뒤 한 번에 교체합니다. 헤더·본문이 준비 중에 사라지거나 페이지 전체가 투명해지는 효과를 넣지 않습니다. 각 URL 직접 접속·새로고침은 원래 정적 HTML로 동작하며, 외부 링크·새 탭·수정 키·다운로드는 브라우저의 기본 동작을 유지합니다. 같은 페이지 메뉴·앵커도 불필요하게 문서를 다시 열지 않습니다. 주소·뒤로/앞으로 가기·스크롤·언어·포커스를 함께 갱신합니다.

전환 코드는 `assets/js/navigation.js`에서 링크·히스토리를, `common.js`에서 다음 문서와 자산 준비·교체를 관리합니다. 준비된 스타일과 본문은 같은 JavaScript 작업 안에서 교체합니다. 터치를 가로막을 수 있는 `document.startViewTransition` 스냅샷은 사용하지 않습니다. `prefers-reduced-motion`도 유지합니다. 필수 HTML·CSS·번역의 실패·취소·시간 초과 시에는 현재 화면을 남기고 다시 시도할 수 있게 합니다.

2026-10-27 모바일 점검에서 제목 테두리는 강제 포커스와 전역 `:focus-visible` 규칙, 지연은 전체 이미지 대기와 스냅샷 전환·메뉴 잠금으로 재현했습니다. `INIT_PAGE.focus`가 터치·마우스 이동의 장식 테두리만 숨기고 키보드 포커스와 본문 바로가기를 유지합니다. lazy 이미지는 브라우저가 필요할 때 읽으며, 나머지 이미지 준비는 최대 700ms만 기다립니다. 이미지 오류만으로 페이지 이동을 취소하지 않습니다. 같은 경로 깊이의 사용 가능한 CSS는 재사용하고, 로딩 중에도 메뉴 열기·닫기·다른 항목 선택이 가능합니다. 같은 목적지 연속 터치는 기존 요청을 공유합니다.

홈 모바일 버튼의 원본은 `site.json`의 `navigation.links.action-index-1`이며 한국어 `서비스 보기`, 영어 `View services`입니다. 사용하지 않는 이전 `역량 보기` 번역은 제거했습니다. 복원된 탭(`pageshow.persisted`), 다시 보이는 탭, 같은 페이지 메뉴·뒤로 가기와 온라인 복구 시 공통 설정을 재검증합니다. 화면이 계속 열려 있을 때도 약 60초마다 설정만 확인하고 숨겨진 탭에서는 주기 검사를 중지합니다. 동시 확인은 한 요청을 공유합니다. 내용이 같으면 HTML·자산 다운로드나 화면 교체를 하지 않고, 변경된 현재 페이지와 설정만 적용합니다. 공통 설정의 `no-cache`는 캐시 삭제가 아니라 서버 재검증이며 운영 서버의 ETag·Last-Modified가 일치하면 304로 기존 응답 본문을 재사용합니다. 내용 해시가 같은 CSS·JS·이미지·영상·폰트는 기존 장기 캐시를 유지합니다.

자동 갱신은 스크롤·언어·방문 기록 수를 유지하고 JavaScript가 바뀌었을 때만 문서를 한 번 새로 엽니다. 메뉴·대화상자·영상·입력 중에는 갱신을 미루며, 오프라인에서는 기존 화면을 유지한 뒤 온라인 복구 시 다시 확인합니다. 배포 전부터 이미 실행 중이며 이 변경 확인 코드가 없는 구버전 문서 자체는 소스 업로드만으로 실행 코드를 바꿀 수 없습니다. 새 코드가 로드된 뒤의 배포부터는 위 자동 갱신이 적용됩니다.

`node scripts/test-cache-refresh.cjs`는 이전 캐시를 그대로 보존하고 WebKit·Chromium의 ko/en에서 변경 없는 검사(새 자산 다운로드 0), HTML만 변경(캐시 자산 재사용), 다른 HTML만 변경(현재 화면 유지), CSS만 변경(해당 CSS 1개 다운로드), 열린 화면의 주기 갱신·예전 메뉴 복원·숨겨진 탭·오프라인·입력 방해 방지·JS 변경 시 한 번만 문서 갱신을 검사합니다. `test-asset-versions.cjs`는 HTML별 버전과 같은 내용 재저장의 안정성도 확인합니다.

`node scripts/test-mobile-navigation.cjs`는 기존 Playwright 설치의 WebKit(iPhone 13)과 Chromium(Pixel 7)에서 공개 12페이지의 ko/en·320px 좁은 화면·전체 모바일 메뉴·하위 앵커·연속 터치·느린 이미지·이미지 실패·이전 메뉴 설정 복원·키보드 접근을 검사합니다. `.tmp/mobile-navigation/`에 화면과 결과를 저장하며 배포하지 않습니다. 브라우저 에뮬레이션은 실물 iPhone/Android 및 네이버 인앱 브라우저 확인을 대신하지 않습니다.

페이지별 동작은 `INIT_PAGE.register("자산 경로", mount)`로 등록하고 정리 함수를 반환합니다. 전환 시 이전 이벤트·관찰자·예약 프레임을 정리한 뒤 새 문서에 한 번만 연결합니다. 전역 이벤트는 `INIT_PAGE.scope()`의 listen·frame·observe를 사용하고 dispose로 정리합니다. 번역은 `INIT_I18N.prepare`로 현재 화면을 건드리지 않고 준비합니다. 새 페이지 동작을 즉시 실행하는 전역 이벤트로 누적하지 않습니다.


스타일은 다음 페이지 준비 중에만 계산된 URL로 임시 로드하며, 최종 DOM에는 현재 문서 기준 상대경로만 남깁니다. 활성 CSS 링크의 href 변경이나 재삽입으로 스타일을 잠깐 해제하지 않고, 상대경로 링크도 로딩이 끝난 뒤 기존 시트를 넘겨줍니다. CSSStyleSheet.media.mediaText로 준비된 시트를 활성화해 link.media 속성 변경에 따른 재요청을 피합니다. 캐시가 꺼진 경우에도 준비된 스타일을 유지합니다.

페이지별 CSS와 기존 공통 CSS를 함께 사용할 때도 모든 표시 프레임에서 `site.json.styles`의 순서를 유지합니다. 새 CSS를 head 끝에 붙였다가 상대경로 정리 후 순서를 바꾸면 제목 줄바꿈·본문 높이가 이동 직후 다시 바뀔 수 있습니다. 새 시트는 다음 재사용 시트 앞에, 상대경로 교체 시트는 기존 시트 바로 앞에 준비합니다. viewport·charset·브라우저 색상 메타는 노드를 유지하고 실제 값만 갱신합니다. 페이지 동작과 최소 글자 크기 보정 후 위치를 복원하며, 활성 서브메뉴 표시는 메뉴 레일의 가로 좌표만 움직입니다.

장식 초기화도 기존 DOM의 글자 크기 보정 클래스를 유지합니다. 회사 캡션의 `className`을 통째로 덮어써 `minimum-font-size`가 사라지면 글꼴 준비 후 다시 보정될 때 구간 높이가 5px 바뀌는 사례가 있어, `classList.add`로 장식 클래스만 추가합니다. 같은 번역 문구를 다시 설정하며 번역 자식 노드를 지우지 않습니다.

같은 문서의 하위 메뉴는 `INIT_PAGE.reveal`로 목적지와 상위 `.reveal` 요소의 opacity·transform 전환을 먼저 완료한 뒤 최종 위치로 스크롤합니다. 제목의 12px 등장 이동과 앵커 스크롤이 겹쳐 도착 위치가 달라지는 것을 막습니다. 대상 요소의 전환만 [getAnimations](https://developer.mozilla.org/en-US/docs/Web/API/Element/getAnimations)·[finish](https://developer.mozilla.org/en-US/docs/Web/API/Animation/finish)로 완료하며 기다리는 시간이나 화면을 덮는 전환을 추가하지 않습니다.

CSS 시트를 교체할 때 글꼴도 다시 등록되면 기본 글꼴과 웹 글꼴 사이에서 제목 줄 수가 두 번 바뀔 수 있습니다. `common.js`는 기존 CSS의 `@font-face`를 읽어 준비한 `FontFace`를 문서 수명 동안 유지합니다. 글꼴의 주소·내용 해시·설정이 같으면 같은 객체를 재사용하고, 바뀐 글꼴은 준비 후 화면 교체 시 적용합니다. 취소된 준비는 현재 글꼴을 바꾸지 않으며, 초기 직접 접속의 글꼴 오류는 CSS 대체 글꼴로 복구합니다. 글꼴 정의와 이미지·폰트 의존 해시의 원본은 계속 CSS 한 곳에 둡니다. [CSS Font Loading 규격](https://www.w3.org/TR/css-font-loading/)에 따라 수동 등록한 준비 완료 글꼴은 CSS 연결 시트가 교체돼도 유지됩니다.

모바일 하단 왼쪽 버튼은 홈 `서비스 보기` → 서비스 `솔루션 보기` → 솔루션 `사업분야 보기` → 사업분야 `채용 보기`로 다음 대메뉴를 연결합니다. 영어는 각각 `View services`, `View solutions`, `View business areas`, `View careers`입니다. 솔루션 상세 3개도 공통 `action-solutions-1`을 사용해 사업분야로 이동하며, 버튼 문구·경로는 `site.json.navigation`에서 함께 관리합니다.

하단 버튼 위치는 레이아웃 높이만 가정하지 않고 VisualViewport의 실제 표시 영역을 따릅니다. DevTools의 모바일 모드 전환·확대·화면 높이 변경 시 resize/scroll을 프레임 단위로 모아 갱신하고, 버튼 크기 관찰로 한영 줄바꿈·글꼴 변경 후의 본문 하단 여백도 확보합니다. 반응형 변경으로 화면에 들어온 reveal 콘텐츠는 같은 갱신에서 표시합니다. viewport 메타 재삽입·페이지 새로고침·캐시 강제 삭제를 사용하지 않으며 페이지 교체 시 이벤트·관찰자를 해제합니다.

`node scripts/test-responsive-viewport.cjs`는 Chromium·WebKit의 한영 12개 페이지에서 1440→390→320→810→가로 화면→390→1440 크기를 새로고침 없이 반복하고, Chromium DevTools의 PC→모바일 전환과 확대 후 실제 표시 영역을 검사합니다. 버튼 전체의 표시 범위·포인터 적중·본문 여백·숨은 콘텐츠·하단 순차 버튼의 좌표 클릭을 확인합니다. 결과는 `.tmp/responsive-viewport/`에 보관합니다. 실제 기기 및 DevTools UI 자체에서의 최종 확인은 별도입니다.

서브메뉴바는 대메뉴·솔루션 상세에서 공통 `--sub-navigation-height: 3.35rem`을 사용합니다. 솔루션만 별도의 높이나 여러 줄 제품명을 적용하지 않습니다. 긴 한국어·영어 메뉴명은 한 줄을 유지하고 메뉴 레일을 가로로 스크롤해 확인합니다. 상단 영역과 앵커 스크롤 여백도 같은 공통 높이를 참조합니다. `node scripts/test-sub-navigation-height.cjs`는 WebKit·Chromium의 320·390·768·810·1440px ko/en에서 페이지별 높이, 순차 하단 버튼·제품 탭 이동 중 표시 프레임과 텍스트 잘림을 검사합니다.

`node scripts/test-navigation-stability.cjs`는 WebKit의 iPhone·iPad와 Chromium의 Android 폰·태블릿 모의 환경에서 ko/en 전체 공개 페이지, 전체 메뉴의 모든 항목과 모든 하위 메뉴, 하단 왼쪽 순차 이동 버튼, 뒤로 가기와 화면 회전을 검사합니다. 같은 페이지의 구간 이동은 의도한 부드러운 스크롤과 이후의 위치 떨림을 구분해 검사합니다. 캐시를 끄고 교체 CSS 응답을 늦춰 중간 프레임의 CSS 순서·제목 및 스크롤 좌표·viewport 노드와 배율을 확인합니다. 결과와 화면은 `.tmp/navigation-stability/`에 보관합니다. 실물 기기의 주소창·네이버 인앱 브라우저 움직임은 별도 운영 확인이 필요합니다.

`node scripts/test-navigation-fonts.cjs`는 WebKit·Chromium의 ko/en에서 로드된 글꼴 객체의 재사용, 캐시 주소 유지, 새 해시의 글꼴 준비 후 교체, 준비 중 메뉴 조작, 글꼴 오류·취소 복구와 초기 직접 접속의 대체 글꼴을 검사합니다. 하단 버튼이 없는 넓은 iPad 화면에서는 전체 메뉴를 원래 크기로 점검하고, 하단 버튼은 좁은 분할 화면 크기에서도 확인합니다.

스크롤 좌표는 프레임마다 메모리에 갱신하고 방문 기록에는 최대 500ms 간격으로 저장합니다. 같은 상태의 `replaceState` 호출도 생략합니다. iPhone의 `history.replaceState()` 빈도 제한을 피하면서, 즉시 뒤로·앞으로 이동할 때는 메모리의 최신 위치를 복원하고 페이지를 떠날 때는 기록에 즉시 저장합니다. `node scripts/test-navigation-history.cjs`는 ko/en WebKit·Chromium에서 160프레임 연속 스크롤의 호출 빈도와 즉시 뒤로·앞으로 이동, pagehide 저장을 확인합니다.
캐시 버전에서 JavaScript 프로그램 자체의 변경이 감지되면 호환성을 위해 한 번 새 문서를 엽니다. 일반 메뉴 이동에서는 문서를 다시 열지 않습니다. 이 기능은 자체 호스팅 JavaScript와 정적 파일만 사용하며 서버 프로그램·프레임워크·서비스 워커를 추가하지 않습니다.

`validate.ps1`은 버전의 최신 여부도 검사합니다. 소스 수정 후 미리보기 전에 `scripts/update-asset-versions.ps1`을 실행하거나 패키징합니다. 이 도구들은 로컬 배포 준비용이며 홈페이지 실행에는 HTML·CSS·JavaScript와 정적 데이터만 필요합니다.

## 상대경로와 배포 위치

내부 메뉴·본문 링크·CSS·JS·이미지·사전은 현재 문서나 자산 기준 상대경로를 사용합니다. 공통 설정의 내부 경로는 사이트 루트 기준 상대경로이며 로더가 각 문서 깊이에 맞게 변환합니다. 같은 사이트의 도메인 절대 주소, `//도메인/...`, `/assets/...` 같은 도메인 루트 고정 경로를 넣지 않습니다. 외부 사이트·메일·전화 링크와 쿼리·앵커는 유지합니다.

검색 메타의 canonical·OG·JSON-LD URL·이미지·@id는 공식 `sitemapBaseUrl`에 기반한 HTTPS 절대주소입니다. `canonicalPath`·`ogImage`·`{"sitePath":"경로#식별자"}`의 편집 값은 공통 JSON의 루트 기준 상대경로로 유지하고 생성기·브라우저가 같은 주소로 변환합니다. 접속한 쿼리·앵커는 canonical에 따라붙지 않습니다. UI 링크·자산의 상대경로 규칙과 검색 메타를 구분합니다.

이 정책은 2026-10-27 네이버 SEO 요청으로 이전 상대 메타 정책을 대체합니다. 다른 도메인·다단계 폴더의 미리보기에서도 UI와 요청 자산은 미리보기 안에서 작동하고 검색 주소는 공식 도메인을 유지합니다. 사이트 실행 시 서버 프로그램·빌드 도구를 호출하지 않습니다.

`sitemapBaseUrl`은 정적·동적 메타와 sitemap·robots가 공유하는 검색 기준주소입니다. 공식 운영 위치가 바뀌면 이 값과 도메인 정규화 규칙을 검토합니다.

```json
"sitemapBaseUrl": "https://new.example/company/site/"
```

기준주소 수정 후 `build-site.ps1` 또는 패키징 명령으로 SEO·검색용 헤더 블록과 검색 안내 파일을 갱신합니다. 고유 본문은 수정하지 않습니다. 하위 경로 배포 시 도메인 루트 robots.txt의 Sitemap 연결도 확인합니다. [사이트맵 loc 규격](https://www.sitemaps.org/protocol.html#xmlTagDefinitions)을 따릅니다.

원본 응답의 검색 태그와 실행 후 다국어 메타를 각각 검증합니다. 소스·브라우저 검사 통과는 검색 결과나 공유 미리보기의 즉시 갱신을 보장하지 않습니다. 참고: [Google canonical 안내](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), [Open Graph 형식](https://ogp.me/).

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
node scripts/test-static-seo.cjs
node scripts/test-canonical-redirect.cjs
node scripts/test-asset-versions.cjs
node scripts/test-cache-transition.cjs
node scripts/test-prepared-navigation.cjs
node scripts/test-navigation-video.cjs
node scripts/test-navigation-styles.cjs
node scripts/test-navigation-stability.cjs
node scripts/test-navigation-fonts.cjs
node scripts/test-navigation-history.cjs
node scripts/test-sub-navigation-height.cjs
node scripts/test-responsive-viewport.cjs
node scripts/test-common-loader.cjs
node scripts/static-smoke.cjs
node scripts/test-relocation.cjs
```

공통 변경의 전파, 고유 본문 보존, ko/en, CSS·JS 중복 방지·순서, 메뉴 조작, 회사명·문의 줄바꿈과 상대경로 배포를 검사합니다. 검색 메타는 미리보기에서도 공식 주소를 유지하고 실제 화면 링크·자산은 미리보기 안에 남아야 합니다. `test-shared-head.ps1`은 공통 로더 검사 호환 명령이며 `sync-head.ps1`은 SEO/헤더 블록과 검색 안내 파일을 동기화합니다.

현재 공개 페이지는 12개, 사이트맵 대상은 제품 상세를 포함한 10개입니다. 개인정보·404는 noindex·사이트맵 제외를 유지합니다. 폐기된 인사이트·미사용 자산은 `templates/disabled-content/`에 보관하며 배포하지 않습니다. 과거 `templates/pages/`·`templates/partials/`는 현재 편집 원본이 아닙니다.

## 한국어·영어와 브라우저 기능

기본 언어는 한국어입니다. `assets/js/i18n.js`가 `assets/i18n/config.json`, `ko.json`, `en.json`을 로드해 본문·접근성 속성·메타데이터와 제품 이미지를 전환합니다. 선택 언어는 `localStorage`에 저장하고 `window.INIT_LANGUAGE`와 `window.INIT_I18N`으로 공유합니다. 서버 API·세션·DB를 사용하지 않습니다.

언어별 캡처는 `_kor.png`, `_eng.png` 쌍으로 관리하고 `data-i18n-image-base`는 현재 페이지 기준 상대경로를 사용합니다. 실행 문구는 `INIT_I18N.t("key")`를 사용합니다. 키보드·갤러리·라이트박스·skip link·reduced-motion을 유지하며, JavaScript 없이도 정적 검색 메타·헤더 링크·한국어 고유 본문을 제공합니다. 전체 UI와 언어 전환에는 JavaScript가 필요합니다.

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
