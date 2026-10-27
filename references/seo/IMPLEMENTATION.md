# 2026-10-27 네이버 검색정보 개선 적용 기록

적용 요청: [사용자 전달 문서](INIT_Naver_SEO_Codex_Handoff_20261027.md). 실제 운영은 **카페24 정적 호스팅**이다. 문서의 Render 전제는 적용하지 않았다.

## 적용 범위와 변경 파일

| 파일 | 변경 내용과 이유 |
| --- | --- |
| `assets/shared/site.json` | 페이지별 제목·설명 키, 정적 링크의 기존 메뉴/번역 참조, 사이트맵 10개와 순서 관리 |
| `assets/i18n/ko.json`, `en.json` | 실제 페이지 내용에 맞춘 고유 SEO 제목·설명 20개씩 추가. 기존 화면 번역 값은 유지 |
| 공개 HTML 12개 | 초기 응답에 title·description·절대 canonical·OG·JSON-LD와 실제 메뉴 링크 제공. 개인정보·404는 noindex 유지 |
| `scripts/sync-seo.ps1` | 공통 설정에서 `site:seo`·`site:header` 블록만 동기화. 본문·전체 UI를 다시 생성하지 않음 |
| `scripts/build-site.ps1`, `sync-head.ps1`, `update-asset-versions.ps1` | 배포 준비 시 정적 검색 블록 동기화 후 기존 내용 해시 계산. 수정 없는 파일의 바이트·mtime 유지 |
| `assets/js/common.js` | 초기 정적 메타를 찾아 갱신하고 헤더를 기존 UI로 한 번 교체. viewport 노드를 유지하며 태그 중복 방지 |
| `sitemap.xml` | 기존 7개 순서 뒤 인에디타원·인법스·인서베이원 상세를 추가해 10개. 임의 lastmod 없음 |
| `.htaccess` | 공식 호스트의 HTTP·www를 HTTPS 비www로 301 정규화. 경로·쿼리 유지, 프록시 HTTPS 루프 방지 |
| `scripts/validate.ps1`, `scripts/lib/check-metadata.cjs`, `test-common-loader.cjs`, `test-relocation.cjs` | 최신 정적 SEO·공식 검색주소 정책 검사. UI·자산의 상대경로 검사는 유지 |
| `scripts/test-static-seo.cjs`, `test-canonical-redirect.cjs`, `test-production-seo.ps1` | 원본 응답·생성기 불변성·301 규칙·업로드 후 실제 HTTP 검증 추가 |
| `README.md`, `AGENTS.md`, `references/seo/` | 이전 상대 메타·사이트맵 7개 정책을 이번 요청 범위에서 갱신. 카페24 업로드와 네이버 재수집 절차 구분 |

공개 HTML은 `/`, `company/`, `services/`, `solutions/`, `projects/`, `careers/`, `contact/`, `solutions/data-editing-system/`, `solutions/inbups/`, `solutions/in-surveyone/`, `privacy/`, `404.html`이다. 초기 원본은 기본 언어인 한국어를 제공하며, 실행 후 영어 제목·설명·메뉴·접근성 속성은 기존 언어 선택에 따라 갱신한다. 별도 언어 URL이나 가상의 hreflang은 추가하지 않았다.

검색 주소만 `site.json.sitemapBaseUrl`을 기준으로 절대주소를 사용한다. 화면 링크·이미지·CSS·JS·영상·폰트는 상대경로와 기존 내용 해시 캐시를 유지한다. 서버 프로그램·서비스 워커·외부 CDN을 추가하지 않았다.

## 최근 버그 수정 보존

이번 SEO 작업에서 CSS 전체와 `navigation.js`, `site.js`, `i18n.js`, `design.js`를 변경하지 않았다. `common.js`의 수정은 메타 갱신·검색주소 변환·정적 헤더 자리 교체에 한정했다. 공개 본문의 문구·구조도 보존했다.

- 변경 전후 PC Chromium·Android Chromium·iPhone WebKit·iPad WebKit의 12페이지 × 한국어/영어, 총 **96개 화면은 픽셀 차이 0**, 제목·좌표·치수도 동일했다.
- 기존 내용 해시 캐시·배포 변경 감지·느린 응답 중 현재 화면 유지·단일 화면 교체·실패 복구 검사를 통과했다.
- CSS 준비·적용 순서, 폰트 고정, viewport 수명, 실제 홍보영상 재생·정리, 브라우저 뒤로/앞으로 스크롤 복원 검사를 통과했다.
- 순차 모바일 하단 버튼, 전체 메뉴·서브메뉴·구간 이동과 서브메뉴 높이도 기존 검사를 그대로 실행해 통과했다. 화면 전환 검사의 허용 오차나 클릭 검사를 완화하지 않았다.

에뮬레이션은 Playwright의 Chromium/WebKit 엔진으로 실행했다. 실제 아이폰·안드로이드·태블릿 하드웨어 및 각 인앱 브라우저에서 직접 조작한 결과로 표현하지 않는다.

