const express = require("express");
const fs = require("fs");
const csv = require("csv-parser");
const NodeCache = require("node-cache");

const router = express.Router();
const cache = new NodeCache({ stdTTL: 0, checkperiod: 0 });

const verifyCache = (req, res, next) => {
    try {
        const { ip } = req.params;
        if (cache.has(ip)) {
            return res.status(200).json(cache.get(ip));
        }
        return next();
    } catch (err) {
        throw new Error(err);
    }
}

router.get("/", async(req, res) => {
	let ip =
		req.headers["x-forwarded-for"] ||
		req.connection.remoteAddress ||
		req.socket.remoteAddress ||
		req.connection.socket.remoteAddress;
	if (ip.substr(0, 7) == "::ffff:") ip = ip.substr(7);

	res.send({ message: "This is owned by RestoreCord.com", usage: `/ip/${ip}` });
});

router.get("/ip", async(req, res) => {
	// get ip from all headers and make sure its ipv4 then redirect to /ip/:ip check if its a valid ipv4
	let ip =
		req.headers["x-forwarded-for"] ||
		req.connection.remoteAddress ||
		req.socket.remoteAddress ||
		req.connection.socket.remoteAddress;
	if (ip.substr(0, 7) == "::ffff:") ip = ip.substr(7);
	res.redirect(`/ip/${ip}`);
});

router.get("/ip/:ip", verifyCache, async(req, res) => {
	let ip = req.params.ip;
	if (!ip.match(/^(\d{1,3}\.){3}\d{1,3}$/)) return res.status(400).send({ success: false, message: "Invalid IP" });

    let firstNum = ip.split(".")[0];
    let range_start = 0;
    let range_end = 0;
    let AS_number = 0;
    let country_code = "";
    let AS_description = "";

    fs.createReadStream(`db/${firstNum}.csv`)
        .pipe(csv())
        .on("data", (row) => {
            if (IPtoNum(ip) >= IPtoNum(row.range_start) && IPtoNum(ip) <= IPtoNum(row.range_end)) {
                range_start = row.range_start;
                range_end = row.range_end;
                AS_number = row.AS_number;
                country_code = row.country_code;
                AS_description = row.AS_description;
            }
        })
        .on("end", () => {
            if (range_start == 0 && range_end == 0) {
                res.send({
                    success: false,
                    message: "IP not found",
                });
            } else {
                const data = {
                    success: true,
                    ip: ip,
                    range_start: range_start,
                    range_end: range_end,
                    AS_number: AS_number,
                    country_code: country_code,
                    AS_description: AS_description,
                };
                cache.set(ip, data);
                res.send(data);
            }
        }
    );
});

function IPtoNum(ip) {
	return Number(ip.split(".").map((d) => ("000" + d).substr(-3)).join(""));
}



module.exports = router;
