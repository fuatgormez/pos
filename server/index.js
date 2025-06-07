const express = require("express");
const cors = require("cors");
const path = require("path");
const apiRoutes = require("./api");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// API routes
app.use("/api", apiRoutes);

// Statik dosyalar için
app.use(express.static(path.join(__dirname, "../build")));

// Diğer tüm istekler için React uygulamasını göster
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../build", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor`);
});
