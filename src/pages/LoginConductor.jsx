// src/pages/LoginConductor.jsx
import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

import {
  FaCar,
  FaUserPlus,
  FaSignInAlt,
  FaMoneyBillWave,
  FaUsers,
  FaClock,
  FaMapMarkerAlt,
  FaPhone,
  FaSchool,
  FaArrowLeft,
  FaClipboardCheck,
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

const getEmptyConductorData = () => ({
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

const MAX_CARNET_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const SUPABASE_BUCKET = import.meta.env.VITE_SUPABASE_BUCKET || "carnets";

export default function LoginConductor() {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // 🔹 Detectar si es móvil para adaptar el layout
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

  // Datos del conductor (solo se usan al registrarse)
  const [conductorData, setConductorData] = useState(() =>
    getEmptyConductorData()
  );

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [carnetFile, setCarnetFile] = useState(null);

  const handleChangeConductor = (e) => {
    const { name, value } = e.target;
    setConductorData((prev) => ({
      ...prev,
      [name]:
        name === "pasajeros" || name === "precio" ? Number(value) : value,
    }));
  };

  const toggleDia = (dia) => {
    setConductorData((prev) => {
      const actual = prev.diasClase || [];
      if (actual.includes(dia)) {
        return { ...prev, diasClase: actual.filter((d) => d !== dia) };
      } else {
        return { ...prev, diasClase: [...actual, dia] };
      }
    });
  };

  const toggleCampus = (campus) => {
    setConductorData((prev) => {
      const actual = prev.campus || [];
      if (actual.includes(campus)) {
        return { ...prev, campus: actual.filter((c) => c !== campus) };
      }
      return { ...prev, campus: [...actual, campus] };
    });
  };

  const handleCarnetChange = (e) => {
    const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    if (file && file.size > MAX_CARNET_FILE_SIZE) {
      setError("El archivo del carnet debe ser menor a 5 MB.");
      e.target.value = "";
      setCarnetFile(null);
      return;
    }
    setError("");
    setCarnetFile(file);
  };

  const resetConductorForm = () => {
    setConductorData(getEmptyConductorData());
    setCarnetFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      if (isRegister) {
        if (!carnetFile) {
          setError("Debes adjuntar una foto o PDF de tu carnet universitario.");
          return;
        }
        if (!conductorData.campus || conductorData.campus.length === 0) {
          setError("Selecciona al menos un campus donde recoges pasajeros.");
          return;
        }

        const res = await createUserWithEmailAndPassword(auth, email, password);
        const uid = res.user.uid;

        await setDoc(doc(db, "usuarios", uid), {
          email,
          role: "conductor",
          createdAt: new Date().toISOString(),
        });

        const {
          nombre,
          colonia,
          horario,
          pasajeros,
          placa,
          precio,
          telefono,
          vehiculo,
          diasClase,
          campus,
        } = conductorData;

        let carnetUrl = "";
        if (carnetFile) {
          if (!supabase) {
            throw new Error(
              "Supabase no está configurado para subir el carnet. Revisa la conexión."
            );
          }
          if (!SUPABASE_BUCKET) {
            throw new Error(
              "No se encontró la variable VITE_SUPABASE_BUCKET para subir el carnet."
            );
          }
          const filePath = `${uid}/${Date.now()}_${carnetFile.name}`;
          const { error: uploadError } = await supabase.storage
            .from(SUPABASE_BUCKET)
            .upload(filePath, carnetFile, {
              upsert: true,
              cacheControl: "3600",
              contentType: carnetFile.type || "application/octet-stream",
            });
          if (uploadError) {
            throw new Error(
              `No se pudo cargar el carnet: ${uploadError.message}`
            );
          }
          const { data: publicData } = supabase.storage
            .from(SUPABASE_BUCKET)
            .getPublicUrl(filePath);
          carnetUrl = publicData?.publicUrl || "";
        }

        await setDoc(doc(db, "conductores", uid), {
          nombre,
          colonia,
          horario,
          pasajeros,
          placa,
          precio,
          telefono,
          vehiculo,
          campus: campus || [],
          foto: "default.png",
          diasClase: diasClase || [],
          carnetUrl,
          aprobado: false,
          aprobadoPor: null,
          aprobadoEl: null,
          email,
          uid,
          createdAt: new Date().toISOString(),
        });

        await signOut(auth);
        resetConductorForm();
        setEmail("");
        setPassword("");
        setIsRegister(false);
        setNotice(
          "Tu registro fue recibido. Un administrador revisará tu carnet y aprobará tu cuenta pronto."
        );
        return;
      }

      const cred = await signInWithEmailAndPassword(auth, email, password);
      const conductorRef = doc(db, "conductores", cred.user.uid);
      const conductorSnap = await getDoc(conductorRef);

      if (!conductorSnap.exists()) {
        await signOut(auth);
        setError(
          "No encontramos tu información de conductor. Contáctanos para completar tu registro."
        );
        return;
      }

      const conductorInfo = conductorSnap.data();
      if (conductorInfo.aprobado === false) {
        await signOut(auth);
        setError(
          "Tu cuenta de conductor sigue en revisión. Te avisaremos cuando haya sido aprobada."
        );
        return;
      }

      navigate("/panel-conductor");
    } catch (err) {
      console.error(err);
      setError(
        err?.message ||
          "No se pudo procesar la solicitud. Intenta nuevamente más tarde."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at top, #22c55e20 0%, #020617 55%, #000 100%)",
        padding: isMobile ? 12 : 16,
      }}
    >
      {/* Card principal */}
      <div
        style={{
          width: "100%",
          maxWidth: 900,
          backgroundColor: "rgba(15,23,42,0.95)",
          borderRadius: 20,
          border: "1px solid rgba(148,163,184,0.5)",
          color: "#f9fafb",
          display: "grid",
          gridTemplateColumns: isMobile
            ? "1fr"
            : "minmax(0, 1.1fr) minmax(0, 1fr)", // 👉 en móvil se apila, en desktop queda igual
          overflow: "hidden",
        }}
      >
        {/* Columna izquierda: formulario */}
        <div
          style={{
            padding: isMobile ? "18px 16px 14px 16px" : "22px 22px 18px 22px",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: isMobile ? "flex-start" : "center",
              gap: isMobile ? 8 : 0,
              marginBottom: 16,
              flexDirection: isMobile ? "column" : "row",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "999px",
                  background:
                    "linear-gradient(135deg,#22c55e,#16a34a,#15803d)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#0b1120",
                }}
              >
                <FaCar />
              </div>
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: isMobile ? "1.1rem" : "1.2rem",
                  }}
                >
                  {isRegister
                    ? "Registro de Conductor"
                    : "Inicio de sesión Conductor"}
                </h3>
                <small style={{ opacity: 0.75, fontSize: isMobile ? 12 : 13 }}>
                  Acceso exclusivo para conductores de CarPool.
                </small>
              </div>
            </div>

            <button
              onClick={() => navigate("/")}
              className="btn btn-sm btn-outline-light"
              style={{
                alignSelf: isMobile ? "flex-end" : "auto",
                paddingInline: isMobile ? 10 : undefined,
              }}
            >
              <FaArrowLeft className="me-1" />
              Pasajeros
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Credenciales */}
            <div className="mb-2">
              <label className="form-label">Correo</label>
              <input
                type="email"
                className="form-control"
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Contraseña</label>
              <input
                type="password"
                className="form-control"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {/* Datos del conductor solo al registrarse */}
            {isRegister && (
              <>
                <hr style={{ borderColor: "rgba(148,163,184,0.5)" }} />
                <h5 style={{ marginBottom: 12 }}>
                  <FaUserPlus className="me-2" />
                  Datos del Conductor
                </h5>

                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-2">
                      <label className="form-label">Nombre completo</label>
                      <input
                        type="text"
                        name="nombre"
                        className="form-control"
                        placeholder="Carlos Martínez"
                        value={conductorData.nombre}
                        onChange={handleChangeConductor}
                        required
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-2">
                      <label className="form-label">Colonia</label>
                      <input
                        type="text"
                        name="colonia"
                        className="form-control"
                        placeholder="Los Álamos"
                        value={conductorData.colonia}
                        onChange={handleChangeConductor}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="mb-2">
                  <label className="form-label">Vehículo</label>
                  <input
                    type="text"
                    name="vehiculo"
                    className="form-control"
                    placeholder="Toyota Corolla 2015"
                    value={conductorData.vehiculo}
                    onChange={handleChangeConductor}
                    required
                  />
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-2">
                      <label className="form-label">Placa</label>
                      <input
                        type="text"
                        name="placa"
                        className="form-control"
                        placeholder="HBD-1234"
                        value={conductorData.placa}
                        onChange={handleChangeConductor}
                        required
                      />
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="mb-2">
                      <label className="form-label">Teléfono</label>
                      <input
                        type="tel"
                        name="telefono"
                        className="form-control"
                        placeholder="+504 9770-1122"
                        value={conductorData.telefono}
                        onChange={handleChangeConductor}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-2">
                      <label className="form-label">
                        Horario salida (ej. 6:00 PM)
                      </label>
                      <input
                        type="text"
                        name="horario"
                        className="form-control"
                        placeholder="6:00 PM"
                        value={conductorData.horario}
                        onChange={handleChangeConductor}
                        required
                      />
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="mb-2">
                      <label className="form-label">
                        Precio por viaje (Lempiras)
                      </label>
                      <input
                        type="number"
                        name="precio"
                        className="form-control"
                        placeholder="25"
                        value={conductorData.precio}
                        onChange={handleChangeConductor}
                        min={0}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Cantidad de pasajeros
                      </label>
                      <input
                        type="number"
                        name="pasajeros"
                        className="form-control"
                        placeholder="3"
                        value={conductorData.pasajeros}
                        onChange={handleChangeConductor}
                        min={1}
                        required
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    {/* Multiselect de días */}
                    <div className="mb-3">
                      <label className="form-label">
                        Días que va a clase
                      </label>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 8,
                          fontSize: 13,
                        }}
                      >
                        {DIAS_SEMANA.map((dia) => (
                          <label
                            key={dia}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              padding: "4px 10px",
                              borderRadius: 999,
                              border: "1px solid rgba(148,163,184,0.7)",
                              cursor: "pointer",
                              backgroundColor: conductorData.diasClase.includes(
                                dia
                              )
                                ? "rgba(34,197,94,0.2)"
                                : "transparent",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={conductorData.diasClase.includes(dia)}
                              onChange={() => toggleDia(dia)}
                              style={{ accentColor: "#22c55e" }}
                            />
                            {dia}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">
                    Campus donde recoges pasajeros
                  </label>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      fontSize: 13,
                    }}
                  >
                    {CAMPUS_OPTIONS.map((campus) => (
                      <label
                        key={campus}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "4px 10px",
                          borderRadius: 999,
                          border: "1px solid rgba(148,163,184,0.7)",
                          cursor: "pointer",
                          backgroundColor: conductorData.campus.includes(campus)
                            ? "rgba(34,197,94,0.2)"
                            : "transparent",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={conductorData.campus.includes(campus)}
                          onChange={() => toggleCampus(campus)}
                          style={{ accentColor: "#22c55e" }}
                        />
                        {campus}
                      </label>
                    ))}
                  </div>
                  <small style={{ fontSize: 12, opacity: 0.75 }}>
                    Puedes seleccionar varias sedes si aplican.
                  </small>
                </div>

                <div className="mb-3">
                  <label className="form-label">
                    Carnet universitario (imagen o PDF)
                  </label>
                  <input
                    type="file"
                    className="form-control"
                    accept="image/*,.pdf"
                    onChange={handleCarnetChange}
                    required
                  />
                  {carnetFile && (
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                      Archivo seleccionado: <strong>{carnetFile.name}</strong>
                    </div>
                  )}
                  <small style={{ fontSize: 12, opacity: 0.75 }}>
                    Máximo 5 MB. Esta evidencia se revisará antes de habilitar
                    tu cuenta.
                  </small>
                </div>
              </>
            )}

            {error && (
              <div
                className="alert alert-danger py-2 mt-2"
                style={{ fontSize: 14 }}
              >
                {error}
              </div>
            )}

            {notice && (
              <div
                className="alert alert-info py-2 mt-2"
                style={{ fontSize: 14 }}
              >
                {notice}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-success w-100 mt-2"
              style={{ borderRadius: 999 }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                "Procesando..."
              ) : isRegister ? (
                <>
                  <FaUserPlus className="me-2" />
                  Registrarse como Conductor
                </>
              ) : (
                <>
                  <FaSignInAlt className="me-2" />
                  Entrar
                </>
              )}
            </button>
          </form>

          <p style={{ marginTop: 12, textAlign: "center", fontSize: 14 }}>
            {isRegister
              ? "¿Ya eres conductor registrado?"
              : "¿Eres nuevo conductor?"}{" "}
            <span
              style={{ color: "#22c55e", cursor: "pointer" }}
              onClick={() => {
                setIsRegister(!isRegister);
                setError("");
                setNotice("");
              }}
            >
              {isRegister ? "Inicia sesión" : "Regístrate"}
            </span>
          </p>
        </div>

        {/* Columna derecha: info / resumen visual */}
        <div
          style={{
            background:
              "radial-gradient(circle at top, #22c55e40 0%, #022c22 50%, #020617 100%)",
            padding: isMobile ? 16 : 22,
            borderLeft: isMobile
              ? "none"
              : "1px solid rgba(31,41,55,0.9)", // en móvil quitamos el borde lateral
            borderTop: isMobile
              ? "1px solid rgba(31,41,55,0.9)"
              : "none", // en móvil parece una sección debajo
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h4
              style={{
                marginBottom: 10,
                display: "flex",
                gap: 8,
                alignItems: "center",
                fontSize: isMobile ? 16 : 18,
              }}
            >
              <FaCar /> <span>Conduce con CarPool</span>
            </h4>
            <p
              style={{
                fontSize: isMobile ? 13 : 14,
                opacity: 0.9,
              }}
            >
              Registra tu ruta, horario y vehículo para que los estudiantes
              puedan agendar viajes contigo de forma rápida y segura.
            </p>

            <div className="mt-3">
              <div
                className="card mb-2"
                style={{
                  backgroundColor: "rgba(15,23,42,0.9)",
                  borderRadius: 14,
                  border: "1px solid rgba(55,65,81,0.8)",
                }}
              >
                <div className="card-body py-2">
                  <p
                    style={{
                      marginBottom: 4,
                      fontSize: isMobile ? 13 : 14,
                      color: "#fafafaff",
                    }}
                  >
                    <FaMapMarkerAlt className="me-2" />
                    Define tu <strong>colonia de salida</strong> y el vehículo
                    que utilizas.
                  </p>
                </div>
              </div>

              <div
                className="card mb-2"
                style={{
                  backgroundColor: "rgba(15,23,42,0.9)",
                  borderRadius: 14,
                  border: "1px solid rgba(55,65,81,0.8)",
                }}
              >
                <div className="card-body py-2">
                  <p
                    style={{
                      marginBottom: 4,
                      fontSize: isMobile ? 13 : 14,
                      color: "#fafafaff",
                    }}
                  >
                    <FaClock className="me-2" />
                    Establece tu <strong>horario de salida</strong> y el{" "}
                    <strong>costo por viaje</strong>.
                  </p>
                </div>
              </div>

              <div
                className="card mb-2"
                style={{
                  backgroundColor: "rgba(15,23,42,0.9)",
                  borderRadius: 14,
                  border: "1px solid rgba(55,65,81,0.8)",
                }}
              >
                <div className="card-body py-2">
                  <p
                    style={{
                      marginBottom: 4,
                      fontSize: isMobile ? 13 : 14,
                      color: "#fafafaff",
                    }}
                  >
                    <FaUsers className="me-2" />
                    Define cuántos <strong>pasajeros</strong> puedes llevar.
                  </p>
                </div>
              </div>

              <div
                className="card"
                style={{
                  backgroundColor: "rgba(15,23,42,0.9)",
                  borderRadius: 14,
                  border: "1px solid rgba(55,65,81,0.8)",
                }}
              >
                <div className="card-body py-2">
                  <p
                    style={{
                      marginBottom: 4,
                      fontSize: isMobile ? 13 : 14,
                      color: "#fafafaff",
                    }}
                  >
                    <FaSchool className="me-2" />
                    Selecciona los <strong>días que vas a clase</strong> para
                    que solo esos días puedan agendar contigo.
                  </p>
                </div>
              </div>

              <div
                className="card mt-2"
                style={{
                  backgroundColor: "rgba(15,23,42,0.9)",
                  borderRadius: 14,
                  border: "1px solid rgba(55,65,81,0.8)",
                }}
              >
                <div className="card-body py-2">
                  <p
                    style={{
                      marginBottom: 4,
                      fontSize: isMobile ? 13 : 14,
                      color: "#fafafaff",
                    }}
                  >
                    <FaClipboardCheck className="me-2" />
                    Adjunta tu <strong>carnet universitario</strong>. Un
                    administrador verificará la información y aprobará tu cuenta
                    manualmente.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              fontSize: 12,
              opacity: 0.75,
              textAlign: "center",
            }}
          >
            © {new Date().getFullYear()} CarPool — Panel de conductores
          </div>
        </div>
      </div>
    </div>
  );
}
