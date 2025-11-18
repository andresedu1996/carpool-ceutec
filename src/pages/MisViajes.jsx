import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  updateDoc,
  doc,
  getDocs,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
  FaUserCircle,
  FaCarSide,
  FaCalendarAlt,
  FaClock,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaInfoCircle,
  FaPhone,
  FaUsers,
} from "react-icons/fa";

function MisViajes() {
  const [user, setUser] = useState(null);
  const [viajes, setViajes] = useState([]);
  const [conductoresMap, setConductoresMap] = useState({});
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingViajes, setLoadingViajes] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [cancelandoId, setCancelandoId] = useState(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setLoadingUser(false);
    });

    return () => unsubAuth();
  }, []);

  // Cargar viajes del usuario logueado
  useEffect(() => {
    if (!user) {
      setViajes([]);
      setLoadingViajes(false);
      return;
    }

    setLoadingViajes(true);
    setMensaje("");

    const q = query(
      collection(db, "viajes"),
      where("pasajeroEmail", "==", user.email),
      orderBy("fecha", "asc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const priority = { programado: 0, completado: 1, cancelado: 2 };
        const rows = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const pa = priority[a.estado] ?? 99;
            const pb = priority[b.estado] ?? 99;
            if (pa !== pb) return pa - pb;
            const fa = a.fecha || "";
            const fb = b.fecha || "";
            if (fa !== fb) return fa.localeCompare(fb);
            const ha = a.horario || "";
            const hb = b.horario || "";
            return ha.localeCompare(hb);
          });
        setViajes(rows);
        setLoadingViajes(false);
      },
      (err) => {
        console.error("Error cargando viajes:", err);
        setMensaje("No se pudieron cargar tus viajes.");
        setLoadingViajes(false);
      }
    );

    return () => unsub();
  }, [user]);

  // Cargar conductores para enriquecer la lista con sus datos
  useEffect(() => {
    const loadConductores = async () => {
      try {
        const snap = await getDocs(collection(db, "conductores"));
        const map = {};
        snap.forEach((d) => {
          map[d.id] = { id: d.id, ...d.data() };
        });
        setConductoresMap(map);
      } catch (err) {
        console.error("Error cargando conductores:", err);
      }
    };
    loadConductores();
  }, []);

  const cancelarViaje = async (viaje) => {
    if (!window.confirm("¿Seguro que deseas cancelar este viaje?")) return;

    try {
      setCancelandoId(viaje.id);
      const ref = doc(db, "viajes", viaje.id);
      await updateDoc(ref, {
        estado: "cancelado",
        canceladoAt: new Date().toISOString(),
      });
      setMensaje("✅ Viaje cancelado correctamente.");
    } catch (err) {
      console.error("Error cancelando viaje:", err);
      setMensaje("❌ No se pudo cancelar el viaje.");
    } finally {
      setCancelandoId(null);
    }
  };

  if (loadingUser) {
    return (
      <div
        style={{
          minHeight: "40vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#f9fafb",
          fontSize: 16,
        }}
      >
        Cargando usuario...
      </div>
    );
  }

  if (!user) {
    return (
      <div
        style={{
          minHeight: "40vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#f9fafb",
          fontSize: 16,
          textAlign: "center",
        }}
      >
        Debes iniciar sesión para ver tus viajes.
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "8px 4px 24px",
        color: "#f9fafb",
        fontSize: 16,
      }}
    >
      {/* Encabezado */}
      <div
        className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3"
        style={{ gap: 12 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: "999px",
              background:
                "linear-gradient(135deg, #22c55e, #16a34a, #15803d)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#0b1120",
            }}
          >
            <FaCarSide />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "2.4rem", color: "#e2e8f0" }}>
              Mi viaje programado
            </h2>
            <small style={{ fontSize:16, color: "rgba(226,232,240,0.7)" }}>
              Revisa el estado de tus viajes y cancela si es necesario.
            </small>
          </div>
        </div>
      </div>

      {/* Info básica del usuario */}
      <div
        className="card mb-3"
        style={{
          backgroundColor: "rgba(15,23,42,0.95)",
          borderRadius: 16,
          border: "1px solid rgba(148,163,184,0.4)",
          fontSize: 16,
          color: "#f9fafb",
        }}
      >
        <div
          className="card-body d-flex align-items-center"
          style={{ gap: 12 }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "999px",
              background: "rgba(34,197,94,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FaUserCircle size={22} />
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>{user.email}</div>
            <div style={{ fontSize: 16, opacity: 0.8 }}>
              Tus viajes agendados se listan abajo.
            </div>
          </div>
        </div>
      </div>

      {/* Mensaje de estado */}
      {mensaje && (
        <div
          className="mb-3"
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            backgroundColor: "rgba(34,197,94,0.15)",
            border: "1px solid rgba(34,197,94,0.4)",
            fontSize: 16,
          }}
        >
          {mensaje}
        </div>
      )}

      {/* Lista de viajes */}
      {loadingViajes ? (
        <p style={{ fontSize: 16 }}>Cargando viajes...</p>
      ) : viajes.length === 0 ? (
        <p style={{ fontSize: 16 }}>No tienes viajes registrados.</p>
      ) : (
        <div style={{ marginTop: 8 }}>
          {viajes.map((v) => {
            const esProgramado = v.estado === "programado";
            const badgeClass =
              v.estado === "programado"
                ? "badge bg-success"
                : v.estado === "cancelado"
                ? "badge bg-danger"
                : "badge bg-secondary";
            const conductorInfo = conductoresMap[v.conductorId] || {};
            const telefono = conductorInfo.telefono || v.conductorTelefono;
            const telefonoWa = telefono
              ? telefono.toString().replace(/\D/g, "")
              : "";

            return (
              <div
                key={v.id}
                className="card mb-3"
                style={{
                  backgroundColor: "#020617",
                  borderRadius: 16,
                  border: "1px solid rgba(55,65,81,0.8)",
                  color: "#f9fafb",
                }}
              >
                <div className="card-body">
                  {/* Header: fecha, hora, estado */}
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div style={{ fontSize: 16 }}>
                      <span
                        className="badge me-2"
                        style={{
                          backgroundColor: "#1f2937",
                          color: "#e5e7eb",
                        }}
                      >
                        <FaCalendarAlt className="me-1" />
                        {v.fecha}
                      </span>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: "#1f2937",
                          color: "#e5e7eb",
                        }}
                      >
                        <FaClock className="me-1" />
                        {v.horario}
                      </span>
                    </div>
                    <span className={badgeClass} style={{ fontSize: 16 }}>
                      <FaInfoCircle className="me-1" />
                      {v.estado}
                    </span>
                  </div>

                  {/* Conductor */}
                  <p style={{ marginBottom: 6, fontSize: 16 }}>
                    <strong>Conductor:</strong> {v.conductorNombre}
                  </p>
                  {conductorInfo.vehiculo && (
                    <p style={{ marginBottom: 6, fontSize: 16 }}>
                      <FaCarSide className="me-1" />
                      <strong>Vehículo:</strong> {conductorInfo.vehiculo}
                    </p>
                  )}

                  {/* Detalles extra si existen */}
                  {(conductorInfo.colonia || v.conductorColonia) && (
                    <p style={{ marginBottom: 6, fontSize: 16 }}>
                      <FaMapMarkerAlt className="me-1" />
                      <strong>Colonia:</strong>{" "}
                      {conductorInfo.colonia || v.conductorColonia}
                    </p>
                  )}
                  {(conductorInfo.horario || conductorInfo.horarios) && (
                    <p style={{ marginBottom: 6, fontSize: 16 }}>
                      <FaClock className="me-1" />
                      <strong>Horario(s):</strong>{" "}
                      {Array.isArray(conductorInfo.horarios)
                        ? conductorInfo.horarios.join(", ")
                        : conductorInfo.horario || "N/D"}
                    </p>
                  )}
                  {conductorInfo.pasajeros && (
                    <p style={{ marginBottom: 6, fontSize: 16 }}>
                      <FaUsers className="me-1" />
                      <strong>Pasajeros:</strong> {conductorInfo.pasajeros}
                    </p>
                  )}
                  {(conductorInfo.precio || v.precio) && (
                    <p style={{ marginBottom: 6, fontSize: 16 }}>
                      <FaMoneyBillWave className="me-1" />
                      <strong>Precio:</strong> L{" "}
                      {conductorInfo.precio || v.precio}
                    </p>
                  )}
                  {conductorInfo.telefono && (
                    <p style={{ marginBottom: 6, fontSize: 16 }}>
                      <FaPhone className="me-1" />
                      <strong>Teléfono:</strong> {conductorInfo.telefono}
                    </p>
                  )}
                  {conductorInfo.campus && conductorInfo.campus.length > 0 && (
                    <p style={{ marginBottom: 6, fontSize: 16 }}>
                      <FaInfoCircle className="me-1" />
                      <strong>Campus:</strong>{" "}
                      {conductorInfo.campus.join(", ")}
                    </p>
                  )}

                  {/* Botón cancelar */}
                  <button
                    className={
                      esProgramado
                        ? "btn btn-outline-danger mt-2"
                        : "btn btn-outline-secondary mt-2"
                    }
                    onClick={() => cancelarViaje(v)}
                    disabled={!esProgramado || cancelandoId === v.id}
                    style={{
                      borderRadius: 999,
                      fontSize: 16,
                      padding: "6px 16px",
                    }}
                  >
                    {esProgramado
                      ? cancelandoId === v.id
                        ? "Cancelando..."
                        : "Cancelar viaje"
                      : "Ya no se puede cancelar"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-success mt-2 ms-2"
                    disabled={!esProgramado || !telefonoWa}
                    onClick={() => {
                      if (!telefonoWa) return;
                      window.open(`https://wa.me/${telefonoWa}`, "_blank");
                    }}
                    style={{
                      borderRadius: 999,
                      fontSize: 16,
                      padding: "6px 16px",
                    }}
                  >
                    Contactar por WhatsApp
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MisViajes;




