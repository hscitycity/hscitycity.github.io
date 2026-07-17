# 화성형 팔란티어 개발일지 (devlog) — 컨텍스트 파일

새 채팅에서 이 파일을 읽으면 devlog 작업 전체 맥락을 파악할 수 있다.

---

## 1. 저장소 구조

| 기기 | 로컬 경로 | GitHub 저장소 | 용도 |
|------|----------|-------------|------|
| PC | `c:\Users\user\Desktop\hs_palantir_dataplatform\` | github.com/hscitycity/hspalantir | 팔란티어 시스템 소스코드 |
| PC | `c:\Users\user\Desktop\hs_palantir_dataplatform\devlog\dev-log-blog\` | github.com/hscitycity/hscitycity.github.io | 개발일지 블로그 |
| 노트북 | `c:\Users\bomoo\바탕 화면\hs_palantir_dataplatform\` | github.com/hscitycity/hspalantir | 팔란티어 시스템 소스코드 |
| 노트북 | `c:\Users\bomoo\바탕 화면\hs_palantir_dataplatform\devlog\dev-log-blog\` | github.com/hscitycity/hscitycity.github.io | 개발일지 블로그 |

- 블로그 배포 URL: **https://hscitycity.github.io/**
- 배포 방식: GitHub Actions (`actions/deploy-pages@v4`) — `.github/workflows/deploy.yml`
- **이 파일(`context_devlog.md`)의 위치**: 블로그 저장소의 `notes/context_devlog.md` (2026-07-17부터). 저장소 바깥에 있으면 push가 안 되므로 안으로 옮김

### 새 기기에서 clone하는 방법 (Windows 필수 옵션)

포스트 파일명이 한글이라 길어서, 옵션 없이 clone하면 **`Filename too long`** 으로 checkout이 실패한다.

```bash
git clone -c core.longpaths=true https://github.com/hscitycity/hscitycity.github.io.git dev-log-blog
cd dev-log-blog
git config core.longpaths true   # 이후 작업에도 계속 적용
```

- 경로가 깊을수록 잘 터지므로 **가급적 짧은 경로**에 clone할 것
- **ZIP 다운로드로 받지 말 것** — `.git`이 없어 push가 불가능하다. 2026-07-17에 노트북이 ZIP 사본 상태(git 이력 없음)여서 clone본으로 교체했다
- `img/Gemini_Generated_Image.png`, `img/profile.jpg`는 의도적으로 untracked라 clone에 안 딸려온다. 기기 이동 시 수동 복사 필요

---

## 2. 블로그 엔진: weniv_blog

- 원본: https://github.com/weniv/weniv_blog
- **순수 정적 SPA** — Jekyll 없음, `.nojekyll` 파일 존재
- GitHub API로 `blog/` 폴더 파일 목록을 가져와 마크다운을 렌더링
- 라이브러리: `marked.min.js`, `highlight.js`, `tailwind-3.4.1.js`

### 파일명 규칙 (필수)
```
[YYYYMMDD]_[제목]_[카테고리]_[썸네일]_[설명]_[작성자인덱스].md
```
- 썸네일: `img/thumb1` ~ `thumb14` 중 하나 (비우면 랜덤). 확장자가 파일마다 다름 — 아래 4번 표 참고 후 실제 파일 확장자와 정확히 맞출 것
- 작성자: 비우면 `users[0]` (이동재, 화성시청 AI스마트전략실)
- **순수 마크다운만** — YAML front matter 없음
- **Windows 파일명 제한**: 콜론(`:`) 사용 불가, 전체 경로 255바이트 제한

---

## 3. 주요 설정 파일

### `config.js`
```javascript
const siteConfig = {
  username: "hscitycity",
  repositoryName: "hscitycity.github.io",
  mainColor: "#2e6ff2",
  blogTitle: "화성형 팔란티어 개발일지",
};
const users = [{
  id: 0,
  username: "이동재",
  company: "화성시청 AI스마트전략실",
  position: "주무관",
  img: "img/user/profile.jpg",   // 화성특례시 로고
}];
const localDataUsing = false;
```

### `js/URLparsing.js` (수정됨)
- 홈 클릭 URL: `https://hscitycity.github.io/` (프로젝트 사이트가 아닌 유저 사이트이므로 repositoryName 경로 없음)

---

## 4. 썸네일 이미지

`img/` 디렉토리 썸네일 세트 (2026-07-07 업데이트로 확장/교체됨):

