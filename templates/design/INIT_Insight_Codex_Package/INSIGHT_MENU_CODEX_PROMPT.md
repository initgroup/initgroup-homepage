# INIT 홈페이지 `인사이트(Insight)` 메뉴 개편 Codex 작업 프롬프트

## 0. 작업 목적

현재 INIT 홈페이지의 대메뉴 구조는 다음과 같다.

- 회사
- 서비스
- 솔루션
- 프로젝트
- 인사이트

이번 작업의 목적은 **인사이트 메뉴를 단순 회사소식/게시판이 아니라 INIT의 전문성, 기술력, 연구역량을 보여주는 지식 콘텐츠 허브(Technology Journal / Digital Magazine)** 로 개편하는 것이다.

기존 홈페이지의 디자인 시스템, 레이아웃 규칙, 폰트, 컬러, 반응형 처리, 공통 Header/Footer, 애니메이션 스타일을 최대한 유지하되, `서비스/솔루션` 페이지처럼 박스만 반복하는 화면은 피한다.

---

# 1. 가장 먼저 해야 할 일

코드를 수정하기 전에 현재 프로젝트를 분석한다.

1. 사용 중인 프레임워크 확인
   - React / Next.js / Vue / 정적 HTML 등
2. 라우팅 구조 확인
3. Header / Footer / 공통 Layout 확인
4. 기존 대메뉴 페이지의 공통 Hero 규칙 확인
5. 서비스 / 솔루션 / 프로젝트 페이지에서 사용하는
   - 컬러 변수
   - spacing
   - max-width
   - breakpoint
   - typography
   - button
   - card
   - animation
   을 확인한다.
6. 현재 `/insight` 또는 이에 해당하는 메뉴가 존재하면 기존 경로를 유지한다.
7. 기존 소스 구조를 불필요하게 재설계하거나 새 프레임워크를 도입하지 않는다.

**기존 디자인 시스템을 우선 재사용하고, 인사이트 화면에 필요한 요소만 확장한다.**

---

# 2. 인사이트 메뉴의 역할

각 대메뉴는 다음 역할로 명확하게 구분한다.

- **서비스**: 우리가 제공하는 전문 업무
- **솔루션**: 우리가 만든 제품과 플랫폼
- **프로젝트**: 우리가 실제 수행한 사업
- **인사이트**: 프로젝트와 연구를 통해 축적한 지식, 기술, 방법론

따라서 Insight는 홍보성 회사 뉴스보다 아래와 같은 콘텐츠를 중심으로 구성한다.

---

# 3. 콘텐츠 카테고리

인사이트는 우선 4개 카테고리로 구성한다.

## 01. Technology Insight

AI, LLM, RAG, GraphRAG, 데이터베이스, 데이터 플랫폼, 오픈소스 등 기술 해설.

예:
- GraphRAG는 기존 RAG와 무엇이 다른가
- 생성형 AI를 데이터 분석 업무에 적용하는 방법
- Vector DB와 Graph DB의 역할
- Oracle 기반 AI 분석 아키텍처

## 02. Data & Statistics

통계 방법론, 데이터 품질, 표본설계, 데이터 분석 등 INIT의 핵심 전문 영역.

예:
- 데이터 품질관리가 필요한 이유
- 데이터 프로파일링 핵심 지표
- 표본설계와 층화추출의 이해
- 이상치 탐지와 데이터 정제

## 03. Research & Lab

INIT가 직접 수행한 PoC, 연구, 실험, 기술검증 콘텐츠.

예:
- AI 기반 데이터 내검 규칙 자동 탐색
- 머신러닝 기반 품질 규칙 후보 발굴
- 오픈소스 LLM 기반 문서 질의 시스템
- GraphRAG 기술 검증

## 04. Case Study

실제 프로젝트나 솔루션에 기술이 어떻게 적용되었는지 설명한다.

프로젝트 메뉴와 중복되지 않도록 한다.

- 프로젝트: "무슨 사업을 수행했는가"
- Case Study: "어떤 문제를 어떤 기술과 방법으로 해결했는가"

---

# 4. 페이지 전체 디자인 방향

## 핵심 컨셉

**Technology Journal + Digital Magazine + Corporate Research Archive**

기존 서비스 페이지처럼 동일 크기의 카드 4개를 첫 화면에 나열하는 방식은 사용하지 않는다.

