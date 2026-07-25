const menuButton = document.getElementById("menu-button");
const menu = document.getElementById("menu");

/*
모바일 환경에서 menu, 이 menu는 이벤트 위임으로 최적화하면 불필요한 코드가 많은 함수입니다. 시간상 최적화하지 않고 넘깁니다.
*/
const mobileMenu = document.getElementById("mobileMenu");

window.addEventListener("click", (event) => {
    if (event.target === menuButton) {
        if (mobileMenu.innerHTML === "") {
            mobileMenu.innerHTML = menu.innerHTML;
            const menuItems = mobileMenu.querySelectorAll("a");
            menuItems.forEach((item, index) => {
                item.classList.add(...mobileMenuStyle.split(" "));
                if (index == 0) {
                    item.classList.add("mt-1.5");
                }
                item.style.animation = `slideDown forwards ${index * 0.2}s`;
            });
        } else {
            mobileMenu.innerHTML = "";
        }
    } else if (event.target.parentNode === mobileMenu) {
        // 외부 HTML 페이지(개발관리 대시보드 등)는 기본 동작(같은 탭 이동)을 허용
        if (event.target.dataset.external === "true") {
            mobileMenu.innerHTML = "";
            window.location.href = event.target.getAttribute("href");
            return;
        }

        event.preventDefault();

        // 라벨(innerText)이 아니라 data 속성에 보존된 실제 파일명으로 판별
        const menuFile = event.target.dataset.menuFile;

        if (menuFile === "blog.md") {
            if (blogList.length === 0) {
                // 블로그 리스트 로딩
                initDataBlogList().then(() => {
                    renderBlogList();
                });
            } else {
                renderBlogList();
            }
            // console.log(origin)
            const url = new URL(origin);
            url.searchParams.set("menu", menuFile);
            window.history.pushState({}, "", url);
            mobileMenu.innerHTML = "";
        } else {
            renderOtherContents(menuFile);
            mobileMenu.innerHTML = "";
        }
    } else {
        mobileMenu.innerHTML = "";
    }
});
