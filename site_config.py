from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class SiteInformation:
    url: str
    company_name: str
    alternate_name: str
    brand_name: str
    founding_date: str
    email: str
    phone_display: str
    phone_href: str
    phone_international: str
    address_country: str
    address_region: str
    street_address: str
    street_address_line_1: str
    street_address_line_2: str


SITE = SiteInformation(
    url="https://initgroup.kr",
    company_name="주식회사 인아이티",
    alternate_name="INIT",
    brand_name="인아이티",
    founding_date="2013-03",
    email="support@initgroup.kr",
    phone_display="070-8785-9647",
    phone_href="+827087859647",
    phone_international="+82-70-8785-9647",
    address_country="KR",
    address_region="대전광역시",
    street_address="대덕구 대화로 120, 가온비즈타워 1024호",
    street_address_line_1="대전광역시 대덕구 대화로 120",
    street_address_line_2="가온비즈타워 1024호",
)

SITE_URL = SITE.url

ASSET_VERSIONS = {
    "css/site.css": "20260803.1",
    "css/page-hero.css": "20260803.2",
    "css/page-headings.css": "20260803.1",
    "css/corporate.css": "20260803.1",
    "css/editorial.css": "20260803.1",
    "css/legal.css": "20260801.9",
    "css/solutions.css": "20260803.1",
    "js/boot.js": "20260801.2",
    "js/site.js": "20260801.2",
}

NAV_ITEMS = (
    ("company", "/company/", "회사"),
    ("services", "/services/", "서비스"),
    ("solutions", "/solutions/", "솔루션"),
    ("projects", "/projects/", "프로젝트"),
    ("insights", "/insights/", "인사이트"),
    ("careers", "/careers/", "채용"),
)

MOBILE_NAV_ITEMS = NAV_ITEMS


@dataclass(frozen=True, slots=True)
class MobileAction:
    href: str
    label: str
    arrow: bool = False


@dataclass(frozen=True, slots=True)
class Page:
    key: str
    route: str
    output_path: str
    title: str
    description: str
    nav_key: str
    og_title: str | None = None
    og_description: str | None = None
    og_type: str | None = "website"
    og_image: str | None = None
    og_image_alt: str | None = None
    twitter_card: str | None = None
    section_css: str | None = None
    body_class: str = ""
    main_class: str = ""
    theme_color: str = "#f4f6f8"
    robots: str | None = None
    mobile_actions: tuple[MobileAction, ...] = ()
    compact_chrome: bool = False

    @property
    def canonical(self) -> str:
        return f"{SITE_URL}{self.route}"

    @property
    def template(self) -> str:
        return self.output_path