인사이트 페이지는 콘텐츠가 지속적으로 축적되는 구조이므로,
"온라인 기술 저널"처럼 보여야 한다.

### 디자인 키워드

- Editorial
- Technology Journal
- Research Archive
- Data Intelligence
- Premium Corporate
- Clean
- Structured
- Asymmetric Layout
- Large Typography
- Generous Whitespace

---

# 5. Hero 영역

페이지 상단에 충분한 여백을 둔다.

예시 구조:

```text
05  ──  INSIGHT

데이터와 기술을
더 깊이 이해합니다.

Technology · Data & Statistics · Research · Case Study

INIT가 프로젝트와 연구 과정에서 축적한
데이터·통계·AI 기술과 경험을 공유합니다.
```

## Hero 요구사항

- 기존 사이트의 대메뉴 번호 표기 스타일이 있으면 그대로 사용
- 제목은 2줄 정도의 대형 타이포그래피
- 오른쪽에는 과도한 일러스트 대신
  - 미세한 데이터 그리드
  - 얇은 연결선
  - 점/노드
  - 미세한 gradient glow
  정도만 사용
- Hero 자체에 큰 카드나 버튼을 여러 개 배치하지 않는다.
- 모바일에서는 1열 구조

---

# 6. Featured Insight

Hero 아래에 가장 중요한 콘텐츠 1개를 대형 Featured Article로 보여준다.

예:

```text
FEATURED INSIGHT
AI · DATA QUALITY

규칙 기반 데이터 내검에서
AI 기반 데이터 품질 관리로

기존 업무 규칙과 실제 데이터에서 패턴을 발견하고
설명 가능한 품질 규칙으로 전환하는 방법을 살펴봅니다.

[Read Insight →]
```

## 디자인

- 전체 폭 또는 60:40 비대칭 레이아웃
- 왼쪽: 제목/요약/태그/날짜
- 오른쪽: 추상 데이터/AI 비주얼 또는 콘텐츠 썸네일
- 지나치게 카드처럼 보이는 테두리를 사용하지 말고 섹션 자체가 하나의 에디토리얼 블록처럼 보이게 한다.
- 이미지가 없더라도 gradient + technical pattern으로 자연스럽게 보이도록 fallback 처리

---

# 7. Category Navigation

Featured 아래 또는 Hero 하단에 카테고리 필터를 배치한다.

```text
All
Technology
Data & Statistics
Research & Lab
Case Study
```

요구사항:

- pill 버튼을 과도하게 둥글게 만들지 않는다.
- 활성 카테고리는 INIT의 teal/cyan 계열 accent 사용
- desktop에서 가로 배열
- mobile에서는 horizontal scroll 가능
- 필터 변경 시 전체 페이지 reload 없이 목록 갱신
- 현재 기술 구조상 서버 렌더링이 적절하면 query parameter 방식도 허용

예:

```text
/insight?category=technology
```

---

# 8. Latest Insights

대표 콘텐츠 아래에 최신 콘텐츠 영역을 구성한다.

## 권장 구조

desktop:
- 3열 grid

tablet:
- 2열

mobile:
- 1열

각 항목은 다음 정보를 가진다.

```text
CATEGORY
Title
Summary
Published Date
Reading Time
Thumbnail / Abstract visual
→
```

카드 디자인은 기존 서비스 페이지의 박스와 다르게 한다.

### 금지

- 동일한 높이의 회색 박스만 3~4개 반복
- 모든 요소에 border
- 모든 콘텐츠를 glass card 처리
- 과도한 그림자
- 아이콘만 크게 넣는 패턴

### 권장

- 이미지 + 타이포 중심
- 일부 콘텐츠는 이미지가 크게
- 일부는 텍스트 중심
- 첫 번째 콘텐츠를 2-column span으로 만드는 editorial grid도 가능
- hover 시 이미지 scale 1.02~1.04 / 제목 accent / arrow 이동 정도만 사용

---

# 9. 콘텐츠 상세 페이지

가능하면 이번 작업에서 상세 페이지 구조까지 구현한다.

경로 예:

```text
/insight/:slug
```

또는 현재 프로젝트의 라우팅 규칙에 맞게 변경.

상세 페이지 구조:

1. Category
2. Title
3. Summary
4. Published Date / Reading Time
5. Hero visual
6. Article content
7. 관련 콘텐츠
8. 이전/다음 글 또는 Back to Insight

본문 max-width는 읽기 편하게 제한한다.

