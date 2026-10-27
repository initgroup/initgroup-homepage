# 인아이티 홈페이지 네이버 검색정보 갱신 및 SEO 구조 개선 — Codex 작업 지시서

- 대상 사이트: https://initgroup.kr/
- 작성일: 2026-10-27 (KST)
- 목적: 네이버에서 `인아이티` 검색 시 노출되는 과거 서브링크 **`인뎁스 IN-DEPS`**를 현재 제품명 **`인에디타원 IN-EDITAONE`**으로 갱신하도록 홈페이지의 검색 수집 구조를 정비한다.
- 작업 성격: 기존 디자인·기능을 유지한 채 소스·SEO·리디렉션·사이트맵을 수정하고 운영 배포 후 검증한다.

## 1. 증상과 확인된 원인

2026-10-27 네이버 검색 화면에서 메인 검색 결과의 제목은 `인아이티 | 데이터 인텔리전스 운영 환경 구축 전문기업`으로 표시되지만, 제목 아래 자동 생성되는 서브링크(하위 메뉴)에 과거 명칭 `인뎁스 IN-DEPS`가 남아 있다.

이는 사용자의 브라우저 방문 기록이나 캐시 문제가 아니다. 네이버가 이전에 수집한 사이트 메뉴 구조 및 색인 정보를 아직 서브링크에 활용하는 것으로 판단한다. 네이버는 서브링크를 자동 생성하며 사이트 개편 후 재수집·반영에 평균 7일 이내가 소요된다고 안내한다. 반영 시점은 보장되지 않는다.

공개 운영 서버의 HTTP 응답과 원본 파일을 직접 점검한 결과:

| 항목 | 점검 결과 | 조치 |
|---|---|---|
| 메인 페이지 및 9개 주요 페이지 HTML | 원본 본문에서 `인뎁스`, `IN-DEPS` 미발견 | 기존 교체 내용 유지 |
| `assets/shared/site.json`과 `assets/i18n/ko.json` | 현재 메뉴/제품명은 `인에디타원 IN-EDITAONE` 중심, 과거명 검색 결과 없음 | 코드 전체에서 추가 검색 |
| `robots.txt` | HTTP 200, `User-agent: * / Allow: /`, sitemap 주소 선언 | 유지 |
| `sitemap.xml` | HTTP 200이나 7개 일반 페이지만 기재; 제품 상세 3개 누락 | 수정 |
| HTML `<head>` | 초기 서버 HTML에 정적 `<title>`, description, canonical 없음. `common.js`가 나중에 동적 삽입 | 우선 수정 |
| 공통 메뉴 | 초기 HTML은 `<template data-site-include="header">` 자리표시자를 제공하고 JavaScript가 메뉴를 생성 | 검색로봇이 직접 읽을 수 있는 정적 링크 마련 |
| 도메인 | `http://initgroup.kr/`, `http://www.initgroup.kr/`, `https://www.initgroup.kr/`, `https://initgroup.kr/` 모두 최종 HTTP 200으로 응답 (301 정규화 없음) | 301 정규화 |
| 구 사이트 `/html/About.html`, `/html/Solution.html` | HTTP 404 | 정상, 검색 갱신 대기 |

중요: **현재 공개 사이트 소스에는 과거 명칭이 보이지 않는다는 것**과 **네이버 색인이 이미 갱신되었다는 것**은 다르다. 기술 개선 후에도 네이버의 재수집과 서브링크 재계산이 필요하다.

## 2. Codex에 요청하는 실제 구현 작업

### A. 모든 공개 HTML 페이지의 SEO 정보를 정적 HTML로 출력

다음 주요 페이지를 대상으로 서버가 처음 반환하는 HTML `<head>`에 페이지별 메타정보를 직접 제공한다.

- `/`
- `/company/`
- `/services/`
- `/solutions/`
- `/projects/`
- `/careers/`
- `/contact/`
- `/solutions/data-editing-system/`
- `/solutions/inbups/`
- `/solutions/in-surveyone/`

