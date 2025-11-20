import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home.jsx";
import ListaConductores from "./pages/ListaDoctores.jsx";
import Login from "./pages/Login.jsx";
import LoginConductor from "./pages/LoginConductor.jsx";
import PanelConductor from "./pages/PanelConductor.jsx";
import LoginAdmin from "./pages/LoginAdmin.jsx";
import PanelAdmin from "./pages/PanelAdmin.jsx";

function App() {
  return (
    <Router>
      <Routes>
        {/* Login pasajero como página inicial */}
        <Route path="/" element={<Login role="pasajero" />} />

        {/* Home pasajero */}
        <Route path="/home" element={<Home />} />

        {/* Vista pública de conductores */}
        <Route path="/conductores" element={<ListaConductores />} />

        {/* Login y panel de conductores */}
        <Route path="/login-conductor" element={<LoginConductor />} />
        <Route path="/panel-conductor" element={<PanelConductor />} />

        {/* Login y panel administrador */}
        <Route path="/login-admin" element={<LoginAdmin />} />
        <Route path="/panel-admin" element={<PanelAdmin />} />
      </Routes>
    </Router>
  );
}

export default App;
