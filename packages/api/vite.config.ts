import { resolve } from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

// https://vitejs.dev/config/
export default defineConfig({
    optimizeDeps: {
        exclude: ["vue-demi"],
    },
    plugins: [
        dts({
            entryRoot: "./lib/",
        }),
    ],
    build: {
        lib: {
            entry: resolve(__dirname, "lib/main.ts"),
            fileName: (format) => `pa-api.${format}.js`,
            name: "pa-api",
        },
    },
});
