const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();

// Kategorileri kaydetme endpoint'i
router.post("/save-categories", (req, res) => {
  try {
    const categories = req.body;
    const filePath = path.join(__dirname, "../src/data/kategoriler.json");

    fs.writeFileSync(filePath, JSON.stringify(categories, null, 2));
    res
      .status(200)
      .json({ success: true, message: "Kategoriler başarıyla kaydedildi" });
  } catch (error) {
    console.error("Kategoriler kaydedilirken hata oluştu:", error);
    res
      .status(500)
      .json({ success: false, message: "Kategoriler kaydedilemedi" });
  }
});

// Ürünleri kaydetme endpoint'i
router.post("/save-products", (req, res) => {
  try {
    const products = req.body;
    const filePath = path.join(__dirname, "../src/data/urunler.json");

    fs.writeFileSync(filePath, JSON.stringify(products, null, 2));
    res
      .status(200)
      .json({ success: true, message: "Ürünler başarıyla kaydedildi" });
  } catch (error) {
    console.error("Ürünler kaydedilirken hata oluştu:", error);
    res.status(500).json({ success: false, message: "Ürünler kaydedilemedi" });
  }
});

// Masaları kaydetme endpoint'i
router.post("/save-tables", (req, res) => {
  try {
    const tables = req.body;
    const filePath = path.join(__dirname, "../src/data/masalar.json");

    fs.writeFileSync(filePath, JSON.stringify(tables, null, 2));
    res
      .status(200)
      .json({ success: true, message: "Masalar başarıyla kaydedildi" });
  } catch (error) {
    console.error("Masalar kaydedilirken hata oluştu:", error);
    res.status(500).json({ success: false, message: "Masalar kaydedilemedi" });
  }
});

module.exports = router;
