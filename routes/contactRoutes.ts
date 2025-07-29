import express from "express"
import {
  create_contact,
  delete_contact,
  delete_multiple_contacts,
  get_all_contacts,
  get_contact_by_id,
  update_contact,
  import_contacts,
  count_of_contact
} from "../controllers/contactController";
import authMiddleware from "../authMiddleware";

const router = express.Router();

router.post("/contacts", authMiddleware, create_contact);
router.get("/contacts", authMiddleware, get_all_contacts);
router.get("/contacts/count", authMiddleware, count_of_contact);
router.get("/contacts/:id", authMiddleware, get_contact_by_id);
router.delete("/contacts/:id", authMiddleware, delete_contact);
router.put("/contacts/:id", authMiddleware, update_contact);
router.delete("/contacts", authMiddleware, delete_multiple_contacts);
router.post("/contacts/import", authMiddleware, import_contacts);

export default router;