| 파일 | 상태 | 비고 |
|------|------|------|
| thumb1~4.webp | 변경 없음 | 최초 세트 그대로 (1=항해/지도, 2=코드리뷰, 3=달밤 배포, 4=돋보기 수달) |
| thumb5~9.jpg | **jpg로 교체됨** | 기존 thumb5~9.webp는 삭제. 게시물 파일명도 확장자 맞춰 갱신함 |
| thumb10.png | 신규 (미사용) | 신경망 앞 너구리·토끼·로봇 |
| thumb11.png | 신규, **사용 중** (20260717 팔란티어 분석) | 책장 앞 고양이 (문서 분석·리서치 주제에 적합) |
| thumb12.png | 신규, **사용 중** (20260717 포스트) | 동물들 화이트보드 브리핑 |
| thumb13.png | 신규, **사용 중** (20260714 포스트) | 동물들 제어판/랩 (922KB, 가장 큼) |
| thumb14.png | 신규 (미사용) | 덩굴숲 돋보기 수달 (세로형) |

**교체 시 번호가 밀렸음** (커밋 `b8d484d`) — 교체 전 thumb8(책 더미)이 현재 thumb7, 교체 전 thumb9(금고/보안관)가 현재 thumb8이다. 옛 메모를 보고 번호만 믿으면 엉뚱한 그림이 붙는다. 현재 실제 내용은 아래와 같다.

| 파일 | 실제 내용 |
|------|----------|
| thumb5.jpg | Team Stand-up (칸반보드 Done/Doing/Blocked) |
| thumb6.jpg | Scaling Architecture (작은 배 → 도시를 실은 큰 배) |
| thumb7.jpg | Learning a New Framework (React-opolis 책 더미에 깔린 토끼) |
| thumb8.jpg | Security Audit (금고 + 열쇠 든 고양이 보안관) |
| thumb9.jpg | Product Launch (VERSION 1.0 LAUNCH 현수막) |

기타 이미지: `404.png`, `default.png`, `test_1~3.jpg`, `icon/`

Gemini 생성 캐릭터 일러스트, Python/Pillow로 크롭해 교체 (`img/Gemini_Generated_Image.png` 원본, untracked).

글쓴이 프로필: `img/user/profile.jpg` (화성특례시 공식 로고, untracked)

**주의**: 새 포스트 작성 시 파일명의 `[thumbN.ext]` 확장자를 실제 파일과 반드시 맞출 것 (webp/jpg/png 혼재 중).

---

## 5. 현재 블로그 포스트 목록 (2026-07-17 세션 종료 기준, 총 13편)

| 날짜 | 제목 | 카테고리 | 썸네일 |
|------|------|---------|--------|
| 20260602 | 화성형 팔란티어 시스템 개발 시작 | project | thumb1.webp |
| 20260605 | WBS — 7개월 공공사업 개발계획 수립기 | project | thumb5.jpg |
| 20260610 | 왜 React가 아닌 단일 HTML로 시작했는가 | architecture | thumb6.jpg |
| 20260615 | 브라우저에서 Naver API를 직접 못 쓰는 이유 | backend | thumb9.jpg |
| 20260618 | LLM을 지오코더로 쓰기 | llm | thumb3.webp |
| 20260622 | AI 채팅 에이전트에 스트리밍을 구현한 이유 | backend | thumb2.webp |
| 20260630 | 표에 display flex를 걸면 안 되는 이유 | css | thumb4.webp |
| 20260707 | 컨테이너 Docker MSA Kubernetes | architecture | thumb8.jpg |
| 20260710 | VPC Subnet NAT DMZ VPN 정리 | network | thumb7.jpg |
| 20260714 | 쿠버네티스 설정하기 (NKS 클러스터 설정) | architecture | thumb13.png |
| 20260717 | 쿠버네티스 클러스터 프로비저닝 | architecture | thumb12.png |
| 20260717 | 2026.7.17.(금) 기준 작업현황 및 작업계획 | architecture | thumb6.jpg |
| 20260717 | 팔란티어 파운드리 아키텍처 분석과 화성형 반영계획 | architecture | thumb11.png |

카테고리 현황: `project`, `architecture`, `backend`, `llm`, `css`, `network`  
미사용 썸네일: thumb10, thumb14  
※ thumb6.jpg 중복: 20260610 + 20260717 「작업현황 및 작업계획」 2편 (허용)

