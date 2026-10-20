# 인사이트 보관 및 재공개 기준

현재 인사이트 메뉴와 17개 HTML 페이지는 공개하지 않습니다. 이전 소스는 `templates/disabled-content/insights/`, 정리 전 한국어·영어 사전은 `templates/disabled-content/i18n/`에 보관합니다. 보고서 번호는 `YYYYMMDD_순번` 형식이며 보관본의 상대경로는 이전 공개 위치 기준입니다.

`static-files.json`과 sitemap에는 이 보관본을 포함하지 않습니다. Apache는 예전 `/insights/` 요청을 410으로 처리하고, 파일이 없는 다른 정적 호스팅은 기본 404를 사용합니다. robots.txt는 크롤러가 이 응답을 확인할 수 있도록 허용합니다.

재공개를 요청받으면 실제 승인된 본문과 이미지를 검토한 뒤 공개 HTML, 두 언어 사전, 메뉴·관련 링크, canonical·공유 메타·JSON-LD, sitemap과 배포 목록을 함께 복원합니다. 이전 주소의 중복 사본 처리와 `/insights/` 410 규칙도 함께 검토합니다. 보관본을 그대로 업로드하지 않습니다.
