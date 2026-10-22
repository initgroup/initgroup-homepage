# AGENTS.md

이 문서는 Codex가 `initgroup-homepage` 저장소에서 작업할 때 자동으로 적용하는 프로젝트 전용 지침입니다.

## 작업 원칙

- 작업 전 `git status --short`로 변경 범위를 확인하고 사용자의 기존 변경사항을 되돌리지 않습니다.
- 사용자가 현재 요청에서 명시적으로 승인하지 않은 `git add`, `git commit`, `git push`와 `scripts/git-publish-main.ps1` 실행을 금지합니다.
- 새 문서와 코드는 UTF-8, 텍스트 줄바꿈은 LF로 작성합니다.
- 파일 검색은 `rg` 또는 `rg --files`를 우선 사용합니다.
- `.env`, 비밀 키, 인증서, 운영 캡처 원본과 개인정보를 읽거나 출력하거나 커밋하지 않습니다.
- 요청 범위 밖의 파일을 대량 정리하거나 기존 콘텐츠를 임의로 다시 쓰지 않습니다.

## Git 작업 절대 제한

- Codex는 어떤 작업을 완료하더라도 자동으로 또는 선제적으로 `git add`, `git commit`, `git push`를 실행하지 않습니다.
- `git tag`, `git merge`, `git rebase`, `git pull`과 `scripts/git-publish-main.ps1`도 사용자가 현재 요청에서 해당 명령의 실행을 명시적으로 요구한 경우에만 실행합니다.
- “수정해줘”, “완료해줘”, “반영해줘”, “배포 준비해줘” 같은 일반적인 작업 요청은 스테이징·커밋·푸시에 대한 승인으로 해석하지 않습니다.
- 이전 대화나 과거 요청에서 받은 Git 실행 승인은 현재 요청으로 이어서 적용하지 않으며, 매번 현재 요청의 명시적 지시를 확인합니다.
- 검증이 성공했거나 작업이 완성된 경우에도 변경 파일은 기본적으로 unstaged·uncommitted 상태로 남겨 둡니다.
- 읽기 전용 명령인 `git status`, `git diff`, `git log`는 변경 범위와 이력을 확인하기 위해 사용할 수 있습니다.
- 사용자가 커밋을 요청하더라도 대상 파일이나 커밋 범위가 불명확하면 임의로 전체 파일을 스테이징하지 않고 먼저 확인합니다.
- 최종 답변에는 Git 변경사항을 자동으로 커밋하거나 푸시하지 않았음을 명시합니다.

## 프로젝트 성격과 구조

- 인아이티 기업 홈페이지 전용 정적 HTML MPA 프로젝트입니다.
- 홈페이지는 HTML·CSS·JavaScript와 정적 JSON·자산만으로 동작합니다. PHP·Python·서버 애플리케이션·DB·Node.js 실행을 연동하지 않습니다. 로컬 검증·ZIP 작성 도구는 배포하거나 사이트 실행 조건으로 추가하지 않습니다.
- Oracle DB, 인증 포털과는 분리되어 있으며 현재 공개 페이지는 DB나 세션에 의존하지 않습니다.
- 각 공개 URL은 디렉터리별 `index.html`로 제공합니다.
- 공개 index.html·404.html이 본문의 편집 원본입니다. 공통 설정은 assets/shared/site.json 한 파일, 반복 HTML은 assets/shared/layout.html, 로더는 assets/js/common.js입니다. 공개 파일 추가·삭제 시 static-files.json도 갱신합니다.
- 로컬 서버와 검증, 백업, Git 배포 자동화는 `scripts/*.ps1`과 `.vscode/tasks.json`에서 관리합니다.
- Node.js, npm, 번들러 또는 외부 UI 프레임워크를 필수 실행 조건으로 추가하지 않습니다.
- 한국어·영어 지원은 DB나 세션 없이 `assets/i18n/config.json`, `ko.json`, `en.json`과 `assets/js/i18n.js`로 제공합니다.

## HTML·CSS·JavaScript 기준

