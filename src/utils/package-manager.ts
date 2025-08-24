/**
 * Detects the package manager used to invoke the CLI
 * Based on the npm_execpath environment variable and user agent
 */
export function detectPackageManager(): {
  name: string;
  command: string;
  createCommand: string;
  installCommand: string;
  runCommand: string;
} {
  // Check npm_config_user_agent first (most reliable)
  const userAgent = process.env.npm_config_user_agent || "";

  // Check npm_execpath as fallback
  const execPath = process.env.npm_execpath || "";

  if (userAgent.includes("pnpm")) {
    return {
      name: "pnpm",
      command: "pnpm",
      createCommand: "pnpm create",
      installCommand: "pnpm add",
      runCommand: "pnpm",
    };
  }

  if (userAgent.includes("yarn")) {
    return {
      name: "yarn",
      command: "yarn",
      createCommand: "yarn create",
      installCommand: "yarn add",
      runCommand: "yarn",
    };
  }

  if (userAgent.includes("bun")) {
    return {
      name: "bun",
      command: "bun",
      createCommand: "bun create",
      installCommand: "bun add",
      runCommand: "bun",
    };
  }

  // Check execpath for additional detection
  if (execPath.includes("pnpm")) {
    return {
      name: "pnpm",
      command: "pnpm",
      createCommand: "pnpm create",
      installCommand: "pnpm add",
      runCommand: "pnpm",
    };
  }

  if (execPath.includes("yarn")) {
    return {
      name: "yarn",
      command: "yarn",
      createCommand: "yarn create",
      installCommand: "yarn add",
      runCommand: "yarn",
    };
  }

  // Default to npm
  return {
    name: "npm",
    command: "npm",
    createCommand: "npm create",
    installCommand: "npm install",
    runCommand: "npm run",
  };
}