각 페이지에서 정적 `<title>`, `<meta name="description">`, `<link rel="canonical">`, `og:title`, `og:description`, `og:url`을 올바르게 생성한다. 페이지마다 고유하고 실제 내용에 맞는 제목·설명을 사용한다. canonical과 og:url은 **`https://initgroup.kr/...` 절대 URL**로 통일한다. 메인 페이지 예시는 다음과 같다.

```html
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>인아이티 | 데이터 인텔리전스 운영 환경 구축 전문기업</title>
  <meta name="description" content="국가통계, 데이터 분석, AI 기반 데이터 품질 관리와 조사 운영 솔루션을 제공하는 인아이티를 소개합니다.">
  <link rel="canonical" href="https://initgroup.kr/">
  <meta property="og:title" content="인아이티 | 데이터 인텔리전스 운영 환경 구축 전문기업">
  <meta property="og:description" content="국가통계, 데이터 분석, AI 기반 데이터 품질 관리와 조사 운영 솔루션을 제공하는 인아이티를 소개합니다.">
  <meta property="og:url" content="https://initgroup.kr/">
</head>
```

예시는 현재 사이트의 문구·브랜드 가이드에 맞춰 조정할 수 있다. **중요: 기존 `assets/js/common.js`의 `renderHead()`가 동일 태그를 중복 삽입하지 않도록 함께 수정해야 한다.** 현재 코드가 `document.title`을 설정하고 `meta`/`canonical`을 새로 append하므로, 정적 태그 도입 시 기존 태그를 찾아 갱신하는 idempotent(upsert) 처리나 빌드 단계의 일원화가 필요하다. 언어 전환과 내부 페이지 이동 기능도 보존한다.

### B. 검색로봇이 이해할 수 있는 내비게이션 제공

현재 메뉴가 JavaScript 공통 템플릿으로 조립되는 구조를 유지하더라도, 서버에서 반환하는 HTML에 핵심 내비게이션의 실제 `<a href="...">텍스트</a>` 링크를 확보하도록 한다. 가능하면 배포 빌드 단계의 정적 사전 렌더링(prerender) 방식을 사용한다.

- 링크 이름에 `인뎁스 IN-DEPS`가 남지 않도록 확인.
- 새 제품명 `인에디타원 IN-EDITAONE`과 그 목적지 `/solutions/data-editing-system/`를 정확히 매핑.
- `<a>`의 href는 크롤러가 접근 가능한 일반 URL을 사용하고, 링크 텍스트를 명시.
- 모바일/데스크톱 레이아웃, 드롭다운, 다국어 기능, 접근성, 기존 클라이언트 사이드 페이지 이동을 손상시키지 말 것.
- 메뉴 중복 노출이나 화면 깜빡임이 발생하지 않게 할 것.

### C. sitemap.xml 및 생성 설정 수정

현재 7개 일반 페이지 외에 아래 3개 상세 URL을 포함하여 총 10개 공개 핵심 페이지를 사이트맵에 기재한다.

```text
https://initgroup.kr/solutions/data-editing-system/
https://initgroup.kr/solutions/inbups/
https://initgroup.kr/solutions/in-surveyone/
```

현재 `assets/shared/site.json`의 `sitemapPages` 배열이 7개만 포함하는 점을 함께 고친다. sitemap이 빌드 시 생성되는 구조라면 생성 결과와 설정을 모두 일치시킨다. 존재하지 않는 구 URL이나 noindex 페이지는 사이트맵에서 제외한다. `lastmod`를 쓴다면 실제 콘텐츠 수정일만 정확하게 기록하고 임의의 미래 시각이나 매 배포일을 무조건 넣지 않는다.

### D. 대표주소 정규화: HTTP 301 리디렉션

대표주소는 `https://initgroup.kr/`로 한다. 서버/Render 설정에서 다음 세 가지 호스트·프로토콜을 대표주소로 **301 영구 리디렉션**하도록 구성한다.