- 공통 로더 완료 후 DOM에는 title, description, canonical, viewport, 정확히 하나의 h1과 main을 유지합니다. 원본 HTML에는 고유 본문과 로더 참조·공통 include 자리만 둡니다.
- 내부 링크와 자산은 현재 HTML·CSS 기준 상대경로를 사용합니다. canonical·OG·JSON-LD의 같은 사이트 주소도 문서 기준 상대경로로 생성합니다. sitemap·robots의 검색 안내 주소만 아래 규격 예외를 따릅니다.
- 인라인 실행 JavaScript를 추가하지 않고 `assets/js/`의 자체 호스팅 파일을 사용합니다.
- 이미지에는 용도에 맞는 `alt`를 제공하고 공개 승인되지 않은 개인정보·운영 식별자를 포함하지 않습니다.
- 키보드 조작, 포커스 표시, skip link, `prefers-reduced-motion`을 훼손하지 않습니다.
- CSS는 기존 선택자와 cascade를 먼저 추적해 원본 규칙을 수정하며 중복 override를 누적하지 않습니다.
- 전역 설명 글자색은 `assets/css/site.css`의 `--text-description`에서 제어합니다. 페이지별 설명·캡션 규칙과 디자인 테마는 이 공통 변수를 참조하며, 어두운 제품 도식·영상 모달의 대비색은 별도로 유지합니다.
- 외부 CDN이나 새 외부 요청을 추가할 때는 CSP, 개인정보, 가용성과 라이선스를 먼저 검토합니다.

## 공통 HTML·메뉴·head와 줄바꿈 유지 기준

- 각 공개 HTML의 head에는 내용 해시 쿼리가 붙은 assets/js/common.js 상대경로와 data-page-file을 가진 script 참조 한 개만 둡니다. 메타·CSS·아이콘·JSON-LD·추가 스크립트 목록을 각 HTML에 다시 복제하지 않습니다.
- 공통 메타·CSS·JS 참조와 페이지별 예외, sitemapBaseUrl은 assets/shared/site.json에서 관리합니다. 대메뉴·서브메뉴·전체 메뉴·모바일 버튼은 같은 파일의 navigation에서 이름·경로·순서를 관리하고 label.ko·label.en을 함께 수정합니다.
- navigation.* 번역을 ko.json·en.json에 중복 저장하지 않습니다. 브라우저 로더가 공통 정의에서 번역을 구성합니다. 일반 본문·메타 번역은 기존 두 사전에 함께 반영합니다.
- 반복되는 HTML은 assets/shared/layout.html의 template 모듈로 분리하고 각 페이지에서는 `<template data-site-include="header"></template>`처럼 참조합니다. 중첩 모듈·경로·문구 토큰은 README의 규칙을 따릅니다.
- 수정은 공통 파일 저장과 새로고침으로 반영되어야 합니다. HTML을 펼쳐 쓰는 생성기를 다시 만들거나 PHP·SSI·서버 include로 바꾸지 않습니다. 사이트 실행 시 PowerShell·Python·Node.js·빌드 도구를 호출하지 않습니다.
- JavaScript가 꺼지면 고유 본문은 남지만 공통 메뉴·스타일·검색 메타는 구성되지 않습니다. 이 제약을 숨기거나 초기 응답에 검색 메타가 있다고 보고하지 않습니다. 원본 태그 반복과 서버 프로그램 연동을 금지한 최신 사용자 요청을 우선합니다.
- CSS·JS 본문 코드는 기존 공통 자산에서 수정합니다. 로더가 공통 HTML 구성 후 스크립트를 정의된 순서로 한 번씩 실행하고 INIT_SITE_READY로 준비 완료를 제공합니다. 중복 로더 실행도 기능·이벤트를 중복 등록하지 않아야 합니다.
- 공통 스타일은 공통 CSS 변수와 원본 규칙으로 제어합니다. 페이지별 인라인 스타일이나 중복 override를 추가하지 않습니다. HTML·site.json은 캐시 재검증을 사용하고 내용 해시가 붙은 자산은 캐시를 재사용합니다. 페이지별 버전 문자열을 수동 관리하지 않습니다.
- scripts/build-site.ps1과 sync-head.ps1은 sitemap·robots 갱신용 호환 도구일 뿐 HTML을 수정하지 않습니다. 공통 변경 후 validate.ps1, test-common-loader.cjs, static-smoke.cjs로 한 곳 변경 전파·HTML 불변·ko/en·PC/모바일·스크립트 순서와 중복 방지를 검증합니다.
- ㈜인아이티와 (주) 인아이티는 .company-name으로 묶어 법인 표시와 회사명이 분리되지 않도록 합니다. 회사명 포함 번역 문장은 data-i18n과 한국어 span을 사용하고 기능 요소를 번역 span 안에 넣지 않습니다.
- 문의 마지막 제목은 .heading-lines > .heading-line의 네 문맥 구간을 유지합니다. 한국어 PC의 네 줄과 좁은 화면의 추가 줄바꿈, 자연스러운 영어 흐름을 확인합니다. corporate.css에서 제목 칸의 폭과 균형 줄바꿈을 제어하며 72rem 이하에서는 이메일 영역을 아래로 배치해 마지막 서술어만 고립되지 않도록 합니다.

