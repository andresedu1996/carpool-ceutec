import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import {
  FaUserShield,
  FaSignOutAlt,
  FaCheckCircle,
  FaClock,
  FaPhone,
  FaMapMarkerAlt,
  FaUsers,
  FaMoneyBillWave,
  FaEye,
} from "react-icons/fa";

function PanelAdmin() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [conductores, setConductores] = useState([]);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("pendientes");
  const [processingId, setProcessingId] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCurrentUser(null);
        setAuthChecked(true);
        navigate("/login-admin");
        return;
      }

      try {
        const ref = doc(db, "usuarios", user.uid);
        const snap = await getDoc(ref);
        if (!snap.exists() || snap.data().role !== "admin") {
          await signOut(auth);
          setCurrentUser(null);
          navigate("/login-admin");
          return;
        }
        setCurrentUser(user);
      } catch (err) {
        console.error("No se pudo validar el rol del admin", err);
        setError("No se pudo validar el rol de administrador.");
      } finally {
        setAuthChecked(true);
      }
    });

    return () => unsub();
  }, [navigate]);

  useEffect(() => {
    if (!currentUser) return;

    const unsub = onSnapshot(
      collection(db, "conductores"),
      (snap) => {
        const rows = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const aDate = a.createdAt || "";
            const bDate = b.createdAt || "";
            if (aDate < bDate) return 1;
            if (aDate > bDate) return -1;
            return 0;
          });
        setConductores(rows);
      },
      (err) => {
        console.error("No se pudo cargar la lista de conductores", err);
        setError("No se pudo cargar la lista de conductores.");
      }
    );

    return () => unsub();
  }, [currentUser]);

  const pendientes = useMemo(
    () => conductores.filter((c) => c.aprobado === false),
    [conductores]
  );

  const activos = useMemo(
    () => conductores.filter((c) => c.aprobado !== false),
    [conductores]
  );

  const visibles = filter === "pendientes" ? pendientes : activos;

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate("/login-admin");
    } catch (err) {
      console.error("No se pudo cerrar sesión", err);
      setError("No se pudo cerrar sesión. Intenta de nuevo.");
    }
  };

  const aprobarConductor = async (conductorId) => {
    if (!currentUser) return;
    try {
      setError("");
      setProcessingId(conductorId);
      await updateDoc(doc(db, "conductores", conductorId), {
        aprobado: true,
        aprobadoPor: currentUser.email || currentUser.uid,
        aprobadoEl: new Date().toISOString(),
      });
    } catch (err) {
      console.error("No se pudo aprobar el conductor", err);
      setError("No se pudo aprobar el conductor. Intenta nuevamente.");
    } finally {
      setProcessingId("");
    }
  };

  if (!authChecked) {
    return (
      <div className="d-flex align-items-center justify-content-center vh-100 text-white">
        Validando credenciales...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #38bdf820 0%, #020617 55%, #000 100%)",
        padding: "24px 16px",
        color: "#f8fafc",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                backgroundColor: "rgba(15,23,42,0.8)",
                padding: "8px 16px",
                borderRadius: 999,
                border: "1px solid rgba(59,130,246,0.3)",
              }}
            >
              <FaUserShield />
              <span style={{ fontWeight: 600 }}>Panel Administrador</span>
            </div>
            <p style={{ marginTop: 12, fontSize: 14, opacity: 0.85 }}>
              Revisa las solicitudes de conductores y habilita solamente a los
              que cumplan con los requisitos.
            </p>
          </div>

          <div className="d-flex align-items-center gap-2">
            {currentUser && (
              <div
                style={{
                  fontSize: 13,
                  textAlign: "right",
                  opacity: 0.85,
                }}
              >
                <div>{currentUser.email}</div>
                <small>Administrador</small>
              </div>
            )}
            <button className="btn btn-outline-light" onClick={handleSignOut}>
              <FaSignOutAlt className="me-1" />
              Cerrar sesión
            </button>
          </div>
        </div>

        <div className="card" style={{ backgroundColor: "#0f172a" }}>
          <div className="card-body">
            <div className="d-flex flex-wrap gap-2 mb-3">
              <button
                className={`btn ${
                  filter === "pendientes" ? "btn-primary" : "btn-outline-light"
                }`}
                onClick={() => setFilter("pendientes")}
              >
                Pendientes ({pendientes.length})
              </button>
              <button
                className={`btn ${
                  filter === "activos" ? "btn-primary" : "btn-outline-light"
                }`}
                onClick={() => setFilter("activos")}
              >
                Aprobados ({activos.length})
              </button>
            </div>

            {error && (
              <div className="alert alert-danger py-2" style={{ fontSize: 14 }}>
                {error}
              </div>
            )}

            {visibles.length === 0 ? (
              <div className="text-center py-5" style={{ opacity: 0.85 }}>
                {filter === "pendientes"
                  ? "No hay solicitudes pendientes."
                  : "Aún no hay conductores aprobados o fueron filtrados."}
              </div>
            ) : (
              <div className="row g-3">
                {visibles.map((conductor) => (
                  <div className="col-12 col-md-6" key={conductor.id}>
                    <div
                      className="card h-100"
                      style={{
                        backgroundColor: "rgba(15,23,42,0.9)",
                        border: "1px solid rgba(148,163,184,0.2)",
                        color: "#e2e8f0",
                      }}
                    >
                      <div className="card-body d-flex flex-column">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div>
                            <h5 className="mb-1">{conductor.nombre || "N/D"}</h5>
                            <small style={{ opacity: 0.75 }}>
                              {conductor.email}
                            </small>
                          </div>
                          <span
                            className={`badge ${
                              conductor.aprobado === false
                                ? "bg-warning text-dark"
                                : "bg-success"
                            }`}
                          >
                            {conductor.aprobado === false
                              ? "En revisión"
                              : "Aprobado"}
                          </span>
                        </div>

                        <div style={{ fontSize: 13.5, lineHeight: 1.7 }}>
                          <p className="mb-1">
                            <FaMapMarkerAlt className="me-1" />
                            <strong>Colonia:</strong>{" "}
                            {conductor.colonia || "N/D"}
                          </p>
                          <p className="mb-1">
                            <FaClock className="me-1" />
                            <strong>Horario:</strong>{" "}
                            {conductor.horario || "N/D"}
                          </p>
                          <p className="mb-1">
                            <FaUsers className="me-1" />
                            <strong>Pasajeros:</strong>{" "}
                            {conductor.pasajeros || "N/D"}
                          </p>
                          <p className="mb-1">
                            <FaMoneyBillWave className="me-1" />
                            <strong>Precio:</strong>{" "}
                            {conductor.precio ? `L ${conductor.precio}` : "N/D"}
                          </p>
                          <p className="mb-1">
                            <FaPhone className="me-1" />
                            <strong>Teléfono:</strong>{" "}
                            {conductor.telefono || "N/D"}
                          </p>
                          <p className="mb-1">
                            <strong>Campus:</strong>{" "}
                            {(conductor.campus || []).length > 0
                              ? conductor.campus.join(", ")
                              : "Sin especificar"}
                          </p>
                          <p className="mb-1">
                            <strong>Días:</strong>{" "}
                            {(conductor.diasClase || []).length > 0
                              ? conductor.diasClase.join(", ")
                              : "Sin especificar"}
                          </p>
                        </div>

                        <div className="mt-3 d-flex flex-wrap gap-2">
                          {conductor.carnetUrl ? (
                            <a
                              href={conductor.carnetUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-outline-info flex-grow-1"
                            >
                              <FaEye className="me-1" />
                              Ver carnet
                            </a>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-outline-secondary flex-grow-1"
                              disabled
                            >
                              Sin carnet adjunto
                            </button>
                          )}

                          {conductor.aprobado === false && (
                            <button
                              className="btn btn-success flex-grow-1"
                              onClick={() => aprobarConductor(conductor.id)}
                              disabled={processingId === conductor.id}
                            >
                              {processingId === conductor.id ? (
                                "Aprobando..."
                              ) : (
                                <>
                                  <FaCheckCircle className="me-1" />
                                  Aprobar
                                </>
                              )}
                            </button>
                          )}

                          {conductor.aprobado !== false &&
                            conductor.aprobadoPor && (
                              <div style={{ fontSize: 12, opacity: 0.75 }}>
                                Aprobado por: {conductor.aprobadoPor}
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PanelAdmin;
