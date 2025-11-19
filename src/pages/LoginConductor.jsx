// src/pages/LoginConductor.jsx
import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
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
} from "react-icons/fa";

const DIAS_SEMANA = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

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
  const [conductorData, setConductorData] = useState({
    nombre: "",
    colonia: "",
    horario: "",
    pasajeros: 3,
    placa: "",
    precio: 0,
    telefono: "",
    vehiculo: "",
    diasClase: [],
  });

  const [error, setError] = useState("");

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      if (isRegister) {
        // Crear usuario en Auth
        const res = await createUserWithEmailAndPassword(auth, email, password);

        const uid = res.user.uid;

        // 1) Guardar en "usuarios" con rol conductor
        await setDoc(doc(db, "usuarios", uid), {
          email,
          role: "conductor",
          createdAt: new Date().toISOString(),
        });

        // 2) Guardar en "conductores"
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
        } = conductorData;

        await setDoc(doc(db, "conductores", uid), {
          nombre,
          colonia,
          horario,
          pasajeros,
          placa,
          precio,
          telefono,
          vehiculo,
          foto: "default.png",
          diasClase: diasClase || [],
          email,
          uid,
          createdAt: new Date().toISOString(),
        });

        alert("Cuenta de conductor creada correctamente");
      } else {
        // Iniciar sesión
        await signInWithEmailAndPassword(auth, email, password);
      }

      // Redirigir al home de conductor
      navigate("/panel-conductor");
    } catch (err) {
      console.error(err);
      setError(err.message);
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

            <button
              type="submit"
              className="btn btn-success w-100 mt-2"
              style={{ borderRadius: 999 }}
            >
              {isRegister ? (
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
              onClick={() => setIsRegister(!isRegister)}
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
