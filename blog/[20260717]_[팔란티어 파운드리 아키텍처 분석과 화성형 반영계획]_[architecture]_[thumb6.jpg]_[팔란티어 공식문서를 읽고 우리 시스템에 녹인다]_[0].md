## 1. 왜 팔란티어 공식 문서를 읽는가

"화성형 팔란티어"라는 이름을 쓰면서 정작 팔란티어가 자기 아키텍처를 어떻게 설명하는지 안 읽어봤다면, 그건 이름만 빌린 것이다.

이 글은 팔란티어 Architecture Center의 공식 문서 7편을 직접 읽고 정리한 기록이다. 목적은 **모방이 아니다.** 팔란티어를 따라 만들 수도 없고, 따라 만들 필요도 없다. 저쪽은 300개가 넘는 마이크로서비스에 수십억 달러가 들어간 물건이고, 이쪽은 공무원 한 명과 오픈소스와 클라우드 API다.

읽는 이유는 다른 데 있다. **팔란티어가 20년간 검증한 아키텍처 원칙 중, 우리 규모에서도 성립하는 것이 무엇인지 가려내기 위해서다.** 원칙은 규모와 무관하게 옳거나 그르다. "데이터가 아니라 의사결정을 모델링한다"는 명제는 300개 마이크로서비스에서도, Express 서버 하나에서도 똑같이 옳다. 그 원칙을 한국 지방정부 맥락으로 번역하는 것이 이 글의 일이다.

읽은 문서는 다음 7편이다.

| # | 문서 | 주제 |
|---|------|------|
| 1 | Overview | 전체 아키텍처 개요 |
| 2 | AIP, Foundry, and Apollo | 3대 플랫폼의 역할과 관계 |
| 3 | The Ontology System | 온톨로지의 4중 통합 |
| 4 | Multimodal Data Plane | 개방형 데이터·컴퓨트 |
| 5 | Interoperability | 6가지 상호운용성 |
| 6 | Rubix Substrate | 보안 인프라 기반 |
| 7 | AIP Architecture | AI 역량 12개 카테고리 |

---

## 2. 팔란티어 Architecture Center 7개 문서 분석

### 2-1. Overview — 전체 아키텍처 개요

**팔란티어가 말하는 것**

팔란티어는 자사 시스템을 **"Enterprise Operating System"** 이라고 부른다. 데이터 분석 도구가 아니라 조직의 운영체제라는 주장이다. 세 플랫폼으로 구성된다.

| 플랫폼 | 역할 |
|--------|------|
| **Foundry** | 핵심 데이터 운영 |
| **AIP** | 생성형 AI |
| **Apollo** | 지속적 배포 |

규모를 보여주는 숫자 둘.

- AIP와 Foundry에 걸쳐 **300개 이상의 마이크로서비스와 자산**이 고가용성 오토스케일링 컴퓨트 메시 위에서 동작
- Apollo가 **주당 수만 건의 릴리즈**를 오케스트레이션

그리고 이 모든 것의 심장에 온톨로지가 있다.

> "The Ontology integrates an enterprise's data, logic, action, and security policies into an intuitive representation that both humans and AI agents can wield."

주목할 부분은 마지막이다 — **"both humans and AI agents can wield"**. 사람과 AI가 *같은* 표현을 쓴다는 것. AI용 데이터와 사람용 화면을 따로 만드는 게 아니다.

**화성형에서의 대응**

우리에게 300개 마이크로서비스는 없다. 지금은 Express 서버 하나에 기능 4개다. 하지만 "사람과 AI가 같은 표현을 공유한다"는 원칙은 지금도 지킬 수 있다. `water-agent.js`가 분석에 쓰는 데이터와 지도 대시보드가 보여주는 데이터가 같은 PostgreSQL 테이블이라면, 그것이 작은 규모의 같은 원칙이다.

### 2-2. AIP, Foundry, Apollo — 세 플랫폼의 관계

**팔란티어가 말하는 것**

세 플랫폼은 나란히 있는 게 아니라 **층으로 쌓여 있다.**

