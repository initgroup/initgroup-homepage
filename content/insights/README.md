# 인사이트 리포트 발행 규칙

인사이트는 DB 없이 파일 기반으로 관리합니다. 리포트 번호는 `YYYYMMDD_순번` 형식이며, 같은 날짜에는 `01`, `02`처럼 순번을 올립니다.

## 새 리포트를 추가할 때

1. `templates/insight-reports/YYYYMMDD_순번/index.html`에 본문을 작성합니다. 본문은 한국어 원문으로 유지하고, `section`의 id와 제목은 `insight_reports.py`의 목차와 맞춥니다.
2. `insight_reports.py`의 `INSIGHT_REPORTS`에 제목, 요약, 카테고리, 발행일, 목차, 관련 리포트와 본문 템플릿 경로를 등록합니다.
3. `assets/images/insights/YYYYMMDD_순번/`에 이미지가 필요하면 `이름_kor.png`와 `이름_eng.png`를 한 쌍으로 둡니다. 템플릿에서는 한국어 파일과 `data-i18n-image-base`를 함께 사용합니다.
4. 상위 인사이트 첫 화면에 노출할 리포트라면 `templates/pages/insights.html`의 해당 카테고리 카드에서 번호형 URL로 연결합니다. 모든 등록 리포트는 카테고리 아카이브에 자동으로 표시됩니다.
5. `./venv/Scripts/python.exe scripts/i18n_catalog.py --sync` 후 새 영어 문구를 `assets/i18n/en.json`에 작성하고, 검증 명령을 실행합니다.

## 기존 리포트 관리

기존 전용 레이아웃을 유지하는 상세 글은 `templates/insight-reports/YYYYMMDD_순번/source.html`에서 원문을 관리합니다. 같은 폴더의 `index.html`은 진입 템플릿이며, `insight_reports.py`의 `page_template`에 이 경로를 등록합니다. 공통 상세 레이아웃을 사용하는 신규 리포트는 `index.html`에 본문을 작성하고 `content_template`에 등록합니다.

`templates/pages/`와 기존 공개 경로에 남아 있는 파일은 실행 중인 서버 및 이전 구조와의 호환을 위한 연결 템플릿일 뿐이며 원문을 중복해서 작성하지 않습니다.

기존 공개 URL은 `legacy_route`로만 유지하며 번호형 공개 URL로 영구 이동합니다. 리포트 원문, 메타데이터와 관련 이미지는 같은 리포트 번호를 기준으로 찾아갈 수 있어야 합니다.
