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
1. **보안**: 브라우저 개발자 도구 → Network 탭에서 요청 헤더가 그대로 보인다. API 키가 공개된다.
2. **CORS**: 그래도 Naver API가 CORS 헤더를 안 보내므로 브라우저가 여전히 차단한다.

---

## 올바른 해결책: CORS 프록시 서버리스 함수

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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

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
# .env.local — 절대 Git에 올리지 않는다
NAVER_CLIENT_ID=발급받은_클라이언트_ID
NAVER_CLIENT_SECRET=발급받은_클라이언트_시크릿
ANTHROPIC_API_KEY=Anthropic_API_키
```

프로덕션 배포 시 Vercel Dashboard → Settings → Environment Variables에 동일하게 설정한다.

---

## Naver Search API 세 가지 엔드포인트

| `type` 파라미터 | Naver API 엔드포인트 | 반환 데이터 |
|----------------|---------------------|------------|
| `news` | `/v1/search/news.json` | 뉴스 기사 |
| `blog` | `/v1/search/blog.json` | 블로그 포스트 |
| `cafe` | `/v1/search/cafearticle.json` | 카페 게시글 |

주의: `title`과 `description`에 `<b>` HTML 태그가 포함되어 있다. 이후 Claude NER 처리 전에 태그를 제거해야 한다.

```javascript
function stripHtml(text) {
  return text.replace(/<[^>]*>/g, '').trim();
}
```

---

## 실제로 부딪힌 문제들

### 문제 1: 네이버 API 할당량

Naver Open API 무료 계정은 하루 25,000건 호출 제한이 있다. 뉴스·블로그·카페 각 10건씩 = 30건이지만, 자동 새로고침을 구현하면 빠르게 소진된다.

**대응**: Phase 2에서 수집 결과를 DB에 캐시하고, 일정 시간 내 같은 쿼리는 DB에서 반환한다.

### 문제 2: 화성시와 무관한 결과

`query=화성시`로 검색해도 "화성" 영화 등 무관한 결과가 섞인다.

**단기 대응**: `query=경기도 화성시`로 쿼리를 구체화한다.  
**장기 대응**: Claude에게 화성시 관련 여부를 먼저 판별하게 하는 분류 단계 추가.

---

## 교훈

- **CORS는 서버 설정 문제가 아니라 브라우저 보안 정책**이다. 서버리스 프록시가 가장 깔끔한 해결책이다.
- **API 키는 절대 브라우저에 노출하지 않는다.** 서버리스 함수 + 환경변수가 표준 패턴이다.
- **Naver API HTML 태그 제거**는 사소해 보이지만 다음 단계(Claude NER)의 품질에 직접 영향을 미친다.
