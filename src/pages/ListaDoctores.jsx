import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

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
      <rect width='128' height='128' fill='#222'/>
      <circle cx='64' cy='46' r='22' fill='#fff'/>
      <rect x='32' y='80' width='64' height='35' rx='6' fill='#fff'/>
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

function ListaConductores() {
  const [conductores, setConductores] = useState([]);

  useEffect(() => {
    (async () => {
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
    })();
  }, []);

  return (
    <div className="container-fluid min-vh-100 d-flex flex-column">
      <h2 className="text-center my-4">Conductores Disponibles</h2>

      <div className="row flex-grow-1">
        {conductores.map((c) => (
          <div
            key={c.id}
            className="col-12 col-sm-6 col-md-4 col-lg-3 d-flex align-items-stretch"
          >
            <div className="card bg-dark text-light mb-4 shadow-sm w-100">
              <div className="ratio ratio-4x3 bg-black">
                <img
                  src={getImage(c)}
                  alt={c.nombre}
                  className="w-100 h-100"
                  style={{ objectFit: "contain" }}
                  onError={(e) => (e.currentTarget.src = defaultAvatar)}
                />
              </div>

              <div className="card-body d-flex flex-column">
                <h5 className="card-title mb-2">{c.nombre}</h5>

                <p className="card-text flex-grow-1">
                  <strong>Colonia:</strong> {c.colonia} <br />
                  <strong>Teléfono:</strong> {c.telefono} <br />
                  <strong>Pasajeros:</strong> {c.pasajeros} <br />
                  <strong>Precio:</strong> L {c.precio} <br />
                  <strong>Horario salida:</strong> {c.horario} <br />
                  <strong>Placa:</strong> {c.placa} <br />
                  <strong>Vehículo:</strong> {c.vehiculo}
                </p>

                <button className="btn btn-primary mt-auto">
                  Agendar Viaje
                </button>
              </div>
            </div>
          </div>
        ))}

        {conductores.length === 0 && (
          <div className="col-12">
            <div className="alert alert-warning text-center">
              No hay conductores registrados.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ListaConductores;
