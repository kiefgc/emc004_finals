import Navbar from "@/app/components/layout/Navbar";
import ProductCard from "@/app/components/ecommerce/ProductCard";
import { cookies } from "next/headers";

const cookieStore = await cookies();

const response = await fetch("http://localhost:3000/api/authentication/me", {
  headers: {
    Cookie: cookieStore.toString(),
  },
  cache: "no-store",
});

async function getProducts() {
  const response = await fetch("http://localhost:3000/api/products", {
    cache: "no-store",
  });

  if (!response.ok) return [];

  return response.json();
}

async function getCurrentUser() {
  const cookieStore = await cookies();

  const response = await fetch("http://localhost:3000/api/authentication/me", {
    headers: {
      Cookie: cookieStore.toString(),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export default async function HomePage() {
  const [products, user] = await Promise.all([getProducts(), getCurrentUser()]);

  const isLoggedIn = !!user;
  const isAdmin = user?.role?.name === "ADMIN";

  return (
    <>
      <Navbar user={user} />

      <main>
        <section className="hero-section">
          <div className="container hero-content">
            <h1 className="hero-title">Placeholder E-Commerce Site</h1>

            <p className="hero-subtitle">
              Discover modern products and seamless shopping experiences powered
              by Next.js and PostgreSQL.
            </p>

            <div className="hero-actions">
              {!isLoggedIn && (
                <>
                  <a href="#products">
                    <button className="btn btn-primary">Browse Products</button>
                  </a>

                  <a href="/auth">
                    <button className="btn btn-secondary">Login</button>
                  </a>
                </>
              )}

              {isLoggedIn && !isAdmin && (
                <>
                  <a href="#products">
                    <button className="btn btn-primary">Browse Products</button>
                  </a>

                  <a href="/cart">
                    <button className="btn btn-secondary">View Cart</button>
                  </a>
                </>
              )}

              {isAdmin && (
                <>
                  <a href="/admin">
                    <button className="btn btn-primary">Manage Products</button>
                  </a>

                  <a href="/orders">
                    <button className="btn btn-secondary">View Orders</button>
                  </a>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="section" id="products">
          <div className="container">
            <div className="section-header">
              <h2>Featured Products</h2>

              <p>Products currently available in inventory.</p>
            </div>

            <div className="grid grid-products">
              {products.map((product: any) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isLoggedIn={isLoggedIn}
                />
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
