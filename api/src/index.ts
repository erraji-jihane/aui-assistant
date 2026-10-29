import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import healthRouter from "./routes/health";
import jihaneRouter from "./routes/jihane";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// mount routers under /api
app.use("/api", healthRouter);
app.use("/api", jihaneRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});