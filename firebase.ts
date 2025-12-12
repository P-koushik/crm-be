import admin from "firebase-admin";
import dotenv from "dotenv"

dotenv.config()

admin.initializeApp({
  credential: admin.credential.cert(process.env.SERVICE_ACCOUNT_KEY_PATH as admin.ServiceAccount)
});

export default admin;
