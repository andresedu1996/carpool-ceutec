// src/pages/PanelConductor.jsx
import React, { useEffect, useState, useMemo } from "react";
import { auth, db } from "../firebase";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

import {
  FaSignOutAlt,
  FaClipboardCheck,
  FaListAlt,
  FaTools,
  FaCar,
  FaMapMarkerAlt,
  FaUser,
  FaMoneyBillWave,
  FaCalendarAlt,
  FaClock,
  FaUsers,
  FaPhone,
  FaSchool,
  FaCheckCircle,
} from "react-icons/fa";

const DIAS_SEMANA = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

const CAMPUS_OPTIONS = ["Ceutec Sede Norte", "Ceutec Sede Central"];

function PanelConductor() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [conductor, setConductor] = useState(null);
  const [viajes, setViajes] = useState([]);

  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingConductor, setLoadingConductor] = useState(true);
  const [loadingViajes, setLoadingViajes] = useState(true);

  const [activeTab, setActiveTab] = useState("inicio");
  const [mensaje, setMensaje] = useState("");
  const [marcandoId, setMarcandoId] = useState(null);

  // Para editar datos del conductor
  const [form, setForm] = useState({
    nombre: "",
    colonia: "",
    horario: "",
    pasajeros: 3,
    placa: "",
    precio: 0,
    telefono: "",
    vehiculo: "",
    diasClase: [],
    campus: [],
  });

  // Stats de viajes
  const stats = useMemo(() => {
    const total = viajes.length;
    const programados = viajes.filter((v) => v.estado === "programado").length;
    const completados = viajes.filter((v) => v.estado === "completado").length;
    const cancelados = viajes.filter((v) => v.estado === "cancelado").length;
    return { total, programados, completados, cancelados };
  }, [viajes]);

  // 1) Escuchar usuario logueado
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setLoadingUser(false);
      if (!u) {
        setUser(null);
        setConductor(null);
        setViajes([]);
        navigate("/login-conductor");
        return;
      }
      setUser(u);
    });

    return () => unsub();
  }, [navigate]);

  // 2) Cargar datos del conductor cuando haya user
  useEffect(() => {
    if (!user) return;

    const loadConductor = async () => {
      setLoadingConductor(true);
      try {
        const ref = doc(db, "conductores", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setConductor({ id: snap.id, ...data });
          setForm({
            nombre: data.nombre || "",
            colonia: data.colonia || "",
            horario: data.horario || "",
            pasajeros: data.pasajeros || 3,
            placa: data.placa || "",
            precio: data.precio || 0,
            telefono: data.telefono || "",
            vehiculo: data.vehiculo || "",
            diasClase: data.diasClase || [],
            campus: data.campus || [],
          });
        } else {
          setConductor(null);
          setMensaje("No se encontraron datos de conductor para tu usuario.");
        }
      } catch (err) {
        console.error("Error cargando conductor:", err);
        setMensaje("No se pudieron cargar tus datos de conductor.");
      } finally {
        setLoadingConductor(false);
      }
    };

    loadConductor();
  }, [user]);

  // 3) Suscribirse a viajes del conductor cuando haya user
  useEffect(() => {
    if (!user) return;

    setLoadingViajes(true);

    const q = query(
      collection(db, "viajes"),
      where("conductorId", "==", user.uid)
      // quitamos orderBy para evitar problemas de índice
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        let rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // ordenar en memoria por fecha descendente (asumiendo YYYY-MM-DD)
        rows.sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
        setViajes(rows);
        setLoadingViajes(false);
      },
      (err) => {
        console.error("Error cargando viajes del conductor:", err);
        setMensaje("No se pudieron cargar tus viajes.");
        setLoadingViajes(false);
      }
    );

    return () => unsub();
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login-conductor");
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
      alert("No se pudo cerrar sesión, intenta de nuevo.");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        name === "pasajeros" || name === "precio" ? Number(value) : value,
    }));
  };

  const toggleDia = (dia) => {
    setForm((prev) => {
      const actual = prev.diasClase || [];
      if (actual.includes(dia)) {
        return { ...prev, diasClase: actual.filter((d) => d !== dia) };
      } else {
        return { ...prev, diasClase: [...actual, dia] };
      }
    });
  };

  const toggleCampus = (camp) => {
    setForm((prev) => {
      const actual = prev.campus || [];
      if (actual.includes(camp)) {
        return { ...prev, campus: actual.filter((c) => c !== camp) };
      } else {
        return { ...prev, campus: [...actual, camp] };
      }
    });
  };

  const guardarPerfil = async (e) => {
    e.preventDefault();
    if (!user) return;

    setMensaje("");
    try {
      const ref = doc(db, "conductores", user.uid);
      await updateDoc(ref, {
        nombre: form.nombre,
        colonia: form.colonia,
        horario: form.horario,
        pasajeros: form.pasajeros,
        placa: form.placa,
        precio: form.precio,
        telefono: form.telefono,
        vehiculo: form.vehiculo,
        diasClase: form.diasClase || [],
        campus: form.campus || [],
        updatedAt: new Date().toISOString(),
      });

      setMensaje("✅ Datos de conductor actualizados correctamente.");
    } catch (err) {
      console.error("Error actualizando datos de conductor:", err);
      setMensaje("❌ No se pudieron actualizar tus datos.");
    }
  };

  // 👇 Marca viaje como completado (con actualización local inmediata)
  const marcarCompletado = async (viajeId) => {
    try {
      setMarcandoId(viajeId);

      const ref = doc(db, "viajes", viajeId);
      const ahoraISO = new Date().toISOString();

      await updateDoc(ref, {
        estado: "completado",
        completadoAt: ahoraISO,
      });

      // Actualizar estado local
      setViajes((prev) =>
        prev.map((v) =>
          v.id === viajeId
            ? { ...v, estado: "completado", completadoAt: ahoraISO }
            : v
        )
      );

      setMensaje("✅ Viaje marcado como completado.");
    } catch (err) {
      console.error("Error marcando viaje como completado:", err);
      setMensaje("❌ No se pudo marcar el viaje como completado.");
    } finally {
      setMarcandoId(null);
    }
  };

  if (loadingUser || loadingConductor) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at top, #1f2937 0%, #020617 55%, #000 100%)",
          color: "#f9fafb",
        }}
      >
        <div className="spinner-border text-success me-2" role="status" />
        <span>Cargando panel de conductor...</span>
      </div>
    );
  }

  if (!user) {
    return <p style={{ padding: 20 }}>Debes iniciar sesión como conductor.</p>;
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        background:
          "radial-gradient(circle at top, #22c55e20 0%, #020617 55%, #000 100%)",
        color: "#f9fafb",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Barra superior */}
      <header
        style={{
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(148,163,184,0.3)",
          backdropFilter: "blur(10px)",
          backgroundColor: "rgba(15,23,42,0.8)",
        }}
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
              fontWeight: "bold",
            }}
          >
            <FaCar />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.3rem" }}>
              Panel del Conductor
            </h2>
            <small style={{ opacity: 0.8 }}>{user.email}</small>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn btn-sm btn-outline-light"
            onClick={() => setActiveTab("inicio")}
          >
            Inicio
          </button>
          <button
            className="btn btn-sm btn-outline-light"
            onClick={handleLogout}
          >
            <FaSignOutAlt className="me-1" />
            Cerrar sesión
          </button>
        </div>
      </header>

      {mensaje && (
        <div
          style={{
            padding: "8px 20px",
            backgroundColor: "rgba(22,163,74,0.2)",
            borderBottom: "1px solid rgba(22,163,74,0.5)",
            fontSize: 14,
          }}
        >
          {mensaje}
        </div>
      )}

      <main
        style={{
          flex: 1,
          padding: "24px",
          maxWidth: 1200,
          width: "100%",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "300px 1fr",
          gap: 24,
        }}
      >
        {/* Sidebar de tabs */}
        <aside
          style={{
            backgroundColor: "rgba(15,23,42,0.95)",
            borderRadius: 16,
            padding: 20,
            border: "1px solid rgba(148,163,184,0.4)",
            height: "fit-content",
          }}
        >
          <h5
            style={{
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 20,
            }}
          >
            <FaUser /> <span>Menú</span>
          </h5>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              fontSize: 15,
            }}
          >
            <button
              className="btn btn-sm text-start"
              style={{
                backgroundColor:
                  activeTab === "inicio" ? "#22c55e" : "transparent",
                borderColor: "#22c55e",
                color: activeTab === "inicio" ? "#0b1120" : "#e5e7eb",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 12px",
                fontSize: 15,
                borderRadius: 12,
              }}
              onClick={() => setActiveTab("inicio")}
            >
              <FaClipboardCheck /> Resumen
            </button>
            <button
              className="btn btn-sm text-start"
              style={{
                backgroundColor:
                  activeTab === "viajes" ? "#22c55e" : "transparent",
                borderColor: "#22c55e",
                color: activeTab === "viajes" ? "#0b1120" : "#e5e7eb",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 12px",
                fontSize: 15,
                borderRadius: 12,
              }}
              onClick={() => setActiveTab("viajes")}
            >
              <FaListAlt /> Mis viajes
            </button>
            <button
              className="btn btn-sm text-start"
              style={{
                backgroundColor:
                  activeTab === "perfil" ? "#22c55e" : "transparent",
                borderColor: "#22c55e",
                color: activeTab === "perfil" ? "#0b1120" : "#e5e7eb",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 12px",
                fontSize: 15,
                borderRadius: 12,
              }}
              onClick={() => setActiveTab("perfil")}
            >
              <FaTools /> Actualizar datos
            </button>
          </div>

          {/* Mini resumen lateral */}
          {conductor && (
            <div
              style={{
                marginTop: 20,
                paddingTop: 14,
                borderTop: "1px solid rgba(55,65,81,0.8)",
                fontSize: 15,
              }}
            >
              <p style={{ marginBottom: 4 }}>
                <FaMapMarkerAlt className="me-1" /> {conductor.colonia}
              </p>
              <p style={{ marginBottom: 4 }}>
                <FaCar className="me-1" /> {conductor.vehiculo}
              </p>
              <p style={{ marginBottom: 4 }}>
                <FaClock className="me-1" /> {conductor.horario}
              </p>
              <p style={{ marginBottom: 4 }}>
                <FaUsers className="me-1" /> {conductor.pasajeros} pasajeros
              </p>
              <p style={{ marginBottom: 4 }}>
                <FaMoneyBillWave className="me-1" /> L {conductor.precio}
              </p>
              <p style={{ marginBottom: 0 }}>
                <FaSchool className="me-1" />{" "}
                {(conductor.campus || []).length > 0
                  ? conductor.campus.join(", ")
                  : "Campus no definido"}
              </p>
            </div>
          )}
        </aside>

        {/* Contenido principal */}
        <section
          style={{
            backgroundColor: "rgba(15,23,42,0.9)",
            borderRadius: 16,
            padding: 20,
            border: "1px solid rgba(148,163,184,0.4)",
          }}
        >
          {activeTab === "inicio" && (
            <>
              <h3 style={{ marginBottom: 16 }}>Resumen</h3>

              {/* Stats */}
              <div className="row g-3 mb-3">
                <div className="col-md-3 col-6">
                  <div
                    className="card"
                    style={{
                      background:
                        "linear-gradient(135deg,#22c55e,#16a34a,#166534)",
                      color: "#052e16",
                      borderRadius: 14,
                    }}
                  >
                    <div className="card-body py-2">
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <small>Total viajes</small>
                          <h4 style={{ margin: 0 }}>{stats.total}</h4>
                        </div>
                        <FaCar size={26} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-3 col-6">
                  <div
                    className="card"
                    style={{
                      backgroundColor: "#0f766e",
                      color: "#ecfeff",
                      borderRadius: 14,
                    }}
                  >
                    <div className="card-body py-2">
                      <small>Programados</small>
                      <h4 style={{ margin: 0 }}>{stats.programados}</h4>
                    </div>
                  </div>
                </div>
                <div className="col-md-3 col-6">
                  <div
                    className="card"
                    style={{
                      backgroundColor: "#1d4ed8",
                      color: "#eff6ff",
                      borderRadius: 14,
                    }}
                  >
                    <div className="card-body py-2">
                      <small>Completados</small>
                      <h4 style={{ margin: 0 }}>{stats.completados}</h4>
                    </div>
                  </div>
                </div>
                <div className="col-md-3 col-6">
                  <div
                    className="card"
                    style={{
                      backgroundColor: "#b91c1c",
                      color: "#fee2e2",
                      borderRadius: 14,
                    }}
                  >
                    <div className="card-body py-2">
                      <small>Cancelados</small>
                      <h4 style={{ margin: 0 }}>{stats.cancelados}</h4>
                    </div>
                  </div>
                </div>
              </div>

              {/* Info conductor */}
              {conductor ? (
                <div
                  className="card mt-2"
                  style={{
                    backgroundColor: "#020617",
                    borderRadius: 16,
                    border: "1px solid rgba(55,65,81,0.8)",
                    color: "#f9fafb",
                  }}
                >
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-4 d-flex flex-column align-items-center justify-content-center mb-3 mb-md-0">
                        <div
                          style={{
                            width: 80,
                            height: 80,
                            borderRadius: "999px",
                            background:
                              "linear-gradient(135deg,#22c55e,#16a34a)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 32,
                            marginBottom: 8,
                            color: "#f9fafb",
                          }}
                        >
                          {conductor.nombre
                            ? conductor.nombre.charAt(0).toUpperCase()
                            : "C"}
                        </div>
                        <h5
                          style={{ margin: 0, fontSize: 24, color: "#f9fafb" }}
                        >
                          {conductor.nombre}
                        </h5>
                        <small
                          style={{
                            opacity: 0.7,
                            fontSize: 16,
                            color: "#e5e7eb",
                          }}
                        >
                          {conductor.vehiculo}
                        </small>
                      </div>
                      <div className="col-md-8">
                        <div className="row">
                          <div className="col-sm-6">
                            <p style={{ fontSize: 18, color: "#f9fafb" }}>
                              <FaMapMarkerAlt className="me-1" />
                              <strong>Colonia:</strong> {conductor.colonia}
                            </p>
                            <p style={{ fontSize: 18, color: "#f9fafb" }}>
                              <FaClock className="me-1" />
                              <strong>Horario salida:</strong>{" "}
                              {conductor.horario}
                            </p>
                            <p style={{ fontSize: 18, color: "#f9fafb" }}>
                              <FaUsers className="me-1" />
                              <strong>Pasajeros:</strong>{" "}
                              {conductor.pasajeros}
                            </p>
                          </div>
                          <div className="col-sm-6">
                            <p style={{ fontSize: 18, color: "#f9fafb" }}>
                              <FaMoneyBillWave className="me-1" />
                              <strong>Precio:</strong> L{" "}
                              {conductor.precio}
                            </p>
                            <p style={{ fontSize: 18, color: "#f9fafb" }}>
                              <FaPhone className="me-1" />
                              <strong>Teléfono:</strong>{" "}
                              {conductor.telefono}
                            </p>
                            <p style={{ fontSize: 18, color: "#f9fafb" }}>
                              <FaSchool className="me-1" />
                              <strong>Días clase:</strong>{" "}
                              {(conductor.diasClase || []).length > 0
                                ? conductor.diasClase.join(", ")
                                : "Sin especificar"}
                            </p>
                            <p style={{ fontSize: 18, color: "#f9fafb" }}>
                              <FaSchool className="me-1" />
                              <strong>Campus:</strong>{" "}
                              {(conductor.campus || []).length > 0
                                ? conductor.campus.join(", ")
                                : "Sin especificar"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p style={{ color: "#f9fafb" }}>
                  No se encontró tu registro de conductor.
                </p>
              )}
            </>
          )}

          {activeTab === "viajes" && (
            <>
              <h3 style={{ marginBottom: 16, color: "#f9fafb" }}>
                Mis viajes
              </h3>
              {loadingViajes ? (
                <p style={{ color: "#f9fafb" }}>Cargando viajes...</p>
              ) : viajes.length === 0 ? (
                <p style={{ color: "#f9fafb" }}>
                  No tienes viajes registrados aún.
                </p>
              ) : (
                <div
                  style={{
                    marginTop: 8,
                    maxHeight: "60vh",
                    overflowY: "auto",
                  }}
                >
                  {viajes.map((v) => (
                    <div
                      key={v.id}
                      className="card mb-2"
                      style={{
                        backgroundColor: "#020617",
                        borderRadius: 14,
                        border: "1px solid rgba(55,65,81,0.8)",
                        fontSize: 20,
                        color: "#f9fafb",
                      }}
                    >
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <div>
                            <span
                              className="badge me-2"
                              style={{
                                backgroundColor: "#1f2937",
                                fontSize: 14,
                                color: "#f9fafb",
                              }}
                            >
                              <FaCalendarAlt className="me-1" />
                              {v.fecha}
                            </span>
                            <span
                              className="badge"
                              style={{
                                backgroundColor: "#1f2937",
                                fontSize: 14,
                                color: "#f9fafb",
                              }}
                            >
                              <FaClock className="me-1" />
                              {v.horario}
                            </span>
                          </div>
                          <span
                            className={
                              v.estado === "programado"
                                ? "badge bg-success"
                                : v.estado === "cancelado"
                                ? "badge bg-danger"
                                : "badge bg-secondary"
                            }
                          >
                            {v.estado}
                          </span>
                        </div>
                        <p style={{ marginBottom: 4 }}>
                          <FaUser className="me-1" />
                          <strong>Pasajero:</strong> {v.pasajeroNombre} (
                          {v.pasajeroEmail})
                        </p>
                        {v.conductorColonia && (
                          <p style={{ marginBottom: 4 }}>
                            <FaMapMarkerAlt className="me-1" />
                            <strong>Colonia:</strong> {v.conductorColonia}
                          </p>
                        )}
                        {v.precio && (
                          <p style={{ marginBottom: 4 }}>
                            <FaMoneyBillWave className="me-1" />
                            <strong>Precio:</strong> L {v.precio}
                          </p>
                        )}

                        {v.estado === "programado" && (
                          <button
                            className="btn btn-sm btn-outline-success mt-2"
                            onClick={() => marcarCompletado(v.id)}
                            disabled={marcandoId === v.id}
                          >
                            <FaCheckCircle className="me-1" />
                            {marcandoId === v.id
                              ? "Marcando..."
                              : "Marcar como completado"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === "perfil" && (
            <>
              <h3 style={{ marginBottom: 16 }}>
                Actualizar datos del conductor
              </h3>
              <form
                onSubmit={guardarPerfil}
                style={{ maxWidth: 520, marginTop: 8 }}
              >
                <div className="mb-2">
                  <label className="form-label">Nombre completo</label>
                  <input
                    type="text"
                    name="nombre"
                    className="form-control"
                    value={form.nombre}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="mb-2">
                  <label className="form-label">Colonia</label>
                  <input
                    type="text"
                    name="colonia"
                    className="form-control"
                    value={form.colonia}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="mb-2">
                  <label className="form-label">Vehículo</label>
                  <input
                    type="text"
                    name="vehiculo"
                    className="form-control"
                    value={form.vehiculo}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="mb-2">
                  <label className="form-label">Placa</label>
                  <input
                    type="text"
                    name="placa"
                    className="form-control"
                    value={form.placa}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="mb-2">
                  <label className="form-label">Teléfono</label>
                  <input
                    type="tel"
                    name="telefono"
                    className="form-control"
                    value={form.telefono}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="mb-2">
                  <label className="form-label">Horario salida</label>
                  <input
                    type="text"
                    name="horario"
                    className="form-control"
                    value={form.horario}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="mb-2">
                <label className="form-label">Precio por viaje (L)</label>
                <input
                  type="number"
                  name="precio"
                  className="form-control"
                  value={form.precio}
                  onChange={handleChange}
                  min={0}
                  required
                />
              </div>

              <div className="mb-2">
                <label className="form-label">Pasajeros disponibles</label>
                <input
                  type="number"
                  name="pasajeros"
                  className="form-control"
                  value={form.pasajeros}
                  onChange={handleChange}
                  min={1}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Días que va a clase</label>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                    fontSize: 14,
                  }}
                >
                  {DIAS_SEMANA.map((dia) => (
                    <label
                      key={dia}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "4px 8px",
                        borderRadius: 999,
                        border: "1px solid rgba(148,163,184,0.6)",
                        cursor: "pointer",
                        backgroundColor: form.diasClase.includes(dia)
                          ? "rgba(34,197,94,0.15)"
                          : "transparent",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={form.diasClase.includes(dia)}
                        onChange={() => toggleDia(dia)}
                      />
                      {dia}
                    </label>
                  ))}
                </div>
              </div>

              {/* Campus multiselect */}
              <div className="mb-3">
                <label className="form-label">Campus donde recoge</label>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                    fontSize: 14,
                  }}
                >
                  {CAMPUS_OPTIONS.map((camp) => (
                    <label
                      key={camp}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "4px 8px",
                        borderRadius: 999,
                        border: "1px solid rgba(148,163,184,0.6)",
                        cursor: "pointer",
                        backgroundColor: form.campus.includes(camp)
                          ? "rgba(34,197,94,0.15)"
                          : "transparent",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={form.campus.includes(camp)}
                        onChange={() => toggleCampus(camp)}
                      />
                      {camp}
                    </label>
                  ))}
                </div>
              </div>

              <button type="submit" className="btn btn-success">
                <FaTools className="me-1" />
                Guardar cambios
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  </div>
  );
}

export default PanelConductor;
