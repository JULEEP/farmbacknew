import admin from "firebase-admin";
import fs from "fs";
import path from "path";

const serviceAccount = JSON.parse(
  fs.readFileSync(new URL("./firebase-service-account.json", import.meta.url))
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;