**포스트 작성 스타일 패턴 (0710, 0714에서 확립)**:
- 실제 존재하는 다이어그램 이미지를 웹 검색으로 찾아 검증(curl 200 확인) 후 삽입. 이미지 없는 사기업 URL은 절대 지어내지 않음
- 모든 개념에 **"아파트 단지" 비유**를 일관되게 적용 (`> 🏢 **비유**: ...` 블록쿼트) — VPC=단지 부지, Subnet=상가/주거동, IGW=하이패스 톨게이트, NAT Gateway=택배 대리수령, Bastion=경비실, DMZ=커뮤니티 센터, VPN=전용 지하통로/원격 출입카드 등. 새 포스트에서 개념이 겹치면 같은 비유를 재사용할 것
- 말미에 "화성형 팔란티어 Phase 3에 적용할 값" 표로 실제 선택지와 근거를 정리하는 패턴 유지

**0717에서 추가된 패턴 — "계획 vs 실제" 대조**:
- 앞선 글에서 "이렇게 하겠다"고 적은 값과 실제 구축값이 갈리면, 그걸 숨기지 말고 **글의 축으로 삼는다.** 프로비저닝처럼 "성공했다" 한 문장으로 끝나는 작업일수록 이 대조가 본론이 된다
- 갈린 이유를 "원칙을 어겼다"가 아니라 **"원칙에 '언제부터'가 빠져 있었다"** 로 해석하는 프레임 (0714의 다중 존 권장 → 0717의 단일 존 구축이 그 예)
- 말미에 `| 항목 | 계획 | 실제 | 이유 |` 4열 표로 정리
- **사실관계는 지어내지 않는다**: 실제로 확인 안 된 건 쓰지 않는다. 0717 글에서 kubectl 노드 확인은 아직 안 한 상태라 "다음 단계"로 넘기고, 콘솔상 생성 완료와 실제 노드 Ready 확인을 구분해서 서술함

---

## 6. 새 게시글 작성 방법

1. `blog/` 디렉토리에 파일명 규칙 맞춰 `.md` 파일 생성
2. 내용은 순수 마크다운 (front matter 없음)
3. `git add`, `git commit`, `git push origin main`
4. GitHub Actions가 자동 배포

**주의**: 파일명에 콜론(`:`) 사용 금지. 파일명이 너무 길면 Linux 255바이트 제한 초과 오류 발생 (설명 부분을 짧게).

### 파일명 검증 (권장)

파일명이 규칙에서 어긋나면 **에러 없이 목록에서 조용히 사라진다** (`js/utils.js`의 정규식이 `null` 반환). push 전에 실제 정규식으로 검증할 것.

```bash
node -e '
const re = /^\[(\d{8})\]_\[(.*?)\]_\[(.*?)\]_\[(.*?)\]_\[(.*?)\]_\[(.*?)\].(md|ipynb)$/;
const m = process.argv[1].match(re);
console.log(m ? "OK thumbnail=img/" + m[4] : "파싱 실패");
' "$(ls blog/ | grep 20260717)"
```

흔한 실수 2가지:
1. **대괄호 누락** — `20260717_제목_...` 형식은 파싱 안 됨. 반드시 `[20260717]_[제목]_...`
2. **썸네일 확장자 누락** — `[thumb6]`이 아니라 `[thumb6.jpg]`. 확장자 없으면 `img/thumb6`을 찾다가 이미지 깨짐

---

## 7. 접속통계 위젯 (index.html 우측 상단)

`index.html` 우측 상단에 `fixed top-2 right-2` 뱃지로 실시간 방문자 통계 표시 중. SPA 셸이라 모든 라우트에서 항상 보임.

- **분석 서비스**: GoatCounter (`https://hscitycity.goatcounter.com`), 무료, 대시보드 Public 설정 완료
- **추적 스크립트**: `index.html` `<head>`에 `data-goatcounter` 스크립트 삽입됨
- **표시 내용**: 일간 방문자수 / 월간 방문자수 / 누적 방문자수 (원래 "연간"이었으나 사용자 요청으로 "누적"으로 변경)
- **구현 파일**: `js/visitorStats.js` — 페이지 로드 시 GoatCounter API(`/api/v0/stats/total`)를 직접 호출해서 세 값을 계산 후 DOM에 렌더링
  - 일간: 오늘 00:00 UTC ~ 현재
  - 월간: 이번 달 1일 00:00 UTC ~ 현재
  - 누적: `2000-01-01`(사이트 개설일 이전 임의 과거 날짜) ~ 현재
