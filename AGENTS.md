# AGENTS.md

이 문서는 Codex가 `initgroup-homepage` 저장소에서 작업할 때 자동으로 적용하는 프로젝트 전용 지침입니다.

## 작업 원칙

- 작업 전 `git status --short`로 변경 범위를 확인하고 사용자의 기존 변경사항을 되돌리지 않습니다.
- 사용자가 현재 요청에서 명시적으로 승인하지 않은 `git add`, `git commit`, `git push`와 `scripts/git-publish-main.ps1` 실행을 금지합니다.
- 새 문서와 코드는 UTF-8, 텍스트 줄바꿈은 LF로 작성합니다.
- 파일 검색은 `rg` 또는 `rg --files`를 우선 사용합니다.
- `.env`, 비밀 키, 인증서, 운영 캡처 원본과 개인정보를 읽거나 출력하거나 커밋하지 않습니다.
- 요청 범위 밖의 파일을 대량 정리하거나 기존 콘텐츠를 임의로 다시 쓰지 않습니다.

## 프로젝트 성격과 구조

- 인아이티 기업 홈페이지 전용 FastAPI 기반 MPA 프로젝트입니다.
- 기존 HTML·CSS·JavaScript 페이지는 FastAPI가 공개 경로로 제공하며, 향후 게시판 API를 `/api/` 아래에 확장합니다.
- Oracle DB, 인증 포털과는 분리되어 있으며 현재 공개 페이지는 DB나 세션에 의존하지 않습니다.
- 각 공개 URL은 디렉터리별 `index.html`로 제공합니다.
- Python 애플리케이션 진입점은 저장소 루트의 `main.py`이며 공통 CSS, JavaScript, 이미지는 `assets/`에서 관리합니다.
- 로컬 서버와 검증, 백업, Git 배포 자동화는 `scripts/*.ps1`과 `.vscode/tasks.json`에서 관리합니다.
- Node.js, npm, 번들러 또는 외부 UI 프레임워크를 필수 실행 조건으로 추가하지 않습니다.
- 한국어·영어 지원은 DB나 세션 없이 `assets/i18n/config.json`, `ko.json`, `en.json`과 `assets/js/i18n.js`로 제공합니다.

## HTML·CSS·JavaScript 기준

- 모든 HTML 문서는 `title`, description, canonical, viewport, 정확히 하나의 `h1`과 `main`을 유지합니다.
- 내부 링크는 루트 기준 경로를 사용하고 실제 정적 파일 또는 디렉터리의 `index.html`로 연결합니다.
- 인라인 실행 JavaScript를 추가하지 않고 `assets/js/`의 자체 호스팅 파일을 사용합니다.
- 이미지에는 용도에 맞는 `alt`를 제공하고 공개 승인되지 않은 개인정보·운영 식별자를 포함하지 않습니다.
- 키보드 조작, 포커스 표시, skip link, `prefers-reduced-motion`을 훼손하지 않습니다.
- CSS는 기존 선택자와 cascade를 먼저 추적해 원본 규칙을 수정하며 중복 override를 누적하지 않습니다.
- 외부 CDN이나 새 외부 요청을 추가할 때는 CSP, 개인정보, 가용성과 라이선스를 먼저 검토합니다.

## 다국어 콘텐츠 기준

- 기본 언어는 한국어(`ko`)이며 HTML 템플릿은 한국어 원문과 하나의 콘텐츠 구조만 유지합니다. 언어별 HTML, JavaScript 또는 페이지 복사본을 만들지 않습니다.
- 사용자의 선택 언어는 `assets/i18n/config.json`에 정의한 키로 `localStorage`에 저장하며 현재 값은 `window.INIT_LANGUAGE`와 `window.INIT_I18N`에서 공유합니다.
- 화면 문구를 추가하거나 한국어 원문을 바꾼 뒤 `.\venv\Scripts\python.exe scripts\i18n_catalog.py --sync`를 실행하고, 생성된 같은 key의 영어 값을 `assets/i18n/en.json`에 자연스러운 문맥으로 작성합니다.
- 실행 중 JavaScript가 만드는 문구는 한국어·영어를 조건문으로 하드코딩하지 않고 `window.INIT_I18N.t("key")`를 사용합니다.
- 언어별 제품 캡처는 같은 경로에 `_kor.png`, `_eng.png` 쌍으로 두고 템플릿의 한국어 `src`와 `data-i18n-image-base` 하나로 연결합니다. 언어와 무관한 이미지는 접미사와 해당 속성 없이 공용으로 사용합니다.
- 캡처 이미지의 `alt`, `aria-label`, title, description과 버튼 문구는 두 언어 사전에 포함합니다.
- 언어 사전 변경 후 `scripts/i18n_catalog.py --check`와 `scripts/validate.ps1`을 실행해 key 일치, 번역 누락과 기본 HTML 계약을 확인합니다.

## 콘텐츠·배포 기준

- 회사 정보, 인증, 프로젝트, 연락처, 채용 정보는 공개 승인된 내용만 사용합니다.
- 제품 화면을 추가하기 전에 직원명, DB·스키마명, 계정, 권한, 고객 데이터가 없는지 확인합니다.
- 새 페이지나 URL을 추가하면 내비게이션, `sitemap.xml`, canonical, 404 및 내부 링크를 함께 확인합니다.
- 운영 배포 전에 `robots.txt`, sitemap 도메인, 개인정보처리방침과 보안 응답 헤더를 검토합니다.

## 개발환경과 검증

```powershell
.\scripts\setup-venv.ps1
.\scripts\validate.ps1
.\scripts\serve.ps1
```

- Python 명령은 시스템 `python`보다 `.\venv\Scripts\python.exe`를 우선 사용합니다.
- `venv/`는 생성 결과물이므로 직접 수정하거나 커밋하지 않습니다.
- `scripts\backup-source.ps1 -Mode Working`은 미커밋 파일까지 백업합니다.
- `scripts\backup-source.ps1 -Mode Git`은 커밋된 소스와 Git bundle을 백업합니다.
- `git-publish-main.ps1` 실행 자체가 add·commit·pull --rebase·push에 대한 명시적 지시입니다. Codex는 사용자가 현재 요청에서 실행을 명시적으로 요구한 경우에만 이 스크립트를 실행합니다.

모든 최종 답변 마지막에는 `Usage 확인: VS Code Codex 입력창에서 /status` 문구를 반드시 추가합니다.
