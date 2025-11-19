import React, { useEffect, useMemo, useState } from "react";
import {
  FaArrowLeft,
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
  const [showGuide, setShowGuide] = useState(false);
  const navigate = useNavigate();

  const BG_URL =
    "https://images.pexels.com/photos/1386649/pexels-photo-1386649.jpeg";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem("carpool_home_guide_seen");
    setShowGuide(!seen);
  }, []);

  const cardBaseStyle = useMemo(
    () => ({
      cursor: "pointer",
      transition: "transform 0.2s ease, box-shadow 0.2s ease",
      borderRadius: 18,
      background:
        "linear-gradient(145deg, rgba(15,23,42,0.85), rgba(2,6,23,0.85))",
      color: "#e2e8f0",
      border: "1px solid rgba(148,163,184,0.4)",
      minHeight: 180,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }),
    []
  );

  const actions = useMemo(
    () => [
      {
        key: "pacientes",
        icon: <FaIdCard size={40} className="mb-3 text-primary" />,
        title: "Registrar Datos Personales",
        description: "Completa tu perfil para que los conductores te ubiquen.",
      },
      {
        key: "agendar",
        icon: <FaCar size={40} className="mb-3 text-success" />,
        title: "Agendar Viaje",
        description: "Elige conductor, fecha y horario disponible.",
      },
      {
        key: "misViajes",
        icon: <FaRoute size={40} className="mb-3 text-warning" />,
        title: "Mi viaje programado",
        description: "Consulta tus viajes próximos o pasados.",
      },
      {
        key: "listaDoctores",
        icon: <FaUsers size={40} className="mb-3 text-info" />,
        title: "Lista Conductores",
        description: "Explora conductores y contáctalos por WhatsApp.",
      },
    ],
    []
  );

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
                {actions.map((action) => (
                  <div className="col-12 col-sm-6 col-xl-3" key={action.key}>
                    <div
                      className="card text-center h-100 shadow-lg"
                      style={{
                        ...cardBaseStyle,
                        boxShadow: showGuide
                          ? "0 0 0 2px rgba(34,197,94,0.7)"
                          : undefined,
                      }}
                      onClick={() => setActiveTab(action.key)}
                      onMouseEnter={handleMouseEnter}
                      onMouseLeave={handleMouseLeave}
                    >
                      <div className="card-body d-flex flex-column justify-content-center">
                        {action.icon}
                        <h5 className="card-title mb-2">{action.title}</h5>
                        <p
                          style={{
                            fontSize: 14,
                            opacity: 0.8,
                            minHeight: 48,
                          }}
                        >
                          {action.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {showGuide && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(2,6,23,0.8)",
              backdropFilter: "blur(6px)",
              zIndex: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
          >
            <div
              style={{
                maxWidth: 420,
                width: "100%",
                backgroundColor: "#0f172a",
                borderRadius: 20,
                border: "1px solid rgba(148,163,184,0.4)",
                padding: 24,
                color: "#e2e8f0",
                textAlign: "left",
              }}
            >
              <h4 style={{ marginBottom: 12 }}>Bienvenido a CarPool 👋</h4>
              <p style={{ fontSize: 14, opacity: 0.9 }}>
                Estas tarjetas te guiarán por los pasos básicos:
              </p>
              <ul style={{ fontSize: 14, paddingLeft: 18, lineHeight: 1.6 }}>
                <li>
                  <strong>Registrar Datos:</strong> comparte tu dirección y
                  teléfono.
                </li>
                <li>
                  <strong>Lista conductores:</strong> explora y contacta al
                  conductor ideal.
                </li>
                <li>
                  <strong>Agendar viaje:</strong> elige fecha y horario
                  disponible.
                </li>
                <li>
                  <strong>Mi viaje programado:</strong> revisa o cancela tus
                  reservas.
                </li>
              </ul>
              <button
                className="btn btn-success w-100 mt-3"
                style={{ borderRadius: 999 }}
                onClick={() => {
                  setShowGuide(false);
                  localStorage.setItem("carpool_home_guide_seen", "1");
                }}
              >
                ¡Entendido!
              </button>
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

            {activeTab === "listaDoctores" && (
              <ListaDoctores onAgendar={() => setActiveTab("agendar")} />
            )}

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
