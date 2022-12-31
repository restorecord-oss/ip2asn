import { Hono } from "hono";
import { prettyJSON } from "hono/pretty-json";
import csv from "csv-parser";
import NodeCache from "node-cache";
import axios from "axios";

const cache = new NodeCache({ stdTTL: 0, checkperiod: 0 });

const verifyCache = async ({ c, next }: any) => {
	try {
		const ip = c.req.param("ip");
		if (cache.has(ip)) {
			// return res.status(200).json(cache.get(ip));
			return c.json(cache.get(ip));
		}
		await next();
	} catch (err: any) {
		throw new Error(err);
	}
};

const app = new Hono();
app.get("/", (c) => {
	let ip =
		c.req.headers.get("x-forwarded-for") ||
		c.req.headers.get("x-real-ip") ||
		c.req.headers.get("x-client-ip") ||
		c.req.headers.get("x-cluster-client-ip") ||
		c.req.headers.get("x-forwarded");
	if (ip?.substr(0, 7) == "::ffff:") ip = ip?.substr(7);

	return c.json({
		message: "This is owned by restorecord.com",
		use: `/ip/${ip}`,
	});
});

app.use("*", prettyJSON());
app.notFound((c) => c.json({ message: "Not Found", success: false }, 404));

app.get("/ip", (c) => {
	return c.redirect("/ip/");
});

app.get("/ip/", (c) => {
	let ip =
		c.req.headers.get("x-forwarded-for") ||
		c.req.headers.get("x-real-ip") ||
		c.req.headers.get("x-client-ip") ||
		c.req.headers.get("x-cluster-client-ip") ||
		c.req.headers.get("x-forwarded");
	if (ip?.substr(0, 7) == "::ffff:") ip = ip?.substr(7);
	return c.redirect(`/ip/${ip}`);
});

app.get("/ip/:ip", (c) => {
	let ip = c.req.param("ip");
	if (!ip.match(/^(\d{1,3}\.){3}\d{1,3}$/))
		return c.json({ success: false, message: "Invalid IP" }, 400);

	let firstNum = ip.split(".")[0];
	let range_start = 0;
	let range_end = 0;
	let AS_number = 0;
	let country_code = "";
	let AS_description = "";

	// check if https://cdn.restorecord.com/asn/${firstNum}.csv exists if not return error
	if (!axios.get(`https://cdn.restorecord.com/asn/${firstNum}.csv`)) {
		return c.json({ success: false, message: "Invalid IP" }, 400);
	}

	// fs.createReadStream(`db/${firstNum}.csv`)
	// 	.pipe(csv())
	// 	.on("data", (row) => {
	// 		if (
	// 			IPtoNum(ip) >= IPtoNum(row.range_start) &&
	// 			IPtoNum(ip) <= IPtoNum(row.range_end)
	// 		) {
	// 			range_start = row.range_start;
	// 			range_end = row.range_end;
	// 			AS_number = row.AS_number;
	// 			country_code = row.country_code;
	// 			AS_description = row.AS_description;
	// 		}
	// 	})
	// 	.on("end", () => {
	// 		if (range_start == 0 && range_end == 0) {
	// 			return c.json(
	// 				{
	// 					success: false,
	// 					message: "IP not found",
	// 				},
	// 				404
	// 			);
	// 		} else {
	// 			const data = {
	// 				success: true,
	// 				ip: ip,
	// 				range_start: range_start,
	// 				range_end: range_end,
	// 				AS_number: AS_number,
	// 				country_code: country_code,
	// 				AS_description: AS_description,
	// 			};
	// 			cache.set(ip, data);
	// 			return c.json(data);
	// 		}
	// 	});

	// convert to https://cdn.restorecord.com/asn/${firstNum}.csv
	axios
		.get(`https://cdn.restorecord.com/asn/${firstNum}.csv`)
		.then((res) => {
			res.data.forEach((row: any) => {
				if (
					IPtoNum(ip) >= IPtoNum(row.range_start) &&
					IPtoNum(ip) <= IPtoNum(row.range_end)
				) {
					range_start = row.range_start;
					range_end = row.range_end;
					AS_number = row.AS_number;
					country_code = row.country_code;
					AS_description = row.AS_description;
				}
			});
			if (range_start == 0 && range_end == 0) {
				return c.json({ success: false, message: "IP not found" }, 404);
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
				return c.json(data);
			}
		})
		.catch((err) => {
			console.error(err);
			return c.json({ success: false, message: "Invalid IP" }, 400);
		});

	return c.json({ success: false, message: "Invalid IP" }, 400);
});

function IPtoNum(ip: any) {
	return Number(
		ip
			.split(".")
			.map((d: any) => ("000" + d).substr(-3))
			.join("")
	);
}

export default app;
