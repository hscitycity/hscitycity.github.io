---
title: "LLM을 지오코더로 쓰기 — Claude NER로 도시 텍스트에서 장소 추출"
date: 2026-06-18 09:00:00 +0900
tags: [llm, ner, geocoding, claude, prompt-engineering, hallucination]
excerpt: "뉴스·블로그 텍스트에서 화성시 내 장소명과 좌표를 추출하기 위해 Claude API를 NER 도구로 사용했다. 전통적인 지오코딩과의 차이, 프롬프트 설계, 그리고 hallucination 문제를 정직하게 기록한다."
---

## 왜 전통적인 지오코딩이 부족한가

지오코딩(geocoding)은 주소 문자열을 위도·경도로 변환하는 것이다. 카카오맵 API, 네이버 지도 API, Google Maps API 모두 지오코딩을 제공한다.

그런데 뉴스·블로그 텍스트에서 장소를 추출하는 문제는 지오코딩으로 바로 해결되지 않는다. 지오코딩 API는 **정형화된 주소**를 받는다:

```
"경기도 화성시 동탄대로 337"  →  위도 37.2036, 경도 127.0759 ✓
```

하지만 실제 뉴스·블로그 텍스트의 장소 표현은 다양하다:

```
"동탄역 근처 아파트에서"          ← 장소명이지만 주소가 아님
"봉담읍 왕림리 쪽 주민들이"       ← 법정동 표현
"동탄 2신도시 호수공원 앞"        ← 복합 표현
"화성시 우리 동네에서"            ← 지오코딩 불가
"반월·시화산단 근처"             ← 약칭 + 인근 표현
```

이 텍스트에서 (1) 장소명이 있는지 판별하고, (2) 있다면 어떤 장소인지 정규화하고, (3) 좌표로 변환하는 세 단계가 필요하다. 이 중 1번과 2번이 NER(Named Entity Recognition) 문제다.

---

## 전통적 NER vs LLM NER

**전통적 NER**: 학습된 시퀀스 레이블링 모델 (BERT, CRF 등)

```
장점: 빠름, 결정론적(같은 입력 → 같은 출력), 외부 API 비용 없음
단점: 한국어 지명 특화 모델 학습 데이터 확보가 어려움,
      신조어·약칭 처리 불가, 맥락 이해 부족
```

**LLM NER (Claude 등)**:

```
장점: 맥락 이해 가능, 맥락에서 애매한 표현 해석 가능,
      한국어 지명 지식 내재, 별도 학습 데이터 불필요
단점: 느림, 확률적(같은 입력이라도 다른 출력), 비용 발생,
      hallucination — 존재하지 않는 좌표를 만들어낼 수 있음
```

이 프로젝트는 LLM NER을 선택했다. 이유: 화성시 내 지명 특화 NER 학습 데이터를 만드는 것이 단기에 불가능하고, LLM의 맥락 이해 능력이 비정형 텍스트 처리에 적합하다. 단, hallucination 리스크는 명시적으로 관리해야 한다.

---

## extract.js: 프롬프트 설계

```javascript
// api/extract.js — Vercel Serverless Function
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { items } = req.body;
  if (!items?.length) return res.status(400).json({ error: 'No items' });

  // 배치로 묶어서 단일 Claude 호출로 처리
  const text = items
    .map((it, i) => `[${i}] ${it.title} / ${it.description}`)
    .join('\n');

  const prompt = `다음은 경기도 화성시 관련 포스트 목록입니다.
각 항목에서 언급된 화성시 내 장소명을 추출하고, 해당 장소의 위도·경도를 반환하세요.
장소가 없거나 불분명하면 null로 처리하세요.

반드시 아래 JSON 배열만 반환하세요 (마크다운 없이):
[
  { "index": 0, "place": "장소명 또는 null", "lat": 위도 또는 null, "lng": 경도 또는 null }
]

화성시 중심 좌표: 위도 37.1996, 경도 126.8312

포스트 목록:
${text}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await response.json();
  const raw = data.content?.[0]?.text || '[]';

  // Claude가 마크다운 코드블록으로 감쌀 때를 대비한 파싱
  let locations;
  try {
    locations = JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch {
    locations = [];
  }

  res.status(200).json({ locations });
}
```

### 프롬프트 설계 결정들

**1. 배치 처리 (여러 항목을 한 번에)**

```
[0] 제목0 / 설명0
[1] 제목1 / 설명1
...
```

각 항목마다 Claude를 따로 호출하면 비용과 시간이 선형으로 증가한다. 배치로 묶으면 Claude의 컨텍스트 이해 능력을 활용할 수도 있다 (예: 앞 항목이 같은 지역에 대한 것이면 뒤 항목의 애매한 표현을 더 잘 해석한다).

단, 배치가 너무 크면 Vercel 10초 타임아웃에 걸린다. 테스트 결과 10개 항목이 안정적인 상한이었다.

**2. `null` 허용**

"장소가 없거나 불분명하면 null로 처리하세요"가 없으면 Claude가 억지로 장소명을 만들어낸다. 화성시와 무관한 기사에서도 아무 지명이나 반환하는 경향이 있었다. `null`을 명시적으로 허용해야 "모르면 null"이라고 답한다.

**3. 화성시 중심 좌표 제공**

Claude에게 화성시의 중심 좌표를 알려주는 이유: Claude의 지식 데이터 기준점이 명확하지 않을 때 중심 좌표를 앵커로 주면 좌표의 타당성 판단에 도움이 된다. 실제로 이 힌트 없이 테스트했을 때 화성시 외부 좌표(예: 경기도 화성군이 아닌 곳)가 반환되는 경우가 있었다.

**4. "마크다운 없이" 지시**

Claude는 기본적으로 코드블록을 마크다운으로 감싼다 (` ```json ... ``` `). JSON을 파싱하려면 이것을 벗겨야 한다. "마크다운 없이"를 프롬프트에 명시해도 간헐적으로 마크다운이 포함되기 때문에, 코드에서도 `replace(/```json|```/g, '')` 처리를 병행했다.

---

## 발견한 문제들: hallucination 사례

솔직하게 쓴다. LLM NER이 예상보다 불안정했다.

### 문제 1: 잘못된 좌표

실제 테스트에서 발생한 사례:

```json
// 입력: "동탄역 근처 신축 아파트 입주"
// 기대 출력: { "place": "동탄역", "lat": 37.2040, "lng": 127.0724 }
// 실제 출력: { "place": "동탄역", "lat": 37.2040, "lng": 127.0724 }  ← 이건 맞음

