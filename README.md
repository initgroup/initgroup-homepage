# INIT Homepage

인아이티 기업 홈페이지 전용 FastAPI 웹 프로젝트입니다. 기존 `init-webbase-system`의 관리자·고객 포털과 분리되어 있으며, 현재 HTML MPA를 Python이 서비스하고 향후 게시판 API와 데이터 저장 계층을 독립적으로 확장할 수 있습니다.

## 구성 원칙

- 공통 Jinja 템플릿을 FastAPI가 렌더링하는 MPA 구조
- 외부 UI 프레임워크나 Node.js 없이 Python만 사용하는 템플릿 빌드
- 실제 인뎁스 IN-DEPS 화면 중심의 제품 증명
- 360px부터 설계한 모바일 적응형 내비게이션·갤러리·프로젝트 카드
- JavaScript 없이도 본문과 링크를 사용할 수 있는 progressive enhancement
- `prefers-reduced-motion`, 키보드 메뉴, dialog와 skip link 지원

## 템플릿과 공통 자산 구조

```text
site_config.py                  회사 기본정보, URL, SEO 메타데이터, CSS와 모바일 액션
templates/base.html            공통 head, CSS·JavaScript 로딩과 문서 골격
templates/partials/            헤더, 내비게이션, 푸터, 모바일 빠른 이동
templates/pages/               페이지별 본문과 JSON-LD
assets/css/site.css            전 페이지 공통 스타일
assets/css/{section}.css       corporate, editorial, legal, solutions 영역 스타일
assets/css/i18n.css            공통 언어 선택 UI
assets/js/boot.js              초기 문서 상태 설정
assets/js/i18n.js              JSON 언어 사전 로딩, 전환과 선택 상태 유지
assets/js/site.js              메뉴, 스크롤, 갤러리, 라이트박스 등 공통 동작
assets/i18n/config.json         기본 언어, 지원 언어, 저장 키와 사전 경로
assets/i18n/{ko,en}.json        한국어·영어 key/value 언어 사전
assets/downloads/              공개 다운로드 자료
scripts/build_site.py          정적 배포 HTML을 .render-static/에 생성
scripts/i18n_catalog.py        템플릿 문구와 언어 사전 동기화·검증
```

루트와 각 공개 디렉터리의 `index.html`은 해당 `templates/pages/*.html`을 상속하는 한 줄짜리 진입 템플릿입니다. 공통 UI는 `templates/base.html`과 `templates/partials/`, 페이지 본문은 `templates/pages/`, 페이지 제목·canonical·OG·연결 CSS는 `site_config.py`에서 수정합니다. 따라서 공통 CSS·JavaScript 버전이나 푸터를 바꿔도 각 `index.html`을 수정하지 않습니다.

## 주요 경로

```text
/
/company/
/services/
/solutions/
/solutions/data-editing-system/
/solutions/inbups/
/projects/
/insights/
/insights/data-quality-rules/
/insights/human-in-the-loop/
/insights/reproducible-analysis/
/careers/
/contact/
/privacy/
```

공통 CSS와 JavaScript는 `assets/`에 있으며 현재 공개 페이지는 기존 시스템 DB, API, 세션 또는 환경변수에 의존하지 않습니다. Python 진입점은 `main.py`이고 향후 서버 기능은 `/api/` 경로에 추가합니다.

## 한국어·영어 지원

언어 지원은 DB, 세션, 언어별 HTML 또는 언어별 JavaScript를 만들지 않는 정적 JSON 방식입니다. 기본 언어는 한국어(`ko`)이며 공통 헤더의 `Korea`, `English` 버튼으로 전환합니다. 선택값은 `assets/i18n/config.json`의 `storageKey`에 따라 브라우저 `localStorage`에 저장되고, 현재 페이지에서는 `window.INIT_LANGUAGE`와 `window.INIT_I18N`으로 공유됩니다. 따라서 다른 메뉴로 이동해도 이전 언어가 유지됩니다.

HTML은 한국어를 progressive-enhancement 원문으로 한 번만 유지합니다. `assets/js/i18n.js`가 `ko.json`의 값을 현재 DOM 문구와 연결하고, 선택된 언어 사전의 같은 key 값으로 본문, 메뉴, 버튼, 메타 설명과 접근성 속성을 교체합니다. 이미지의 대체 설명도 언어 사전으로 관리합니다.

언어별 제품 캡처는 같은 폴더에서 `파일명_kor.png`, `파일명_eng.png` 쌍으로 관리하고, HTML에는 한국어 `src`와 확장자를 제외한 `data-i18n-image-base`만 선언합니다. 공통 로더는 `config.json`의 `imageSuffix`를 읽어 현재 언어의 캡처로 자동 교체합니다. 언어와 무관한 로고·도형·캡처는 접미사 없이 두고 `data-i18n-image-base`를 선언하지 않습니다. 새 언어별 캡처를 연결하면 `scripts/validate.ps1`이 두 파일의 존재를 함께 확인합니다.

