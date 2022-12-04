const http = require("http");
const express = require("express");
const cookieParser = require("cookie-parser");

const router = require("./router");

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use("/", router);

app.use((req, res, next) => {
    const err = new Error("Not Found");
    err.status = 404;
    next(err);
});

app.use((err, req, res, next) => {
    const status = err.status || 500;
    res.status(status).send({ message: err.message });
});

server.listen(8080, () => {
    console.log("Server started on port http://127.0.0.1:8080");
});


module.exports = app;