## 로컬 검증과 배포 파일

프로젝트 루트에서 실행한다. 서버가 필요한 검사는 기존 `http://127.0.0.1:8200/`을 사용하며 서버 재시작이 필요하면 프로젝트 승인 규칙을 따른다.

```powershell
.\scripts\build-site.ps1
.\scripts\update-asset-versions.ps1
.\scripts\validate.ps1
.\scripts\test-relative-paths.ps1
.\scripts\test-shared-head.ps1
node scripts/test-static-seo.cjs
node scripts/test-canonical-redirect.cjs
.\scripts\package-static.ps1
```

기존 PC/모바일·한영·캐시·화면 전환·폰트·히스토리·영상 검사 명령은 README를 따른다. Playwright 설치는 로컬 검증용이며 카페24 실행 조건이 아니다.

정적 SEO 검사는 JavaScript를 끈 12개 원본 응답, 고유 제목·설명, 10개 실제 메뉴 링크, 현재 제품명, noindex 2개, 사이트맵 10개를 확인한다. 별도 복사본에서 생성기 반복 실행의 바이트·mtime 불변과 공통 설정 변경 시 본문 보존도 검사한다. 301 검사는 **54개 규칙 사례**를 통과했지만, 로컬 Apache 실행 검사가 아니므로 카페24 HTTP 검증을 대체하지 않는다.

실행 결과 기록:

| 검사 | 결과 |
| --- | --- |
| 원본 정적 SEO·생성기 반복 실행 | 12페이지 통과, 고유 검색 제목·설명 10개, noindex 2개 |
| 공통 로더·상대경로·이전 배포 위치 호환 | 통과. 재배치 48개, PC/모바일·한영 smoke 96개 |
| 자산 버전·캐시 전환·변경 감지 | 통과. 같은 내용의 해시·mtime 유지, HTML 단독 변경, 변경 파일 자동 갱신, 오프라인·실패 복구 |
| 준비 후 화면 전환 | 192개 통과. 느린 응답·전환 API 없는 경우·실제 메뉴 클릭·같은 문서 유지 |
| CSS 전환 프레임 | 149개 표시 프레임 통과. 캐시 없는 지연 응답에서도 스타일 유지 |
| 폰트·히스토리 | Chromium/WebKit × 한국어/영어 통과. 느린 폰트·iPhone 히스토리 호출 제한·즉시 뒤로 가기 포함 |
| 실제 영상 재생 | ko/en PC/모바일·상대 배포 경로·재시도·페이지 이동 정리 24개 통과 |
| 서브메뉴 높이 | Chromium/WebKit, 320·390·768·810·1440px, 한영 312개 통과 |
| 메뉴 이동 직후 위치 안정성 | iPhone·Android·iPad·Android 태블릿, 한영 총 632개 통과. 모든 프로필에서 추가 위치 변화 최대 0px |
| 모바일 경계 동작 | Chromium/WebKit 통과. 빠른 연속 탭·느린 이미지·실패 복구·키보드 포커스 유지 |
| 소스·배포 파일 대조 | 본문 12개 보존, CSS/동작 파일 14개 바이트 동일, 이전 번역 1,226개씩 동일, ZIP 98개 파일 일치 |

생성 결과는 내용이 같은 재실행에서 갱신 파일 0개였고 `git diff --check`도 통과했다.

배포 결과물은 `dist/cafe24-static.zip`과 `dist/site/`이다. `static-files.json`의 공개 파일 98개만 포함한다. 스크립트·참조 문서·비공개 캡처·설치 환경은 포함하지 않는다.

## 실제 운영 상태와 카페24 업로드

**2026-10-27 업로드 전 읽기 전용 검사 결과:** 운영은 아직 이전 소스이며 정적 SEO 블록이 없다. 사이트맵은 7개, HTTP·www 세 변형은 301 대신 200을 반환했다. 운영 핵심 JS/CSS 내용 해시도 현재 로컬과 달랐다. 따라서 이번 검색 개선뿐 아니라 최신 모바일 버그 수정 파일도 전체 묶음으로 업로드해야 한다. 이를 브라우저 캐시 문제로 단정하거나 강제 캐시 삭제로 처리하지 않는다.

운영 `robots.txt`는 수집 허용을 유지했고, `/html/About.html`·`/html/Solution.html`은 404, `/insights/`는 410이었다. 현재 정상인 폐기 경로를 홈으로 일괄 리디렉션하지 않는다.

1. 카페24 기존 공개 파일을 백업한다.
2. ZIP 내부의 **내용물** 또는 `dist/site/`의 **내용물**을 실제 웹 루트에 업로드한다. `site` 폴더 자체를 한 단계 더 만들지 않는다. 숨김 파일 `.htaccess`, 12개 HTML, `assets/shared/site.json`, 변경 자산, `sitemap.xml`을 함께 반영한다.
3. 기존 공개 종료 파일을 다시 업로드하지 않고 기존 410 규칙을 유지한다. 카페24 관리 기능에 중복 리디렉션이 있다면 단일 이동과 루프 여부를 확인한다.
4. 아래 읽기 전용 운영 검사를 실행한다. 실패하면 업로드 완료로 보고하지 않는다.

