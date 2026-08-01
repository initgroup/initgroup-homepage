# INIT Homepage

인아이티 기업 홈페이지 전용 FastAPI 웹 프로젝트입니다. 기존 `init-webbase-system`의 관리자·고객 포털과 분리되어 있으며, 현재 HTML MPA를 Python이 서비스하고 향후 게시판 API와 데이터 저장 계층을 독립적으로 확장할 수 있습니다.

## 구성 원칙

- 경로별 실제 HTML을 FastAPI가 제공하는 MPA 구조
- 외부 UI 프레임워크와 빌드 과정이 없는 HTML·CSS·JavaScript
- 실제 INIT Data Editing System 화면 중심의 제품 증명
- 360px부터 설계한 모바일 적응형 내비게이션·갤러리·프로젝트 카드
- JavaScript 없이도 본문과 링크를 사용할 수 있는 progressive enhancement
- `prefers-reduced-motion`, 키보드 메뉴, dialog와 skip link 지원

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

공통 자산은 `assets/`에 있으며 현재 공개 페이지는 기존 시스템 DB, API, 세션 또는 환경변수에 의존하지 않습니다. Python 진입점은 `main.py`이고 향후 서버 기능은 `/api/` 경로에 추가합니다.

## 로컬 실행

PowerShell에서 다음 명령을 실행합니다.

```powershell
.\scripts\setup-venv.ps1
.\scripts\serve.ps1
```

기본 주소는 `http://127.0.0.1:8200/`입니다. 검증은 다음 명령으로 실행합니다.

이 홈페이지는 `uvicorn main:app`으로 실행합니다. 새 명령창을 열어 서버를 계속 표시하려면 `scripts\start-homepage.cmd`를 실행합니다. 일반 실행은 8200번에서 이미 홈페이지가 실행 중이면 중복 서버를 만들지 않고 현재 주소를 안내합니다. VS Code의 `Ctrl+Shift+B` 작업은 이 프로젝트의 `venv\Scripts\python.exe`로 Uvicorn을 직접 실행하므로, 작업 터미널이 서버 프로세스와 함께 계속 유지됩니다.

```powershell
.\scripts\validate.ps1
```

VS Code에서는 `INIT Homepage: Setup Venv`, `Run Server`, `Validate`, `Backup`, `Publish Main` 작업을 사용할 수 있습니다. 저장소 루트의 `AGENTS.md`는 Codex가 이 작업공간을 열 때 프로젝트 지침으로 자동 인식합니다.

## Git·백업 자동화

이 폴더는 `main` 브랜치 Git 저장소로 사용하며 `origin`은 [initgroup/init-homepage](https://github.com/initgroup/init-homepage)에 연결합니다. 소스를 수정해도 자동으로 commit하거나 push하지 않으며, 명시적으로 배포할 때만 다음 스크립트를 실행합니다.

```powershell
.\scripts\git-publish-main.ps1
```

스크립트는 전체 변경을 stage하고 `init-homepage-yyyyMMdd-N` 형식으로 커밋한 뒤 원격 `main`과 rebase하여 push합니다. 실행 즉시 원격 저장소를 변경하므로 일반 소스 작업 중에는 실행하지 않습니다.

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
- Repository: `initgroup/init-homepage`
- Branch: `main`
- Runtime: `Python 3`
- Build Command: `pip install -r requirements.txt`
- Start Command: `python -m uvicorn main:app --host 0.0.0.0 --port $PORT`
- Health Check Path: `/healthz`

Render가 기존 Python Web Service에 저장한 `pip install -r requirements.txt`와 `uvicorn main:app --host 0.0.0.0 --port 10000` 명령도 이 구성과 호환됩니다. 다만 실행 파일 탐색 문제를 피하려면 Start Command를 `python -m uvicorn main:app --host 0.0.0.0 --port $PORT`로 바꾸는 편이 더 확실합니다. 배포 후 `/healthz`가 HTTP 200과 `{"status":"ok"}`를 반환하는지 확인합니다.

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
