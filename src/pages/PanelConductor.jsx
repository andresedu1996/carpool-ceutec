// src/pages/PanelConductor.jsx
import React, { useEffect, useState, useMemo } from "react";
import { auth, db, messagingPromise } from "../firebase";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  setDoc,
   addDoc, //Logs push token
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { getToken, onMessage } from "firebase/messaging";

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
  FaWhatsapp,
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
  const [pasajerosInfo, setPasajerosInfo] = useState({});

  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingConductor, setLoadingConductor] = useState(true);
  const [loadingViajes, setLoadingViajes] = useState(true);

  const [pushStatus, setPushStatus] = useState("checking");
  const [pushToken, setPushToken] = useState("");
  const [pushError, setPushError] = useState("");
  const [activandoPush, setActivandoPush] = useState(false);

  const [activeTab, setActiveTab] = useState("inicio");
  const [mensaje, setMensaje] = useState("");
  const [marcandoId, setMarcandoId] = useState(null);

  // 🔹 Detectar si es móvil para cambiar el layout
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => {
      if (typeof window === "undefined") return;
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  // 2.5) Cargar info extra de pasajeros
  useEffect(() => {
    const loadPasajeros = async () => {
      const faltantes = viajes
        .map((v) => v.pasajeroEmail)
        .filter((email) => email && !pasajerosInfo[email]);
      if (faltantes.length === 0) return;

      const nuevos = {};
      await Promise.all(
        faltantes.map(async (email) => {
          try {
            const q = query(
              collection(db, "usuarios"),
              where("email", "==", email)
            );
            const snap = await getDocs(q);
            if (!snap.empty) {
              nuevos[email] = snap.docs[0].data();
            } else {
              nuevos[email] = null;
            }
          } catch (err) {
            console.error("Error cargando datos del pasajero:", err);
            nuevos[email] = null;
          }
        })
      );

      setPasajerosInfo((prev) => ({ ...prev, ...nuevos }));
    };

    loadPasajeros();
  }, [viajes, pasajerosInfo]);

  // 2.6) Escuchar tokens guardados para mostrar estado de notificaciones
  useEffect(() => {
    if (!user) return undefined;

    const supportsNotifications = typeof Notification !== "undefined";
    if (!supportsNotifications) {
      setPushStatus("unsupported");
      return undefined;
    }

    const ref = collection(db, "conductores", user.uid, "tokens");
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.empty) {
        setPushToken("");
        if (Notification.permission === "denied") {
          setPushStatus("denied");
        } else {
          setPushStatus("idle");
        }
        return;
      }

      const storedToken = snap.docs[0].data()?.token || snap.docs[0].id;
      setPushToken(storedToken);
      setPushStatus("granted");
    });

    return () => unsub();
  }, [user]);

  // 2.7) Listener de mensajes en primer plano
  useEffect(() => {
    let unsubscribe = null;

    messagingPromise.then((messaging) => {
      if (!messaging) return;
      unsubscribe = onMessage(messaging, (payload) => {
        const title = payload?.notification?.title || payload?.data?.title;
        const body = payload?.notification?.body || payload?.data?.body;

        if (body || title) {
          const label = title ? `${title}: ${body || ""}` : body;
          setMensaje(`📩 ${label}`);
        }
      });
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

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
        const priority = { programado: 0, completado: 1, cancelado: 2 };
        let rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        rows.sort((a, b) => {
          const pa = priority[a.estado] ?? 99;
          const pb = priority[b.estado] ?? 99;
          if (pa !== pb) return pa - pb;
          const fechaA = a.fecha || "";
          const fechaB = b.fecha || "";
          if (fechaA !== fechaB) return fechaB.localeCompare(fechaA);
          const horaA = a.horario || "";
          const horaB = b.horario || "";
          return horaA.localeCompare(horaB);
        });
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

  useEffect(() => {
    if (typeof Notification === "undefined") {
      setPushStatus("unsupported");
      return;
    }

    if (Notification.permission === "granted") setPushStatus("granted");
    else if (Notification.permission === "denied") setPushStatus("denied");
    else setPushStatus("idle");
  }, []);

  const activarNotificaciones = async () => {
    if (!user) return;
    setPushError("");

    try {
      setActivandoPush(true);

      if (typeof Notification === "undefined") {
        setPushStatus("unsupported");
        setPushError("Este navegador no soporta notificaciones push.");
        return;
      }

      const messaging = await messagingPromise;
      if (!messaging) {
        setPushStatus("unsupported");
        setPushError("FCM no es soportado en este navegador.");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushStatus("denied");
        setPushError("Debes permitir las notificaciones en tu navegador.");
        return;
      }

      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        setPushError("Falta configurar VITE_FIREBASE_VAPID_KEY en tu .env");
        return;
      }

      const swRegistration = await navigator.serviceWorker.ready;
      const token = await getToken(messaging, {
  vapidKey,
  serviceWorkerRegistration: swRegistration,
});

if (!token) {
  setPushError("No se pudo obtener el token de notificaciones.");
  return;
}

console.log("FCM push token obtenido:", token);

await setDoc(doc(db, "conductores", user.uid, "tokens", token), {
  token,
  createdAt: new Date().toISOString(),
  userAgent: navigator.userAgent || "desconocido",
});

// Log en colección global de logs
try {
  await addDoc(collection(db, "logs_push_tokens"), {
    uid: user.uid,
    email: user.email || null,
    token,
    createdAt: new Date().toISOString(),
    userAgent: navigator.userAgent || "desconocido",
    platform: navigator.platform || "desconocido",
  });
} catch (logErr) {
  console.warn("No se pudo guardar el log del push token:", logErr);
}

setPushToken(token);
setPushStatus("granted");
setMensaje("🔔 Notificaciones activadas para este dispositivo.");
    } catch (err) {
      console.error("Error activando notificaciones:", err);
      const message = err?.message || "No se pudieron activar las notificaciones.";
      setPushError(message);
    } finally {
      setActivandoPush(false);
    }
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

  if (conductor && conductor.aprobado === false) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at top, #1f2937 0%, #020617 55%, #000 100%)",
          color: "#f1f5f9",
          textAlign: "center",
          padding: 24,
        }}
      >
        <h2 style={{ marginBottom: 12 }}>Tu cuenta está en revisión</h2>
        <p style={{ maxWidth: 480, opacity: 0.85 }}>
          Recibimos tu registro y la evidencia de tu carnet universitario. Un
          administrador debe aprobar la cuenta antes de que puedas acceder al
          panel. Te notificaremos en cuanto se habilite.
        </p>
        <button className="btn btn-outline-light mt-3" onClick={handleLogout}>
          <FaSignOutAlt className="me-1" />
          Cerrar sesión
        </button>
      </div>
    );
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
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "flex-start" : "center",
          justifyContent: "space-between",
          gap: isMobile ? 12 : 0,
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
        <div
          style={{
            display: "flex",
            gap: 8,
            width: isMobile ? "100%" : "auto",
            justifyContent: isMobile ? "flex-end" : "flex-start",
          }}
        >
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
          padding: isMobile ? "16px" : "24px",
          maxWidth: 1200,
          width: "100%",
          margin: "0 auto",
          display: isMobile ? "flex" : "grid",
          flexDirection: isMobile ? "column" : undefined,
          gridTemplateColumns: isMobile ? undefined : "300px 1fr",
          gap: isMobile ? 16 : 24,
        }}
      >
        {/* Sidebar de tabs: solo en desktop/tablet */}
        {!isMobile && (
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
        )}

        <section
          style={{
            backgroundColor: "rgba(15,23,42,0.9)",
            borderRadius: 16,
            padding: isMobile ? 16 : 20,
            border: "1px solid rgba(148,163,184,0.4)",
          }}
        >
          {/* Menú compacto para móvil */}
          {isMobile && (
            <>
              <nav
                style={{
                  marginBottom: 12,
                  display: "flex",
                  gap: 8,
                  overflowX: "auto",
                  paddingBottom: 4,
                }}
              >
                <button
                  className="btn btn-sm"
                  style={{
                    whiteSpace: "nowrap",
                    backgroundColor:
                      activeTab === "inicio" ? "#22c55e" : "transparent",
                    borderColor: "#22c55e",
                    color: activeTab === "inicio" ? "#0b1120" : "#e5e7eb",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    borderRadius: 999,
                    padding: "6px 10px",
                    fontSize: 14,
                  }}
                  onClick={() => setActiveTab("inicio")}
                >
                  <FaClipboardCheck /> Resumen
                </button>
                <button
                  className="btn btn-sm"
                  style={{
                    whiteSpace: "nowrap",
                    backgroundColor:
                      activeTab === "viajes" ? "#22c55e" : "transparent",
                    borderColor: "#22c55e",
                    color: activeTab === "viajes" ? "#0b1120" : "#e5e7eb",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    borderRadius: 999,
                    padding: "6px 10px",
                    fontSize: 14,
                  }}
                  onClick={() => setActiveTab("viajes")}
                >
                  <FaListAlt /> Mis viajes
                </button>
                <button
                  className="btn btn-sm"
                  style={{
                    whiteSpace: "nowrap",
                    backgroundColor:
                      activeTab === "perfil" ? "#22c55e" : "transparent",
                    borderColor: "#22c55e",
                    color: activeTab === "perfil" ? "#0b1120" : "#e5e7eb",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    borderRadius: 999,
                    padding: "6px 10px",
                    fontSize: 14,
                  }}
                  onClick={() => setActiveTab("perfil")}
                >
                  <FaTools /> Perfil
                </button>
              </nav>

              {/* Mini resumen arriba en móvil */}
              {conductor && activeTab === "inicio" && (
                <div
                  className="card mb-3"
                  style={{
                    backgroundColor: "#020617",
                    borderRadius: 14,
                    border: "1px solid rgba(55,65,81,0.8)",
                    color: "#f9fafb",
                  }}
                >
                  <div className="card-body">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: "999px",
                          background:
                            "linear-gradient(135deg,#22c55e,#16a34a)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 24,
                        }}
                      >
                        {conductor.nombre
                          ? conductor.nombre.charAt(0).toUpperCase()
                          : "C"}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontWeight: "bold",
                            fontSize: 16,
                            marginBottom: 2,
                          }}
                        >
                          {conductor.nombre}
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            opacity: 0.8,
                            marginBottom: 4,
                          }}
                        >
                          {conductor.vehiculo}
                        </div>
                        <div style={{ fontSize: 13 }}>
                          <FaMapMarkerAlt className="me-1" />
                          {conductor.colonia} ·{" "}
                          <FaClock className="me-1" />
                          {conductor.horario}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === "inicio" && (
            <>
              <h3
                style={{
                  marginBottom: 16,
                  fontSize: isMobile ? 18 : 20,
                }}
              >
                Resumen
              </h3>

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
                          <h4
                            style={{
                              margin: 0,
                              fontSize: isMobile ? 18 : 20,
                            }}
                          >
                            {stats.total}
                          </h4>
                        </div>
                        <FaCar size={isMobile ? 22 : 26} />
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
                      <h4
                        style={{
                          margin: 0,
                          fontSize: isMobile ? 18 : 20,
                        }}
                      >
                        {stats.programados}
                      </h4>
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
                      <h4
                        style={{
                          margin: 0,
                          fontSize: isMobile ? 18 : 20,
                        }}
                      >
                        {stats.completados}
                      </h4>
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
                      <h4
                        style={{
                          margin: 0,
                          fontSize: isMobile ? 18 : 20,
                        }}
                      >
                        {stats.cancelados}
                      </h4>
                    </div>
                  </div>
                </div>
              </div>
{/*              <div className="row g-3 mb-3">
                <div className="col-12">
                  <div
                    className="card"
                    style={{
                      backgroundColor: "#0b1120",
                      borderRadius: 14,
                      border: "1px solid rgba(55,65,81,0.8)",
                      color: "#f9fafb",
                    }}
                  >
                    <div className="card-body d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">
                      <div>
                        <h5 className="mb-1">Notificaciones push</h5>
                        <p className="mb-1" style={{ opacity: 0.85 }}>
                          Activa los avisos para enterarte cuando un pasajero agenda
                          un viaje contigo.
                        </p>
                        <div style={{ fontSize: 14, opacity: 0.8 }}>
                          Estado: {pushStatus === "granted" && "activadas"}
                          {pushStatus === "idle" && "pendiente"}
                          {pushStatus === "denied" && "bloqueadas por el navegador"}
                          {pushStatus === "unsupported" && "no soportadas"}
                        </div>
                        {pushToken && (
                          <div
                            className="mt-2"
                            style={{
                              fontSize: 12,
                              wordBreak: "break-all",
                              opacity: 0.7,
                            }}
                          >
                            Token guardado
                          </div>
                        )}
                        {pushError && (
                          <div className="mt-2 text-danger" style={{ fontSize: 14 }}>
                            {pushError}
                          </div>
                        )}
                      </div>
                      <div className="d-flex gap-2 align-items-center">
                        <button
                          className="btn btn-success"
                          disabled={
                            activandoPush ||
                            pushStatus === "granted" ||
                            pushStatus === "unsupported"
                          }
                          onClick={activarNotificaciones}
                        >
                          {activandoPush ? "Guardando..." : "Activar notificaciones"}
                        </button>
                        {pushStatus === "denied" && (
                          <small style={{ color: "#fbbf24", maxWidth: 200 }}>
                            Habilita las notificaciones en tu navegador y vuelve a
                            intentarlo.
                          </small>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
*/}
              {/* Info conductor (vista completa, se mantiene igual en desktop) */}
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
                          style={{
                            margin: 0,
                            fontSize: isMobile ? 20 : 24,
                            color: "#f9fafb",
                          }}
                        >
                          {conductor.nombre}
                        </h5>
                        <small
                          style={{
                            opacity: 0.7,
                            fontSize: isMobile ? 14 : 16,
                            color: "#e5e7eb",
                          }}
                        >
                          {conductor.vehiculo}
                        </small>
                      </div>
                      <div className="col-md-8">
                        <div className="row">
                          <div className="col-sm-6">
                            <p
                              style={{
                                fontSize: isMobile ? 15 : 18,
                                color: "#f9fafb",
                              }}
                            >
                              <FaMapMarkerAlt className="me-1" />
                              <strong>Colonia:</strong> {conductor.colonia}
                            </p>
                            <p
                              style={{
                                fontSize: isMobile ? 15 : 18,
                                color: "#f9fafb",
                              }}
                            >
                              <FaClock className="me-1" />
                              <strong>Horario salida:</strong>{" "}
                              {conductor.horario}
                            </p>
                            <p
                              style={{
                                fontSize: isMobile ? 15 : 18,
                                color: "#f9fafb",
                              }}
                            >
                              <FaUsers className="me-1" />
                              <strong>Pasajeros:</strong>{" "}
                              {conductor.pasajeros}
                            </p>
                          </div>
                          <div className="col-sm-6">
                            <p
                              style={{
                                fontSize: isMobile ? 15 : 18,
                                color: "#f9fafb",
                              }}
                            >
                              <FaMoneyBillWave className="me-1" />
                              <strong>Precio:</strong> L {conductor.precio}
                            </p>
                            <p
                              style={{
                                fontSize: isMobile ? 15 : 18,
                                color: "#f9fafb",
                              }}
                            >
                              <FaPhone className="me-1" />
                              <strong>Telefono:</strong>{" "}
                              {conductor.telefono}
                            </p>
                            <p
                              style={{
                                fontSize: isMobile ? 15 : 18,
                                color: "#f9fafb",
                              }}
                            >
                              <FaSchool className="me-1" />
                              <strong>Días clase:</strong>{" "}
                              {(conductor.diasClase || []).length > 0
                                ? conductor.diasClase.join(", ")
                                : "Sin especificar"}
                            </p>
                            <p
                              style={{
                                fontSize: isMobile ? 15 : 18,
                                color: "#f9fafb",
                              }}
                            >
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
              <h3
                style={{
                  marginBottom: 16,
                  color: "#f9fafb",
                  fontSize: isMobile ? 18 : 20,
                }}
              >
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
                    maxHeight: isMobile ? "65vh" : "60vh",
                    overflowY: "auto",
                  }}
                >
                  {viajes.map((v) => {
                    const pasajeroExtra =
                      pasajerosInfo[v.pasajeroEmail] || null;
                    const telefonoPasajero = pasajeroExtra?.telefono
                      ? pasajeroExtra.telefono.toString().replace(/\D/g, "")
                      : "";
                    return (
                      <div
                        key={v.id}
                        className="card mb-2"
                        style={{
                          backgroundColor: "#020617",
                          borderRadius: 14,
                          border: "1px solid rgba(55,65,81,0.8)",
                          fontSize: isMobile ? 14 : 20,
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
                            <strong>Pasajero:</strong>{" "}
                            {pasajeroExtra?.nombre ||
                              v.pasajeroNombre ||
                              "Sin nombre"}{" "}
                            ({v.pasajeroEmail})
                          </p>
                          {pasajeroExtra?.direccion && (
                            <p style={{ marginBottom: 4 }}>
                              <FaMapMarkerAlt className="me-1" />
                              <strong>Direccion:</strong>{" "}
                              {pasajeroExtra.direccion}
                            </p>
                          )}
                          {pasajeroExtra?.telefono && (
                            <p style={{ marginBottom: 4 }}>
                              <FaPhone className="me-1" />
                              <strong>Telefono:</strong>{" "}
                              {pasajeroExtra.telefono}
                            </p>
                          )}
                          {v.conductorColonia && (
                            <p style={{ marginBottom: 4 }}>
                              <FaMapMarkerAlt className="me-1" />
                              <strong>Colonia:</strong>{" "}
                              {v.conductorColonia}
                            </p>
                          )}
                          {v.precio && (
                            <p style={{ marginBottom: 4 }}>
                              <FaMoneyBillWave className="me-1" />
                              <strong>Precio:</strong> L {v.precio}
                            </p>
                          )}

                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 8,
                              marginTop: 8,
                            }}
                          >
                            {v.estado === "programado" && (
                              <button
                                className="btn btn-sm btn-outline-success"
                                onClick={() => marcarCompletado(v.id)}
                                disabled={marcandoId === v.id}
                              >
                                <FaCheckCircle className="me-1" />
                                {marcandoId === v.id
                                  ? "Marcando..."
                                  : "Marcar como completado"}
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-success"
                              disabled={
                                v.estado !== "programado" ||
                                !telefonoPasajero
                              }
                              onClick={() => {
                                if (!telefonoPasajero) return;
                                window.open(
                                  `https://wa.me/${telefonoPasajero}`,
                                  "_blank"
                                );
                              }}
                            >
                              <FaWhatsapp className="me-1" />
                              WhatsApp
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {activeTab === "perfil" && (
            <>
              <h3
                style={{
                  marginBottom: 16,
                  fontSize: isMobile ? 18 : 20,
                }}
              >
                Actualizar datos del conductor
              </h3>
              <form
                onSubmit={guardarPerfil}
                style={{
                  maxWidth: 520,
                  marginTop: 8,
                }}
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
                  <label className="form-label">Telefono</label>
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