- **⚠️ 보안 참고**: `js/visitorStats.js`에 GoatCounter API Bearer 토큰이 **평문으로 하드코딩**되어 있고 공개 저장소에 커밋됨. 토큰 권한은 "Read statistics"만 부여되어 있고, GoatCounter 대시보드 자체도 이미 Public이라 노출되어도 실질적 피해는 없다는 판단 하에 사용자 승인을 받고 진행함 (Claude Code 자동 분류기가 최초 커밋 시 credential-leakage로 1차 차단 → 사용자가 재확인 후 승인). 새 채팅에서 이 토큰을 다시 만들거나 회전(rotate)할 필요는 없음 — 알고 한 선택임을 인지할 것
- 이전에 시도했던 `visitor-badge.laobi.icu`(누적 방문자 뱃지 이미지) 및 `hits.seeyoufarm.com`(서비스 자체가 죽어서 폐기)은 더 이상 쓰지 않음

---

## 8. 화성형 팔란티어 시스템 개요

- **사업명**: 행안부-NIA '2026년 공공부문 AI서비스 지원' 공모사업
- **대상**: 경기도 화성시 도시 데이터 통합 플랫폼
- **기간**: 2026년 6월 ~ 12월
- **배포**: Naver Cloud (Phase 3 목표), 현재 Vercel (Phase 1)

| Phase | 기간 | 스택 |
|-------|------|------|
| Phase 1 (현재) | 2026.06 ~ | 단일 HTML + Vercel 서버리스 (search.js, extract.js, agent.js) |
| Phase 2 (예정) | 2026.08 ~ | Docker Compose + PostgreSQL + PostGIS |
| Phase 3 (목표) | 2026.10 ~ | React + Node.js + Kubernetes on Naver Cloud |

---

## 9. 세션 기록

### 2026-07-17 (노트북) — 저장소 정상화 + 프로비저닝 포스트

**1. 노트북 블로그 폴더를 ZIP 사본 → git clone본으로 교체**

- 증상: `devlog/dev-log-blog/`에 `.git`이 없어 commit·push 자체가 불가능한 상태였음 (ZIP 다운로드로 받은 사본)
- clone 시 `Filename too long`으로 checkout 실패 → `-c core.longpaths=true`로 해결 (1번 항목에 방법 기록)
- 교체 전 안전 확인: ZIP 사본과 clone본의 포스트 10편 + 설정 파일 전체를 해시 비교(`tr -d '\r'`로 개행 정규화 후 md5) → **실내용 차이 0건, CRLF/LF 차이뿐**임을 확인하고 교체
- untracked 이미지 2개(`img/Gemini_Generated_Image.png`, `img/profile.jpg`)는 clone본으로 수동 복사해 보존
- 임시/백업 폴더(`_clone_tmp`, `dev-log-blog_zip_backup`) 정리 완료 → 현재 `devlog/` 아래는 `dev-log-blog/` 하나뿐

**2. 이 문서(`context_devlog.md`)를 블로그 저장소 `notes/` 안으로 이동**

- 이유: 저장소 바깥(프로젝트 루트)에 있어서 git push 대상이 될 수 없었음
- 참고: 프로젝트 루트(`hs_palantir_dataplatform/`) 자체는 **아직 git 저장소가 아님** (`git init` 안 된 상태)

**3. 문서와 실제가 어긋난 부분 대량 수정**

문서가 실제 저장소 상태를 못 따라오고 있었다. 이번에 맞춘 것들:

| 항목 | 문서에 적혀 있던 것 | 실제 |
|------|-------------------|------|
| 썸네일 개수 | thumb1~10 (전부 .webp) | thumb1~14, 확장자 webp/jpg/png 혼재 |
| 썸네일 번호 | 옛 번호 기준 (thumb8=책더미, thumb9=금고) | 교체로 번호 밀림 (thumb7=책더미, thumb8=금고) |
| 포스트 목록 | 8편 (0707까지) | 11편 (0710, 0714, 0717 누락돼 있었음) |
| 노트북 경로 | 아예 없음 (PC 경로만) | 노트북 경로 추가 |

**4. 새 포스트 작성·배포**: 20260717 「쿠버네티스 클러스터 프로비저닝」 (커밋 `142548d`)

