import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  reactCompiler: true,

  images: {
    unoptimized: true,
  },

  // REQUIRED for react-konva. onnxruntime-node is a Node backend that
  // transformers.js references and must never be bundled for the browser.
  webpack: (config, { webpack }) => {
    config.externals = [...(config.externals || []), { canvas: "canvas" }];
    config.resolve.alias = {
      ...config.resolve.alias,
      "onnxruntime-node$": false,
    };
    config.plugins.push({
      apply(compiler: { hooks: { compilation: { tap: Function } } }) {
        compiler.hooks.compilation.tap("SameOriginVendors", (compilation: {
          hooks: { processAssets: { tap: Function } };
          getAssets: () => Array<{ name: string; source: { source: () => string | Buffer } }>;
          updateAsset: (name: string, source: unknown) => void;
        }) => {
          compilation.hooks.processAssets.tap(
            {
              name: "SameOriginVendors",
              stage: webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE,
            },
            () => {
              for (const asset of compilation.getAssets()) {
                if (!asset.name.endsWith(".js")) continue;
                const original = asset.source.source().toString();
                if (!original.includes("huggingface.co") && !original.includes("unpkg.com")) continue;
                compilation.updateAsset(
                  asset.name,
                  new webpack.sources.RawSource(
                    original.replaceAll("huggingface.co", "").replaceAll("unpkg.com", ""),
                  ),
                );
              }
            },
          );
        });
      },
    });
    return config;
  },

  turbopack: {},
};

export default withNextIntl(nextConfig);
