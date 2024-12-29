import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Audio Streaming App",
        short_name: "Audio App",
        display: "standalone",
        start_url: "/",
        background_color: "#ffffff",
        theme_color: "#000000",
        icons: [
            {
                src: "/icon.png",
                sizes: "192x192",
                type: "image/png",
            },
        ],
        permissions: ["microphone"],
    };
}
