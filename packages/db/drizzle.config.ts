import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({
	path: ".env",
});

const connectionString =
	process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (!connectionString) {
	throw new Error(
		"DATABASE_URL_UNPOOLED or DATABASE_URL must be set to run Drizzle Kit.",
	);
}

export default defineConfig({
	schema: "./src/schema/*.ts",
	out: "./src/migrations",
	dialect: "postgresql",
	dbCredentials: {
		url: connectionString,
	},
});
