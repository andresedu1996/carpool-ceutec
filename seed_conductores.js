import admin from "firebase-admin";
import fs from "fs";

const serviceAccount = JSON.parse(
  fs.readFileSync("./serviceAccountKey.json", "utf8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const conductores = [
  {
    nombre: "Carlos Martínez",
    colonia: "Los Álamos",
    pasajeros: 3,
    telefono: "+504 9770-1122",
    precio: 25,
    horario: "6:30 AM",
    vehiculo: "Toyota Corolla 2015",
    placa: "HBD-1234",
    foto: "default.png",
  },
  {
    nombre: "Ana López",
    colonia: "Altamira",
    pasajeros: 2,
    telefono: "+504 9483-2201",
    precio: 20,
    horario: "7:00 AM",
    vehiculo: "Kia Rio 2018",
    placa: "PDG-8899",
    foto: "default.png",
  },
  {
    nombre: "Jorge Hernández",
    colonia: "La Tara",
    pasajeros: 4,
    telefono: "+504 9911-0044",
    precio: 30,
    horario: "6:45 AM",
    vehiculo: "Honda CR-V 2014",
    placa: "HFA-2281",
    foto: "default.png",
  },
];

async function seed() {
  try {
    for (const c of conductores) {
      await db.collection("conductores").add(c);
      console.log("✔ Conductor agregado:", c.nombre);
    }
    console.log("🎉 Seed completado.");
  } catch (err) {
    console.error("Error:", err);
  }
}

seed();
