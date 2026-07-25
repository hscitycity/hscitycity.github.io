// header.js — 헤더 동작
// - 상단바: 방문자 통계 + 햄버거(항상 표시되는 메뉴 토글) + 읽기 진행선(rAF)
// - 이미지 하단 오버레이 메뉴바: 소개/개발일지/검색/대시보드
// - 메뉴 클릭은 render.js의 라우팅 함수를 재사용(renderBlogList / renderOtherContents / search)
// - 현재 페이지 표시(aria-current + is-current 밑줄)

(function () {
  const progressEl = document.getElementById("hdr-progress");
  const hamburger = document.getElementById("hamburger-btn");
  const drawer = document.getElementById("menu-drawer");
  const searchBtn = document.getElementById("hdr-search-btn");
  const searchPanel = document.getElementById("hdr-search-panel");
  const searchInput = document.getElementById("search-input");
  const searchGo = document.getElementById("hdr-search-go");
  const wordmark = document.getElementById("blog-title");
  const scrollTopFab = document.getElementById("scroll-top-fab");

  const prefersReduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // ---------- 상단바 높이 → --topbar-h (sticky 메뉴바가 그 아래에 붙도록) ----------
  const topBar = document.getElementById("top-bar");
  function setTopbarH() {
    if (!topBar) return;
    document.documentElement.style.setProperty(
      "--topbar-h",
      topBar.offsetHeight + "px"
    );
  }
  setTopbarH();
  window.addEventListener("resize", setTopbarH);
  window.addEventListener("load", setTopbarH);

  // ---------- 현재 페이지 표시 ----------
  function currentView() {
    const p = new URLSearchParams(location.search);
    if (p.has("post")) return "post";
    if (p.get("menu") === "about.md") return "about";
    return "blog";
  }
  function syncCurrent() {
    const view = currentView();
    document.querySelectorAll(".hero-menubar .hdr-link").forEach((a) => {
      const nav = a.getAttribute("data-nav");
      const on =
        (view === "about" && nav === "about") ||
        (view === "blog" && nav === "blog");
      a.classList.toggle("is-current", on);
      if (on) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }

  // ---------- 읽기 진행선 (rAF throttle) ----------
  let ticking = false;
  function updateProgress() {
    const y =
      window.scrollY ||
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      0;
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = docH > 0 ? Math.min(1, Math.max(0, y / docH)) : 0;
    if (progressEl) progressEl.style.width = (ratio * 100).toFixed(2) + "%";

    // 맨 위로 버튼: 300px 넘게 스크롤하면 노출
    if (scrollTopFab) {
      const on = y > 300;
      if (on && scrollTopFab.hidden) scrollTopFab.hidden = false;
      scrollTopFab.classList.toggle("show", on);
      scrollTopFab.style.pointerEvents = on ? "auto" : "none";
    }
    ticking = false;
  }
  function onScroll() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(updateProgress);
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });

  // ---------- 열림 상태 관리(드로어/검색은 상호 배타) ----------
  function setDrawer(open) {
    if (!drawer || !hamburger) return;
    if (open) {
      setSearch(false);
      drawer.removeAttribute("hidden");
      hamburger.setAttribute("aria-expanded", "true");
      hamburger.setAttribute("aria-label", "메뉴 닫기");
    } else {
      drawer.setAttribute("hidden", "");
      hamburger.setAttribute("aria-expanded", "false");
      hamburger.setAttribute("aria-label", "메뉴 열기");
    }
  }
  function setSearch(open) {
    if (!searchPanel) return;
    if (open) {
      setDrawer(false);
      searchPanel.removeAttribute("hidden");
      if (searchBtn) searchBtn.setAttribute("aria-expanded", "true");
      if (searchInput) searchInput.focus();
    } else {
      searchPanel.setAttribute("hidden", "");
      if (searchBtn) searchBtn.setAttribute("aria-expanded", "false");
    }
  }
  function isDrawerOpen() {
    return drawer && !drawer.hasAttribute("hidden");
  }
  function isSearchOpen() {
    return searchPanel && !searchPanel.hasAttribute("hidden");
  }

  if (hamburger) {
    hamburger.addEventListener("click", (e) => {
      e.stopPropagation();
      setDrawer(!isDrawerOpen());
    });
  }

  // ---------- 메뉴 동작 위임([data-nav]) ----------
  function handleNav(nav) {
    if (nav === "search") {
      setSearch(!isSearchOpen());
      return;
    }
    if (nav === "blog") {
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
      pushMenu("blog.md");
    } else if (nav === "about") {
      if (typeof renderOtherContents === "function")
        renderOtherContents("about.md");
      pushMenu("about.md");
    }
    setDrawer(false);
    window.scrollTo({ top: 0 });
    syncCurrent();
  }
  function pushMenu(name) {
    if (typeof origin === "undefined") return;
    const u = new URL(origin);
    u.searchParams.set("menu", name);
    history.pushState({}, "", u);
  }
  document.querySelectorAll("[data-nav]").forEach((el) => {
    el.addEventListener("click", (e) => {
      const nav = el.getAttribute("data-nav");
      if (nav === "search") e.stopPropagation();
      e.preventDefault();
      handleNav(nav);
    });
  });

  // ---------- 검색 실행(기존 search() 재사용) ----------
  function runSearch() {
    if (typeof search === "function") search();
    setSearch(false);
  }
  if (searchInput) {
    searchInput.addEventListener("keyup", (e) => {
      if (e.key === "Enter") runSearch();
    });
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setSearch(false);
    });
  }
  if (searchGo) searchGo.addEventListener("click", runSearch);

  // ---------- 바깥 클릭 / Escape 로 닫기 ----------
  document.addEventListener("click", (e) => {
    if (isDrawerOpen() && drawer && !drawer.contains(e.target)) setDrawer(false);
    if (
      isSearchOpen() &&
      searchPanel &&
      !searchPanel.contains(e.target) &&
      searchBtn &&
      !searchBtn.contains(e.target)
    ) {
      setSearch(false);
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      setDrawer(false);
      setSearch(false);
    }
  });

  // ---------- 워드마크(홈) ----------
  if (wordmark) {
    wordmark.addEventListener("click", () => setTimeout(syncCurrent, 0));
    wordmark.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        wordmark.click();
      }
    });
  }

  // ---------- 맨 위로 버튼 클릭 ----------
  if (scrollTopFab) {
    scrollTopFab.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" });
    });
  }

  window.addEventListener("popstate", syncCurrent);
  syncCurrent();
  updateProgress();
})();