```
AIP        ← 생성형 AI (에이전트, k-LLM)
Foundry    ← 데이터 운영, 온톨로지, 워크플로
─────────────────────────────
Apollo     ← 인프라 관리 / 배포 (아래를 떠받침)
```

Apollo는 "Foundry와 AIP 서비스를 호스팅하는 기반 인프라를 관리"하며, "매일 수백 개 서비스에 걸쳐 수천 건의 무중단 업그레이드"를 오케스트레이션한다. Foundry는 "데이터 관리, 로직 작성, 온톨로지 개발, 분석, 워크플로 개발의 핵심 역량"을 제공한다. AIP는 **"k-LLM" 패러다임**을 통해 LLM에 안전하게 연결하고, 에이전트 구축 도구와 AI 워크플로 거버넌스를 위한 평가 프레임워크를 제공한다.

> 🏢 **비유**: Apollo는 **단지의 전기·수도·도로 같은 기반시설**, Foundry는 **그 위에 선 건물과 그 안의 살림**, AIP는 **그 살림을 대신 해주는 집사**다. 집사를 먼저 들일 수는 없다. 전기가 안 들어오는 집에서는 아무것도 안 된다.

**화성형에서의 대응**

이 층 구조는 우리가 실제로 밟아온 순서와 정확히 같다.

| 팔란티어 | 화성형 | 상태 |
|----------|--------|------|
| Apollo | NKS(K8s) + GitHub Actions CI/CD | 클러스터 ✅ / CI/CD ⏳ 8월 |
| Foundry | PostgreSQL + 수집·변환 파이프라인 | 부분 ✅ |
| AIP | Claude/Gemini 에이전트 (`agent.js`, `water-agent.js`) | 부분 ✅ |

우연이 아니다. 인프라 없이 데이터 파이프라인이 못 서고, 데이터 없이 AI가 할 말이 없다. **순서를 건너뛸 수 없다**는 걸 우리는 삽질로 배웠고, 팔란티어는 문서 첫 장에 그려놨다.

### 2-3. The Ontology System — 4중 통합

이번에 읽은 7편 중 **가장 중요한 문서**다.

**팔란티어가 말하는 것**

온톨로지의 정의부터가 선언적이다.

> "designed to represent the complex, interconnected _decisions_ of an enterprise, not simply the data."

**데이터가 아니라 의사결정을 표현하도록 설계됐다.** 이 한 문장이 온톨로지와 일반 데이터 모델링을 가른다.

네 가지가 통합된다.

| 요소 | 팔란티어의 설명 |
|------|----------------|
| **Data** | "fragmented ERP estates, homegrown systems of record, CRMs, industrial databases, geospatial repositories, real-time sensors, document stores" — 온갖 출처를 객체·속성·링크로 통합 |
| **Logic** | "a simple business rule, a conventional machine learning model, an LLM-driven function, or a complex multi-step orchestration" — 로직의 형태는 무엇이든 될 수 있음 |
| **Action** | "simple transactions to complex multi-step updates that must be written back to operational and edge systems in real time" — 읽기만이 아니라 **되돌려 쓰기** |
| **Security** | 사람이든 AI 에이전트든, 누가 무엇을 읽고 실행하고 수정할 수 있는지 |

그리고 온톨로지는 얇은 시맨틱 레이어가 아니라 **세 부분으로 된 구조물**이다.

| 구성 | 역할 |
|------|------|
| **Language** | 객체·링크·속성·행동(kinetic actions)과 그 로직을 모델링 |
| **Engine** | 읽기(SQL 쿼리, 실시간 구독) + 쓰기(원자적 업데이트, 배치 변경, 스트림) |
| **Toolchain** | Ontology SDK와 거버넌스 인프라 |

**핵심은 Action이다.** 여기가 팔란티어가 BI 도구와 갈라지는 지점이다. 대시보드는 보여주고 끝난다. 온톨로지는 **원래 시스템에 되돌려 쓴다.** "민원이 몰리고 있습니다"를 보여주는 것과 "긴급출동을 지시했습니다"를 실제 시스템에 기록하는 것은 다른 물건이다.

**화성형에서의 대응** — 3장에서 상세히 다룬다.

### 2-4. Multimodal Data Plane — 개방형 데이터·컴퓨트

