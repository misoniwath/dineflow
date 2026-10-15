import { useEffect, useState } from "react";

export function useGreeting() {
  // Computed after mount so server and client markup match.
  const [greeting, setGreeting] = useState("Welcome back");
  const [date, setDate] = useState("");

  useEffect(() => {
    const now = new Date();
    const h = now.getHours();
    setGreeting(
      h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening",
    );
    setDate(
      now.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    );
  }, []);
  return { greeting, date };
}
