---
title: "AI 채팅 에이전트에 스트리밍을 구현한 이유 — SSE와 Vercel 서버리스의 조합"
date: 2026-06-22 09:00:00 +0900
tags: [sse, streaming, claude-api, vercel, serverless, ux]
excerpt: "AI 응답이 완전히 생성될 때까지 기다리지 않고 글자 단위로 스트리밍하는 이유와 방법. Vercel 서버리스에서 SSE 스트리밍이 작동하는 방식과 제약을 실제 코드로 기록한다."
---

## 왜 스트리밍인가: 사용자 경험의 문제

AI 에이전트 응답을 스트리밍하지 않으면 어떻게 되는가?

1. 사용자가 질문을 입력한다
2. 5~15초 동안 화면에 아무 것도 표시되지 않는다
3. 응답이 한꺼번에 나타난다

이것은 느린 것이 아니라 **느리게 느껴진다**. 실제 응답 시간이 같아도, 텍스트가 글자 단위로 나타나면 사용자는 "AI가 생각하고 있다"는 피드백을 받는다. UX 연구에서 이것은 체감 대기 시간(perceived latency)을 크게 줄인다.

Claude API, OpenAI API, Gemini API 모두 스트리밍을 지원하는 이유가 여기에 있다. 기술적으로 스트리밍이 더 복잡하지만 사용자 경험 개선 효과가 명확하다.

---

## SSE vs WebSocket: 왜 SSE를 선택했는가

스트리밍 구현 방법은 크게 두 가지다:

**WebSocket**: 양방향 전이중(full-duplex) 통신. 클라이언트와 서버가 동시에 메시지를 주고받을 수 있다.

**SSE (Server-Sent Events)**: 서버 → 클라이언트 단방향 스트림. HTTP 기반이다.

| 항목 | WebSocket | SSE |
|------|-----------|-----|
| 방향 | 양방향 | 단방향 (서버→클라이언트) |
| 프로토콜 | ws:// (별도) | HTTP/HTTPS (기존) |
| 재연결 | 직접 구현 | 브라우저가 자동 처리 |
| Vercel 서버리스 지원 | ❌ (장기 연결 불가) | ✅ (스트리밍 응답 가능) |
| 브라우저 지원 | 모든 모던 브라우저 | 모든 모던 브라우저 |

AI 채팅 에이전트에서 스트리밍은 **서버 → 클라이언트 단방향**이다. 사용자가 질문을 보내는 것은 일반 POST 요청이고, AI 응답만 스트리밍으로 받으면 된다. WebSocket의 양방향 기능이 필요하지 않다.

그리고 결정적으로: **Vercel 서버리스 함수는 WebSocket을 지원하지 않는다.** 서버리스 함수는 요청 하나를 처리하고 종료되는 구조라 장기 연결이 불가능하다. SSE는 HTTP 스트리밍 응답이기 때문에 Vercel에서 작동한다.

---

## Claude API 스트리밍 동작 방식

Claude API는 `stream: true` 옵션을 주면 SSE 형식으로 응답을 스트리밍한다:

```
data: {"type":"message_start","message":{"id":"msg_01...","type":"message",...}}

data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}

data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"화성시"}}

data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"의 동탄"}}

data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"2신도시에서"}}

...

data: {"type":"message_delta","delta":{"stop_reason":"end_turn"}}

data: {"type":"message_stop"}
```

각 `content_block_delta` 이벤트에 텍스트 조각(`text_delta`)이 담겨 있다. 이것들을 이어 붙이면 완전한 응답이 된다.

---

## agent.js: 스트리밍 구현