**팔란티어가 말하는 것**

MMDP의 철학은 한 줄로 요약된다.

> "Any data, any compute, any model, anywhere."

- **개방형 데이터**: Apache Iceberg를 표준 테이블 포맷으로. 카탈로그를 팔란티어 안에서 관리해도 되고, 외부 제공자의 것을 가상 카탈로그·가상 테이블로 등록해도 된다. 데이터를 복제하지 않고 여러 곳에 둘 수 있다
- **개방형 컴퓨트**: 배치는 Spark, 스트리밍은 Flink, 단일 노드는 DataFusion·Polars·DuckDB. Compute Modules로 **자기 컨테이너를 가져와서(Bring your own compute)** 쓸 수도 있다
- 이 모든 게 지향하는 상태를 문서는 **"unwalled garden"** 이라 부른다

플랫폼 회사가 자기 문서에 "우리한테 가두지 않는다"고 쓰는 건 특이하다. 그런데 이건 선의가 아니라 **전략**이다. 정부·군·대기업은 벤더에 종속되는 순간을 가장 두려워한다. 잠그지 않는다는 약속 자체가 팔는 물건인 것이다.

**화성형에서의 대응**

공공기관은 이 두려움이 더 크다. 담당자가 바뀌고, 계약이 바뀌고, 사업이 이관된다. **"이 사람 아니면 못 만지는 시스템"은 공공에서 실패한 시스템이다.**

우리의 이식성 확보 수단은 표준을 쓰는 것뿐이다.

| 계층 | 선택 | 이식성 |
|------|------|--------|
| 오케스트레이션 | **표준 Kubernetes** (NKS) | 매니페스트가 어느 K8s에서든 동작 |
| DB | **표준 PostgreSQL** + PostGIS | 덤프·복원으로 어디든 이동 |
| 컨테이너 | **표준 OCI 이미지** | 어느 레지스트리·런타임에서든 동작 |
| LLM | Claude / Gemini (교체 가능한 API) | 특정 모델에 로직을 묶지 않음 |

네이버 클라우드 위에 있지만 **네이버 클라우드 전용 기능에는 기대지 않는다.** NKS를 쓰되 NKS에만 있는 기능으로 매니페스트를 짜지 않고, Cloud DB for PostgreSQL을 쓰되 표준 PostgreSQL 문법을 벗어나지 않는다. 이게 우리 규모에서 가능한 "unwalled garden"이다.

### 2-5. Interoperability — 6가지 상호운용성

**팔란티어가 말하는 것**

상호운용성을 6개 축으로 나눈다.

| 축 | 내용 |
|----|------|
| **Data** | 원본 포맷 그대로 저장(CSV, Iceberg, Parquet), REST·JDBC·S3 호환 인터페이스로 접근 |
| **Metadata** | 프로젝트·데이터셋·온톨로지 요소·에이전트·모델의 메타데이터를 외부 카탈로그에 노출 |
| **Semantic** | 온톨로지 정의를 REST API로 공개, 외부 시맨틱 모델링 도구와 **양방향 동기화** |
| **Code & Logic** | Python·Java·SparkSQL 등 개방 언어, Compute Modules로 자체 컨테이너 반입 |
| **Analytical** | Power BI·Tableau·Jupyter·RStudio 커넥터 기본 제공 |
| **Security** | 기존 SAML 인증·Active Directory 인가 활용, role/classification/purpose 기반 권한 |

**화성형에서의 대응**

6개 중 지금 당장 의미 있는 건 **Semantic**과 **Security** 두 축이다.

Semantic이 중요한 이유는 5장에서 다룰 MCP 통합과 직결되기 때문이다. 법령 MCP, KOSIS MCP, kordoc MCP는 각각 다른 사람이 만든 **외부 시맨틱 모델**이다. 이것들과 대화하려면 우리 온톨로지가 API로 열려 있어야 한다.

Security는 공공기관이라 선택이 아니다. 다만 팔란티어의 SAML·AD 자리에 우리는 아직 아무것도 없다. 이건 6-2에서 다시 본다.

### 2-6. Rubix Substrate — 보안 인프라 기반