권장:

```css
max-width: 760px ~ 860px;
line-height: 1.75 ~ 1.9;
```

---

# 10. 초기 Seed 콘텐츠

최소 8~12개의 샘플 콘텐츠를 준비한다.

우선 아래 콘텐츠를 사용한다.

1. 데이터 에디팅이란?
2. 데이터 품질관리가 필요한 이유
3. 규칙 기반 내검과 AI 기반 내검의 차이
4. GraphRAG는 기존 RAG와 무엇이 다른가
5. 생성형 AI와 공공데이터 활용
6. 표본설계와 층화추출의 기본 개념
7. 데이터 프로파일링이 필요한 이유
8. AI 기반 이상치 탐지
9. Oracle Database 기반 데이터 분석
10. 데이터 품질 플랫폼 구축 방법

샘플 콘텐츠 데이터는 별도 JSON 또는 현재 프로젝트에서 사용하는 데이터 구조에 맞춰 관리한다.

정적 배열을 사용하더라도 나중에 CMS/API로 교체할 수 있게 분리한다.

---

# 11. 권장 데이터 모델

현재 프로젝트 구조에 맞게 이름은 변경 가능하다.

```ts
type InsightCategory =
  | 'technology'
  | 'data-statistics'
  | 'research'
  | 'case-study';

interface InsightPost {
  id: string;
  slug: string;
  category: InsightCategory;
  categoryLabel: string;
  title: string;
  summary: string;
  publishedAt: string;
  readingTime: number;
  featured?: boolean;
  thumbnail?: string;
  tags?: string[];
  content?: string;
}
```

---

# 12. 컴포넌트 구조 권장안

현재 프로젝트가 컴포넌트 기반이라면 아래와 비슷하게 분리한다.

```text
InsightPage
 ├─ InsightHero
 ├─ FeaturedInsight
 ├─ InsightCategoryNav
 ├─ InsightGrid
 │   └─ InsightCard
 └─ InsightCTA
```

상세:

```text
InsightDetailPage
 ├─ InsightArticleHeader
 ├─ InsightArticleBody
 ├─ RelatedInsights
 └─ InsightNavigation
```

단, 현재 프로젝트의 naming convention을 우선한다.

---

# 13. 마지막 CTA 영역

인사이트의 끝은 뉴스레터 구독보다 현재 INIT 사이트 특성상
"프로젝트/솔루션 상담"으로 연결하는 편이 적합하다.

예:

```text
FROM INSIGHT TO SOLUTION

데이터에 대한 이해를
실제 업무 시스템으로 연결하세요.

현재 데이터와 업무 환경에 맞는
분석·품질관리·AI 적용 방법을 함께 검토합니다.

[솔루션 문의하기 →]
```

기존 Contact / 문의 페이지가 있다면 해당 경로로 연결한다.

---

# 14. 시각적 연결 규칙

현재 홈페이지의 기존 톤을 유지한다.

## Light section

- white
- very light gray-blue
- navy text
- cyan / teal accent
- border는 매우 얇게

## Dark section

- deep navy
- slightly brighter navy panel
- cyan / teal accent
- white text
- 너무 많은 neon glow 금지

### 추천 변수 예

실제 프로젝트 CSS variable이 존재하면 반드시 기존 값을 사용한다.

```css
--insight-navy: #081a33;
--insight-deep: #051427;
--insight-blue: #145ee8;
--insight-cyan: #31d4c5;
--insight-light: #f5f8fc;
--insight-line: rgba(30, 70, 120, 0.16);
```

위 값은 참고값일 뿐, 실제 소스의 기존 브랜드 컬러를 우선한다.

---

# 15. 배경 이미지 처리

배경 이미지는 콘텐츠와 분리한다.

권장 구조 예:

```text
/public/images/insight/
  insight-hero-bg.webp
  insight-featured-ai.webp
  insight-default-thumb.webp
```

CSS:

```css
.insight-hero {
  position: relative;
  overflow: hidden;
}

.insight-hero::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(
      90deg,
      rgba(247,250,253,1) 0%,
      rgba(247,250,253,.96) 42%,
      rgba(247,250,253,.68) 70%,
      rgba(247,250,253,.15) 100%
    ),
    url("/images/insight/insight-hero-bg.webp") right center / cover no-repeat;
  pointer-events: none;
}

.insight-hero > * {
  position: relative;
  z-index: 1;
}
```