- NKS 클러스터 프로비저닝 성공(10여 분, 무사고). 그런데 이 사실 자체는 한 문장이라, **0714 글의 계획값과 실제 구축값이 갈린 두 지점**을 글의 축으로 삼음
  - 다중 존 → **단일 존(KR-2)**: 지금은 테스트·개발 단계라서. 단, 단일 존은 생성 후 변경 불가 → 운영 전환 시 클러스터 재생성 필요. 그래서 매니페스트를 클러스터 종속적으로 쓰면 안 된다는 함의를 함께 기록
  - 172.17 회피(10.x 예시) → **192.168.0.0/16**: 원칙 위반이 아니라 172.16/12 블록을 통째로 회피한 것
- 삽질: 커밋 메시지에 PowerShell here-string 문법(`@'...'@`)을 Bash에 써서 `@` 문자가 메시지에 섞임 → push 전이라 `--amend`로 수정. **Bash 툴에서는 heredoc(`<<'EOF'`)을 쓸 것**

**5. 두 번째 포스트 작성·배포**: 20260717 「2026.7.17.(금) 기준 작업현황 및 작업계획」 (thumb6.jpg)

- 최초 제목은 「화성형 팔란티어 인프라 구축과 협업 계획」이었으나 "날짜 기준 작업현황" 형식으로 변경함
- **요일 주의**: 요청은 `(토)`였으나 2026-07-17은 **금요일**이라 `(금)`으로 교정. 제목에 날짜·요일을 넣을 땐 `date -d YYYY-MM-DD '+%A'`로 확인할 것

- 지금까지의 인프라 구축(VPC·DB·NAT·NCR·NKS) + Docker 컨테이너화 + 향후 계획(7월~12월) + **전국 우수 공무원 결과물 MCP 통합 계획**을 한 편으로 통합
- 같은 날짜(20260717) 포스트 2편이 됨 — 규칙상 문제 없음
- 삽질 기록 포함: 서브넷 용도("일반" → "NAT Gateway 전용" 재생성, 용도는 사후 변경 불가), Object Storage 선행 생성 필요, WSL2/BIOS 가상화, `docker cp`로 PC 미push 작업물 복구
- **파일명 규칙 위반 사전 차단**: 요청받은 파일명이 대괄호 없는 형식(`20260717_제목_..._0.md`)이었는데, [`js/utils.js`](../js/utils.js)의 정규식은 `[YYYYMMDD]_[제목]_[카테고리]_[썸네일]_[설명]_[작성자].md` 형식만 파싱하고 불일치 시 `null`을 반환한다. **에러가 나는 게 아니라 목록에서 조용히 사라진다.** 대괄호 형식으로 교정하고 썸네일에 확장자(`thumb6` → `thumb6.jpg`)를 붙여서 해결
  - 작성 후 실제 정규식을 node로 직접 돌려 파싱 검증하는 절차를 권장 (아래 6번 항목)

**6. 세 번째 포스트 작성·배포**: 20260717 「팔란티어 파운드리 아키텍처 분석과 화성형 반영계획」 (thumb6.jpg)

- 팔란티어 Architecture Center 공식 문서 7편을 WebFetch로 직접 읽고 분석 → 화성형 대응 방안 정리
- **인용문 교정**: 요청받은 인용 "The Ontology models decisions, not simply data"는 원문과 다름. 실제 원문은 "designed to represent the complex, interconnected _decisions_ of an enterprise, not simply the data" → 원문대로 수정함. 공식 문서 인용 시 반드시 원문 대조할 것
- **팔란티어 공식 다이어그램 14장 삽입** (전량 `curl` 200 확인). URL 패턴:
  `https://www.palantir.com/docs/resources/foundry/architecture-center/<이름>.png`
  - 문서별 이미지 목록은 WebFetch로 "List every image with exact src URL and alt text" 프롬프트를 주면 뽑을 수 있음
  - 상대경로(`/docs/resources/...`)로 나오므로 `https://www.palantir.com` 붙일 것
  - **각 이미지마다 `*출처: [문서명](URL)*` 캡션 필수** — 저작권은 Palantir Technologies에 있고, 인용·분석 목적임을 2장 서두에 명시함
  - 핫링크 방식이라 팔란티어가 경로를 바꾸면 깨질 수 있음 (docs.docker.com 깨진 전례와 동일 리스크). 깨지면 self-host 전환 검토
  - 주요 이미지: `ontology-read-write-loops.png`(읽기-쓰기 고리 — 우리에게 없는 절반), `ontology-table.png`(3×4 격자 = 온톨로지 12과제), `rubix-k8s.png`, `aip-architecture.png`