**이번에 읽은 것 중 우리에게 가장 직접적으로 쓸모 있는 문서였다.** 왜냐하면 —

**팔란티어가 말하는 것**

> Rubix is Palantir's **hardened Kubernetes implementation** underlying AIP, Foundry, and Apollo.

**Rubix는 강화된 쿠버네티스다.** 우리가 지난주에 만든 그 쿠버네티스. 팔란티어의 보안 기반은 우리가 모르는 특수 기술이 아니라, **같은 K8s를 어떻게 조이느냐**의 문제였다.

핵심 설계 세 가지.

**1) 격리와 암호화**
> "Every workload is securely isolated based on necessary requirements, enabling the safe execution of operational tasks that require elevated privileges."

> "every interaction between workloads must be authenticated, authorized, and logged in accordance with immutable configurations."

워크로드 간 **모든** 상호작용이 인증·인가·기록된다. 내부망이니까 믿는다는 개념이 없다. 이것이 zero-trust다.

**2) 노드의 수명 48시간**

Rubix는 노드가 48시간을 넘겨 살지 못하게 한다. 이유가 인상적이다.

> "aggressive node cycling ensures that compromising a single node is insufficient for an attacker to gain persistent access to an environment."

노드를 계속 죽였다 살리면, **공격자가 노드 하나를 뚫어도 거점을 유지할 수 없다.** 침입을 막는 대신 침입이 지속되지 못하게 만드는 발상이다. 부수 효과로 "모든 서비스가 장애를 전제로(designed for disruption) 설계"되게 강제된다. 노드가 어차피 48시간마다 죽으니, 죽어도 되게 짜는 것 외에 선택지가 없다.

**3) 멀티클라우드**
> "deploy AIP, Foundry, Apollo, and dependent offerings across AWS, Azure, Google Cloud, Oracle Cloud, or on-premises environments — with identical operational characteristics."

**"write once, ship anywhere"**. FedRAMP High, DOD DISA IL-5/IL-6 같은 규제 환경까지 같은 방식으로 나간다.

**화성형에서의 대응**

우리 노드는 2대이고 48시간 사이클링은 지금 할 수 없다. 하지만 **"노드는 언제든 죽어도 된다"는 전제로 짜는 것**은 지금부터 할 수 있고, 사실상 공짜다.

| Rubix 원칙 | 화성형에서 지금 할 수 있는 것 |
|------------|---------------------------|
| 노드 임시성 | Pod에 상태를 두지 않기. 세션·파일을 노드 로컬에 저장하지 않기 |
| 장애 전제 설계 | replicas 2 이상, readiness/liveness probe 설정 |
| 모든 상호작용 인증 | (지금은 없음) → RBAC 도입 계획 |
| write once, ship anywhere | 표준 K8s 매니페스트만 사용 — 클러스터 재생성 대비 |

마지막 항목이 특히 중요하다. 우리 클러스터는 **단일 존이라 운영 전환 시 재생성해야 한다.** 매니페스트가 특정 클러스터에 종속돼 있으면 그때 전부 다시 써야 한다. 팔란티어의 "write once, ship anywhere"는 우리에게 이상이 아니라 **이미 예정된 이사에 대한 대비**다.

### 2-7. AIP Architecture — AI 역량 12개 카테고리

**팔란티어가 말하는 것**

AIP는 역량을 12개로 나눈다.

| # | 카테고리 | 요지 |
|---|----------|------|
| 1 | Secure LLM Integration & Access | GPT·Gemini·Claude·오픈소스 연결. **"no transmitted data is retained by third-party providers"** |
| 2 | End-to-End Observability | 모든 데이터 흐름 모니터링, 토큰 소비 추적 |
| 3 | Context Engineering | 배치·스트리밍·CDC 실시간 복제로 컨텍스트 주입 |
| 4 | The Ontology System | 운영 프로세스의 "명사"와 "동사" |
| 5 | Vector, Compute, Tool Services | 임베딩, 컴퓨트 프레임워크, 툴 서비스 |
| 6 | Security & Governance | **role-, marking-, purpose-based** 통제 + 감사 로깅 |
| 7 | Agent Lifecycle | 노코드/로우코드 워크벤치로 에이전트 구축·오케스트레이션 + 평가 |
| 8 | Operational Automation | 스케줄·이벤트·API 기반 자동화 |
| 9 | Development Environments | VS Code, JupyterLab, SDK, **Palantir MCP** |
| 10 | Human + AI Applications | AI 개입 정도를 "carefully controlled" |
| 11 | Package, Release, Deploy | 이기종 환경 대상 DevOps 툴체인 |
| 12 | Enterprise Automation | 파이프라인·앱을 짓는 전문 에이전트 |

