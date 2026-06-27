// app/components/admin/AdminStatCard.tsx

import Card from "@/app/components/ui/Card";

interface AdminStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
}

export default function AdminStatCard({
  title,
  value,
  subtitle,
}: AdminStatCardProps) {
  return (
    <Card>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: "0.9rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {title}
        </p>

        <h2
          style={{
            margin: 0,
          }}
        >
          {value}
        </h2>

        {subtitle && (
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.9rem",
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </Card>
  );
}
