// 읽기 전용(Read statistics) 권한만 부여된 토큰 — 대시보드가 이미 Public이라 노출 위험이 낮음
const GOATCOUNTER_SITE = "https://hscitycity.goatcounter.com";
const GOATCOUNTER_TOKEN =
  "172jrzyl9c6wiwt64o5nw8gvw1m51emi8fgh22157b7v2nk4bwg";

async function fetchGoatCounterTotal(start, end) {
  const url = `${GOATCOUNTER_SITE}/api/v0/stats/total?start=${encodeURIComponent(
    start.toISOString()
  )}&end=${encodeURIComponent(end.toISOString())}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GOATCOUNTER_TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`GoatCounter API 요청 실패: ${res.status}`);
  }

  const data = await res.json();
  return data.total;
}

async function renderVisitorStats() {
  const now = new Date();
  const dayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));

  const dailyEl = document.getElementById("stat-daily");
  const monthlyEl = document.getElementById("stat-monthly");
  const yearlyEl = document.getElementById("stat-yearly");

  try {
    const [daily, monthly, yearly] = await Promise.all([
      fetchGoatCounterTotal(dayStart, now),
      fetchGoatCounterTotal(monthStart, now),
      fetchGoatCounterTotal(yearStart, now),
    ]);

    if (dailyEl) dailyEl.textContent = daily;
    if (monthlyEl) monthlyEl.textContent = monthly;
    if (yearlyEl) yearlyEl.textContent = yearly;
  } catch (err) {
    console.error("방문자 통계 로드 실패:", err);
  }
}

document.addEventListener("DOMContentLoaded", renderVisitorStats);
