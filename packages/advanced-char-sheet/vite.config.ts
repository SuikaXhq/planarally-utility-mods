import { resolve } from "path";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { exec } from "child_process";

const deployPlugin = () => ({
    name: 'deploy-plugin',
    closeBundle() {
        exec("node deploy.mjs", (err, stdout, stderr) => {
            if (stdout) console.log(stdout);
            if (stderr) console.error(stderr);
        });
    }
});

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [vue(), deployPlugin()],
    define: {
        "process.env": {},
    },
    build: {
        minify: false,
        lib: {
            entry: resolve(__dirname, "src/main.ts"),
            name: "ExampleMod",
            fileName: "index",
            formats: ["es"],
        },
        rollupOptions: {
            external: ["vue"],
            output: {
                globals: { vue: "Vue" },
                assetFileNames: (assetInfo) => {
                    if (assetInfo.name === 'style.css') return 'index.css';
                    return '[name].[ext]';
                },
            },
        },
    },
});