세 가지가 눈에 띈다.

**첫째, 9번의 "Palantir MCP".** 팔란티어도 MCP를 쓴다. 문서는 이를 "a secure interface for agentic development"라고 설명한다. 우리가 류승인 주무관의 MCP 서버들을 붙이려는 계획은, 팔란티어가 이미 같은 방향으로 가고 있다는 뜻이다. **MCP는 유행이 아니라 이 바닥의 접속 규격이 되어가고 있다.**

**둘째, 1번의 "제3자 제공자가 전송 데이터를 보관하지 않는다".** 공공 데이터를 외부 LLM API에 보내는 순간 반드시 나오는 질문이 이거다. 팔란티어는 이걸 인프라 차원에서 보장한다고 문서 최상단에 적어놨다.

**셋째, 7번 Agent Lifecycle의 평가(AIP Evals).** 에이전트를 만드는 것과 **그게 잘 하는지 측정하는 것**을 같은 층위로 놓는다. 테스트 케이스를 만들고, 여러 LLM을 비교하고, 실행 간 편차를 살핀다. 우리에게 지금 완전히 없는 것이다.

---

## 3. 화성형 팔란티어에 반영할 핵심 인사이트

### 3-1. 온톨로지 시스템

**팔란티어**: 데이터(명사) + 액션(동사) + 로직 + 보안의 4중 통합

**화성형 번역**:

| 팔란티어 | 화성형 |
|----------|--------|
| Data (명사) | **민원** — 그리고 피드, 센서 판독, 출동 기록 |
| Action (동사) | **처리** — 접수, 배정, 출동, 공지 |
| Logic | **Claude / Gemini** — 원인 추론, 장소 추출 |
| Security | **데이터 거버넌스** — 정책협의체/실행협의체 |

**구현**: PostgreSQL + PostGIS로 객체-링크-액션 모델링.

지금 우리 테이블은 5개(`complaints`, `feeds`, `analysis_logs`, `dispatch_records`, `sensor_readings`)인데, 이건 **객체(명사)만 있고 링크와 액션이 없는 상태**다. 온톨로지가 되려면 두 가지가 더 필요하다.

- **링크**: 이 민원과 저 출동 기록이 같은 사건인가? 이 센서 이상과 저 민원 다발이 연결되는가? 지금은 이 관계가 `water-agent.js` 코드 안에 암묵적으로만 있다. **관계를 코드가 아니라 데이터로 만들어야 한다**
- **액션**: 지금 우리 시스템은 읽기만 한다. 분석하고 보여주고 끝난다. 팔란티어가 말한 "write back to operational systems"가 없다

두 번째가 진짜 벽이다. 되돌려 쓰려면 쓸 대상 시스템(새올행정 등)에 대한 권한이 필요하고, 그건 기술이 아니라 행정 협의의 문제다. **12월 목표인 새올행정 API 연동이 사실상 "우리 시스템이 온톨로지가 되는 시점"이다.**

**공간 온톨로지**: 좌표 + 국가기초구역(우편번호 5자리)을 공통 식별자로.

이 결정은 팔란티어 문서를 읽고 나서 더 확신이 생겼다. 온톨로지의 본질이 **서로 다른 출처를 하나의 표현으로 묶는 것**이라면, 묶는 기준이 흔들리면 안 된다. 행정동 경계는 사람이 그은 선이라 바뀐다. 좌표는 안 바뀐다.

### 3-2. AIP → AI 에이전트

**팔란티어**: Secure LLM integration(1) / Agent lifecycle(7) / Operational automation(8)

