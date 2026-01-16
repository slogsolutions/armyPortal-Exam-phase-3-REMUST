const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/admin", require("./routes/admin.routes"));
app.use("/api/candidate", require("./routes/candidate.routes"));
// app.use("/api/exam", require("./routes/exam.routes"));
// app.use("/api/practical", require("./routes/practical.routes"));
// app.use("/api/result", require("./routes/result.routes"));

module.exports = app;
