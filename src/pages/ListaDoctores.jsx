import React, { useEffect, useMemo, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import {
  FaCarSide,
  FaClock,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaPhone,
  FaUniversity,
  FaUsers,
  FaWhatsapp,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const USE_FIREBASE = true;

const images = import.meta.glob(
  "/src/assets/conductores/*.{png,PNG,jpg,JPG,jpeg,JPEG,webp,WEBP,svg,SVG}",
  { eager: true, as: "url" }
);

const imageMap = Object.fromEntries(
  Object.entries(images).map(([path, url]) => {
    const file = path.split("/").pop();
    return [file.toLowerCase(), url];
  })
);

const defaultAvatar =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'>
      <rect width='128' height='128' fill='#0f172a'/>
      <circle cx='64' cy='46' r='22' fill='#22c55e'/>
      <rect x='32' y='80' width='64' height='35' rx='6' fill='#22c55e'/>
    </svg>
  `);

const slugify = (str = "") =>
  str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

function getImage(conductor) {
  const { nombre, id, foto } = conductor;
  if (foto) {
    const key = foto.toLowerCase();
    if (imageMap[key]) return imageMap[key];

    if (/^https?:\/\//i.test(foto)) return foto;
    return `/assets/conductores/${foto}`;
  }

  const possible = [
    `${slugify(nombre)}.jpg`,
    `${slugify(nombre)}.png`,
    `${id}.jpg`,
    "default.png",
  ];
  for (let file of possible) {
    if (imageMap[file.toLowerCase()]) return imageMap[file.toLowerCase()];
  }
  return defaultAvatar;
}

function ListaConductores({ onAgendar }) {
  const [conductores, setConductores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      setCargando(true);
      let base = [];

      if (USE_FIREBASE) {
        try {
          const querySnapshot = await getDocs(collection(db, "conductores"));
          const fromFb = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          base = fromFb;
        } catch (e) {
          console.warn("No se pudo cargar desde Firebase", e);
        }
      }

      setConductores(base);
      setCargando(false);
    })();
  }, []);

  const cards = useMemo(() => {
    return conductores.map((c) => {
      const telefonoWa = c.telefono
        ? c.telefono.toString().replace(/\D/g, "")
        : "";
      return (
        <div
          key={c.id}
          className="col-12 col-md-6 col-lg-4 d-flex align-items-stretch"
        >
          <div
            className="card mb-4"
            style={{
              backgroundColor: "#0f172a",
              borderRadius: 16,
              border: "1px solid rgba(59,130,246,0.15)",
              color: "#f8fafc",
              overflow: "hidden",
              width: "100%",
            }}
          >
            <div className="ratio ratio-4x3 bg-black">
              <img
                src={getImage(c)}
                alt={c.nombre}
                className="w-100 h-100"
                style={{ objectFit: "cover" }}
                onError={(e) => (e.currentTarget.src = defaultAvatar)}
              />
            </div>

            <div className="card-body d-flex flex-column text-white">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <h5 className="card-title mb-1" style={{ color: "#e2e8f0" }}>
                    {c.nombre}
                  </h5>
                  <small style={{ color: "rgba(226,232,240,0.75)" }}>
                    {c.vehiculo || "Vehículo N/D"} — {c.colonia || "Colonia N/D"}
                  </small>
                </div>
              </div>

              <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                <p className="mb-1">
                  <FaClock className="me-1" />
                  <strong>Horario(s):</strong>{" "}
                  {Array.isArray(c.horarios)
                    ? c.horarios.join(", ")
                    : c.horario || "N/D"}
                </p>
                <p className="mb-1">
                  <FaUsers className="me-1" />
                  <strong>Pasajeros:</strong> {c.pasajeros || "N/D"}
                </p>
                <p className="mb-1">
                  <FaMoneyBillWave className="me-1" />
                  <strong>Precio:</strong>{" "}
                  {c.precio ? `L ${c.precio}` : "N/D"}
                </p>
                <p className="mb-1">
                  <FaPhone className="me-1" />
                  <strong>Telefono:</strong> {c.telefono || "N/D"}
                </p>
                <p className="mb-1">
                  <FaUniversity className="me-1" />
                  <strong>Campus:</strong>{" "}
                  {(c.campus || []).length > 0
                    ? c.campus.join(", ")
                    : "Sin especificar"}
                </p>
              </div>

              <div className="mt-auto d-flex flex-wrap gap-2">
                <button
                  className="btn btn-success flex-grow-1"
                  style={{ borderRadius: 12 }}
                  onClick={() =>
                    onAgendar ? onAgendar() : navigate("/agendar-viaje")
                  }
                >
                  Agendar viaje
                </button>
                <button
                  type="button"
                  className="btn btn-outline-success"
                  style={{ borderRadius: 12 }}
                  disabled={!telefonoWa}
                  onClick={() => {
                    if (!telefonoWa) return;
                    window.open(`https://wa.me/${telefonoWa}`, "_blank");
                  }}
                >
                  <FaWhatsapp /> WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    });
  }, [conductores, navigate, onAgendar]);

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
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div className="d-flex align-items-center justify-content-between mb-3">
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
                Conductores disponibles
              </h2>
              <small style={{ color: "rgba(226,232,240,0.7)" }}>
                Consulta la información y agenda tu viaje.
              </small>
            </div>
          </div>
        </div>

        {cargando ? (
          <p style={{ color: "#e2e8f0" }}>Cargando conductores...</p>
        ) : conductores.length === 0 ? (
          <div className="alert alert-warning text-center">
            No hay conductores registrados.
          </div>
        ) : (
          <div className="row g-3">{cards}</div>
        )}
      </div>
    </div>
  );
}

export default ListaConductores;
