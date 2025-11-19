// ------------- Agendar Viaje con Conductor --------------

import React, { useEffect, useState, useMemo } from "react";
import { auth, db } from "../firebase";
import {
  collection,
  getDocs,
  query,
  doc,
  setDoc,
  updateDoc,
  where,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

import {
  FaCarSide,
  FaUserCircle,
  FaMapMarkerAlt,
  FaClock,
  FaUsers,
  FaMoneyBillWave,
  FaCalendarAlt,
  FaPhone,
  FaSchool,
  FaUniversity,
  FaWhatsapp,
} from "react-icons/fa";

function AgendarViaje() {
  const [conductores, setConductores] = useState([]);
  const [viajes, setViajes] = useState([]);

  const [pasajero, setPasajero] = useState(null);
  const [loadingPasajero, setLoadingPasajero] = useState(true);

  const [form, setForm] = useState({
    conductorId: "",
    fecha: "",
    horario: "",
  });

  const [agendando, setAgendando] = useState(false);

  // Obtener pasajero segun usuario logueado
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setPasajero(null);
        setLoadingPasajero(false);
        return;
      }

      try {
        const qPasajero = query(
          collection(db, "pasajeros"),
          where("email", "==", user.email)
        );
        const snap = await getDocs(qPasajero);

        if (!snap.empty) {
          const d = snap.docs[0];
          setPasajero({ id: d.id, ...d.data() });
        } else {
          const ref = doc(collection(db, "pasajeros"));
          const payload = {
            nombre: user.displayName || user.email,
            email: user.email,
            identidad: "",
            uid: user.uid,
            createdAt: serverTimestamp(),
          };
          await setDoc(ref, payload);
          setPasajero({ id: ref.id, ...payload });
        }
      } catch (err) {
        console.error("Error cargando pasajero del usuario:", err);
      } finally {
        setLoadingPasajero(false);
      }
    });

    return () => unsub();
  }, []);

  // Cargar conductores
  useEffect(() => {
    const loadConductores = async () => {
      const snap = await getDocs(collection(db, "conductores"));
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setConductores(rows);
    };
    loadConductores();
  }, []);

  // Viajes ya agendados para evitar horarios ocupados
  useEffect(() => {
    const qViajes = query(collection(db, "viajes"));
    const unsub = onSnapshot(qViajes, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setViajes(rows);
    });
    return () => unsub();
  }, []);

  // Horarios disponibles del conductor con control de cupos (pasajeros)
  const horariosDisponibles = useMemo(() => {
    if (!form.conductorId || !form.fecha) return [];

    const conductor = conductores.find((c) => c.id === form.conductorId);
    if (!conductor) return [];

    let posibles = [];
    if (Array.isArray(conductor.horarios)) {
      posibles = conductor.horarios;
    } else if (
      typeof conductor.horario === "string" &&
      conductor.horario.trim() !== ""
    ) {
      posibles = [conductor.horario.trim()];
    } else {
      return [];
    }

    const capacidad = Number(conductor.pasajeros) || 0;
    const ocupados = viajes
      .filter(
        (v) => v.conductorId === form.conductorId && v.fecha === form.fecha
      )
      .reduce((acc, v) => {
        acc[v.horario] = (acc[v.horario] || 0) + 1;
        return acc;
      }, {});

    return posibles.map((hora) => {
      const usados = ocupados[hora] || 0;
      const disponible = capacidad > 0 ? usados < capacidad : usados === 0;
      const restantes = capacidad > 0 ? Math.max(capacidad - usados, 0) : 0;
      return { hora, disponible, restantes, capacidad };
    });
  }, [form.conductorId, form.fecha, conductores, viajes]);

  // Limpiar horario seleccionado si ya no está disponible
  useEffect(() => {
    if (!form.horario) return;
    const slot = horariosDisponibles.find((h) => h.hora === form.horario);
    if (!slot || !slot.disponible) {
      setForm((f) => ({ ...f, horario: "" }));
    }
  }, [form.horario, horariosDisponibles]);

  const conductorSeleccionado = useMemo(() => {
    if (!form.conductorId) return null;
    return conductores.find((c) => c.id === form.conductorId) || null;
  }, [conductores, form.conductorId]);

  const diasPermitidos = useMemo(() => {
    if (!conductorSeleccionado?.diasClase) return [];

    const mapaDias = {
      domingo: 0,
      lunes: 1,
      martes: 2,
      miércoles: 3,
      miercoles: 3,
      jueves: 4,
      viernes: 5,
      sábado: 6,
      sabado: 6,
    };

    return conductorSeleccionado.diasClase
      .map((dia) =>
        mapaDias[
          dia
            .toString()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
        ]
      )
      .filter((dia) => dia !== undefined);
  }, [conductorSeleccionado]);

  const telefonoWhatsApp = useMemo(() => {
    if (!conductorSeleccionado?.telefono) return "";
    return conductorSeleccionado.telefono.toString().replace(/\D/g, "");
  }, [conductorSeleccionado]);

  const [fechaError, setFechaError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "fecha") {
      if (!value) {
        setFechaError("");
        setForm((f) => ({ ...f, fecha: "", horario: "" }));
        return;
      }

      const fechaSeleccionada = new Date(`${value}T00:00:00`);
      if (Number.isNaN(fechaSeleccionada.getTime())) {
        setFechaError("Fecha inválida.");
        setForm((f) => ({ ...f, fecha: "", horario: "" }));
        return;
      }

      const diaSemana = fechaSeleccionada.getDay();
      if (diasPermitidos.length > 0 && !diasPermitidos.includes(diaSemana)) {
        setFechaError("El conductor no viaja ese día. Elige un día permitido.");
        setForm((f) => ({ ...f, fecha: "", horario: "" }));
        return;
      }

      setFechaError("");
      setForm((f) => ({ ...f, fecha: value }));
      return;
    }

    setForm((f) => ({ ...f, [name]: value }));
  };

  useEffect(() => {
    if (!form.fecha) {
      setFechaError("");
      return;
    }

    const fechaSeleccionada = new Date(`${form.fecha}T00:00:00`);
    if (Number.isNaN(fechaSeleccionada.getTime())) return;

    const diaSemana = fechaSeleccionada.getDay();
    if (diasPermitidos.length > 0 && !diasPermitidos.includes(diaSemana)) {
      setFechaError("El conductor no viaja ese día. Elige un día permitido.");
      setForm((f) => ({ ...f, fecha: "", horario: "" }));
    }
  }, [diasPermitidos, form.fecha]);

  // Agendar viaje
  const agendarViaje = async (e) => {
    e.preventDefault();

    if (!pasajero)
      return alert("No se pudo obtener el pasajero. Inicia sesión de nuevo.");
    if (!form.conductorId || !form.fecha || !form.horario)
      return alert("Completa todos los campos.");

    setAgendando(true);

    try {
      const conductor = conductores.find((c) => c.id === form.conductorId);

      const ref = doc(collection(db, "viajes"));
      await setDoc(ref, {
        pasajeroId: pasajero.id,
        pasajeroNombre: pasajero.nombre,
        pasajeroEmail: pasajero.email,
        conductorId: conductor.id,
        conductorNombre: conductor.nombre,
        fecha: form.fecha,
        horario: form.horario,
        estado: "programado",
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, "pasajeros", pasajero.id), {
        ultimoViajeId: ref.id,
        ultimoViajeFecha: form.fecha,
      });

      alert("🚗 Viaje agendado correctamente.");
      setForm({ conductorId: "", fecha: "", horario: "" });
    } catch (err) {
      console.error(err);
      alert("Error al agendar viaje");
    } finally {
      setAgendando(false);
    }
  };

  // ------------------- UI -------------------
  if (loadingPasajero) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at top, #1f2937 0%, #020617 55%, #000 100%)",
          color: "#f9fafb",
        }}
      >
        <div className="spinner-border text-success me-2" role="status" />
        <span>Cargando datos del pasajero...</span>
      </div>
    );
  }

  if (!pasajero) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at top, #1f2937 0%, #020617 55%, #000 100%)",
          color: "#f9fafb",
          textAlign: "center",
          padding: 20,
        }}
      >
        Debes iniciar sesión para agendar un viaje.
      </div>
    );
  }

  return (
    <div
      style={{
        background:
          "radial-gradient(circle at top, #22c55e20 0%, #020617 55%, #000 100%)",
        minHeight: "100vh",
        padding: "24px 12px",
        color: "#f8fafc",
      }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        {/* Encabezado */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
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
              <h2 style={{ margin: 0, color: "#e2e8f0", fontSize: "1.6rem" }}>
                Agendar Viaje
              </h2>
              <small style={{ color: "rgba(226,232,240,0.7)" }}>
                Elige conductor, fecha y horario para tu próximo viaje.
              </small>
            </div>
          </div>
        </div>

        {/* Card pasajero */}
        <div className="mb-3">
          <div
            className="card"
            style={{
              backgroundColor: "rgba(15,23,42,0.95)",
              borderRadius: 16,
              border: "1px solid rgba(148,163,184,0.4)",
            }}
          >
            <div className="card-body d-flex align-items-center gap-3">
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "999px",
                  background: "rgba(34,197,94,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FaUserCircle size={22} color="#fff" />
              </div>
              <div style={{ fontSize: 14, color: "#e2e8f0" }}>
                <div style={{ fontWeight: 600, color: "#e2e8f0"  }}>{pasajero.nombre}</div>
                <div style={{ opacity: 0.8 }}>{pasajero.email}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Layout principal */}
        <div className="row g-3">
          {/* Formulario */}
          <div className="col-12 col-lg-6">
            <div
              className="card h-100"
              style={{
                backgroundColor: "#0f172a",
                borderRadius: 16,
                border: "1px solid rgba(59,130,246,0.15)",
                color: "#f8fafc",
              }}
            >
              <div className="card-body text-white">
                <h5 style={{ color: "#e2e8f0", marginBottom: 12 }}>
                  Datos del viaje
                </h5>
                <form onSubmit={agendarViaje}>
                  <label className="form-label mt-2">Conductor</label>
                  <select
                    name="conductorId"
                    className="form-control mb-2 bg-dark text-light"
                    value={form.conductorId}
                    onChange={handleChange}
                    style={{
                      borderColor: "#1f2937",
                      fontSize: 14,
                    }}
                  >
                    <option value="">Seleccione conductor</option>
                    {conductores.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} — {c.colonia}
                      </option>
                    ))}
                  </select>

                  <div className="row">
                    <div className="col-12 col-sm-6">
                      <label className="form-label">Fecha</label>
                      <input
                        type="date"
                        name="fecha"
                        className="form-control mb-2 bg-dark text-light"
                        value={form.fecha}
                        onChange={handleChange}
                        style={{ borderColor: "#1f2937", fontSize: 14 }}
                      />
                      {conductorSeleccionado?.diasClase?.length ? (
                        <small style={{ color: "rgba(226,232,240,0.7)" }}>
                          Días permitidos: {conductorSeleccionado.diasClase.join(", ")}
                        </small>
                      ) : null}
                      {fechaError ? (
                        <div style={{ color: "#fda4af", fontSize: 12 }}>{fechaError}</div>
                      ) : null}
                    </div>
                    <div className="col-12 col-sm-6">
                      <label className="form-label">Horario</label>
                      <select
                        name="horario"
                        className="form-control mb-2 bg-dark text-light"
                        value={form.horario}
                        onChange={handleChange}
                        disabled={!form.fecha || horariosDisponibles.length === 0}
                        style={{ borderColor: "#1f2937", fontSize: 14 }}
                      >
                        <option value="">
                          {form.fecha
                            ? horariosDisponibles.length > 0
                              ? "Seleccione horario"
                              : "Sin horarios disponibles"
                            : "Seleccione primero una fecha"}
                        </option>
                        {horariosDisponibles.map((h, i) => (
                          <option
                            key={i}
                            value={h.hora}
                            disabled={!h.disponible}
                          >
                            {h.hora}
                            {h.capacidad > 0
                              ? ` — ${h.restantes} de ${h.capacidad} libres`
                              : ""}
                            {!h.disponible ? " (No disponible)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Resumen rápido selección */}
                  {form.fecha && form.horario && (
                    <div
                      className="mt-2 mb-2"
                      style={{ fontSize: 13, opacity: 0.9 }}
                    >
                      <span
                        className="badge me-2"
                        style={{
                          backgroundColor: "#1f2937",
                          color: "#e5e7eb",
                        }}
                      >
                        <FaCalendarAlt className="me-1" />
                        {form.fecha}
                      </span>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: "#1f2937",
                          color: "#e5e7eb",
                        }}
                      >
                        <FaClock className="me-1" />
                        {form.horario}
                      </span>
                    </div>
                  )}

                  <button
                    className="btn btn-success w-100 mt-2"
                    disabled={agendando}
                    style={{ padding: "10px 0", borderRadius: 999 }}
                  >
                    {agendando ? "Agendando…" : "Confirmar viaje"}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Info conductor seleccionado */}
          <div className="col-12 col-lg-6">
            <div
              className="card h-100"
              style={{
                backgroundColor: "#020617",
                borderRadius: 16,
                border: "1px solid rgba(148,163,184,0.2)",
                color: "#f8fafc",
              }}
            >
              <div className="card-body text-white">
                <h5 style={{ color: "#e2e8f0", marginBottom: 12 }}>
                  Conductor seleccionado
                </h5>
                {conductorSeleccionado ? (
                  <>
                    <div className="d-flex align-items-center mb-3">
                      <div
                        style={{
                          width: 54,
                          height: 54,
                          borderRadius: "999px",
                          background:
                            "linear-gradient(135deg,#22c55e,#16a34a)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 26,
                          marginRight: 10,
                          color: "#f9fafb",
                        }}
                      >
                        {conductorSeleccionado.nombre
                          ? conductorSeleccionado.nombre
                              .charAt(0)
                              .toUpperCase()
                          : "C"}
                      </div>
                      <div style={{ fontSize: 14 }}>
                        <div style={{ fontWeight: 600 }}>
                          {conductorSeleccionado.nombre}
                        </div>
                        <div style={{ opacity: 0.8 }}>
                          {conductorSeleccionado.vehiculo || "Vehículo N/D"}
                        </div>
                      </div>
                    </div>

                    <p>
                      <FaMapMarkerAlt className="me-1" />
                      <strong>Colonia:</strong>{" "}
                      {conductorSeleccionado.colonia || "N/D"}
                    </p>
                    <p>
                      <FaClock className="me-1" />
                      <strong>Horario(s):</strong>{" "}
                      {Array.isArray(conductorSeleccionado.horarios)
                        ? conductorSeleccionado.horarios.join(", ")
                        : conductorSeleccionado.horario || "N/D"}
                    </p>
                    <p>
                      <FaUsers className="me-1" />
                      <strong>Pasajeros:</strong>{" "}
                      {conductorSeleccionado.pasajeros || "N/D"}
                    </p>
                    <p>
                      <FaMoneyBillWave className="me-1" />
                      <strong>Precio:</strong>{" "}
                      {conductorSeleccionado.precio
                        ? `L ${conductorSeleccionado.precio}`
                        : "N/D"}
                    </p>
                    <p>
                      <FaPhone className="me-1" />
                      <strong>Teléfono:</strong>{" "}
                      {conductorSeleccionado.telefono || "N/D"}
                    </p>
                    <p>
                      <FaSchool className="me-1" />
                      <strong>Días clase:</strong>{" "}
                      {(conductorSeleccionado.diasClase || []).length > 0
                        ? conductorSeleccionado.diasClase.join(", ")
                        : "Sin especificar"}
                    </p>
                    <p>
                      <FaUniversity className="me-1" />
                      <strong>Campus:</strong>{" "}
                      {(conductorSeleccionado.campus || []).length > 0
                        ? conductorSeleccionado.campus.join(", ")
                        : "Sin especificar"}
                    </p>

                    <button
                      type="button"
                      className="btn btn-outline-success w-100 mt-3"
                      disabled={!telefonoWhatsApp}
                      onClick={() => {
                        if (!telefonoWhatsApp) return;
                        window.open(
                          `https://wa.me/${telefonoWhatsApp}`,
                          "_blank"
                        );
                      }}
                      style={{
                        borderRadius: 999,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                      }}
                    >
                      <FaWhatsapp />
                      Contactar por WhatsApp
                    </button>
                  </>
                ) : (
                  <p style={{ color: "rgba(248,250,252,0.7)", marginTop: 8 }}>
                    Selecciona un conductor en el formulario para ver sus datos
                    y poder contactarlo.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AgendarViaje;