새 문구나 기존 한국어 문구를 변경할 때는 다음 순서를 지킵니다.

```powershell
.\venv\Scripts\python.exe .\scripts\i18n_catalog.py --sync
```

동기화 후 `assets/i18n/en.json`에 새 key의 자연스러운 영어 값을 작성합니다. `ko.json`의 key는 한국어 원문에서 결정적으로 생성되므로 HTML에 별도의 key 속성을 반복해서 추가할 필요가 없습니다. 영어 값이 비어 있거나 한국어로 남아 있거나 두 사전의 key가 다르면 검증이 실패합니다.

```powershell
.\venv\Scripts\python.exe .\scripts\i18n_catalog.py --check
.\scripts\validate.ps1
```

메뉴 열기·닫기처럼 JavaScript가 실행 중 새로 만드는 문구는 HTML 문구를 하드코딩하지 않고 `window.INIT_I18N.t("key")`로 가져옵니다. 지원 언어, 기본 언어와 저장 키를 변경할 때는 `assets/i18n/config.json`만 수정합니다.

## 로컬 실행

PowerShell에서 다음 명령을 실행합니다.

```powershell
.\scripts\setup-venv.ps1
.\scripts\serve.ps1
```

기본 주소는 `http://127.0.0.1:8200/`입니다. 검증은 다음 명령으로 실행합니다.

이 홈페이지는 `uvicorn main:app`으로 실행합니다. 새 명령창을 열어 서버를 계속 표시하려면 `scripts\start-homepage.cmd`를 실행합니다. 일반 실행은 8200번에서 이미 홈페이지가 실행 중이면 중복 서버를 만들지 않고 현재 주소를 안내합니다. VS Code의 `Ctrl+Shift+B` 작업은 이 프로젝트의 `venv\Scripts\python.exe`로 Uvicorn을 직접 실행하므로, 작업 터미널이 서버 프로세스와 함께 계속 유지됩니다.

FastAPI는 진입 템플릿을 직접 렌더링하므로 페이지 수정 후 별도의 HTML 생성 과정이 필요하지 않습니다. 정적 호스팅 결과가 필요할 때만 `.render-static/`에 완성 HTML을 생성합니다. `--check`는 파일을 만들지 않고 전체 템플릿을 렌더링해 계약을 확인합니다.

```powershell
.\venv\Scripts\python.exe .\scripts\build_site.py
.\venv\Scripts\python.exe .\scripts\build_site.py --check
```

```powershell
.\scripts\validate.ps1
```

새 페이지는 `templates/pages/`에 본문 템플릿을 만들고 공개 경로의 `index.html`에서 해당 템플릿을 상속한 뒤, `site_config.py`의 `PAGES`에 URL, 출력 경로와 SEO 정보를 등록합니다. 그 다음 `sitemap.xml`, 내비게이션, 404와 내부 링크를 함께 확인합니다.

VS Code에서는 `INIT Homepage: Setup Venv`, `Build Static Pages`, `Run Server`, `Validate`, `Backup`, `Commit & Push` 작업을 사용할 수 있습니다. 저장소 루트의 `AGENTS.md`는 Codex가 이 작업공간을 열 때 프로젝트 지침으로 자동 인식합니다.

## Git·백업 자동화