```javascript
// api/agent.js
const SYSTEM_PROMPT =
  '당신은 화성시 도시 인텔리전스 분석 에이전트입니다. ' +
  '수집된 뉴스·블로그·카페·민원 데이터를 기반으로 화성시의 현안, ' +
  '민원 트렌드, 지역 이슈를 분석해 답변하세요.';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = typeof req.body === 'string'
    ? JSON.parse(req.body || '{}')
    : (req.body || {});

  const rawMessages = Array.isArray(body.messages) ? body.messages : [];
  const context = String(body.context || '').slice(0, 3000); // 컨텍스트 3000자 제한

  // 메시지 정제: role이 user/assistant인 것만, content를 문자열로
  const sanitizedMessages = rawMessages
    .filter(msg => msg && (msg.role === 'user' || msg.role === 'assistant'))
    .map(msg => ({
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content : String(msg.content || ''),
    }));

  // 수집 데이터를 첫 번째 user 메시지로 주입 (컨텍스트 인젝션)
  const requestMessages = [
    {
      role: 'user',
      content: `수집 데이터 요약(최대 3000자):\n${context || '수집 데이터 없음'}\n\n위 요약은 분석 참고용 컨텍스트입니다.`,
    },
    ...sanitizedMessages,
  ].slice(-20); // 최대 20개 메시지 (컨텍스트 윈도우 관리)

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1800,
      stream: true,           // 스트리밍 활성화
      system: SYSTEM_PROMPT,
      messages: requestMessages,
    }),
  });

  // 스트리밍 응답 헤더 설정
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');

  // Claude의 SSE 스트림을 그대로 클라이언트로 중계
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(decoder.decode(value, { stream: true }));
  }

  return res.end();
}
```

### 핵심 패턴: 스트림 중계 (Passthrough)

이 코드의 핵심 패턴은 **Claude의 SSE 응답을 그대로 클라이언트에 중계**하는 것이다. Claude API가 보내는 SSE 바이트 스트림을 받아서 파싱하지 않고 바로 클라이언트에 `write()`한다.

파싱하지 않는 이유: 파싱 + 재포맷하면 코드가 복잡해지고 중계 지연(latency)이 생긴다. Claude API의 SSE 형식을 그대로 클라이언트에 내보내면 프론트엔드가 직접 파싱하면 된다.

---

## 프론트엔드: SSE 수신

```javascript
// 브라우저에서 SSE 수신
async function sendMessage(userMessage, contextData) {
  const response = await fetch('/api/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: conversationHistory,
      context: contextData,
    }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let assistantText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // 마지막 불완전한 줄을 버퍼에 유지

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6); // 'data: ' 제거
      if (data === '[DONE]') break;

      try {
        const event = JSON.parse(data);
        if (event.type === 'content_block_delta' &&
            event.delta?.type === 'text_delta') {
          assistantText += event.delta.text;
          // 실시간으로 화면 업데이트
          updateChatUI(assistantText);
        }
      } catch {
        // JSON 파싱 실패는 무시 (부분 청크일 수 있음)
      }
    }
  }

  // 대화 히스토리에 추가
  conversationHistory.push(
    { role: 'user', content: userMessage },
    { role: 'assistant', content: assistantText }
  );
}
```

### 줄 버퍼링(line buffering)이 필요한 이유

SSE 스트림은 `\n`으로 구분된 줄들이다. 하지만 네트워크 청크가 `\n` 경계와 정확히 일치하지 않을 수 있다:

```
청크 1: 'data: {"type":"content_block_delta","index":0,"de'
청크 2: 'lta":{"type":"text_delta","text":"화성시"}}\n\n'
```

청크 1만으로는 JSON 파싱이 불가능하다. `buffer`에 쌓아뒀다가 `\n`을 만나면 그 줄을 처리하는 방식이 필요하다.

---

## 컨텍스트 인젝션 설계

AI 에이전트가 화성시 데이터에 대해 답변하려면, 수집된 데이터를 컨텍스트로 주입해야 한다. 이 시스템에서의 방식:

```javascript
// 수집된 뉴스·블로그·민원 데이터를 요약 텍스트로 변환
function buildContext(collectedItems) {
  return collectedItems
    .slice(0, 30) // 최대 30개
    .map(item => `[${item.type}] ${item.title}: ${item.description}`)
    .join('\n')
    .slice(0, 3000); // 3000자 제한
}
```

이 컨텍스트가 Claude에게 첫 번째 `user` 메시지로 전달된다. Claude는 이 데이터를 참고해서 사용자 질문에 답한다.

