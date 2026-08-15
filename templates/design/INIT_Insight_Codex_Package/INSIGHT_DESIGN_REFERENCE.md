# Insight 페이지 디자인 레퍼런스

이 문서는 `INSIGHT_MENU_CODEX_PROMPT.md`와 함께 Codex에 전달하기 위한 간단한 시각 구조 레퍼런스다.

## 1. 전체 정보 구조

```text
┌──────────────────────────────────────────────────────────────┐
│ 05 ─ INSIGHT                                                 │
│                                                              │
│ 데이터와 기술을                                              │
│ 더 깊이 이해합니다.                           subtle visual   │
│                                                              │
│ Technology · Data & Statistics · Research · Case Study       │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ FEATURED INSIGHT                                             │
│                                                              │
│ [Category]                                                   │
│ 규칙 기반 데이터 내검에서         ┌──────────────────────┐    │
│ AI 기반 데이터 품질 관리로        │ abstract tech visual │    │
│                                  │ or thumbnail         │    │
│ 설명 문구                          └──────────────────────┘    │
│ Read Insight →                                               │
└──────────────────────────────────────────────────────────────┘

All | Technology | Data & Statistics | Research & Lab | Case Study

┌──────────────────────────┐ ┌──────────────────────────┐
│ thumbnail                │ │ thumbnail                │
│ CATEGORY                 │ │ CATEGORY                 │
│ title                    │ │ title                    │
│ summary                  │ │ summary                  │
│ date · reading time   →  │ │ date · reading time   →  │
└──────────────────────────┘ └──────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ FROM INSIGHT TO SOLUTION                                     │
│ 데이터에 대한 이해를 실제 업무 시스템으로 연결하세요.       │
│                                           솔루션 문의하기 →   │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. 디자인 차별화

### 서비스
- 제공 업무를 명확히 보여주는 구조
- 기능/영역 중심

### 솔루션
- 제품 및 플랫폼 화면 중심
- dark tech / product showcase

### 인사이트
- 기사/연구/지식 중심
- 큰 제목과 여백
- 이미지 + 타이포
- magazine/editorial 구조
- 동일한 사각 박스 반복 금지

---

## 3. 추천 Hero 비율

Desktop:
- text 영역: 약 55~60%
- visual 영역: 약 40~45%

Mobile:
- text 100%
- visual은 배경 장식 수준으로 축소

---

## 4. 썸네일 원칙

썸네일은 실제 서비스 화면이 없어도 다음 요소만으로 제작 가능하다.

- grid
- data node
- graph line
- vector/knowledge graph
- database cylinder
- AI network
- statistical plot abstraction
- rule / validation flow
- document / RAG connection

이미지 내부에는 텍스트를 넣지 않는다.

---

## 5. 첫 화면에서 피해야 할 것

- 4개의 동일 박스를 일렬 배치
- 모든 영역을 카드화
- 큰 아이콘 4개 나열
- 과도한 neon
- hero부터 너무 많은 설명
- 서비스/솔루션 페이지 구조의 단순 복사

---

## 6. 시각적 리듬

권장 순서:

1. 넓은 Hero
2. Featured article
3. 짧은 category navigation
4. 비대칭 content grid
5. dark/light 전환 섹션 또는 CTA
6. footer

한 페이지에 Light → Light → Editorial Grid → Dark CTA 정도의 흐름을 권장한다.