이 폴더는 `main` 브랜치 Git 저장소로 사용하며 `origin`은 [initgroup/initgroup-homepage](https://github.com/initgroup/initgroup-homepage)에 연결합니다. 소스를 수정해도 자동으로 stage, commit 또는 push하지 않습니다. 수정 파일은 VS Code 소스 제어에 계속 표시되며 사용자가 배포 명령을 직접 실행할 때만 커밋합니다.

```powershell
.\scripts\git-publish-main.ps1
```

Codex가 소스를 수정한 직후에는 자동으로 stage, commit 또는 push하지 않으며 변경 파일은 VS Code에 `M`으로 남습니다. 사용자가 `git-publish-main.ps1` 명령이나 `Commit & Push` 작업을 직접 실행하면 그 실행 자체를 명시적인 커밋 지시로 간주하여, 전체 변경을 검증한 뒤 stage·commit·pull --rebase·push합니다. 기본 커밋 메시지는 일련번호로 생성되며 `-Message "메시지"`로 직접 지정할 수 있습니다. `-DryRun` 옵션은 변경 없이 점검만 수행합니다.

별도 창에서 실행 결과와 오류를 계속 확인하려면 `scripts\publish-homepage.cmd`를 실행합니다. 일반 PowerShell 터미널에서는 새 `powershell -File` 프로세스를 만들지 말고 위의 `.\scripts\git-publish-main.ps1` 명령을 직접 사용합니다.

백업 기본 위치는 프로젝트와 같은 상위 폴더의 `backup\`입니다.

```powershell
.\scripts\backup-source.ps1 -Mode Working
.\scripts\backup-source.ps1 -Mode Git
```

`Working`은 미커밋 파일을 포함하되 Git 메타데이터·venv·비밀 파일을 제외합니다. `Git`은 커밋된 소스와 복구용 `repository.bundle`을 만듭니다.

## 배포

FastAPI는 승인된 페이지 디렉터리와 `assets/`만 공개하며 저장소의 스크립트·문서·Git 파일은 서비스하지 않습니다. 현재 자산 파일명은 content hash를 포함하지 않으므로 `assets/`에는 재검증 가능한 짧은 캐시를 사용합니다. 장기 immutable 캐시는 배포 시 파일명을 fingerprint하는 경우에만 적용합니다.

### Render

이 프로젝트는 FastAPI 애플리케이션이며 Render의 Python `Web Service`에서 실행합니다. 저장소 루트의 `render.yaml`은 같은 설정을 Blueprint로 관리합니다.

Render Dashboard에서 권장하는 구성은 다음과 같습니다.

- Service Type: `Web Service`
- Repository: `initgroup/initgroup-homepage`
- Branch: `main`
- Runtime: `Python 3`
- Build Command: `pip install -r requirements.txt && python scripts/build_site.py --check && python scripts/i18n_catalog.py --check`
- Start Command: `python -m uvicorn main:app --host 0.0.0.0 --port $PORT`
- Health Check Path: `/healthz`

Render 빌드는 모든 진입 템플릿이 정상적으로 렌더링되는지 확인하고, FastAPI가 요청 시 완성 HTML을 반환합니다. 실행 파일 탐색 문제를 피하려면 Start Command는 `python -m uvicorn main:app --host 0.0.0.0 --port $PORT`를 사용합니다. 배포 후 `/healthz`가 HTTP 200과 `{"status":"ok"}`를 반환하는지 확인합니다. 별도 정적 호스팅 결과는 `scripts/build-render-static.sh`로 생성합니다.

기존 고객 포털을 계속 운영할 경우 홈페이지와 포털의 호스트를 분리하는 구성이 안전합니다.

- `https://initgroup.kr` — 이 FastAPI 홈페이지
- `https://portal.initgroup.kr` — 기존 FastAPI 고객 포털

실제 전환 전에는 DNS, 포털 URL, CORS·쿠키 범위와 기존 URL redirect 정책을 별도로 확인해야 합니다. `404.html`은 호스팅의 custom error document로 연결하고, 존재하지 않는 경로에 파일 내용만 200으로 반환하지 않도록 실제 HTTP 404 상태를 설정합니다. 기존 홈페이지 URL은 대응되는 새 경로로 301 매핑합니다.

권장 응답 헤더는 운영 호스트에서 설정합니다.

```text
Content-Security-Policy: default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'
Referrer-Policy: strict-origin-when-cross-origin
X-Content-Type-Options: nosniff
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

`Strict-Transport-Security`는 HTTPS와 모든 하위 도메인 준비가 끝난 뒤 적용합니다. CSP 적용을 위해 실행 JavaScript는 모두 자체 호스팅 외부 파일로 분리되어 있습니다.

## 배포 전 확인

- 대표 이메일·전화·주소와 사업자 표기의 최신 정보
- ISO 9001, Inno-Biz, 기업부설연구소 등 인증·선정의 현재 유효 범위
- 회사 연혁의 2016·2018·2021·2023·2024 세부 항목, 인재육성형 중소기업과 SAS 협약 이력의 원문 증빙
- 프로젝트 사례 문구의 공개 가능 범위와 고객명 사용 승인
- `sitemap.xml`의 운영 도메인 및 최종 URL
- `/privacy/` 검토본의 개인정보 보호책임자, 문의 정보·접속 로그 보유 기간, 호스팅 처리위탁·국외 이전 여부와 법률 검토

제품 이미지는 직원명·권한·DB·스키마 같은 운영 식별자가 없는 공개 후보 화면만 `assets/images/product/`에 포함합니다. 남아 있는 규칙 ID·컬럼명·예시 지표 역시 데이터 소유자의 공개 승인을 받은 뒤 배포하며, 원본 운영 캡처를 추가할 때도 같은 기준으로 먼저 검수해야 합니다.
