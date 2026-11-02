import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import healthRouter from "./routes/health";
import jihaneRouter from "./routes/jihane";
import uploadRouter from "./routes/upload";
import documentsRouter from "./routes/documents";


dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api", healthRouter);
app.use("/api", jihaneRouter);
app.use("/api", uploadRouter);
app.use("/api", documentsRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});