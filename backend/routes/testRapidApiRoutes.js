import express from "express";
import testRapidApi from "../controllers/testRapidApiController.js";

const router = express.Router();

router.get("/", testRapidApi);

export default router;
