import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ProfileActions from "@/app/components/profile/ProfileActions";
import BackButton from "@/app/components/navigation/BackButton";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

async function getCurrentUser() {
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
}

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth");
  }

  return (
    <main className="section">
      <div className="container">
        <BackButton href="/" label="Back to Home" />
        <div className="card">
          <h1>Profile</h1>

          <div className="mt-3">
            <h3>Email Address</h3>
            <p>{user.email}</p>
          </div>

          <div className="mt-3">
            <h3>Account Type</h3>
            <p>{user.role.name}</p>
          </div>
          <ProfileActions />
        </div>
      </div>
    </main>
  );
}
