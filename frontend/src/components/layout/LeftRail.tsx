import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

const recentQueries = [
  { query: "Q3 revenue by region", time: "2m ago", rows: "340 rows" },
  { query: "Churn cohort, last 90d", time: "1h ago", rows: "82 rows" },
  { query: "Top SKUs by margin", time: "Yesterday", rows: "55 rows" },
  { query: "Support ticket volume", time: "3d ago", rows: "1.2k rows" },
];

export function LeftRail() {
  const location = useLocation();
  const { user } = useAuthStore();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="hidden lg:flex flex-col gap-2.5 pt-1.5">
      <span className="font-mono text-[11px] tracking-widest text-ink-faint uppercase mb-1.5">
        Recent
      </span>
      {recentQueries.map((item, i) => (
        <Link
          key={item.query}
          to="/llm"
          className="rail-item"
          style={{
            opacity: 1 - i * 0.15,
            transform: `translateX(${i * 2}px) scale(${1 - i * 0.015})`,
          }}
        >
          <span className="t">{item.query}</span>
          <span className="m">
            {item.time} · {item.rows}
          </span>
        </Link>
      ))}
      {user?.role === "admin" && (
        <Link
          to="/admin"
          className="rail-item mt-3"
          data-active={isActive("/admin")}
        >
          <span className="t">Admin Panel</span>
          <span className="m">Manage users</span>
        </Link>
      )}
    </aside>
  );
}
