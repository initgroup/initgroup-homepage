# 인사이트 리포트 발행 규칙

인사이트는 완성된 정적 HTML 파일로 관리합니다. 리포트 번호는 `YYYYMMDD_순번` 형식이며 같은 날짜에는 `01`, `02`처럼 순번을 올립니다.

## 새 리포트

1. 기존 공개 보고서를 참고해 `insights/reports/YYYYMMDD_순번/index.html`을 작성합니다. title·description·canonical·공유 메타데이터, 본문, 목차와 관련 리포트를 갱신합니다.
2. `insights/index.html`과 해당 카테고리의 `index.html`에 보고서 링크를 추가합니다. 모든 내부 링크·이미지는 현재 파일 기준 상대경로로 연결합니다.
3. 공개 승인된 이미지만 `assets/images/insights/YYYYMMDD_순번/`에 추가합니다. 언어별 이미지는 `_kor.png`, `_eng.png` 쌍과 `data-i18n-image-base`를 사용합니다.
4. 새 화면 문구를 `assets/i18n/ko.json`과 `en.json`의 같은 고유 key에 등록하고 자연스러운 영어 번역을 작성합니다.
5. 새 HTML·이미지를 `static-files.json`에 추가하고 `sitemap.xml`을 갱신합니다.
6. `scripts/validate.ps1`로 검사하고 `scripts/package-static.ps1`로 업로드 파일을 갱신합니다.

## 기존 리포트

공개 경로의 HTML이 원본입니다. 예전 주소인 `data-quality-rules/`, `human-in-the-loop/`, `reproducible-analysis/`는 각각 보고서 `20260801_01`, `20260801_02`, `20260801_03`의 정적 사본입니다. 내용을 수정하면 양쪽 파일을 갱신하고 각 파일의 깊이에 맞는 상대경로를 유지합니다. canonical은 번호형 보고서 주소로 유지합니다.