## 캐시와 화면 전환 유지 기준

- package-static.ps1은 update-asset-versions.ps1을 호출해 자산별 SHA-256 앞 16자리와 site.json의 assetVersions를 갱신합니다. 내용이 같으면 버전과 파일 수정 시각을 유지합니다. 날짜·난수·접속·mtime으로 버전을 올리지 않습니다.
- CSS의 이미지·폰트 참조와 CSS 자체 버전은 의존 파일 변경을 반영합니다. common.js가 바뀔 때 공개 HTML의 해당 script 쿼리만 갱신하며 본문·공통 head·메뉴를 펼쳐 쓰지 않습니다. assetVersions는 직접 편집하지 않습니다.
- 새 동적 자산은 INIT_ASSETS.url로 연결하고 내부 경로·쿼리·앵커를 보존합니다. HTML·site.json과 버전 없는 주소는 재검증하고, 해시가 붙은 공개 자산만 장기 캐시합니다. 서비스 워커나 별도 서버 프로그램을 추가하지 않습니다.
- 내부 메뉴는 현재 화면을 유지한 채 다음 정적 HTML·공통 모듈·양 언어 사전·CSS·이미지를 준비하고 한 번에 교체합니다. 전환 중 현재 문서를 비우거나 body 전체의 opacity를 낮추는 등장 효과를 넣지 않습니다. 초기 직접 접속 시에만 준비 전 HTML·기본 언어 노출을 막으며, 실패·시간 초과 시 고유 본문을 복구합니다.
- common.js의 INIT_SITE_ENGINE과 navigation.js가 문서 준비·주소·히스토리를 관리합니다. 각 URL의 정적 HTML 직접 접속을 보존하고 같은 페이지 메뉴·앵커도 불필요하게 재로딩하지 않습니다. document.startViewTransition이 없어도 같은 준비 후 교체 동작을 지원합니다. JavaScript 버전이 바뀐 배포 때만 호환성을 위한 전체 문서 갱신을 허용합니다.
- 페이지 동작은 INIT_PAGE.register로 등록하고 정리 함수를 반환합니다. INIT_PAGE.scope의 listen·frame·observe로 전역 이벤트·프레임·관찰자를 정리해 중복 초기화를 막습니다. 번역은 INIT_I18N.prepare로 다음 문서에서 준비하고 교체 후 활성화합니다. 로딩 실패·취소 시 기존 화면·주소를 유지합니다.

- 경로 깊이가 바뀔 때 활성 CSS의 href를 직접 바꾸거나 재삽입해 스타일을 잠깐 해제하지 않습니다. 계산된 임시 URL로 준비한 시트를 유지하고, 최종 상대경로 링크까지 로딩된 뒤 넘겨줍니다. CSSStyleSheet.media.mediaText로 활성화하고 link.media 속성 변경으로 재요청을 유발하지 않습니다. 최종 DOM의 자산 참조는 상대경로이며 캐시가 없어도 스타일이 유지되어야 합니다.
- 앵커·새 탭·수정 키 클릭·다운로드와 브라우저 기본 이동을 보존하고, pageshow의 뒤로 가기 복원 및 reduced-motion을 처리합니다.
- 변경 후 test-asset-versions.cjs, test-cache-transition.cjs, test-prepared-navigation.cjs, test-navigation-styles.cjs, test-navigation-video.cjs와 기존 공통·상대경로·ko/en PC/모바일 검사를 실행합니다. 기존 캐시·변경 없는 재방문·지연 응답에서 현재 화면 유지·준비된 단일 교체·실제 표시 프레임·같은 문서 유지·메뉴/서브메뉴·뒤로/앞으로 가기·스크롤·실패 복구·전환 API 없는 경우를 검증합니다.

- 홍보영상은 상대경로를 유지하고 사용자 클릭 안에서 src 설정·load()·play()를 실행합니다. play() 거절도 미디어 오류와 함께 처리하며 두 언어의 재시도·새 창 열기를 제공합니다. 영상 테스트는 실제 currentTime 증가, 재시도 및 페이지 교체 시 정리까지 검증합니다.

## 상대경로와 배포 주소 유지 기준

