---
title: "브라우저에서 Naver API를 직접 못 쓰는 이유 — CORS 프록시 서버리스 구현"
date: 2026-06-15 09:00:00 +0900
tags: [cors, serverless, naver-api, vercel, security]
excerpt: "CORS가 왜 존재하는지, 왜 Naver API를 브라우저에서 직접 호출하면 안 되는지, 그리고 Vercel 서버리스 함수로 이 문제를 어떻게 해결했는지 기록한다."
---

## CORS란 무엇이고 왜 존재하는가

CORS(Cross-Origin Resource Sharing)는 브라우저가 보안을 위해 강제하는 정책이다. 브라우저는 기본적으로 다른 출처(origin)의 리소스에 대한 요청을 차단한다.

출처(origin)는 `프로토콜 + 도메인 + 포트`의 조합이다:

```
https://hscitycity.github.io   ← 내 페이지의 출처
https://openapi.naver.com      ← Naver API의 출처 (다른 출처)
```

두 출처가 다르기 때문에 브라우저가 요청을 차단한다. 이것이 CORS 오류다.

### 왜 이런 정책이 있는가

CSRF(Cross-Site Request Forgery) 공격을 막기 위해서다. 사용자가 은행 사이트에 로그인한 상태에서 악성 사이트를 방문했을 때, 악성 사이트의 JavaScript가 은행 API를 사용자 이름으로 호출하는 것을 막아야 한다.

서버가 `Access-Control-Allow-Origin: *` 헤더를 응답에 포함하면 브라우저가 다른 출처에서의 요청을 허용한다. Naver API는 이 헤더를 반환하지 않는다. 서버 간 호출을 전제로 설계되어 있기 때문이다.

---

## 잘못된 해결책: API 키를 브라우저에 노출

처음에 가장 쉬운 방법을 생각했다:

```javascript
// ❌ 이렇게 하면 안 된다
const response = await fetch(
  `https://openapi.naver.com/v1/search/news.json?query=화성시`,
  {
    headers: {
      'X-Naver-Client-Id': 'MY_CLIENT_ID',      // 브라우저 콘솔에서 보임
      'X-Naver-Client-Secret': 'MY_SECRET',      // 브라우저 콘솔에서 보임
    }
  }
);
```

문제점 두 가지:

1. **보안**: 브라우저 개발자 도구 → Network 탭을 열면 요청 헤더가 그대로 보인다. API 키가 공개된다.
2. **CORS**: 그래도 Naver API가 CORS 헤더를 안 보내므로 브라우저가 여전히 차단한다.

---

## 올바른 해결책: CORS 프록시 서버리스 함수

브라우저는 같은 출처(내 Vercel 도메인)에만 요청한다. Vercel 함수가 서버에서 Naver API를 호출한다.

```
브라우저
  → GET /api/search?type=news&query=화성시
    → Vercel 함수 (search.js)
      → Naver API (서버에서 호출, CORS 제약 없음)
        ← JSON 응답
      ← JSON 응답 + CORS 허용 헤더 추가
    ← JSON 응답
  ← 렌더링
