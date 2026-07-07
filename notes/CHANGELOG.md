# 작업 노트 (거친 기록용)

평소 작업하면서 바로바로 남기는 메모. 형식 안 갖춰도 됨. 어느 정도 쌓이면 추려서 `_posts/`에 정리된 글로 옮긴다.

형식 제안: `## YYYY-MM-DD 한 줄 제목` 으로 구분, 그 아래 자유 서술.

---

## 2026-06-30 WBS 대시보드 컬럼 정렬 버그

- 컬럼이 자꾸 한 칸씩 밀려 보임. 처음엔 localStorage 캐시 문제라고 생각해서 storage key 버전업 → 효과 없음
- 컬럼 너비 드래그 기능 추가 후 인덱스 밀림이라고 생각해서 그 key도 버전업 → 효과 없음
- playwright로 직접 렌더링해서 getBoundingClientRect 찍어보니 진짜 원인 발견: td에 display:flex 걸려있던 게 테이블 레이아웃을 깨뜨림
- 다음엔 "캐시 문제겠지" 추측 전에 먼저 직접 렌더링해서 찍어보자

→ 정리된 글: [td에 display:flex를 걸면 안 되는 이유](/2026/06/30/td-flex-table-layout-bug/)

---

## 2026-06-22 AI 채팅 에이전트 스트리밍 구현

- Vercel 서버리스에서 SSE 스트리밍이 작동함을 확인
- `Cache-Control: no-transform` 없으면 CDN에서 버퍼링 발생
- 스트림 passthrough 패턴 (Claude SSE → 함수 → 클라이언트, 파싱 없이 바이트 그대로 중계)
- `.slice(-20)` 히스토리 제한으로 20회 이상 대화 시 초기 컨텍스트 유실 → Phase 2 개선 예정

→ 정리된 글: [AI 채팅 에이전트에 스트리밍을 구현한 이유](/2026/06/22/sse-streaming-ai-agent/)

---

## 2026-06-18 Claude NER 장소 추출 — hallucination 발견

- Claude가 좌표를 직접 생성할 때 오차 발생 (경도 0.5도 틀린 사례)
- "null 허용" 지시 없으면 억지로 장소명 생성
- 화성시 경계 좌표 필터로 명백히 잘못된 결과 제거
- 장기 대응: Claude는 지명 추출만, 좌표 변환은 공식 지오코딩 API 분리

→ 정리된 글: [LLM을 지오코더로 쓰기](/2026/06/18/claude-ner-geocoding/)

---

## 2026-06-15 Naver API CORS 프록시 구현

- Naver API는 서버 간 호출 전제, 브라우저 직접 호출 불가
- `search.js` 서버리스 함수로 CORS 프록시 + API 키 보안 동시 해결
- Naver 응답의 `<b>` HTML 태그 제거 필수 (Claude NER 품질 영향)
- 하루 25,000건 무료 호출 제한 → Phase 2에서 DB 캐시 필요

→ 정리된 글: [브라우저에서 Naver API를 직접 못 쓰는 이유](/2026/06/15/naver-api-cors-proxy/)

---

## 2026-06-10 아키텍처 결정: 단일 HTML + Vercel 서버리스

- Phase 1은 가설 검증이 목적 → React/Express 대신 최소 구성 선택
- Vercel 무료 10초 타임아웃: extract.js에서 20개 배치 시 간헐적 타임아웃 → 10개로 축소
- 의도적으로 쌓은 기술 부채 (영속성 없음, 상태 관리 없음) → Phase 2 전면 재작성으로 해소 예정

→ 정리된 글: [왜 React가 아닌 단일 HTML로 시작했는가](/2026/06/10/architecture-decision-serverless-first/)

---

## 2026-06-05 WBS 수립

- 공공사업 WBS = 납품물 중심, 계약 이행 증거 구조
- 새올 API 연계(Phase 3) 일정 불확실 → 연계 실패 시 CSV 수동 업로드 대체안 병행 설계
- 국토연구원 Urban AI 모델 형태 미확인 (API vs 코드 vs 논문)

→ 정리된 글: [WBS — 7개월 공공사업 개발계획](/2026/06/05/wbs-public-project/)

---

## 2026-06-02 프로젝트 시작

- 화성형 팔란티어 시스템 개발 공식 시작
- 행안부-NIA 공모사업, 2026년 6월~12월 7개월
- 핵심 설계 원칙: 국가기초구역(우편번호 5자리) 기본 공간 단위

→ 정리된 글: [화성형 팔란티어 시스템 개발 시작](/2026/06/02/project-overview/)

---

## (다음 항목을 여기에 계속 추가)
