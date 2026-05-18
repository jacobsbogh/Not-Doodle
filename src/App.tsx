import { BookClubApp } from "./components/BookClubApp";
import { LoginScreen } from "./components/LoginScreen";
import { MissingConfig } from "./components/MissingConfig";
import { Shell } from "./components/Shell";
import { missingFirebaseConfig } from "./firebase";
import { useAuth } from "./hooks/useAuth";

export function App() {
  if (missingFirebaseConfig.length > 0) {
    return <MissingConfig />;
  }

  return <ConfiguredApp />;
}

function ConfiguredApp() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return <Shell>Loading...</Shell>;
  }

  if (!user) {
    return <LoginScreen />;
  }

  return <BookClubApp />;
}
