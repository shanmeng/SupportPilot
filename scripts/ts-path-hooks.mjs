// Resolve hooks so Node's built-in TypeScript support can run scripts that use the app's
// `@/` path alias and extensionless imports (as the Next.js bundler allows). No dependencies.
import { existsSync, statSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const srcDir = fileURLToPath(new URL("../src/", import.meta.url));

function withTsExtension(path) {
  for (const candidate of [path, `${path}.ts`, `${path}.tsx`, `${path}/index.ts`]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const file = withTsExtension(srcDir + specifier.slice(2));
      if (file) return nextResolve(pathToFileURL(file).href, context);
    }
    const parentUrl = context.parentURL;
    if ((specifier.startsWith("./") || specifier.startsWith("../")) && parentUrl?.startsWith("file:")) {
      if (!fileURLToPath(parentUrl).includes("/node_modules/")) {
        const file = withTsExtension(fileURLToPath(new URL(specifier, parentUrl)));
        if (file) return nextResolve(pathToFileURL(file).href, context);
      }
    }
    return nextResolve(specifier, context);
  },
});
