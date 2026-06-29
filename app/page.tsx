import Navbar from "@/app/components/layout/Navbar";
import ProductCard from "@/app/components/ecommerce/ProductCard";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

async function getProducts() {
  try {
    const response = await fetch(`${BASE_URL}/api/products`, {
      cache: "no-store",
    });

    if (!response.ok) return [];
    return response.json();
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return [];
  }
}

async function getCurrentUser() {
  try {
    const cookieStore = await cookies();

    const response = await fetch(`${BASE_URL}/api/authentication/me`, {
      headers: {
        Cookie: cookieStore.toString(),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    console.error("Failed to fetch user:", error);
    return null;
  }
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
              We had a little less than a week to complete this web app, you can
              browse the products below and add them to your cart. <br />
              If you wish to test the admin dashboard where you can manage
              products and view orders. Use these exact credentials: <br />
              Email: admin@meraki.com <br />
              Password: SuperSecureHashedPassword123! <br />
              (Contact 2_na on discord for any issues with the web app)
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

                  <a href="/admin/orders">
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
            </div>

            <div className="grid grid-products">
              {products.map((product: any) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isLoggedIn={isLoggedIn}
                  userRole={user?.role?.name}
                />
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
