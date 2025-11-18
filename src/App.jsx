import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home.jsx";
import ListaConductores from "./pages/ListaDoctores.jsx";
import Login from "./pages/Login.jsx";
import LoginConductor from "./pages/LoginConductor.jsx"; // 👈 nuevo
import PanelConductor from "./pages/PanelConductor.jsx"; // 👈 luego lo armas, puede ser un placeholder

function App() {
  return (
    <Router>
      <Routes>
        {/* Login pasajero como página inicial */}
        <Route path="/" element={<Login role="pasajero" />} />

        {/* Home pasajero después de iniciar sesión */}
        <Route path="/home" element={<Home />} />

        {/* Vista de lista de conductores (pública o como la uses) */}
        <Route path="/conductores" element={<ListaConductores />} />

        {/* Login específico para conductores */}
        <Route path="/login-conductor" element={<LoginConductor />} />

        {/* Panel conductor (home de conductor) */}
        <Route
          path="/panel-conductor"
          element={<PanelConductor />}
        />
      </Routes>
    </Router>
  );
}

export default App;