```powershell
.\scripts\test-production-seo.ps1
```

검사는 실제 HTTP 원본 title·description·canonical·링크, 사이트맵 10개, 수집 허용, 폐기 경로, 세 별칭의 단일 301과 경로·쿼리 보존, 주요 자산의 설정 해시 및 실제 응답 바이트를 확인한다. `.tmp/seo-production.json`에 결과를 기록한다. 업로드 전 상태만 기록하려면 `-ReportOnly`를 사용한다. 이 옵션의 종료 성공은 검증 항목의 통과를 뜻하지 않으므로 보고서의 `passed`를 확인한다.

이 작업에서는 카페24 파일 업로드·호스팅 설정 변경을 실행하지 않았다. 운영 Apache/프록시/SSL 설정에 따라 `.htaccess`의 실제 응답 검증이 남아 있다.

## 배포 후 네이버 재수집

1. 소유확인된 네이버 서치어드바이저의 `https://initgroup.kr` 사이트를 선택한다.
2. 공개 `sitemap.xml`이 최신 10개인지 확인한 뒤 제출한다.
3. 홈 → 솔루션 → 인에디타원 상세를 우선해 웹페이지 수집을 요청한다.
4. URL 검사에서 수집·색인 상태와 제목·설명을 확인하고 검색 결과의 서브링크를 추후 확인한다.

이번 작업에서 네이버 계정 접속·사이트맵 제출·재수집 요청을 실행하지 않았다. 실제 소유확인 값이 제공되지 않아 `naver-site-verification` 값을 임의 생성하지 않았다. 소유확인 태그가 필요하면 실제 값을 공통 메타 설정에 넣고 정적 SEO를 다시 동기화한다.

과거 명칭은 공개 콘텐츠에서 발견되지 않았다. 비공개 원본/이 전달 문서의 역사적 언급과 기존 폐기 자산 410 규칙은 별개로 유지한다. `nosublinks`, 전체 수집 차단, 전체 noindex, 서브링크 삭제 신고는 적용하지 않았다. 검색엔진의 기존 색인과 서브링크는 코드 수정이나 브라우저 캐시 삭제로 즉시 바꿀 수 없으며 반영 시점은 보장하지 않는다.

공식 안내: [서브링크](https://searchadvisor.naver.com/guide/faq-sublink), [JavaScript 검색 최적화](https://searchadvisor.naver.com/guide/seo-advanced-javascript), [대표주소와 301](https://searchadvisor.naver.com/guide/seo-basic-create), [사이트 소유확인](https://searchadvisor.naver.com/guide/faq-start-register).

Git 변경은 자동 스테이징·커밋·푸시하지 않는다.

## 후속 모바일 수정

위 화면 96개·CSS/동작 파일 바이트 동일 결과는 SEO 단독 작업 시점의 보존 검사다. 이후 사용자가 요청한 하단 버튼 잘림·반응형 전환 개선으로 공통 `site.js`·`site.css`를 수정했고, 최신 ZIP에는 이 후속 수정도 포함한다. VisualViewport에 맞춘 버튼 위치, 실제 버튼 높이에 따른 하단 여백과 resize 후 콘텐츠 표시를 보완했다. 후속 재현·검사 방법은 README의 `test-responsive-viewport.cjs`를 따른다. 기존 SEO·캐시·화면 전환 검사를 함께 재실행한다.

후속 재현에서는 Chromium의 실제 확대 API로 표시 높이를 556px로 줄였을 때 기존 버튼이 695px 아래쪽에 남았고, 수정 후 버튼 하단은 556px·폭은 실제 표시 너비 312px에 맞았다. 이 조건은 단순한 window resize만으로는 확인되지 않는다. DevTools UI 자체의 모든 배율/버전 문제를 재현했다고 해석하지 않는다.

후속 반응형 검사는 Chromium 268개·WebKit 196개, 총 464개를 통과했다. 한영 12개 페이지에서 새로고침 없는 크기 전환, 버튼 전체 표시·클릭 좌표·푸터 여백을 확인했다. 확대를 유지한 한영 10개 페이지 교체도 통과했다. 기존 캐시·준비 후 교체 192개·공통 로더·SEO·재배치·한영 smoke·폰트·히스토리·실제 영상 재생 24개·서브메뉴 높이 312개 검사도 다시 통과했다. ZIP의 공개 파일 98개는 현재 소스와 바이트가 일치한다. 카페24 업로드는 여전히 별도이며 Git 스테이징·커밋·푸시는 실행하지 않았다.

전체 메뉴 이동 안정성도 iPhone·Android 폰·iPad·Android 태블릿의 한영 총 632개를 다시 통과했으며, 모든 프로필의 이동 직후 추가 위치 변화는 최대 0px였다.
