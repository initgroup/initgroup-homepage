from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class InsightCategory:
    key: str
    index: str
    label: str
    label_en: str
    section_id: str
    archive_route: str
    headline: str
    description: str


@dataclass(frozen=True, slots=True)
class InsightReport:
    report_id: str
    category_key: str
    kicker: str
    title: str
    description: str
    one_sentence: str
    published_at: str
    published_display: str
    reading_time: str
    summary_points: tuple[str, str, str]
    toc: tuple[tuple[str, str], ...]
    conclusion_title: str
    conclusion: str
    related_ids: tuple[str, ...] = ()
    content_template: str | None = None
    page_template: str | None = None
    legacy_route: str | None = None

    @property
    def public_route(self) -> str:
        return f"/insights/reports/{self.report_id}/"

    @property
    def output_path(self) -> str:
        return self.public_route.strip("/") + "/index.html"

    @property
    def page_key(self) -> str:
        return f"insight-report-{self.report_id}"


INSIGHT_CATEGORIES = (
    InsightCategory(
        key="technology",
        index="01",
        label="기술·AI",
        label_en="TECHNOLOGY & AI",
        section_id="technologyInsight",
        archive_route="/insights/technology-ai/",
        headline="기술의 구조를\n업무의 언어로 해석합니다.",
        description="새 기술을 소개하는 데서 멈추지 않고, 어떤 문제에 적용할지와 검증·운영 조건까지 함께 다룹니다.",
    ),
    InsightCategory(
        key="data-statistics",
        index="02",
        label="데이터·통계",
        label_en="DATA & STATISTICS",
        section_id="dataStatisticsInsight",
        archive_route="/insights/data-statistics/",
        headline="데이터의 상태를 읽고\n판단의 기준을 세웁니다.",
        description="프로파일링, 품질 검증과 표본 설계를 통해 결과를 믿을 수 있는 근거와 적용 범위를 설계합니다.",
    ),
    InsightCategory(
        key="research-lab",
        index="03",
        label="연구·검증",
        label_en="RESEARCH & LAB",
        section_id="researchLabInsight",
        archive_route="/insights/research-lab/",
        headline="가능성을 실험하고\n운영 가능한 조건을 찾습니다.",
        description="성능 수치만이 아니라 설명 가능성, 사람의 검토와 반복 운영까지 이어지는 검증 조건을 살핍니다.",
    ),
    InsightCategory(
        key="applied",
        index="04",
        label="현장 적용",
        label_en="APPLIED INSIGHT",
        section_id="appliedInsight",
        archive_route="/insights/applied/",
        headline="분석 결과를\n반복 가능한 업무로 연결합니다.",
        description="분석 근거, 실행 이력과 운영 화면을 연결해 결과가 실제 업무에서 계속 쓰이게 하는 방법을 다룹니다.",
    ),
)


INSIGHT_CATEGORIES_BY_KEY = {category.key: category for category in INSIGHT_CATEGORIES}


