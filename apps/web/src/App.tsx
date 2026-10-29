import { Nav } from "./components/Nav";
import { AppDataProvider, useAppData } from "./data/AppData";
import { useHashRoute } from "./hooks/useHashRoute";
import { useReminderTimer } from "./hooks/useReminderTimer";
import { useTheme } from "./hooks/useTheme";
import { Calendar } from "./screens/Calendar";
import { Settings } from "./screens/Settings";
import { Today } from "./screens/Today";

export function App() {
  return (
    <AppDataProvider>
      <Shell />
    </AppDataProvider>
  );
}

function Shell() {
  const data = useAppData();
  const route = useHashRoute();
  const mode = useTheme(data.settings.theme);
  const { banner, dismissBanner } = useReminderTimer();

  return (
    <div className="page">
      <Nav route={route} mode={mode} onToggleTheme={() => void data.saveSettings({ ...data.settings, theme: mode === "dark" ? "light" : "dark" })} />
      {banner && (
        <div className="banner" role="status">
          <span>
            <span className="warn">!!</span> {banner}
          </span>
          <button type="button" className="btn" onClick={dismissBanner}>
            [ ok ]
          </button>
        </div>
      )}
      {data.error && (
        <div className="banner" role="alert">
          <span>
            <span className="warn">error:</span> {data.error}
          </span>
          <button type="button" className="btn" onClick={data.clearError}>
            [ dismiss ]
          </button>
        </div>
      )}
      {route === "today" && <Today />}
      {route === "calendar" && <Calendar />}
      {route === "settings" && <Settings />}
    </div>
  );
}