```text
http://initgroup.kr/*       -> https://initgroup.kr/*
http://www.initgroup.kr/*   -> https://initgroup.kr/*
https://www.initgroup.kr/*  -> https://initgroup.kr/*
```

**모든 하위 경로와 쿼리스트링을 유지**하고 가능한 한 불필요한 중간 리디렉션을 피한다. 단순 JavaScript `location.href` 이동이나 클라이언트 메타 리프레시가 아닌 실제 HTTP 301 응답으로 구현한다. Render 배포 형태(Static Site/Web Service/애플리케이션 서버)를 먼저 확인하고 해당 방식에 맞는 설정을 사용한다. 다른 서비스 도메인이나 경로에 영향을 주지 않게 한다.

### E. 구 이름·구 URL 처리

전체 프로젝트 소스를 대소문자 구분 없이 `IN-DEPS`, `in-deps`, `indeps`, `인뎁스`로 검색하여 실제 공개되는 제목·메뉴·링크·사이트맵·JSON-LD·번역문에 잔존하는지 확인한다. 발견 시 제품 의미가 동일한 곳은 새 명칭으로 수정하되, 역사적 기록 또는 제삼자 인용은 맥락을 검토하여 무조건 삭제하지 않는다.

이전 경로가 현재의 새 제품 상세 페이지와 동일한 콘텐츠를 가리킨다면 적절한 301 리디렉션을 검토한다. 이미 적절한 404/410이 반환되는 무관한 폐기 경로를 일괄적으로 메인 페이지로 이동시키지 않는다. 검색엔진 차단을 위한 전역 `noindex` 또는 `robots.txt Disallow: /`는 사용하지 않는다.

## 3. 네이버 검색 반영 절차 (배포 후)

1. 사이트 소유확인이 완료된 네이버 서치어드바이저의 `https://initgroup.kr` 속성을 선택한다.
2. 수정된 sitemap.xml이 공개 상태인 것을 확인하고 필요 시 제출한다.
3. `https://initgroup.kr/`, `https://initgroup.kr/solutions/`, `https://initgroup.kr/solutions/data-editing-system/`를 우선하여 웹페이지 수집 요청한다.
4. URL 검사에서 수집·색인 상태와 제목·설명 정보를 확인한다.
5. 네이버에서 `인아이티` 검색 결과의 자동 서브링크가 갱신되는지 며칠 간격으로 확인한다. **수집 요청이 즉시 검색결과 변경을 보장하는 것은 아니다.**

참고: 네이버 서치어드바이저에서 `요청` 메뉴가 보이지 않으면 웹마스터 *가이드* 화면인지, 웹마스터 *도구*에서 개별 사이트를 선택했는지, 사이트 소유확인이 완료됐는지 확인한다. 사이트 소유확인용 `naver-site-verification` 메타태그를 사용한다면 이것 역시 **정적 HTML head**에 두어야 한다(네이버 소유확인은 JavaScript 생성 태그를 지원하지 않음). 실제 소유확인 값은 관리자에게 받아 사용하며 임의로 생성하지 않는다.

네이버의 `잘못된 서브링크 삭제 요청`은 일부만 삭제되지 않을 수 있고, 신고로 삭제된 링크는 재노출이 어려울 수 있으므로 기본 조치로 사용하지 않는다. `meta name="naver" content="nosublinks"`도 **모든 서브링크를 제거**할 수 있으므로 사용자가 전체 서브링크 숨김을 명시적으로 승인하기 전에는 적용하지 않는다.

## 4. 수용 기준 및 검증 명령

수정 완료 후 Codex는 다음 항목을 검증하고 결과를 보고한다.