- 같은 사이트의 이동 링크와 자산은 현재 HTML·CSS·스크립트 기준 상대경로로 작성합니다. 운영 도메인이 포함된 절대 주소, `//도메인/...`, `/assets/...`·`/solutions/...` 같은 도메인 루트 고정 경로를 넣지 않습니다. 쿼리·앵커는 보존하고 외부 사이트·메일·전화 링크는 원래 형식을 유지합니다.
- JavaScript가 생성하는 경로도 문서 또는 스크립트 위치와 상대경로로 계산합니다. 브라우저가 `href`/`src` 프로퍼티를 절대 주소로 해석하는 동작과 소스의 도메인 하드코딩을 혼동하지 않습니다.
- 2026-10-22 최신 요청에 따라 검색·공유 메타도 상대경로로 생성합니다. canonical href, OG content, JSON-LD의 같은 사이트 URL·이미지·@id에 도메인이나 루트 고정 경로를 넣지 않습니다. canonicalPath·ogImage와 JSON-LD의 {"sitePath":"경로#식별자"}는 공통 JSON에서 사이트 루트 기준 상대경로로 관리하고 로더가 현재 문서 기준으로 바꿉니다. 홈은 빈 주소가 아닌 ./를 사용하고 쿼리·앵커를 canonical에 남기지 않습니다. schema.org 어휘 식별자는 외부 표준 URL로 유지합니다.
- 도메인·하위 경로 이동 시 페이지 메타의 설정 변경은 필요 없습니다. sitemap.xml의 loc와 robots.txt의 Sitemap만 규격상 절대 URL을 유지하며 assets/shared/site.json의 sitemapBaseUrl에서 계산합니다. 이 값은 브라우저 메타·내비게이션에 사용하지 않습니다. build-site.ps1은 검색 안내 파일만 갱신합니다. 개인정보·404의 noindex 및 사이트맵 제외를 유지합니다.
- 상대 메타가 새 도메인·다단계 경로·명시적 index.html·디렉터리 URL·쿼리·앵커에서 같은 대상을 가리키는지 ko/en으로 검사합니다. JavaScript 생성·상대 OG의 검색 및 공유 수집기 지원은 보장하지 않습니다.
- 경로 관련 수정 뒤 `scripts/validate.ps1`, `scripts/test-relative-paths.ps1`, `scripts/test-shared-head.ps1`, `scripts/test-relocation.cjs`로 상대경로, 쿼리·앵커, 새 도메인·다단계 하위 경로, 한국어·영어 PC·모바일을 검증합니다. 미리보기 서버 포트는 계속 8200만 사용합니다.

## 다국어 콘텐츠 기준

- 홈페이지의 모든 공개 페이지는 한국어(`ko`)와 영어(`en`) 두 언어를 항상 함께 지원합니다. 사용자가 한 언어의 문구나 화면만 제시하더라도 모든 홈페이지 수정은 두 언어에 함께 반영하는 것을 기본 작업 범위로 합니다.
- 문구·회사명·제품명·버튼·메타데이터·이미지·기능을 추가·수정·삭제할 때 한국어와 영어의 대응 콘텐츠 및 동작을 함께 갱신하며, 한 언어에만 반영한 상태로 작업을 완료하지 않습니다.
- 레이아웃·CSS·반응형 수정은 한국어와 영어의 문장 길이 차이를 고려하고, 변경 영역을 두 언어의 데스크톱·모바일 화면에서 모두 확인해 줄바꿈·간격·정렬·잘림·가로 넘침과 언어 전환을 검증합니다.
- 작업 완료 전 두 언어의 반영 여부를 확인하고 최종 답변에 함께 반영·검증했는지 명시합니다. 실행 환경 문제로 확인하지 못한 항목은 검증 완료로 표현하지 않고 제한 사항을 알립니다.
- 기본 언어는 한국어(`ko`)이며 공개 HTML은 한국어 원문과 하나의 콘텐츠 구조만 유지합니다. 언어별 HTML, JavaScript 또는 페이지 복사본을 만들지 않습니다.
- 사용자의 선택 언어는 `assets/i18n/config.json`에 정의한 키로 `localStorage`에 저장하며 현재 값은 `window.INIT_LANGUAGE`와 `window.INIT_I18N`에서 공유합니다.
- 일반 화면 문구를 추가하거나 한국어 원문을 바꾸면 assets/i18n/ko.json과 en.json의 같은 고유 key에 원문과 자연스러운 영어 번역을 함께 작성합니다. 공통 메뉴의 navigation.* key는 assets/shared/site.json의 두 언어 메뉴 정의를 브라우저에서 읽어 구성합니다.
- 실행 중 JavaScript가 만드는 문구는 한국어·영어를 조건문으로 하드코딩하지 않고 `window.INIT_I18N.t("key")`를 사용합니다.
- 언어별 제품 캡처는 같은 경로에 `_kor.png`, `_eng.png` 쌍으로 두고 템플릿의 한국어 `src`와 `data-i18n-image-base` 하나로 연결합니다. 언어와 무관한 이미지는 접미사와 해당 속성 없이 공용으로 사용합니다.
- 캡처 이미지의 `alt`, `aria-label`, title, description과 버튼 문구는 두 언어 사전에 포함합니다.
- 언어 사전 변경 후 `scripts/build-site.ps1`, `scripts/validate.ps1`을 실행해 key 일치, 번역 누락과 기본 HTML 계약을 확인합니다.