```

### search.js 전체 코드

```javascript
// api/search.js — Naver Search API CORS 프록시
export default async function handler(req, res) {
  // 브라우저로의 응답에 CORS 헤더 추가
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  // Preflight 요청 처리 (브라우저가 실제 요청 전 OPTIONS를 먼저 보냄)
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { type = 'news', query = '화성시', display = 10 } = req.query;

  const typeMap = {
    news:  'https://openapi.naver.com/v1/search/news.json',
    blog:  'https://openapi.naver.com/v1/search/blog.json',
    cafe:  'https://openapi.naver.com/v1/search/cafearticle.json',
  };

  const url = typeMap[type];
  if (!url) return res.status(400).json({ error: 'Invalid type' });

  try {
    const response = await fetch(
      `${url}?query=${encodeURIComponent(query)}&display=${display}&sort=date`,
      {
        headers: {
          // 환경변수에서 읽음 — 브라우저에 절대 노출되지 않음
          'X-Naver-Client-Id':     process.env.NAVER_CLIENT_ID,
          'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText || 'Naver API error' });
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
```

### Vercel 환경변수 설정

로컬 개발에서는 `.env.local`:

```bash
# .env.local (절대 Git에 올리지 않는다 - .gitignore에 포함)
NAVER_CLIENT_ID=발급받은_클라이언트_ID
NAVER_CLIENT_SECRET=발급받은_클라이언트_시크릿
ANTHROPIC_API_KEY=Anthropic_API_키
```

프로덕션 배포 시 Vercel Dashboard → Settings → Environment Variables에 동일하게 설정한다. Vercel이 빌드 시 환경변수를 함수에 주입한다.

---

## Naver Search API 세 가지 엔드포인트

뉴스, 블로그, 카페 기사를 각각 다른 엔드포인트로 수집한다:

| `type` 파라미터 | Naver API 엔드포인트 | 반환 데이터 |
|----------------|---------------------|------------|
| `news` | `/v1/search/news.json` | 뉴스 기사 |
| `blog` | `/v1/search/blog.json` | 블로그 포스트 |
| `cafe` | `/v1/search/cafearticle.json` | 카페 게시글 |

모두 같은 구조의 JSON을 반환한다:

```json
{
  "lastBuildDate": "...",
  "total": 1234,
  "start": 1,
  "display": 10,
  "items": [
    {
      "title": "<b>화성시</b> 동탄 소음 민원 급증",
      "originallink": "https://...",
      "link": "https://...",
      "description": "...",
      "pubDate": "Mon, 02 Jun 2026 09:00:00 +0900"
    }
  ]
}
```

주의: `title`과 `description`에 `<b>` HTML 태그가 포함되어 있다. 이후 Claude NER 처리 전에 태그를 제거해야 한다.

---

## 실제로 부딪힌 문제들

### 문제 1: 네이버 API 할당량

Naver Open API 무료 계정은 하루 25,000건 호출 제한이 있다. 뉴스·블로그·카페 각 10건씩 3번 = 30건이지만, 여러 사용자가 동시에 쓰거나 자동 새로고침을 구현하면 빠르게 소진된다.

**대응**: Phase 2에서 수집 결과를 DB에 캐시하고, 일정 시간 내 같은 쿼리는 DB에서 반환한다. Phase 1에서는 수동으로만 검색한다.

### 문제 2: HTML 태그 제거

Naver API 응답의 `title`과 `description`에 `<b>`, `</b>` 태그가 포함되어 있다. 이걸 그대로 Claude에 넘기면 Claude가 HTML 태그를 텍스트로 처리해서 장소명 추출이 방해받는다.

```javascript
// 프론트엔드에서 Naver 응답을 전처리
function stripHtml(text) {
  return text.replace(/<[^>]*>/g, '').trim();
}

const cleanedItems = items.map(item => ({
  ...item,
  title: stripHtml(item.title),
  description: stripHtml(item.description),
}));
```

### 문제 3: 화성시와 무관한 결과

`query=화성시`로 검색해도 화성시와 무관한 결과가 섞인다. "화성" 영화, 화성시가 아닌 다른 지역 결과 등이 포함된다.

**단기 대응 (Phase 1)**: `query=경기도 화성시`로 쿼리를 구체화한다. 여전히 일부 노이즈가 있지만 비율이 줄어든다.

**장기 대응 (Phase 2)**: Claude에게 화성시 관련 여부를 먼저 판별하게 하거나(분류 → 추출 2단계), 화성시 내 주요 지명 목록을 포함해서 관련성 점수를 계산한다.

---

## 로컬 개발에서의 서버리스 테스트

Vercel CLI를 설치하면 로컬에서도 서버리스 함수를 실행할 수 있다:

```bash
npm install -g vercel
cd Palantir-Demo
vercel dev  # 로컬 http://localhost:3000 에서 실행
```

`vercel dev`는 `.env.local`을 자동으로 읽어 환경변수를 주입한다. 프로덕션 배포 전 로컬에서 테스트하는 표준 워크플로우다.

---

## 교훈

- **CORS는 서버 설정 문제가 아니라 브라우저 보안 정책**이다. 서버리스 프록시가 가장 깔끔한 해결책이다.
- **API 키는 절대 브라우저에 노출하지 않는다.** 서버리스 함수 + 환경변수가 표준 패턴이다.
- **Naver API HTML 태그 제거**는 사소해 보이지만 다음 단계(Claude NER)의 품질에 직접 영향을 미친다. 데이터 전처리를 건너뛰지 않는다.

---

## 다음 글

[LLM을 지오코더로 쓰기 — Claude NER로 도시 텍스트에서 장소 추출](/2026/06/18/claude-ner-geocoding/)에서 수집된 텍스트에서 장소명과 좌표를 추출하는 과정을 다룬다. LLM이 NER 도구로서 갖는 강점과 위험을 솔직하게 정리한다.
