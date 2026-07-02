import Link from "next/link";

interface NavbarProps {
  user: {
    id: string;
    email: string;
    role: {
      id: number;
      name: string;
    };
  } | null;
}

export default function Navbar({ user }: NavbarProps) {
  const isAdmin = user?.role.name === "ADMIN";
  const isUser = user?.role.name === "USER";

  return (
    <header className="navbar">
      <div className="container flex-between">
        <Link href="/">
          <h2 className="logo">Vantgarde Designers</h2>
        </Link>

        <nav className="nav-links">
          <Link href="/" className="nav-link">
            Home
          </Link>

          {!user && (
            <Link href="/auth" className="nav-link">
              Login
            </Link>
          )}

          {user && (
            <>
              {isUser && (
                <Link href="/cart" className="nav-link">
                  Cart
                </Link>
              )}
              {isUser && (
                <Link href="/orders" className="nav-link">
                  Orders
                </Link>
              )}

              {isAdmin && (
                <Link href="/admin" className="nav-link">
                  Admin
                </Link>
              )}

              <Link href="/profile" className="nav-link">
                Profile
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