**팔란티어 공식 문서에서 확인한 사실 (재사용 가능한 근거)**

| 항목 | 내용 | 출처 문서 |
|------|------|----------|
| Rubix | **"hardened Kubernetes implementation"** — 팔란티어 보안 기반은 특수 기술이 아니라 강화된 K8s | rubix |
| 노드 수명 | 48시간 강제 사이클링. "compromising a single node is insufficient for an attacker to gain persistent access" | rubix |
| 멀티클라우드 | AWS/Azure/GCP/Oracle/on-prem "with identical operational characteristics", FedRAMP High·DOD IL-5/IL-6 | rubix |
| **Palantir MCP** | AIP 역량 9번에 실재. "a secure interface for agentic development" → **류승인 주무관 MCP 통합 계획의 근거** | aip-architecture |
| LLM 데이터 보관 | "no transmitted data is retained by third-party providers" (AIP 역량 1번) | aip-architecture |
| AIP Evals | 에이전트 평가 프레임워크 — **화성형에 현재 완전히 없는 것** | aip-architecture |
| 규모 | 300+ 마이크로서비스, Apollo 주당 수만 건 릴리즈 | overview |
| 플랫폼 층위 | Apollo(인프라) → Foundry(데이터) → AIP(AI) | platforms |
| 온톨로지 4중 통합 | Data + Logic + Action + Security / 구조는 Language·Engine·Toolchain | ontology-system |
| MMDP 철학 | "Any data, any compute, any model, anywhere", Iceberg, "unwalled garden" | multimodal-data-plane |
| 상호운용성 6축 | Data / Metadata / Semantic / Code·Logic / Analytical / Security | interoperability |

**글에서 도출된 숙제 (다음 작업 후보에 반영)**
- 우리 DB 5개 테이블은 **객체(명사)만 있고 링크·액션이 없음** → 온톨로지가 되려면 관계를 코드가 아닌 데이터로, 그리고 write-back이 필요
- **에이전트 평가 체계 부재** — 에이전트를 늘리기 전에 평가 방법부터
- **파이프라인 모니터링 부재** — 수집 실패해도 아무도 모름
- **접근제어 부재** — RBAC 최소 role 기반부터

**다음 작업 후보**
- kubectl 설치 → kubeconfig 연결 → `kubectl get nodes`로 노드 2대 Ready 확인 (0717 글의 "다음 단계")
- 그 결과가 나오면 K8s 매니페스트 작성·배포 → 다음 포스트 소재
- 류승인 주무관 MCP 서버를 Claude API `mcp_servers` 파라미터로 연결
- 전명구 주무관 플랫폼 파일 수령 후 통합 계획 상세화

---

## 10. 알려진 이슈 / 주의사항

- `img/Gemini_Generated_Image.png`, `img/profile.jpg` (루트) — git untracked 상태 (의도적)
- 외부 이미지 URL 사용 시 깨질 수 있음 (docs.docker.com 이미지 깨짐 → spacelift.io로 교체한 전례, hits.seeyoufarm.com도 서비스 죽어서 폐기한 전례)
- GitHub API rate limit: 비인증 요청 60회/시간 → 방문자 많으면 `localDataUsing = true` 전환 필요
- GoatCounter API 토큰이 `js/visitorStats.js`에 평문 노출 중 (7번 항목 참고, 의도된 선택)
- 새 포스트 추가 시 썸네일 확장자(webp/jpg/png)를 실제 파일과 반드시 대조할 것 — 혼재되어 있어 오타 시 이미지 깨짐
- Windows에서 clone 시 `core.longpaths=true` 필수 (1번 항목) — 한글 파일명이 길어 260자 제한에 걸림
- **⚠️ 미해결**: 프로젝트 루트의 `작업메모.txt`에 NCP IAM Access Key / Secret Key가 **평문**으로 있음. 현재 루트가 git 저장소가 아니라 노출은 안 됐지만, 루트를 `git init`해서 hspalantir에 올리는 순간 유출된다. 그 전에 키 교체 또는 `.gitignore` 처리 필요
- 문서(이 파일)와 실제 저장소 상태가 어긋나는 일이 반복됨 (2026-07-17에 썸네일 번호·포스트 목록 대량 수정). **포스트나 이미지를 추가하면 4·5번 표를 같은 커밋에서 같이 갱신할 것**