**화성형 현재**: `agent.js`(Claude), `water-agent.js`(Gemini + PostgreSQL)

**MCP 연결**: 팔란티어 MCP ↔ 우리는 **류승인 주무관의 법령 MCP, KOSIS MCP, kordoc MCP**를 붙인다. Claude API의 `mcp_servers` 파라미터로 원격 MCP 서버를 직접 호출할 수 있으므로 중계 서버 없이 연결된다.

**향후**: AIP Logic 같은 저코드 자동화 파이프라인 도입.

다만 여기서 팔란티어 문서가 우리에게 준 숙제가 하나 있다. **AIP Evals** — 에이전트 평가다. 지금 `water-agent.js`가 내놓은 원인 분석이 맞는지 틀리는지 우리는 측정하지 않는다. 데모니까 그럴듯하면 넘어간다. 하지만 실제 민원에 적용하는 순간 "이 AI가 얼마나 자주 틀리는가"는 반드시 답해야 하는 질문이 된다. **에이전트를 늘리기 전에 평가 방법을 먼저 만드는 게 순서다.**

### 3-3. Foundry → 데이터 파이프라인

**팔란티어**: Data Services — 수집 / 변환 / 가상화 / 저장 / 모니터링

**화성형**:
```
search.js (수집) → extract.js (변환) → PostgreSQL (저장)
```

**향후**: 새올행정 API, 공공데이터포털 API 자동 수집 파이프라인.

팔란티어의 5단계 중 우리에게 **없는 것이 "모니터링"** 이다. 지금은 수집이 실패해도 아무도 모른다. 파이프라인이 늘어날수록 이건 심각해진다. 8월 CI/CD 작업 때 같이 넣어야 한다.

### 3-4. Apollo → 배포 자동화

**팔란티어**: 주당 수만 건 릴리즈, 자율적 소프트웨어 딜리버리

**화성형**:
```
GitHub Actions → docker build → NCR push → kubectl rolling update
```

숫자만 보면 비교가 민망하지만(주당 수만 건 vs 아직 0건), **방향은 정확히 같다.** 그리고 이 방향의 핵심은 속도가 아니라 심리다. 배포가 수동이고 무서우면 사람은 배포를 미룬다. 미루면 한 번에 나가는 변경이 커지고, 커지면 더 무서워진다. **자동화의 목적은 배포를 지루하게 만드는 것이다.**

### 3-5. Multimodal Data Plane → 개방형 데이터

**팔란티어**: 벤더 종속 없는 개방형 컴퓨트·스토리지, "unwalled garden"

**화성형**: 네이버 클라우드 기반이되 **표준 K8s + 표준 PostgreSQL로 이식성 확보** (2-4에서 정리)

**공공데이터포털 API 목록조회**로 데이터 소스를 자동 탐색한다. 이건 팔란티어의 "virtual catalogs"와 발상이 같다 — **데이터를 다 가져와서 쌓는 게 아니라, 어디에 무엇이 있는지 아는 것**부터가 데이터 플레인이다.

### 3-6. Rubix / 보안

**팔란티어**: zero-trust, 군사급 보안, 행 수준 접근제어

**화성형**:
- 민원 **개인정보 비식별화 ETL** — 이름·연락처·상세주소는 파이프라인 입구에서 제거하거나 마스킹. 좌표와 국가기초구역만 남긴다. **LLM API로 나가는 데이터에 개인정보가 없어야 한다** (팔란티어가 AIP 1번 항목에서 보장하는 것을, 우리는 애초에 안 보내는 방식으로 해결)
- **정책협의체 / 실행협의체** — 화성시 도시데이터 기반 시정 운영 조례 제14조. 팔란티어의 거버넌스 도구에 해당하는 것이 우리에겐 조례와 협의체다. 기술이 아니라 제도로 구현된 거버넌스
- **RBAC 도입 계획** — 팔란티어의 "role-, marking-, purpose-based" 3중 통제 중, 우리는 최소한 role 기반부터

솔직히 말하면 이 항목이 현재 가장 취약하다. 지금 우리 시스템에는 **접근제어라 부를 만한 게 없다.** 데모 단계라 그렇지만, 실제 민원 데이터가 들어오는 순간 이건 미룰 수 없는 항목이 된다.