INSIGHT_REPORTS = (
    InsightReport(
        report_id="20260816_01",
        category_key="technology",
        kicker="KNOWLEDGE ARCHITECTURE",
        title="GraphRAG는 언제 필요한가: 검색 정확도보다 관계의 맥락을 설계하는 법",
        description="문서 조각 검색과 지식 그래프 탐색의 차이를 업무 질문, 출처와 변경 관리 관점에서 정리합니다.",
        one_sentence="GraphRAG는 모든 문서에 붙이는 기능이 아니라, 관계를 따라 근거를 설명해야 하는 질문에 쓰는 지식 구조입니다.",
        published_at="2026-08-16",
        published_display="2026.08.16",
        reading_time="7 min read",
        summary_points=(
            "문서 내용만 찾으면 되는 질문과, 개체·관계의 맥락이 필요한 질문을 먼저 구분합니다.",
            "그래프는 검색 결과를 꾸미는 장식이 아니라 출처, 관계와 갱신 기준을 관리하는 운영 구조입니다.",
            "정확도 평가는 답변 문장뿐 아니라 근거 경로와 최신성, 권한 통제까지 함께 봐야 합니다.",
        ),
        toc=(("question", "GraphRAG가 필요한 질문"), ("model", "지식 구조 만들기"), ("operate", "검증과 운영 기준")),
        conclusion_title="관계를 설명해야 할 때, 검색은 지식 구조가 됩니다",
        conclusion="업무의 판단 근거가 여러 문서와 개체 사이를 오갈 때 GraphRAG는 유용합니다. 다만 먼저 질문, 출처와 갱신 책임을 설계해야 관계 탐색이 신뢰할 수 있는 답변으로 이어집니다.",
        related_ids=("20260816_02", "20260816_03"),
        content_template="insight-reports/20260816_01/index.html",
    ),
    InsightReport(
        report_id="20260816_02",
        category_key="technology",
        kicker="GENERATIVE AI",
        title="생성형 AI를 업무에 연결하기 전 확인할 4가지 기준",
        description="검색 범위, 출처 표시, 권한과 최신성 관리를 기준으로 생성형 AI 적용 범위를 설계합니다.",
        one_sentence="생성형 AI의 첫 설계 대상은 프롬프트가 아니라, 답변이 어떤 근거와 권한 위에서 만들어질지를 정하는 일입니다.",
        published_at="2026-08-16",
        published_display="2026.08.16",
        reading_time="6 min read",
        summary_points=(
            "질문별로 허용된 지식 범위와 답변이 필요한 근거 수준을 정의합니다.",
            "출처, 권한과 최신성은 모델 밖에서 관리하고 답변 화면까지 전달합니다.",
            "자동 응답·초안·검토 보조를 업무 위험과 되돌릴 수 있는 수준에 맞춰 나눕니다.",
        ),
        toc=(("scope", "답변의 범위 정하기"), ("evidence", "출처·권한·최신성"), ("workflow", "업무 흐름에 넣기")),
        conclusion_title="좋은 답변은 모델 성능보다 운영 기준에서 시작됩니다",
        conclusion="생성형 AI는 빠르게 문장을 만들 수 있지만, 업무 신뢰는 답변의 범위와 근거를 명확히 할 때 생깁니다. 작은 검토 보조부터 시작해 실제 예외와 책임을 기준으로 범위를 넓히는 편이 안전합니다.",
        related_ids=("20260816_01", "20260816_04"),
        content_template="insight-reports/20260816_02/index.html",
    ),
    InsightReport(
        report_id="20260816_03",
        category_key="technology",
        kicker="DATABASE ANALYTICS",
        title="데이터를 옮기지 않고 분석하기: 데이터베이스 안에서 판단 흐름을 설계하는 법",
        description="데이터 이동을 줄이면서 분석·보안·운영 기준을 연결하는 데이터베이스 기반 분석 구조를 설명합니다.",
        one_sentence="분석 위치를 결정할 때는 성능만이 아니라 데이터 이동, 권한과 실행 이력을 함께 설계해야 합니다.",
        published_at="2026-08-16",
        published_display="2026.08.16",
        reading_time="6 min read",
        summary_points=(
            "분석을 데이터 가까이 배치할수록 전송 비용과 복제 위험을 줄일 수 있습니다.",
            "원천·중간 산출물·결과의 접근 권한과 마스킹 기준을 한 흐름으로 관리합니다.",
            "실행 조건과 결과를 남겨 같은 판단이 언제·어떤 데이터에서 나왔는지 확인합니다.",
        ),
        toc=(("location", "분석 위치 결정하기"), ("control", "권한과 데이터 통제"), ("trace", "실행 이력 남기기")),
        conclusion_title="분석 구조는 데이터의 이동 경로에서 드러납니다",
        conclusion="데이터베이스 기반 분석은 데이터를 한곳에 가두는 방식이 아니라, 이동·권한·실행을 통제해 신뢰할 수 있는 판단 흐름을 만드는 방법입니다. 업무별로 필요한 계산과 검토 경계를 먼저 정의해야 합니다.",
        related_ids=("20260816_01", "20260801_03"),
        content_template="insight-reports/20260816_03/index.html",
    ),
    InsightReport(
        report_id="20260801_01",
        category_key="data-statistics",
        kicker="DATA EDITING",
        title="데이터 품질은 전처리가 아니라 운영 체계입니다",
        description="데이터 품질 규칙을 제안·검토·실행·개선의 운영 수명주기로 설계하는 방법을 소개합니다.",
        one_sentence="좋은 품질 규칙은 오류를 찾는 조건이 아니라, 근거와 책임이 반복 실행되는 운영 자산입니다.",
        published_at="2026-08-01",
        published_display="2026.08.01",
        reading_time="10 min read",
        summary_points=("규칙의 근거와 버전을 남깁니다.", "자동 탐지와 최종 판단을 분리합니다.", "결정 이력을 다음 개선에 연결합니다."),
        toc=(),
        conclusion_title="",
        conclusion="",
        related_ids=("20260816_04", "20260816_05"),
        page_template="insight-reports/20260801_01/index.html",
        legacy_route="/insights/data-quality-rules/",
    ),
    InsightReport(
        report_id="20260816_04",
        category_key="data-statistics",
        kicker="AI VALIDATION",
        title="규칙 기반 검증과 AI 검증을 함께 운영하는 기준",
        description="확정 규칙과 AI 후보 탐지를 역할·오탐 비용·검토 흐름에 따라 구분하고 연결하는 방법을 정리합니다.",
        one_sentence="규칙과 AI는 경쟁하는 검증 방식이 아니라, 확정 기준과 탐색 신호를 분담하는 두 개의 장치입니다.",
        published_at="2026-08-16",
        published_display="2026.08.16",
        reading_time="7 min read",
        summary_points=(
            "명확한 업무 기준은 규칙으로, 아직 정의되지 않은 패턴은 AI 후보 탐지로 다룹니다.",
            "AI 결과는 확정값이 아니라 근거·신뢰도·검토 우선순위를 가진 후보로 제시합니다.",
            "오탐·누락과 전문가의 결정은 규칙 및 모델 개선의 공통 입력으로 관리합니다.",
        ),
        toc=(("roles", "두 검증 방식의 역할"), ("review", "검토 흐름 설계"), ("measure", "성능을 운영 기준으로 읽기")),
        conclusion_title="검증의 목표는 더 많은 경고가 아니라 더 나은 판단입니다",
        conclusion="규칙은 합의된 기준을 일관되게 지키게 하고, AI는 아직 정의하지 못한 변화를 찾게 합니다. 두 결과가 하나의 검토 흐름과 개선 이력으로 만날 때 검증 체계가 실제 운영에서 강해집니다.",
        related_ids=("20260801_01", "20260801_02"),
        content_template="insight-reports/20260816_04/index.html",
    ),
    InsightReport(
        report_id="20260816_05",
        category_key="data-statistics",
        kicker="DATA PROFILING",
        title="데이터 프로파일링으로 분석 전에 판단 기준 세우기",
        description="결측, 분포, 중복과 관계를 측정해 분석·품질·표본 설계의 판단 기준으로 바꾸는 방법을 설명합니다.",
        one_sentence="프로파일링은 데이터를 한 번 훑는 작업이 아니라, 어떤 결과까지 믿을 수 있는지를 정하는 출발점입니다.",
        published_at="2026-08-16",
        published_display="2026.08.16",
        reading_time="7 min read",
        summary_points=(
            "결측·분포·중복·관계를 업무 질문과 연결해 측정합니다.",
            "통계적 이상은 오류 확정이 아니라, 확인할 우선순위를 정하는 신호로 다룹니다.",
            "측정 결과를 품질 규칙, 표본 설계와 분석 방법 선택의 입력으로 이어갑니다.",
        ),
        toc=(("measure", "무엇을 측정할 것인가"), ("interpret", "이상을 어떻게 읽을 것인가"), ("connect", "다음 판단으로 연결하기")),
        conclusion_title="데이터를 이해한 뒤에야 분석 방법을 선택할 수 있습니다",
        conclusion="프로파일링으로 관찰한 데이터의 한계는 분석을 막는 문제가 아니라, 해석 범위와 검증 방법을 정하는 근거입니다. 같은 지표를 주기적으로 비교하면 변화 자체도 중요한 운영 신호가 됩니다.",
        related_ids=("20260816_04", "20260816_06"),
        content_template="insight-reports/20260816_05/index.html",
    ),
    InsightReport(
        report_id="20260816_06",
        category_key="data-statistics",
        kicker="SAMPLING DESIGN",
        title="표본설계와 층화추출: 대표성을 판단할 수 있는 표본의 전제",
        description="조사 목적, 모집단과 표본틀을 확인한 뒤 층화·배분·가중의 기준을 설계하는 기본 개념을 설명합니다.",
        one_sentence="표본설계는 추출 기법을 고르는 일이 아니라, 어떤 모집단에 어디까지 말할 수 있는지를 미리 정하는 일입니다.",
        published_at="2026-08-16",
        published_display="2026.08.16",
        reading_time="8 min read",
        summary_points=(
            "조사 목적·모집단·표본틀을 먼저 분리해 정의해야 대표성의 범위를 설명할 수 있습니다.",
            "층화는 중요한 집단이 빠지지 않도록 설계하고, 배분은 정확도와 자원 사이의 선택입니다.",
            "가중·무응답·조사 모드까지 기록해야 결과 해석과 다음 조사 개선이 가능합니다.",
        ),
        toc=(("frame", "모집단과 표본틀"), ("strata", "층화와 배분의 기준"), ("interpret", "추정과 해석의 경계")),
        conclusion_title="대표성은 추출 뒤가 아니라 설계 단계에서 만들어집니다",
        conclusion="표본이 모집단을 얼마나 잘 설명하는지는 표본 수만으로 결정되지 않습니다. 누구를 포함하고 제외했는지, 어떤 집단을 더 정밀하게 봐야 하는지, 결과를 어디까지 일반화할지를 설계 단계에서 투명하게 정해야 합니다.",
        related_ids=("20260816_05", "20260801_01"),
        content_template="insight-reports/20260816_06/index.html",
    ),
    InsightReport(
        report_id="20260801_02",
        category_key="research-lab",
        kicker="HUMAN-IN-THE-LOOP",
        title="자동화의 마지막 판단을 전문가에게 남기는 설계",
        description="AI의 후보 제안과 담당자의 최종 책임을 연결하는 Human-in-the-loop 업무 설계 방법을 소개합니다.",
        one_sentence="AI는 후보와 근거를 제시하고, 최종 책임은 업무 담당자의 검토 절차에 연결합니다.",
        published_at="2026-08-01",
        published_display="2026.08.01",
        reading_time="10 min read",
        summary_points=("자동화 경계를 정합니다.", "전문가 검토 흐름을 설계합니다.", "결정을 개선에 연결합니다."),
        toc=(),
        conclusion_title="",
        conclusion="",
        related_ids=("20260816_04", "20260801_03"),
        page_template="insight-reports/20260801_02/index.html",
        legacy_route="/insights/human-in-the-loop/",
    ),
    InsightReport(
        report_id="20260801_03",
        category_key="applied",
        kicker="TRACEABLE ANALYTICS",
        title="재현 가능한 분석을 만드는 실행 이력",
        description="입력 데이터, 실행 조건과 결과를 하나의 실행 이력으로 연결해 다시 실행하고 비교할 수 있는 방법을 소개합니다.",
        one_sentence="데이터 계약부터 실행 조건과 결과까지 끊기지 않게 연결해야 분석이 업무 자산이 됩니다.",
        published_at="2026-08-01",
        published_display="2026.08.01",
        reading_time="10 min read",
        summary_points=("입력과 버전을 고정합니다.", "실행 단위를 남깁니다.", "결과를 다음 운영에 연결합니다."),
        toc=(),
        conclusion_title="",
        conclusion="",
        related_ids=("20260816_03", "20260801_02"),
        page_template="insight-reports/20260801_03/index.html",
        legacy_route="/insights/reproducible-analysis/",
    ),
)


INSIGHT_REPORTS_BY_ID = {report.report_id: report for report in INSIGHT_REPORTS}
INSIGHT_LEGACY_REDIRECTS = {
    report.legacy_route: report.public_route
    for report in INSIGHT_REPORTS
    if report.legacy_route
}


def reports_for_category(category_key: str) -> tuple[InsightReport, ...]:
    return tuple(report for report in INSIGHT_REPORTS if report.category_key == category_key)
