# 화성형 팔란티어 — 디자인 시스템 (Palantir HUD)

블로그(`hscitycity.github.io`)와 대시보드(`dashboard.html`)가 공유하는 시각 언어.
새 화면/컴포넌트를 만들 때 이 문서의 토큰·패턴·스니펫을 그대로 재사용한다.

> 컨셉 한 줄: **"다크 관제화면(HUD) 위의 사이언 글로우 + 밝은 그라디언트 타이포"**
> 팔란티어 관제센터 느낌 — 어두운 네이비 바탕, 사이언(#38bdf8) 강조, 은은한 발광(glow), 격자/라디얼 배경.

---

## 1. 색상 토큰 (CSS 변수)

색은 **하드코딩하지 말고 아래 변수를 쓴다.** 라이트 UI용과 HUD(다크) 오버레이용을 구분.

```css
:root {
  /* HUD (다크/이미지 위) */
  --hud-cyan: #38bdf8;                     /* 강조 사이언 */
  --hud-cyan-soft: rgba(56, 189, 248, 0.85);
  --hud-bright: #f0f9ff;                    /* hover/현재 상태 밝은색 */
  --hud-navy: #0a1628;                      /* 바탕 네이비 */
  --hud-grad: linear-gradient(135deg,
    rgba(15, 23, 42, 0.92) 0%,
    rgba(30, 58, 138, 0.82) 100%);         /* HUD 패널/배지 배경 */

  /* 라이트 UI (본문·드롭다운·카드) */
  --hdr-bg: #ffffff;
  --hdr-ink: #121314;                       /* 본문 텍스트(surface) */
  --hdr-muted: #8d9299;                     /* 보조 텍스트(graylv3) */
  --hdr-line: rgba(18, 19, 20, 0.12);       /* 얇은 경계선 */
  --hdr-hover: #f3f5fa;                      /* 옅은 hover 배경(graylv1) */
  --hdr-primary: #2e6ff2;                   /* 브랜드 블루(primary) */

  /* 레이아웃 */
  --hdr-maxw: 1190px;                        /* 본문/헤더 공통 최대폭 */
}
```

**대시보드 스탯/포인트 색** (칸반·통계): `#2B7DE0`(파랑, 완료/강조), `#F5A623`(주황, 진행중), `#7A8CA0`(회색, 예정), `#D63B1F`(빨강, 높음/위험).

### 글로우(그림자) 공식
- 은은한 발광: `box-shadow: 0 0 20px rgba(56,189,248,0.2), inset 0 0 12px rgba(56,189,248,0.15);`
- hover 강조: `box-shadow: 0 0 30px rgba(56,189,248,0.4), inset 0 0 18px rgba(56,189,248,0.3);`
- 텍스트 발광: `text-shadow: 0 0 8px rgba(56,189,248,0.35);`

---

## 2. 폰트

```html
<!-- <head>에 두 줄 -->
<link rel="stylesheet" as="style" crossorigin
  href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
<link rel="stylesheet" as="style" crossorigin
  href="https://cdn.jsdelivr.net/gh/fonts-archive/Paperlogy/subsets/Paperlogy-dynamic-subset.css" />
```

```css
:root {
  --font-fallback: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
body { font-family: "Pretendard Variable", Pretendard, var(--font-fallback); }
/* 워드마크·큰 제목·글 제목 */
.hero-h1, .paperlogy-title { font-family: "Paperlogy", var(--font-fallback); }
```

- **본문·UI·메뉴**: Pretendard (가변, 동적 서브셋)
- **큰 제목·워드마크·포스트 제목**: Paperlogy (굵기 대비 큼, 장문 금지)
- 항상 `font-display: swap` + 폴백 지정. `@import` 대신 `<link>`. 버전 태그(`@v1.3.9`) 고정.

---

## 3. 히어로 (상단 대문) — 핵심 패턴

다크 이미지 풀블리드 + 오버레이(격자·라디얼·하단 라인) + HUD 카피. 블로그·대시보드 공통.

```css
.hero {
  position: relative;
  background-color: #0a1628;
  background-image:
    radial-gradient(ellipse 80% 60% at 72% -10%, rgba(43,125,224,.30) 0%, transparent 60%),
    radial-gradient(ellipse 50% 45% at 12% 115%, rgba(56,189,248,.16) 0%, transparent 55%),
    linear-gradient(180deg, rgba(10,22,40,.50) 0%, rgba(10,22,40,.85) 100%),
    url("/img/배경이미지.png");           /* 맨 아래 레이어 = 이미지 */
  background-size: auto, auto, cover, cover;
  background-position: center;
  background-repeat: no-repeat;
  overflow: hidden;
}
/* 미세 격자 (가운데만 보이게 마스크) */
.hero::before {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background-image:
    linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px);
  background-size: 48px 48px;
  -webkit-mask-image: radial-gradient(ellipse 70% 70% at 50% 30%, #000 20%, transparent 75%);
  mask-image: radial-gradient(ellipse 70% 70% at 50% 30%, #000 20%, transparent 75%);
}
/* 하단 사이언 라인 */
.hero::after {
  content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(56,189,248,.5), transparent);
}
.hero-inner { position: relative; z-index: 2; max-width: var(--hdr-maxw); margin: 0 auto; padding: 18px 28px 60px; }
```

**규칙**: 이미지가 밝으면 `linear-gradient` 오버레이 어둡기(0.5→0.85)를 올려 텍스트 가독성 확보. 텍스트/네비는 항상 이 오버레이 위(밝은색).

---

## 4. 컴포넌트 스니펫 (복붙용)

### 4-1. HUD 이어브로우 배지
```html
<span class="hero-eyebrow">HWASEONG PALANTIR SYSTEM</span>
```
```css
.hero-eyebrow {
  display: inline-block; font-size: 12.5px; font-weight: 700; letter-spacing: 2.5px;
  color: var(--hud-cyan);
  background: rgba(56,189,248,.12);
  border: 1px solid rgba(56,189,248,.3);
  border-radius: 999px; padding: 7px 18px; margin-bottom: 22px;
}
```

### 4-2. 그라디언트 대형 제목
```css
.hero-h1 {
  font-family: "Paperlogy", var(--font-fallback);
  font-size: 52px; font-weight: 900; line-height: 1.12; letter-spacing: -1px;
  width: fit-content;
  background: linear-gradient(135deg, #ffffff 0%, #c9e2ff 45%, #7bb8ff 100%);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent; color: transparent;
}
.hero-sub { font-size: 17px; font-weight: 500; color: rgba(200,220,240,.85); }
```

### 4-3. HUD 네비 링크 / 아이콘 버튼 / 구분선 / 아웃라인 버튼
```css
.hdr-link { position: relative; font-size: 16px; color: rgba(255,255,255,.82); text-decoration: none; transition: color .2s; }
.hdr-link:hover, .hdr-link.is-current { color: var(--hud-bright); }
.hdr-link.is-current { font-weight: 600; }
.hdr-link.is-current::after {            /* 현재 페이지 밑줄(발광) */
  content: ""; position: absolute; left: 0; right: 0; bottom: -6px; height: 2px;
  background: var(--hud-cyan); box-shadow: 0 0 8px rgba(56,189,248,.8);
}
.hdr-iconbtn { width: 36px; height: 36px; border-radius: 8px; display: inline-flex;
  align-items: center; justify-content: center; background: transparent; border: none;
  cursor: pointer; color: var(--hud-cyan); transition: background .2s; }
.hdr-iconbtn:hover { background: rgba(56,189,248,.16); }
.hdr-divider { width: 1px; height: 20px; background: rgba(56,189,248,.35); }
.hdr-dashboard-btn {                     /* 아웃라인 + inset glow */
  display: inline-flex; align-items: center; gap: 6px; font-size: 15px;
  color: var(--hud-cyan); text-decoration: none;
  border: 1px solid rgba(56,189,248,.5); border-radius: 8px; padding: 6px 14px;
  box-shadow: inset 0 0 8px rgba(56,189,248,.1); transition: all .2s;
}
.hdr-dashboard-btn:hover { color: var(--hud-bright); border-color: rgba(56,189,248,.9); box-shadow: 0 0 18px rgba(56,189,248,.35); }
```

### 4-4. 읽기 진행선 (사이언 발광)
```css
.hdr-progress { position: absolute; left: 0; bottom: 0; height: 2px; width: 0%;
  background: var(--hud-cyan); box-shadow: 0 0 8px rgba(56,189,248,.6); transition: width .1s linear; }
```
JS: 스크롤 비율 = `scrollY / (scrollHeight - innerHeight)`, **rAF로 throttle**.

### 4-5. 맨 위로 FAB
```css
.scroll-top-fab { position: fixed; right: 24px; bottom: 24px; width: 52px; height: 52px;
  border-radius: 50%; background: var(--hud-navy); border: 1px solid rgba(56,189,248,.6);
  box-shadow: 0 0 20px rgba(56,189,248,.3); color: var(--hud-cyan); cursor: pointer;
  opacity: 0; transform: translateY(8px); transition: opacity .2s, transform .2s; }
.scroll-top-fab.show { opacity: 1; transform: translateY(0); }
```
JS: `scrollY > 300`이면 `.show` 토글 + `pointer-events` 관리.

### 4-6. 드롭다운/검색 패널 (라이트, 우상단 fixed)
```css
.menu-drawer, .hdr-search-panel {
  position: fixed; top: 68px; right: 20px; z-index: 60;
  background: #fff; border: 0.5px solid var(--hdr-line); border-radius: 12px;
  box-shadow: 0 12px 32px rgba(10,22,40,.2); padding: 8px;
}
```

### 4-7. 카드 / 스탯 (대시보드)
```css
.card, .stat, .net-card {
  background: #fff; border: 1px solid #E3EDF7; border-radius: 16px; padding: 20px;
  box-shadow: 0 2px 10px rgba(40,90,160,.05);
  transition: box-shadow .15s, transform .15s, border-color .15s;
}
.card:hover { border-color: #9FC4EE; box-shadow: 0 6px 24px rgba(40,90,160,.12); transform: translateY(-2px); }
```
- 우선순위 배지: 높음 `#D63B1F/#FDEEEA`, 중간 `#B07A0A/#FDF5E2`, 낮음 `#2E3D50/#EFF4F9`.
- 상태 점: 예정 회색, 진행중 주황, 완료 파랑.

---

## 5. 반응형 · 접근성 · 모션

- **최대폭** 컨테이너 `--hdr-maxw`(1190px), 좌우 패딩 데스크톱 28px / 모바일 16~18px.
- **모바일(<768px)**: 큰 제목 축소(52→34px), 방문자 통계 숨김, 대시보드 버튼 텍스트 숨기고 아이콘만, gap 축소. 햄버거로 메뉴 접근.
- **접근성**:
  - 아이콘 전용 버튼 `aria-label` 필수, 장식 아이콘 `aria-hidden="true"`.
  - 네비는 `<nav aria-label="...">`, 현재 링크 `aria-current="page"`.
  - **포커스 링 지우지 말 것** — `:focus-visible { outline: 2px solid var(--hud-cyan); outline-offset: 2px; }`.
- **모션**: 전환 0.2s ease. `@media (prefers-reduced-motion: reduce)`에서 모든 transition 제거.

---

## 6. 적용 체크리스트

- [ ] 색은 `--hud-*` / `--hdr-*` 변수 사용 (하드코딩 금지)
- [ ] 다크 배경 위 텍스트는 밝은색 + 필요 시 오버레이 어둡기 상향
- [ ] 큰 제목은 그라디언트 텍스트 + Paperlogy, 본문은 Pretendard
- [ ] 강조 요소에 사이언 발광(box-shadow/text-shadow) 절제 있게
- [ ] 스크롤 계산·잦은 이벤트는 rAF throttle
- [ ] 아이콘 버튼 aria-label / 장식 aria-hidden / 포커스 링 유지
- [ ] 모바일 축소 규칙 + reduced-motion 처리

---

## 7. 파일 위치 (2026-07-25 기준)

| 대상 | 파일 | 헤더/히어로 구현 |
|------|------|-----------------|
| 블로그 | `index.html` `<style>` + `js/header.js` | `.blog-hero`, `.bh-nav`, `.hero-eyebrow/.hero-h1/.hero-sub` |
| 대시보드 | `dashboard.html` `<style>` | `.hero`, `.hero-eyebrow`, `.hero h1` |

두 파일의 히어로 CSS가 이 문서의 기준 구현이다. 값이 바뀌면 이 문서도 갱신할 것.