---

## 4. 팔란티어와 화성형의 결정적 차이

| | 팔란티어 | 화성형 |
|---|---------|--------|
| 서비스 수 | 300+ 마이크로서비스 | Express 서버 1개 (기능 4개) |
| 배포 빈도 | 주당 수만 건 | 아직 수동 |
| 인프라 | 수십억 달러 | 네이버 클라우드 + 오픈소스 |
| 인력 | 수천 명 엔지니어 | **공무원 1인** |
| 노드 수명 | 48시간 강제 사이클링 | 2대 상시 가동 |
| 기간 | 20년 | 6개월 |

숫자만 보면 비교 자체가 성립하지 않는다. **그럼에도 방향은 같다.**

```
데이터 사일로 해소 → 온톨로지로 연결 → AI 의사결정 지원
```

그리고 이 방향은 **돈으로 사는 게 아니라 결정으로 정해진다.** 좌표를 공통 식별자로 쓸지 행정동을 쓸지, 데이터를 복제할지 참조할지, 특정 클라우드 기능에 기댈지 표준만 쓸지 — 이 결정들은 예산이 1억이든 1조든 똑같이 내려야 하고, 틀리면 똑같이 나중에 값을 치른다.

팔란티어가 20년에 걸쳐 증명한 것을, 화성시는 6개월 안에 MVP로 구현한다. 규모가 아니라 **원칙**을 가져오는 것이기에 가능한 일이다.

---

## 5. 마치며

7편을 읽으면서 가장 오래 붙들고 있었던 문장은 이것이다.

> "designed to represent the complex, interconnected _decisions_ of an enterprise, **not simply the data**."

**데이터가 아니라 의사결정을 표현한다.**

처음엔 수사적인 표현이라고 생각했다. 다시 읽으니 아니었다. 이건 설계 지침이다. 테이블에 무엇을 남길지 정하는 기준이 바뀐다.

화성시의 민원 데이터도 단순한 데이터가 아니다. **시민의 결정**(불편을 참지 않고 신고하기로 한 것), **공무원의 판단**(어디로 배정하고 언제 출동시킬지), **도시의 상태**(그날 그 시간 그 좌표에서 실제로 벌어지던 일)를 담은 **의사결정의 흔적**이다.

`complaints` 테이블에 민원 내용만 남기면 데이터고, **누가 언제 무엇을 판단했고 그래서 무엇이 달라졌는지**까지 남기면 온톨로지다. 지금 우리 테이블은 전자에 가깝다. 후자로 가는 것이 남은 6개월의 일이다.

---

## 정리

| 팔란티어 문서 | 핵심 | 화성형이 지금 할 일 |
|--------------|------|-------------------|
| Overview | 사람과 AI가 같은 표현을 공유 | 에이전트와 대시보드가 같은 DB를 보게 |
| Platforms | Apollo → Foundry → AIP 층 구조 | 인프라 → 데이터 → AI 순서 유지 |
| Ontology | 데이터가 아닌 **의사결정** 모델링 | 링크와 액션 추가, 판단 이력 기록 |
| MMDP | "Any data, any compute, anywhere" | 표준 K8s·PostgreSQL로 이식성 확보 |
| Interoperability | 6축, 특히 시맨틱 양방향 | 온톨로지를 API로 열어 MCP와 연결 |
| **Rubix** | **강화된 K8s**, 노드 48시간, 장애 전제 | Pod 무상태화, 매니페스트 이식성 |
| AIP | 12개 역량, **Palantir MCP**, Evals | MCP 통합 + **에이전트 평가 체계 마련** |

읽기 전에는 팔란티어가 우리와 다른 세계의 물건이라고 생각했다. 읽고 나니 **Rubix가 그냥 잘 조인 쿠버네티스**였고, **MCP는 우리가 붙이려던 그 MCP**였다. 도구는 같다. 다른 건 규모와, 20년이라는 시간과, 그 시간 동안 내린 결정의 일관성이다.

우리에게 20년은 없지만, 일관성은 지금부터 선택할 수 있다.