이미지 자체에 제목, 문구, 카드, UI 텍스트를 넣지 않는다.

---

# 16. 반응형

반드시 기존 breakpoint를 우선 사용한다.

기본 요구:

## Desktop
- max-width 기존 사이트와 통일
- featured 2-column
- contents 3-column

## Tablet
- featured 비율 축소
- contents 2-column

## Mobile
- 모든 섹션 1-column
- 제목 2~3줄 허용
- category navigation horizontal scroll
- 이미지 높이 고정 최소화
- hover 전용 interaction에 의존하지 않는다.

---

# 17. 접근성 / SEO

- semantic HTML 사용
  - `main`
  - `section`
  - `article`
  - `nav`
- 이미지 alt 제공
- heading 순서 준수
- 링크는 실제 `<a>` 또는 router link 사용
- keyboard focus 표시
- 카테고리 필터는 button 또는 link 중 동작에 맞는 semantic element 사용

SEO:

- Insight list meta title / description
- 각 detail page title / description
- Open Graph metadata 구조가 이미 있으면 적용

---

# 18. 애니메이션

기존 사이트에서 사용하는 animation library가 있으면 재사용한다.

허용:

- section fade-up
- 12~24px 정도 translate
- 400~700ms
- stagger
- thumbnail hover scale 1.02~1.04
- arrow 4~8px 이동

금지:

- 과도한 parallax
- 카드가 크게 튀어오르는 효과
- 지속적인 neon pulse
- 읽기를 방해하는 자동 움직임

`prefers-reduced-motion` 고려.

---

# 19. 구현 시 매우 중요한 원칙

1. 기존 Header/Footer를 새로 만들지 않는다.
2. 기존 공통 CSS와 component를 최대한 재사용한다.
3. 기존 페이지 스타일을 깨지 않는다.
4. 기존 서비스 페이지의 박스 나열 디자인을 그대로 복제하지 않는다.
5. 인사이트는 에디토리얼 중심으로 보이게 한다.
6. 콘텐츠와 배경 이미지를 분리한다.
7. 이미지 안에 문구를 포함하지 않는다.
8. 임의의 외부 유료 API나 CMS를 추가하지 않는다.
9. 현재 데이터가 없으면 local seed data로 구현하되 향후 API 교체가 쉬운 구조로 만든다.
10. 작업 후 기존 메뉴와 전체 반응형을 같이 확인한다.

---

# 20. Codex 실행 순서

다음 순서대로 작업한다.

### STEP 1
프로젝트 구조와 기존 디자인 시스템 분석

### STEP 2
현재 Insight 관련 파일/route 검색

### STEP 3
구현 계획을 먼저 간단히 출력

### STEP 4
Insight seed data 생성

### STEP 5
Insight listing page 구현

### STEP 6
카테고리 필터 구현

### STEP 7
Insight detail page 구현

### STEP 8
기존 Header 대메뉴의 Insight 링크 확인

### STEP 9
responsive / hover / animation 보정

### STEP 10
lint / build / test 실행

### STEP 11
수정한 파일 목록과 주요 변경사항 정리

---

# 21. 완료 기준

아래 조건을 모두 만족해야 완료된 것으로 본다.

- [ ] 인사이트가 기존 사이트에서 정상 접근됨
- [ ] Hero가 기존 브랜드 스타일과 일치함
- [ ] 서비스 페이지와 다른 editorial 디자인임
- [ ] Featured Insight가 존재함
- [ ] 4개 카테고리 필터가 동작함
- [ ] 최소 8개 이상의 seed 콘텐츠가 표시됨
- [ ] desktop/tablet/mobile에서 정상
- [ ] 상세페이지 또는 상세화면 연결이 정상
- [ ] 기존 Header/Footer 깨짐 없음
- [ ] 콘텐츠와 배경이미지가 분리됨
- [ ] 이미지에 텍스트가 포함되지 않음
- [ ] build/lint 오류 없음

---

# 22. 최종 보고 형식

작업이 끝나면 아래 형식으로 보고한다.

```text
1. 분석한 기존 구조
2. 변경한 파일
3. 새로 추가한 파일
4. 구현한 기능
5. 디자인 적용 내용
6. 반응형 처리
7. 테스트/build 결과
8. 사용자가 직접 확인해야 할 항목
```

가능하면 작업 전후를 비교할 수 있도록 변경사항을 간결하게 설명한다.
