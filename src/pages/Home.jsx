import React, { useState } from "react";
import {
  FaUserPlus,
  FaListUl,
  FaUserMd,
  FaArrowLeft,
  FaCalendarAlt,
  FaUserCheck,
  FaHistory,
  FaIdCard,
  FaCar,
  FaRoute,
  FaUsers,
  
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";

import ListaDoctores from "./ListaDoctores.jsx";
import PacienteForm from "./PacienteForm.jsx";
import AgendarViaje from "./AgendarViaje.jsx";
import MisViajes from "./MisViajes.jsx";

function Home() {
  const [activeTab, setActiveTab] = useState("inicio");
  const navigate = useNavigate();

  const BG_URL =
    "https://images.pexels.com/photos/1386649/pexels-photo-1386649.jpeg";

  // Estilos comunes de las cards
  const cardBaseStyle = {
    cursor: "pointer",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  };

  // funciones hover reutilizables
  const handleMouseEnter = (e) => {
    e.currentTarget.style.transform = "translateY(-3px)";
    e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.3)";
  };
  const handleMouseLeave = (e) => {
    e.currentTarget.style.transform = "translateY(0)";
    e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate("/"); // volver al login de pasajero
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
      alert("No se pudo cerrar sesión. Intenta de nuevo.");
    }
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        position: "relative",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Fondo */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${BG_URL})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          zIndex: -1,
          filter: "brightness(0.65)",
        }}
      />

      {/* Botón de logout arriba a la derecha */}
      <div
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          zIndex: 10,
        }}
      >
        <button
          onClick={handleLogout}
          className="btn btn-sm btn-outline-light"
          style={{
            padding: "6px 12px",
            borderRadius: 20,
            fontSize: 14,
            backdropFilter: "blur(4px)",
            backgroundColor: "rgba(0,0,0,0.3)",
          }}
        >
          Cerrar sesión
        </button>
      </div>

      <main
        style={{
          flex: 1,
          display: "grid",
          placeItems: "center",
          padding: "32px 20px",
        }}
      >
        {activeTab === "inicio" && (
          <div style={{ textAlign: "center", width: "100%" }}>
            <h1
              className="mb-4"
              style={{
                fontSize: "2.2rem",
                textShadow: "2px 2px 4px rgba(0,0,0,0.7)",
              }}
            >
              CarPool
            </h1>
            <div className="container">
              <div className="row justify-content-center g-4">
                {/* Card para registrar datos personales */}
                <div className="col-md-3">
                  <div
                    className="card text-center h-100 shadow-lg"
                    style={cardBaseStyle}
                    onClick={() => setActiveTab("pacientes")}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div className="card-body">
                      <FaIdCard size={40} className="mb-3 text-primary" />
                      <h5 className="card-title">
                        Registrar Datos Personales
                      </h5>
                    </div>
                  </div>
                </div>

                {/* Card para agendar viaje */}
                <div className="col-md-3">
                  <div
                    className="card text-center h-100 shadow-lg"
                    style={cardBaseStyle}
                    onClick={() => setActiveTab("agendar")}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div className="card-body">
                      <FaCar size={40} className="mb-3 text-success" />
                      <h5 className="card-title">Agendar Viaje</h5>
                    </div>
                  </div>
                </div>

                {/* Card: Mi viaje programado */}
                <div className="col-md-3">
                  <div
                    className="card text-center h-100 shadow-lg"
                    style={cardBaseStyle}
                    onClick={() => setActiveTab("misViajes")}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div className="card-body">
                      <FaRoute size={40} className="mb-3 text-warning" />
                      <h5 className="card-title">Mi viaje programado</h5>
                    </div>
                  </div>
                </div>

                {/* Card Lista Conductores */}
                <div className="col-md-3">
                  <div
                    className="card text-center h-100 shadow-lg"
                    style={cardBaseStyle}
                    onClick={() => setActiveTab("listaDoctores")}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div className="card-body">
                     <FaUsers size={40} className="mb-3 text-dark" />
                      <h5 className="card-title">Lista Conductores</h5>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* volver al menu principal */}
        {activeTab !== "inicio" && (
          <div style={{ width: "100%" }}>
            <button
              className="btn btn-secondary mb-3"
              onClick={() => setActiveTab("inicio")}
            >
              <FaArrowLeft className="me-2" />
              Regresar al menú
            </button>

            {activeTab === "pacientes" && <PacienteForm />}

            {activeTab === "listaPacientes" && (
              <ListaPacientes setActiveTab={setActiveTab} />
            )}

            {activeTab === "listaDoctores" && <ListaDoctores />}

            {activeTab === "agendar" && <AgendarViaje />}

            {activeTab === "atender" && <AtenderPaciente />}

            {activeTab === "historial" && <HistorialAtendidos />}

            {activeTab === "misViajes" && <MisViajes />}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          padding: 16,
          textAlign: "center",
          opacity: 0.85,
          fontSize: 14,
          backgroundColor: "rgba(0,0,0,0.6)",
        }}
      >
        © {new Date().getFullYear()} CarPool
      </footer>
    </div>
  );
}

export default Home;