// 입력: "봉담 ICT밸리 근처 공사 소음"
// 기대 출력: { "place": "봉담 ICT밸리", "lat": 37.2045, "lng": 126.9963 }
// 실제 출력: { "place": "봉담 ICT밸리", "lat": 37.2045, "lng": 127.4962 }
//                                                                 ↑ 경도가 0.5도 틀림
```

좌표가 0.5도 틀리면 실제 거리로 약 40km 오차다. 지도에서 완전히 다른 위치에 마커가 찍힌다.

### 문제 2: 화성시 밖 결과

```json
// 입력: "화성 궁평항 낙조 맛집"
// 실제 출력: { "place": "궁평항", "lat": 37.1589, "lng": 126.7512 }
// 검증: 이 좌표는 화성시 서신면 궁평리. 맞음.

// 입력: "화성에 출장 다녀왔어요"
// 실제 출력: { "place": "화성", "lat": 37.2001, "lng": 126.8316 }
// 문제: 화성시 중심 좌표를 반환했지만 이 포스트의 화성은 화성시가 아닐 수 있음
```

### 문제 3: 존재하지 않는 장소

```json
// 입력: "동탄 신리단길 카페"
// 실제 출력: { "place": "동탄 신리단길", "lat": 37.2102, "lng": 127.0761 }
// 문제: "신리단길"은 화성시에 존재하지 않는 도로명. Claude가 비슷한 패턴("OO리단길")으로 만들어냈다.
```

---

## 이 문제에 대한 단기 대응과 장기 대응

### Phase 1 단기 대응 (현재 적용)

**좌표 범위 검증**: 화성시 경계 좌표(위도 36.95~37.35, 경도 126.60~127.15)를 벗어나는 결과를 필터링한다.

```javascript
function isInHwaseong(lat, lng) {
  return lat >= 36.95 && lat <= 37.35 &&
         lng >= 126.60 && lng <= 127.15;
}

const filtered = locations.filter(
  loc => loc.lat === null || isInHwaseong(loc.lat, loc.lng)
);
```

이 필터로 좌표가 완전히 틀린 결과(화성시 밖)는 잡을 수 있다. 좌표가 화성시 안이지만 특정 위치가 틀린 경우는 잡지 못한다.

**낮은 신뢰도 표시**: 지도에 마커를 찍을 때 "AI 추출 (검증 필요)" 라벨을 붙여 사용자가 결과를 그대로 신뢰하지 않도록 한다.

### Phase 2 장기 대응 (설계 중)

**하이브리드 파이프라인**:

```
텍스트
  → Claude: 장소명 추출 (NER)
    → 카카오맵 지오코딩 API: 장소명 → 공식 좌표 변환
      → 좌표 검증 (화성시 경계 내 여부)
        → DB 저장
```

Claude는 장소명 추출(텍스트 → 지명)만 담당하고, 지명 → 좌표 변환은 공식 지오코딩 API에 맡긴다. Claude의 hallucination이 가장 위험한 지점은 좌표를 직접 생성하는 부분이기 때문이다.

---

## 비용 계산

Claude Sonnet 4 기준 (2026년 6월 기준):

- 입력: $3.00 / MTok
- 출력: $15.00 / MTok

10개 항목 배치 기준 프롬프트 약 500 토큰 + 응답 약 200 토큰 = 약 700 토큰/호출

하루 100번 호출 = 70,000 토큰 = $0.21/일

Phase 1에서는 비용이 문제가 아니다. Phase 2에서 자동 수집 파이프라인이 하루 수백 번 호출할 때 비용 구조가 달라진다. Phase 2에서는 Claude를 지명 추출에만 사용하고, 지오코딩은 무료/저렴한 공식 API로 분리하는 이유 중 하나다.

---

## 교훈

- **LLM NER은 정형화된 주소가 아닌 자연어 텍스트에서 장소명 추출에 유용하다.** 하지만 좌표까지 직접 생성하게 하면 hallucination이 발생한다.
- **LLM이 좌표를 생성하게 하지 않는다.** 장소명 추출(Claude) + 좌표 변환(공식 API) 2단계 분리가 올바른 설계다.
- **`null` 허용 지시는 필수다.** 없으면 LLM이 억지로 답을 만든다.
- **범위 검증은 선택이 아니라 필수다.** LLM 출력을 신뢰해서 그대로 지도에 올리면 안 된다.

---

## 다음 글

[AI 채팅 에이전트에 스트리밍을 구현한 이유 — SSE와 Vercel 서버리스의 조합](/2026/06/22/sse-streaming-ai-agent/)에서 `agent.js`의 스트리밍 구현과, Vercel 서버리스에서 SSE가 작동하는 방식을 다룬다.
