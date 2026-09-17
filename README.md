# INIT Homepage

인아이티 기업 홈페이지의 정적 HTML MPA 프로젝트입니다. 카페24 UTF-8 (PHP 8.4, MariaDB 10.x) 호스팅에 완성된 파일을 업로드하면 동작합니다. 홈페이지 운영·로컬 미리보기·검증·업로드 패키징에는 Python, PHP 실행, DB, Node.js 또는 npm이 필요하지 않습니다.

## 카페24 업로드

```powershell
.\scripts\validate.ps1
.\scripts\package-static.ps1
```

`dist/site/` **안의 내용 전체**를 카페24 계정의 웹 공개 디렉터리에 업로드합니다. 또는 `dist/cafe24-static.zip`을 압축 해제해 같은 내용을 업로드합니다. 루트 `index.html`, 각 메뉴의 `index.html`, `assets/`, `robots.txt`, `sitemap.xml`, `.htaccess`가 포함됩니다. `dist`나 `site` 폴더 자체가 아니라 그 안의 내용을 옮깁니다. 기존 기본 시작 파일이 있다면 호스팅에서 `index.html`이 시작 문서로 선택되는지 확인합니다.

`scripts/`, `.git/`, 디자인 참고 자료 및 운영 캡처 원본은 업로드 대상이 아닙니다. 패키지는 `static-files.json`의 공개 파일만 복사합니다. 이 목록에는 페이지, CSS 배경, 언어별 이미지와 공유용 이미지가 등록되어 있습니다. 공개 파일을 추가하거나 삭제할 때 이 목록도 함께 수정합니다.

모든 내부 링크·이미지·CSS·JS·다국어 JSON은 문서 또는 CSS 파일 위치를 기준으로 한 상대경로입니다. 예를 들어 솔루션 상세 페이지는 `../../assets/`를 사용하므로 도메인의 루트뿐 아니라 하위 디렉터리에서도 동작합니다. canonical, OG·JSON-LD, sitemap의 공개 URL과 외부 사이트·메일·전화 링크는 각 형식에 맞게 유지합니다. 운영 도메인이나 공개 기준 경로가 바뀌면 검색·공유 메타데이터도 함께 갱신합니다.

`.htaccess`는 UTF-8, `index.html`, 디렉터리 목록 차단, 기존 보안 헤더와 캐시 정책을 설정합니다. 존재하지 않는 URL은 호스팅의 기본 HTTP 404로 응답하며, 홈으로 보내는 rewrite는 없습니다. `404.html`은 직접 열 수 있는 안내 페이지입니다. 하위 경로 오류를 이 파일로 내부 rewrite하면 상대 자산 경로가 달라지므로 기본 오류 응답을 사용합니다. 설정 기준은 [Apache DirectoryIndex](https://httpd.apache.org/docs/2.4/mod/mod_dir.html#directoryindex)와 [ErrorDocument](https://httpd.apache.org/docs/2.4/mod/core.html#errordocument)를 참고합니다.

## 로컬 미리보기와 검증

```powershell
.\scripts\serve.ps1 -Port 8200
.\scripts\validate.ps1
```

`http://127.0.0.1:8200/`에서 PowerShell의 정적 파일 서버로 확인합니다. VS Code 기본 빌드 작업이나 `scripts/start-homepage.cmd`도 같은 서버를 실행하며 Python을 시작하지 않습니다. 이미 실행 중인 서버는 자동으로 재시작하지 않습니다. 포트 점유 시 프로세스를 확인하며, 사용자가 재시작을 명시한 경우에만 `-Restart`를 사용합니다. 하위 디렉터리를 함께 검증하려면 `-PreviewSubdirectory`로 시작한 뒤 `http://127.0.0.1:8200/preview/`를 확인합니다.

검증은 완성 HTML의 문서 계약, 템플릿 미해석 여부, 상대 링크·앵커·CSS 자산·언어 이미지 쌍, sitemap, 언어 사전의 key·번역 누락을 검사합니다. Node가 이미 설치되어 있으면 JavaScript 구문 검사도 추가합니다. 로컬 파일 더블클릭(`file://`)은 브라우저가 JSON 로딩을 제한할 수 있으므로 HTTP 미리보기로 확인합니다.

Playwright가 설치된 개발 환경에서는 `node scripts/static-smoke.cjs`로 실제 브라우저 회귀 검증을 실행할 수 있습니다. 먼저 `serve.ps1 -PreviewSubdirectory`로 서버를 시작합니다. Playwright가 별도 위치에 있으면 `PLAYWRIGHT_MODULE` 환경변수로 지정합니다. 이 도구와 Node는 운영·일반 검증에 필요하지 않습니다.

## 정적 소스 편집

공개 디렉터리의 `index.html`과 `404.html`을 직접 수정합니다. 별도 템플릿 렌더링이나 빌드 단계가 없으며, 공통 메뉴·헤더·푸터를 바꾸면 해당 HTML들에 같은 변경을 반영합니다.

- 스타일과 브라우저 동작: `assets/css/`, `assets/js/`
- 언어 사전: `assets/i18n/ko.json`, `en.json`, `config.json`
- 배포할 파일 목록: `static-files.json`
- 검증·미리보기·패키징: `scripts/validate.ps1`, `serve.ps1`, `package-static.ps1`
- 이전 HTML 템플릿과 디자인 자료: `templates/` (보존용이며 운영·편집 도구에서 사용하지 않음)

새 페이지나 이미지를 추가하면 `static-files.json`에도 경로를 추가하고 내비게이션·sitemap·canonical·내부 링크를 확인합니다. 링크와 자산은 현재 HTML 또는 CSS 파일 위치를 기준으로 한 상대경로로 작성합니다.

화면 문구를 추가할 때 한국어와 영어 사전에 같은 고유 key를 추가합니다. 한국어 문구를 변경할 때는 해당 key의 한국어 값과 영어 번역을 함께 수정합니다. 번역 key는 기존 항목을 재사용하거나 충돌하지 않는 이름으로 정합니다. 검증 후 패키지를 갱신합니다.

```powershell
.\scripts\validate.ps1
.\scripts\package-static.ps1
```

인사이트 카테고리 4개와 보고서 9개는 모두 정적 파일입니다. 예전 보고서 주소 3개에도 같은 내용이 있으며 canonical은 번호형 주소를 가리킵니다. 보고서를 수정하면 예전 주소의 사본도 함께 수정합니다. 상세 편집 규칙은 `content/insights/README.md`에 있습니다.

## 한국어·영어와 브라우저 기능

기본 언어는 한국어입니다. `assets/js/i18n.js`가 `assets/i18n/config.json`, `ko.json`, `en.json`을 로드해 본문·접근성 속성·메타데이터와 제품 이미지를 전환합니다. 선택 언어는 `localStorage`에 저장하고 `window.INIT_LANGUAGE`와 `window.INIT_I18N`으로 공유합니다. 서버 API·세션·DB를 사용하지 않습니다.

언어별 캡처는 `_kor.png`, `_eng.png` 쌍으로 관리하고 `data-i18n-image-base`도 현재 페이지 기준 상대경로를 사용합니다. 실행 중 생성하는 문구는 `window.INIT_I18N.t("key")`를 사용합니다. 키보드 메뉴·갤러리·라이트박스·skip link·`prefers-reduced-motion`을 유지하며, JavaScript 없이도 한국어 본문과 링크를 이용할 수 있습니다.

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