- [ ] 공개 주요 10개 페이지의 **원본 HTML(view-source / curl 응답)** 에 페이지별 `<title>`·description·절대 canonical이 직접 존재한다.
- [ ] JS 실행 후 같은 유형의 SEO 태그가 불필요하게 중복되지 않는다.
- [ ] 현재 메뉴에 `인에디타원 IN-EDITAONE`이 표시되고 옛 명칭이 없다.
- [ ] 정적 HTML에 중요한 사이트 내 링크가 있고 검색로봇이 접근 가능하다.
- [ ] `sitemap.xml`이 정상 XML이며 10개 URL을 포함한다.
- [ ] `robots.txt`가 정상적으로 접근을 허용하고 sitemap URL을 선언한다.
- [ ] HTTP·www 변형은 대표 HTTPS 비www URL로 301 이동하며 path/query가 보존된다.
- [ ] 기존 홈페이지의 PC·모바일 디자인, 언어 전환, 동적 메뉴, 페이지 전환이 정상이다.
- [ ] 이전 `/html/` 폐기 페이지는 의미 있는 404/410 상태를 유지한다.
- [ ] 배포 후 실제 도메인으로 검증하고, 네이버 측 수집·색인·서브링크 갱신은 별도 외부 처리 상태로 구분한다.

예시 검증 명령(운영 환경에서 실행):

```bash
curl -IL https://initgroup.kr/
curl -IL https://www.initgroup.kr/
curl -IL http://initgroup.kr/
curl -IL http://www.initgroup.kr/
curl -fsSL https://initgroup.kr/ | grep -Ei '<title|name="description"|rel="canonical"'
curl -fsSL https://initgroup.kr/sitemap.xml
curl -fsSL https://initgroup.kr/robots.txt
```

위 검증은 원본 HTML 기준이다. 브라우저 개발자 도구의 동적 DOM만 보고 정적 메타태그가 있다고 판정하지 말 것.

## 5. 변경 시 주의사항 및 Codex 결과 보고 형식

- 현재 배포된 공개 서버 소스 점검 결과를 바탕으로 작성했으므로, **실제 저장소의 최신 브랜치·파일 구조·Render 설정을 먼저 읽은 뒤** 정확한 변경 파일을 결정한다.
- 제품명 개편은 완료된 상태일 수 있으므로 기존 UI·콘텐츠를 무분별하게 다시 변경하지 않는다.
- 리디렉션 변경은 서비스 영향이 있으므로 배포 방식·호스트·SSL 설정을 확인하고 테스트한다.
- 변경 전후의 코드 차이(diff), 테스트 결과, 실제 배포 여부를 구분하여 보고한다.
- 네이버 수집 요청은 해당 계정 권한이 있어야 가능하다. 권한이 없으면 작업 완료로 허위 보고하지 말고 관리자 수행 절차를 남긴다.
- **완료 보고:** ① 수정 파일 목록 ② 변경 이유 ③ 테스트 결과 ④ 실제 배포 상태 ⑤ 네이버 재수집 요청 필요 여부 ⑥ 아직 남은 제한사항.

## 6. 공식 참고 자료

- 네이버 서브링크 갱신 및 삭제 안내: https://searchadvisor.naver.com/guide/faq-sublink
- 자바스크립트 검색 최적화와 서버 렌더링 권장: https://searchadvisor.naver.com/guide/seo-advanced-javascript
- 단일 호스트·301 리디렉션·사이트맵 권장: https://searchadvisor.naver.com/guide/seo-basic-create
- URL 검사 안내: https://searchadvisor.naver.com/guide/url-inspection
- 웹페이지 수집 요청 정책: https://searchadvisor.naver.com/guide/request-crawl
- 사이트 소유확인 및 JavaScript 제약: https://searchadvisor.naver.com/guide/faq-start-register

---

**Codex 최종 지시:** 위 현상을 단순한 검색 캐시 문제로만 처리하지 말고, 사이트의 정적 메타정보·정적 메뉴 링크·사이트맵·대표주소를 코드에서 보강하라. 기존 홈페이지 디자인과 기능은 유지하고 안전하게 배포·검증한 후 네이버 재수집을 안내하라. 네이버 색인 자체는 홈페이지 코드 수정만으로 즉시 강제할 수 없음을 명시하라.
