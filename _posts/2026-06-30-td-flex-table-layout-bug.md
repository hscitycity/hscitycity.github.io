---
title: "표(td)에 display:flex를 걸면 안 되는 이유 — WBS 대시보드 컬럼 정렬 버그"
date: 2026-06-30 12:00:00 +0900
tags: [html, css, table, debugging]
excerpt: "겉보기엔 멀쩡한 HTML인데 컬럼이 자꾸 한 칸씩 밀려 보이는 버그를 잡은 기록."
---

## 배경

엑셀 WBS 파일을 받아서, 비밀번호로 잠그고 풀 수 있는 편집 가능한 HTML 대시보드를 만들고 있었다. 작업 행마다 "대분류"·"기능분류" 칸을 회색 텍스트로 미리 채워두고, 드래그 핸들 아이콘과 텍스트를 나란히 보여주려고 그 칸(`<td>`)에 `display:flex`를 줬다.

## 시도

처음엔 컬럼이 밀려 보이는 걸 **데이터 문제**라고 생각했다.

1. 저장된(localStorage) 옛날 데이터가 깨졌을 거라 보고 storage key 버전을 올려서 캐시를 무효화함 → 안 고쳐짐
2. 컬럼 너비 드래그 기능을 넣은 뒤 컬럼 개수가 바뀌면서 저장된 너비 인덱스가 밀렸을 거라 보고 그 key도 버전업 → 안 고쳐짐
3. 사용자가 "그래도 안 된다"고 해서, 그제서야 추측을 멈추고 **playwright로 실제 브라우저에 렌더링해서 각 `<td>`의 `getBoundingClientRect()`를 직접 찍어봄**

찍어보니 두 번째 칸(`기능분류`)의 좌표가 첫 번째 칸 바로 **아래**에 있었다 — 가로로 나란히 있어야 할 두 칸이 세로로 쌓여 있었다. `outerHTML`은 멀쩡했다(`<td>` 17개, 순서도 정상). HTML 구조는 문제가 없는데 레이아웃만 깨진 상황.

## 결과

원인은 CSS 한 줄이었다.

```css
/* 문제: <td> 자체에 flex를 걸면 브라우저가 더 이상 "표 칸"으로 취급하지 않는다 */
.readout-cell{ display:flex; align-items:center; gap:4px; }
```

`<td>`에 `display:flex`를 주면 그 셀의 box type이 `table-cell`에서 벗어나버린다. 인접한 두 칸이 똑같이 `flex`였기 때문에, 브라우저가 둘을 "테이블 칸이 아닌 블록 둘"로 보고 세로로 쌓아버린 것이다. 그룹 헤더 행은 옆 칸이 `flex`가 아니어서 우연히 안 깨져 보였을 뿐이었다.

```css
/* 수정: td는 그대로 두고, 내용물만 감싸는 안쪽 요소에 flex를 준다 */
.readout-cell{ padding:6px 8px; /* ...table-cell 기본 동작 유지... */ }
.readout-inner{ display:inline-flex; align-items:center; gap:4px; }
```

```html
<td class="readout-cell">
  <span class="readout-inner">
    <span class="drag-handle">⠿</span>
    <span class="readout-text">...</span>
  </span>
</td>
```

## 교훈

- **표 레이아웃이 이상하면 제일 먼저 `<td>`/`<tr>`에 `display` 오버라이드가 있는지 확인할 것.** `flex`, `grid`, `block` 전부 테이블 레이아웃을 깨뜨릴 수 있다.
- **추측으로 캐시·데이터를 의심하기 전에, 먼저 실제 렌더링 결과를 찍어볼 것.** `outerHTML`만 봐서는 못 잡는다 — 구조(HTML)는 멀쩡한데 표시(레이아웃)만 깨지는 버그였다. `getBoundingClientRect()` 한 번이면 바로 보였을 걸, 두 번의 잘못된 가설(스토리지 캐시)에 시간을 썼다.
- 같은 증상이 반복되면("아직도 안 됐다") 같은 종류의 가설을 다시 시도하지 말고, 가설 자체를 의심해야 한다.
