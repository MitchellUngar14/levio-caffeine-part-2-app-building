import { useEffect, useState } from "react";

export type Route = "today" | "calendar" | "settings";

function parse(): Route {
  const h = window.location.hash.replace(/^#\/?/, "");
  return h === "calendar" || h === "settings" ? h : "today";
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(parse);
  useEffect(() => {
    const onChange = () => setRoute(parse());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}
