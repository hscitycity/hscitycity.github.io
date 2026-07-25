// header.js — 상단 헤더 동작
// - sticky 축소(스크롤 80px 초과 시 52px + 현재 글 제목 표시 + 메뉴 숨김)
// - 읽기 진행선(문서 높이 기준, rAF throttle)
// - 검색 아이콘 토글(기존 search() 재사용)
// - 현재 페이지 표시(aria-current + is-current 밑줄)
// - 맨 위로 버튼
// 라우팅/데이터 로직은 render.js의 전역 함수를 재사용한다(새로 만들지 않음).

(function () {
  const header = document.getElementById("site-header");
  if (!header) return;

  const progressEl = document.getElementById("hdr-progress");
  const postTitleEl = document.getElementById("hdr-post-title");
  const navAbout = document.getElementById("nav-about");
  const navBlog = document.getElementById("nav-blog");
  const searchBtn = document.getElementById("hdr-search-btn");
  const searchPanel = document.getElementById("hdr-search-panel");
  const searchInput = document.getElementById("search-input");
  const searchGo = document.getElementById("hdr-search-go");
  const topBtn = document.getElementById("hdr-top-btn");

  const prefersReduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // ---------- 현재 페이지 판별 ----------
  function currentView() {
    const p = new URLSearchParams(location.search);
    if (p.has("post")) return "post";
    if (p.get("menu") === "about.md") return "about";
    return "blog"; // 기본값 = 개발일지 목록
  }

  function currentPostTitle() {
    const p = new URLSearchParams(location.search);
    const post = p.get("post");
    if (!post) return "";
    try {
      const name = decodeURIComponent(post).replaceAll("+", " ");
      const info =
        typeof extractFileInfo === "function" ? extractFileInfo(name) : null;
      return info && info.title ? info.title : "";
    } catch (e) {
      return "";
    }
  }

  function syncCurrent() {
    const view = currentView();
    [navAbout, navBlog].forEach((a) => {
      if (!a) return;
      a.classList.remove("is-current");
      a.removeAttribute("aria-current");
    });
    const active =
      view === "about" ? navAbout : view === "blog" ? navBlog : null;
    if (active) {
      active.classList.add("is-current");
      active.setAttribute("aria-current", "page");
    }
    // 축소 헤더에 표시할 현재 글 제목
    const title = currentPostTitle();
    if (postTitleEl) {
      postTitleEl.textContent = title;
      postTitleEl.dataset.hasTitle = title ? "true" : "false";
    }
  }

  // ---------- 스크롤: 축소 + 진행선 (rAF throttle) ----------
  let ticking = false;
  function updateOnScroll() {
    const y =
      window.scrollY ||
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      0;
    header.classList.toggle("is-shrunk", y > 80);

    const docH =
      document.documentElement.scrollHeight - window.innerHeight;
    const ratio = docH > 0 ? Math.min(1, Math.max(0, y / docH)) : 0;
    if (progressEl) progressEl.style.width = (ratio * 100).toFixed(2) + "%";

    ticking = false;
  }
  function onScroll() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(updateOnScroll);
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });

  // ---------- 메뉴 링크: 기존 라우팅 재사용 ----------
  if (navBlog) {
    navBlog.addEventListener("click", (e) => {
      e.preventDefault();
      if (
        typeof blogList !== "undefined" &&
        blogList.length === 0 &&
        typeof initDataBlogList === "function"
      ) {
        initDataBlogList().then(() => {
          if (typeof renderBlogList === "function") renderBlogList();
        });
      } else if (typeof renderBlogList === "function") {
        renderBlogList();
      }
      if (typeof origin !== "undefined") {
        const u = new URL(origin);
        u.searchParams.set("menu", "blog.md");
        history.pushState({}, "", u);
      }
      window.scrollTo({ top: 0 });
      syncCurrent();
    });
  }

  if (navAbout) {
    navAbout.addEventListener("click", (e) => {
      e.preventDefault();
      if (typeof renderOtherContents === "function") {
        renderOtherContents("about.md");
      }
      if (typeof origin !== "undefined") {
        const u = new URL(origin);
        u.searchParams.set("menu", "about.md");
        history.pushState({}, "", u);
      }
      window.scrollTo({ top: 0 });
      syncCurrent();
    });
  }

  // ---------- 검색 토글 (기존 search() 재사용) ----------
  function setSearchOpen(open) {
    if (!searchPanel || !searchBtn) return;
    if (open) {
      searchPanel.removeAttribute("hidden");
      searchBtn.setAttribute("aria-expanded", "true");
      if (searchInput) searchInput.focus();
    } else {
      searchPanel.setAttribute("hidden", "");
      searchBtn.setAttribute("aria-expanded", "false");
    }
  }
  if (searchBtn) {
    searchBtn.addEventListener("click", () => {
      setSearchOpen(searchPanel.hasAttribute("hidden"));
    });
  }
  function runSearch() {
    if (typeof search === "function") search();
    setSearchOpen(false);
  }
  if (searchInput) {
    searchInput.addEventListener("keyup", (e) => {
      if (e.key === "Enter") runSearch();
    });
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setSearchOpen(false);
    });
  }
  if (searchGo) searchGo.addEventListener("click", runSearch);

  // ---------- 맨 위로 ----------
  if (topBtn) {
    topBtn.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: prefersReduced ? "auto" : "smooth",
      });
    });
  }

  // ---------- 상태 동기화 ----------
  window.addEventListener("popstate", syncCurrent);
  // 워드마크(홈) 클릭 시에도 현재 페이지 갱신 (URLparsing이 onclick을 별도로 붙임)
  const wordmark = document.getElementById("blog-title");
  if (wordmark) {
    wordmark.addEventListener("click", () => setTimeout(syncCurrent, 0));
    wordmark.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        wordmark.click();
      }
    });
  }

  syncCurrent();
  updateOnScroll();
})();
