interface BadgeProps {
  children: React.ReactNode;
  variant?: "pending" | "confirmed" | "delivered" | "cancelled";
}

export default function Badge({ children, variant = "pending" }: BadgeProps) {
  return <span className={`badge badge-${variant}`}>{children}</span>;
}
