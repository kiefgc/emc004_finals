import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  // Simulates 10 concurrent users ramping up to test system stability
  vus: 10,
  duration: "5s",
};

export default function () {
  // Generates a completely unique email string for every single execution loop
  const uniqueId = Math.floor(Math.random() * 10000000);
  const email = `k6-user-${uniqueId}-${__VU}-${__ITER}@example.com`;

  const url = "http://localhost:3000/api/register";
  const payload = JSON.stringify({
    email: email,
    password: "Password123!",
  });

  const params = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  const res = http.post(url, payload, params);

  // Checks that the database accepted the registration and returned 201
  check(res, {
    "is status 201": (r) => r.status === 201,
  });

  // Small pause to simulate real human behavior (optional, remove to max out stress)
  sleep(0.1);
}
