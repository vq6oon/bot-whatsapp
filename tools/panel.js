// Browser-based bot.js editor. Requires panel/index.html.
// Start with: npm run panel
import express from "express";
import fs from "fs";
import path from "path";
import bodyParser from "body-parser";

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use("/panel", express.static("panel"));

app.get("/code", (req, res) => {
  res.sendFile(path.resolve("panel/index.html"));
});

app.get("/code/file", (req, res) => {
  fs.readFile(path.resolve("bot.js"), "utf8", (err, data) => {
    if (err) return res.status(500).send("Failed to read file");
    res.send(data);
  });
});

app.post("/code/save", (req, res) => {
  fs.writeFile(path.resolve("bot.js"), req.body.code, (err) => {
    if (err) return res.status(500).send("Failed to save file");
    res.send("File saved!");
  });
});

app.listen(PORT, () => {
  console.log(`Panel: http://localhost:${PORT}/code`);
});