**3000자 제한의 이유**: Claude Sonnet 4의 컨텍스트 윈도우는 200K 토큰으로 매우 크다. 그러나 컨텍스트가 길수록 응답 속도가 느려지고 비용이 증가한다. 30개 항목을 3000자로 요약하는 것이 속도와 품질의 균형점이었다.

**`.slice(-20)` 대화 히스토리 제한**: 대화가 길어지면 히스토리 전체를 매번 보내는 것이 비효율적이다. 최근 20개 메시지만 유지한다. 20개를 초과하면 초기 대화 내용은 사라진다.

---

## Vercel 서버리스에서 스트리밍의 제약

Vercel 서버리스 함수에서 SSE 스트리밍은 작동하지만 두 가지 제약이 있다:

**1. 실행 시간 제한**

무료 플랜: 10초, Pro 플랜: 60초. Claude Sonnet 4의 1800 토큰 응답 생성이 평균 5-8초이므로 무료 플랜에서도 대부분 통과하지만, 복잡한 분석 요청에서 간헐적 타임아웃이 발생했다.

대응: `max_tokens`를 1800으로 제한했다. 더 긴 응답이 필요하면 Pro 플랜 업그레이드 또는 Phase 2에서 전용 서버로 이전이 필요하다.

**2. 응답 버퍼링**

일부 CDN/프록시 환경에서 SSE 응답을 버퍼링해서 한꺼번에 내보내는 경우가 있다. `Cache-Control: no-cache, no-transform`이 이 버퍼링을 방지하는 표준 헤더다.

`no-transform` 이 핵심이다: `no-cache`만으로는 중간 프록시가 응답을 압축하거나 변환하는 것을 막지 못한다. `no-transform`이 있어야 SSE가 실시간으로 클라이언트에 전달된다.

---

## 실제로 발생한 버그

**버그**: 대화를 20번 이상 이어가면 초기 질문 맥락이 사라지는 현상.

**원인**: `.slice(-20)` 히스토리 제한 때문에 첫 번째 컨텍스트 인젝션 메시지가 잘려나간다.

**현황**: Phase 1에서는 허용한다. 화성시 데이터 분석 에이전트 특성상 하나의 세션에서 20회 이상 질문하는 경우가 드물다고 판단했다. Phase 2에서 컨텍스트 압축(이전 대화 요약 + 최근 N개 메시지) 방식으로 개선할 예정이다.

---

## 교훈

- **AI 채팅에는 스트리밍이 필수다.** 비스트리밍 응답은 사용자가 시스템이 멈췄다고 오해한다.
- **Vercel 서버리스에서 SSE는 작동한다.** WebSocket과 달리 서버리스 함수의 실행 모델과 호환된다.
- **`Cache-Control: no-transform`을 빠뜨리면 스트리밍이 깨진다.** CDN 버퍼링을 막는 이 헤더는 SSE에서 필수다.
- **스트림 중계 패턴(passthrough)**: Claude SSE → 내 함수 → 클라이언트, 중간에 파싱하지 않고 바이트를 그대로 흘리는 것이 가장 단순하고 빠르다.
- **줄 버퍼링**: 네트워크 청크가 SSE 줄 경계와 맞지 않을 수 있다. 버퍼를 유지하면서 `\n` 단위로 처리해야 한다.

---

## Beta v0.1 전체 아키텍처 요약

여기까지 4편(검색 API, NER 추출, 에이전트 스트리밍, CSS 버그)을 마치면 Beta v0.1의 전체 흐름이 완성된다:

```
사용자 입력 (검색 키워드)
  → [search.js] Naver API 프록시 → 뉴스·블로그·카페 결과
  → [extract.js] Claude NER → 장소명·좌표 추출
  → [index.html] 네이버 지도 마커 표시

사용자 입력 (자연어 질문)
  → [agent.js] Claude 에이전트 (스트리밍)
  → [index.html] 실시간 텍스트 렌더링
```

다음 시리즈는 Phase 2: 3-Tier 아키텍처 전환 과정이다. PostgreSQL + PostGIS 설계, 공간 온톨로지 구현, React 전환의 의사결정을 기록할 예정이다.