## 콘텐츠·배포 기준

- 회사 정보, 인증, 프로젝트, 연락처, 채용 정보는 공개 승인된 내용만 사용합니다.
- 제품 화면을 추가하기 전에 직원명, DB·스키마명, 계정, 권한, 고객 데이터가 없는지 확인합니다.
- 새 페이지나 URL을 추가하면 내비게이션, `sitemap.xml`, canonical, 404 및 내부 링크를 함께 확인합니다.
- 운영 배포 전에 `robots.txt`, sitemap 도메인, 개인정보처리방침과 보안 응답 헤더를 검토합니다.

## 공개 범위와 검색 정보

- 공개 파일은 `static-files.json`을 기준으로 하며, 비공개 보관본은 `templates/disabled-content/`에 둡니다. 현재 숨긴 인사이트 페이지와 미사용 자산을 배포 목록에 다시 넣지 않습니다. 보관한 미사용 자산의 이전 URL도 Apache 410 설정을 유지합니다.
- sitemap.xml은 2026-10-22 사용자가 재확인한 캡처에 맞춰 홈(/) → 회사(company/) → 서비스(services/) → 솔루션(solutions/) → 사업분야(projects/) → 채용(careers/) → 문의(contact/)의 7개 주소만 이 순서로 포함합니다. assets/shared/site.json의 sitemapPages에서 대상과 순서를 관리하며 공개 페이지 전체를 자동 등록하거나 알파벳순으로 정렬하지 않습니다.
- 제품 상세 3개의 공개·canonical 설정은 유지하되 사이트맵에는 추가하지 않습니다. 개인정보 안내와 404 안내는 `noindex,follow`로 유지하며 사이트맵에서 제외합니다. 패키징 후에도 승인된 7개 URL과 순서가 유지되는지 확인합니다.
- title·description·OG·페이지 JSON-LD는 실제 화면 내용과 맞추고 한국어·영어를 함께 반영합니다. 제품 공유 이미지는 현재 공개한 화면만 사용합니다.
- 별도 언어 URL이 없으므로 같은 URL에 가상의 언어별 `hreflang`을 만들지 않습니다. 확인되지 않은 변경 날짜와 불필요한 sitemap 우선순위·빈도를 추가하지 않습니다.
- `/insights/`는 공개 종료 경로입니다. Apache 410 설정을 유지하며 robots.txt로 재수집을 막지 않습니다. 운영 업로드 시 예전 파일이 남지 않도록 확인합니다.

## 개발환경과 검증

```powershell
.\scripts\build-site.ps1
.\scripts\update-asset-versions.ps1
.\scripts\validate.ps1
.\scripts\serve.ps1 -Port 8200
```

- 이 프로젝트의 로컬 홈페이지 포트는 항상 `8200`으로 유지합니다. Codex의 미리보기, 브라우저 확인, Playwright·시각 회귀 검증 URL도 `http://127.0.0.1:8200/`을 사용하고 8201·8203 같은 대체 포트를 임의로 만들지 않습니다.
- 서버 재시작이 필요하면 실행 전에 사용자에게 먼저 확인하고, 현재 요청에서 명시적으로 승인받은 경우에만 `.\scripts\serve.ps1 -Port 8200 -Restart`를 실행합니다.
- 8200을 다른 프로세스가 점유했거나 권한 문제로 재시작할 수 없으면 정확한 점유 프로세스를 확인하고 사용자에게 알립니다.
- `scripts\backup-source.ps1 -Mode Working`은 미커밋 파일까지 백업합니다.
- `scripts\backup-source.ps1 -Mode Git`은 커밋된 소스와 Git bundle을 백업합니다.
- `git-publish-main.ps1` 실행 자체가 add·commit·pull --rebase·push에 대한 명시적 지시입니다. Codex는 사용자가 현재 요청에서 실행을 명시적으로 요구한 경우에만 이 스크립트를 실행합니다.

모든 최종 답변 마지막에는 `Usage 확인: VS Code Codex 입력창에서 /status` 문구를 반드시 추가합니다.
