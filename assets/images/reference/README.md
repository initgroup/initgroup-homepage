# Product image reference library

이 폴더는 홈페이지 제품 소개를 설계할 때 사용하는 원본 화면과 기존 소개 자료를 보관합니다. 원본 이미지는 Git에서 변경 이력을 관리하며, 공개 페이지에는 기능 설명에 필요한 화면만 선별해 사용합니다.

## Data Editing System

언어별 화면은 같은 기본 이름의 `_kor.png`, `_eng.png` 쌍으로 저장합니다. 언어와 무관한 화면은 접미사 없는 공용 파일 하나를 사용합니다.

| 저장 파일 | 원본 파일 | 내용 |
| --- | --- | --- |
| `data-editing-system/llm-search.png` | `에디팅_LLM검색.PNG` | LLM 검색·대화 화면 |
| `data-editing-system/admin-database_kor.png`<br>`data-editing-system/admin-database_eng.png` | `에디팅_관리자1.PNG` | 데이터베이스 객체·프로시저 관리 |
| `data-editing-system/login_kor.png`<br>`data-editing-system/login_eng.png` | `에디팅_로그인.PNG` | 제품 로그인 화면 |
| `data-editing-system/ai-menu-help_kor.png`<br>`data-editing-system/ai-menu-help_eng.png` | `에디팅_메뉴도움말1.PNG` | 현재 화면 문맥을 활용한 AI 도움말 |
| `data-editing-system/dashboard_kor.png`<br>`data-editing-system/dashboard_eng.png` | `에디팅_메인.PNG` | 실행 현황 대시보드 |
| `data-editing-system/model-training_kor.png`<br>`data-editing-system/model-training_eng.png` | `에디팅_모델학습.PNG` | 모델 학습·비교·활성화 |
| `data-editing-system/analysis-overview_kor.png`<br>`data-editing-system/analysis-overview_eng.png` | `에디팅_분석1.PNG` | 통합 실행 결과와 단계별 노드 |
| `data-editing-system/relation-network_kor.png`<br>`data-editing-system/relation-network_eng.png` | `에디팅_분석2.PNG` | 컬럼 관계·군집 네트워크 |
| `data-editing-system/categorical-rules_kor.png`<br>`data-editing-system/categorical-rules_eng.png` | `에디팅_분석3.PNG` | IF–THEN 범주형 규칙 후보 |
| `data-editing-system/continuous-rule-detail_kor.png`<br>`data-editing-system/continuous-rule-detail_eng.png` | `에디팅_분석4.PNG` | A=B+C 형태의 연속형 규칙 상세·산점도 |
| `data-editing-system/violation-query_kor.png`<br>`data-editing-system/violation-query_eng.png` | `에디팅_분석5.PNG` | 규칙 위반 행 조회·검토 |
| `data-editing-system/continuous-rule-list_kor.png`<br>`data-editing-system/continuous-rule-list_eng.png` | `에디팅_분석6.PNG` | 연속형 수식 규칙 후보 목록 |
| `data-editing-system/flow-designer_kor.png`<br>`data-editing-system/flow-designer_eng.png` | `에디팅_플로우.PNG` | 분석–발굴–탐지 Flow 설계 |
| `data-editing-system/rule-master_kor.png`<br>`data-editing-system/rule-master_eng.png` | 별도 원본명 미기록 | 발굴 규칙 검토와 최종 규칙 정의 |
| `data-editing-system/editing-error_kor.png`<br>`data-editing-system/editing-error_eng.png` | 별도 원본명 미기록 | 오류 행의 실제값·예측값 비교와 수정 |
| `data-editing-system/editing-production-deployment_kor.png`<br>`data-editing-system/editing-production-deployment_eng.png` | 별도 원본명 미기록 | 검증된 편집 결과의 운영 반영 |

## 인법스 IN-BAPS

| 저장 파일 | 원본 파일 | 내용 |
| --- | --- | --- |
| `in-baps/c-bap-collection.png` | `인법스_C-BAP수집솔루션.PNG` | C-BAP 수집 채널 소개 |
| `in-baps/r-bap-analysis.png` | `인법스_R-BAP분석솔루션.PNG` | R-BAP 분석 방법 소개 |
| `in-baps/v-bap-visualization.png` | `인법스_V-BAP시각화솔루션.PNG` | V-BAP 시각화 도구 소개 |

## Design reference

| 저장 파일 | 원본 파일 | 내용 |
| --- | --- | --- |
| `design/decision-card-concept.png` | `디자인컨셉.PNG` | 홈페이지 핵심 기능 카드의 승인된 시각 방향 |

## 공개 전 확인

실제 제품 화면에는 사용자명, DB·스키마·프로시저명, 업무 데이터명처럼 내부 정보로 해석될 수 있는 항목이 포함될 수 있습니다. 공개 페이지와 공개 저장소에 반영하기 전에 각 이미지의 공개 가능 범위를 최종 확인합니다.
