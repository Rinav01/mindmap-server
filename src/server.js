const express = require("express");
const cors = require("cors");
require("dotenv").config();
require("./config/db");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/mindmaps", require("./routes/mindmapRoutes"));
app.use("/api", require("./routes/versionRoutes"));

app.listen(process.env.PORT || 5000, () => {
  console.log("Server running");
});