PAGES = (
    Page(
        key="home",
        route="/",
        output_path="index.html",
        title="인아이티 | AI·통계·데이터 품질 전문기업",
        description="인아이티는 데이터의 신뢰를 설계하고 AI의 판단을 운영으로 연결합니다. 국가통계·공공·금융·산업 데이터 컨설팅, 분석 시스템 구축과 데이터 품질 솔루션을 제공합니다.",
        nav_key="home",
        og_title="인아이티 | 데이터의 맥락을 읽고, 판단이 작동하는 시스템",
        og_description="통계적 전문성으로 현장 문제를 정의하고, 데이터 품질·AI 분석·업무 시스템을 설계·구축·운영합니다.",
        mobile_actions=(
            MobileAction("/services/", "역량 보기"),
            MobileAction("/contact/", "과제 상담", arrow=True),
        ),
    ),
    Page(
        key="company",
        route="/company/",
        output_path="company/index.html",
        title="회사소개 | 데이터 운영 전문기업 인아이티",
        description="2013년부터 국가통계·공공·금융·산업 데이터를 다뤄온 인아이티의 미션, 수행 방식, 연혁과 기술 기반을 소개합니다.",
        nav_key="company",
        og_title="회사소개 | 데이터 운영 전문기업 인아이티",
        og_description="통계의 깊이로 데이터를 읽고, 운영의 언어로 완성합니다.",
        section_css="css/corporate.css",
        mobile_actions=(
            MobileAction("/services/", "서비스 보기"),
            MobileAction("/contact/", "과제 상담", arrow=True),
        ),
    ),
    Page(
        key="services",
        route="/services/",
        output_path="services/index.html",
        title="AI·통계·데이터 품질 서비스 | 인아이티",
        description="데이터 전략과 통계 컨설팅, 데이터 엔지니어링·품질, AI·통계 분석, 의사결정 시스템 구축과 운영을 하나의 팀으로 제공합니다.",
        nav_key="services",
        og_title="AI·통계·데이터 품질 서비스 | 인아이티",
        og_description="문제 정의부터 분석 시스템 운영까지 하나의 팀으로 이어갑니다.",
        section_css="css/corporate.css",
        mobile_actions=(
            MobileAction("/projects/", "프로젝트 보기"),
            MobileAction("/contact/", "과제 상담", arrow=True),
        ),
    ),
    Page(
        key="solutions",
        route="/solutions/",
        output_path="solutions/index.html",
        title="데이터 품질·빅데이터 솔루션 | 인아이티",
        description="설명 가능한 데이터 품질 플랫폼 INIT Data Editing System과 수집·분석·시각화를 연결하는 인법스 빅데이터 플랫폼을 소개합니다.",
        nav_key="solutions",
        og_title="데이터 품질·빅데이터 솔루션 | 인아이티",
        og_description="데이터를 이해하고 근거를 만들며 운영까지 연결하는 인아이티의 솔루션입니다.",
        section_css="css/solutions.css",
        body_class="solutions-page solution-hub-page",
        mobile_actions=(
            MobileAction("#portfolioTitle", "제품 비교"),
            MobileAction("/contact/", "도입 상담", arrow=True),
        ),
    ),
    Page(
        key="data-editing-system",
        route="/solutions/data-editing-system/",
        output_path="solutions/data-editing-system/index.html",
        title="INIT Data Editing System | 설명 가능한 데이터 품질 플랫폼",
        description="데이터 구조와 관계를 분석해 설명 가능한 품질 규칙을 발굴하고, 위반 탐지·전문가 검토·수정·실행 이력을 관리하는 INIT Data Editing System을 소개합니다.",
        nav_key="solutions",
        og_title="INIT Data Editing System | 인아이티",
        og_description="규칙 후보를 발견하고, 전문가가 판단하며, 과정을 이력으로 남기는 데이터 품질 플랫폼.",
        og_type="product",
        og_image=f"{SITE_URL}/assets/images/product/login-overview.png",
        section_css="css/solutions.css",
        body_class="solutions-page data-editing-page",
        mobile_actions=(
            MobileAction("#productScreensTitle", "실제 화면"),
            MobileAction("/contact/", "도입 상담", arrow=True),
        ),
    ),
    Page(
        key="inbups",
        route="/solutions/inbups/",
        output_path="solutions/inbups/index.html",
        title="인법스(IN-BAPS) 빅데이터 플랫폼 | 인아이티",
        description="Open API·SNS·웹 데이터를 수집하는 C-BAP, 통계·텍스트·관계 분석을 수행하는 R-BAP, 차트·BI·R 시각화로 전달하는 V-BAP을 연결한 인법스 플랫폼입니다.",
        nav_key="solutions",
        og_title="인법스(IN-BAPS) 빅데이터 플랫폼 | 인아이티",
        og_description="수집·분석·시각화를 하나의 데이터 활용 흐름으로 연결합니다.",
        og_type="product",
        section_css="css/solutions.css",
        body_class="solutions-page inbups-page",
        mobile_actions=(
            MobileAction("#inbupsModules", "모듈 보기"),
            MobileAction("/contact/", "적용 상담", arrow=True),
        ),
    ),
    Page(
        key="projects",
        route="/projects/",
        output_path="projects/index.html",
        title="국가통계·금융·제조 데이터 프로젝트 | 인아이티",
        description="국가통계, 금융 데이터 분석, 제조 수요예측과 연구·정책 데이터 분야에서 인아이티가 수행해 온 역할과 접근 방식을 문제·역할·접근·산출 구조로 소개합니다.",
        nav_key="projects",
        og_title="국가통계·금융·제조 데이터 프로젝트 | 인아이티",
        og_description="기술 목록보다 현장의 문제, 인아이티의 역할과 운영에 남은 변화를 먼저 보여드립니다.",
        section_css="css/editorial.css",
        main_class="editorial-main",
        mobile_actions=(
            MobileAction("/insights/", "실무 인사이트"),
            MobileAction("/contact/", "과제 상담", arrow=True),
        ),
    ),
    Page(
        key="insights",
        route="/insights/",
        output_path="insights/index.html",
        title="AI·통계·데이터 품질 인사이트 | 인아이티",
        description="데이터 품질 규칙, Human-in-the-loop, 재현 가능한 분석처럼 AI와 통계를 실제 운영에 적용할 때 필요한 인아이티의 실무 관점을 읽어보세요.",
        nav_key="insights",
        og_title="AI·통계·데이터 품질 인사이트 | 인아이티",
        og_description="유행하는 기술보다 신뢰 가능한 데이터와 설명 가능한 운영 방법을 이야기합니다.",
        section_css="css/editorial.css",
        main_class="editorial-main",
        mobile_actions=(
            MobileAction("/projects/", "프로젝트 보기"),
            MobileAction("/contact/", "과제 상담", arrow=True),
        ),
    ),
    Page(
        key="data-quality-rules",
        route="/insights/data-quality-rules/",
        output_path="insights/data-quality-rules/index.html",
        title="데이터 품질은 전처리가 아니라 운영 체계입니다 | 인아이티",
        description="데이터 품질 규칙을 일회성 정제가 아닌 제안·검토·실행·개선의 운영 수명주기로 설계하는 방법과 실무 점검표를 소개합니다.",
        nav_key="insights",
        og_title="데이터 품질은 전처리가 아니라 운영 체계입니다",
        og_description="규칙의 근거, 담당자의 판단과 변경 이력이 다음 실행에도 이어져야 하는 이유.",
        og_type="article",
        section_css="css/editorial.css",
        main_class="editorial-main",
        mobile_actions=(
            MobileAction("/insights/", "글 목록"),
            MobileAction("/contact/", "과제 상담", arrow=True),
        ),
    ),
    Page(
        key="human-in-the-loop",
        route="/insights/human-in-the-loop/",
        output_path="insights/human-in-the-loop/index.html",
        title="자동화의 마지막 판단을 전문가에게 남기는 설계 | 인아이티",
        description="AI의 후보 제안과 업무 담당자의 최종 책임을 분리하고, 근거·검토·결정·이력을 연결하는 Human-in-the-loop 업무 설계 방법을 소개합니다.",
        nav_key="insights",
        og_title="자동화의 마지막 판단을 전문가에게 남기는 설계",
        og_description="AI는 후보와 근거를 제시하고, 최종 책임은 업무 담당자의 검토 절차에 연결합니다.",
        og_type="article",
        section_css="css/editorial.css",
        main_class="editorial-main",
        mobile_actions=(
            MobileAction("/insights/", "글 목록"),
            MobileAction("/contact/", "과제 상담", arrow=True),
        ),
    ),
    Page(
        key="reproducible-analysis",
        route="/insights/reproducible-analysis/",
        output_path="insights/reproducible-analysis/index.html",
        title="재현 가능한 분석은 Run 단위 이력에서 시작됩니다 | 인아이티",
        description="입력 데이터, 실행 조건, 코드·규칙·모델 버전과 결과를 Run 단위로 연결해 분석을 재현 가능한 운영 자산으로 만드는 방법을 소개합니다.",
        nav_key="insights",
        og_title="재현 가능한 분석은 Run 단위 이력에서 시작됩니다",
        og_description="데이터 계약부터 실행 조건과 결과까지 끊기지 않게 연결하는 방법.",
        og_type="article",
        section_css="css/editorial.css",
        main_class="editorial-main",
        mobile_actions=(
            MobileAction("/insights/", "글 목록"),
            MobileAction("/contact/", "과제 상담", arrow=True),
        ),
    ),
    Page(
        key="careers",
        route="/careers/",
        output_path="careers/index.html",
        title="채용 | 데이터 문제를 함께 푸는 인아이티",
        description="국가통계·공공·금융·산업의 데이터 문제를 깊이 탐구하고 근거로 소통하며 함께 완성할 인아이티의 동료를 기다립니다.",
        nav_key="careers",
        og_title="채용 | 데이터 문제를 함께 푸는 인아이티",
        og_description="깊이 탐구하고, 근거로 소통하며, 함께 완성합니다.",
        section_css="css/corporate.css",
        mobile_actions=(
            MobileAction("/company/", "회사 보기"),
            MobileAction(
                f"mailto:{SITE.email}?subject=%5B%EC%B1%84%EC%9A%A9%20%EB%AC%B8%EC%9D%98%5D%20%EC%9D%B8%EC%95%84%EC%9D%B4%ED%8B%B0",
                "채용 문의",
                arrow=True,
            ),
        ),
    ),
    Page(
        key="contact",
        route="/contact/",
        output_path="contact/index.html",
        title="데이터·AI 프로젝트 상담 | 인아이티",
        description="AI·통계 분석, 데이터 품질, 분석 시스템 구축과 솔루션 도입에 관해 인아이티에 문의하세요. 이메일과 전화 상담 정보를 안내합니다.",
        nav_key="contact",
        og_title="데이터·AI 프로젝트 상담 | 인아이티",
        og_description="과제를 설명하는 것부터 함께 시작하겠습니다.",
        section_css="css/corporate.css",
        mobile_actions=(
            MobileAction(f"tel:{SITE.phone_href}", "전화하기"),
            MobileAction(
                f"mailto:{SITE.email}?subject=%5B%EC%82%AC%EC%97%85%20%EB%AC%B8%EC%9D%98%5D%20%EC%9D%B8%EC%95%84%EC%9D%B4%ED%8B%B0",
                "이메일 문의",
                arrow=True,
            ),
        ),
    ),
    Page(
        key="privacy",
        route="/privacy/",
        output_path="privacy/index.html",
        title="개인정보 안내 | 인아이티",
        description="인아이티 홈페이지의 개인정보 처리와 문의 채널 이용 방식을 안내합니다.",
        nav_key="privacy",
        og_title="개인정보 안내 | 인아이티",
        og_description="인아이티 홈페이지의 개인정보 처리와 문의 채널 이용 방식 안내",
        section_css="css/legal.css",
        theme_color="#07152f",
        robots="noindex,nofollow",
        mobile_actions=(
            MobileAction("/solutions/", "솔루션 보기"),
            MobileAction("/contact/", "과제 상담", arrow=True),
        ),
    ),
    Page(
        key="not-found",
        route="/404.html",
        output_path="404.html",
        title="페이지를 찾을 수 없습니다 | 인아이티",
        description="요청한 인아이티 홈페이지 경로를 찾을 수 없습니다.",
        nav_key="error",
        og_type=None,
        section_css="css/legal.css",
        body_class="error-page",
        main_class="error-main",
        theme_color="#07152f",
        robots="noindex,follow",
        compact_chrome=True,
    ),
)

PAGES_BY_KEY = {page.key: page for page in PAGES}
PAGES_BY_OUTPUT = {page.output_path: page for page in PAGES}


def page_for_request(requested_path: str) -> Page | None:
    normalized = requested_path.strip("/")
    if normalized in {"", "index.html"}:
        return PAGES_BY_KEY["home"]
    if normalized == "404.html":
        return PAGES_BY_KEY["not-found"]

    output_path = normalized
    if output_path.endswith("/index.html"):
        pass
    elif output_path.endswith(".html"):
        return None
    else:
        output_path = f"{output_path}/index.html"
    return PAGES_BY_OUTPUT.get(output_path)


def asset_url(path: str) -> str:
    normalized = path.lstrip("/")
    version = ASSET_VERSIONS.get(normalized)
    suffix = f"?v={version}" if version else ""
    return f"/assets/{normalized}{suffix}"
