import { Routes, Route } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Enroll from "./pages/Enroll";
import Verify from "./pages/Verify";
import Identify from "./pages/Identify";
import Metrics from "./pages/Metrics";
import Assistant from "./pages/Assistant";

export default function App() {
  return (
    <AppProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/enroll" element={<Enroll />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/identify" element={<Identify />} />
          <Route path="/metrics" element={<Metrics />} />
          <Route path="/assistant" element={<Assistant />} />
        </Route>
      </Routes>
    </AppProvider>
  );
}
