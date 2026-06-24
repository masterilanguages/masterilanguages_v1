export default function PortalDashboard() {
  return (
    <div>
      <div className="mb-8">
        <p
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: "#93C5FD", fontFamily: "Jost, Inter, sans-serif" }}
        >
          Student Portal
        </p>
        <h1
          className="mt-1 text-3xl font-extrabold text-white"
          style={{ fontFamily: "Jost, Inter, sans-serif" }}
        >
          Welcome back.
        </h1>
        <p className="mt-2 text-sm" style={{ color: "#64748B" }}>
          Use the navigation above to get started.
        </p>
      </div>
    </div>
  );
}
