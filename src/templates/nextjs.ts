import { execa } from "execa";
import fs from "fs-extra";
import path from "path";
import inquirer from "inquirer";
import type { Ora } from "ora";
import { formatSelectedWallets } from "../utils/wallet-providers";

export async function createNextJsApp(
  projectName: string,
  spinner: Ora,
  privyAppId: string,
  privyClientId: string,
  selectedWallets: string[],
  useWagmi: boolean = false,
  useGlobalWallets: boolean = false,
  packageManager: {
    name: string;
    command: string;
    createCommand: string;
    installCommand: string;
    runCommand: string;
  }
) {
  // Ask Next.js specific questions (excluding TypeScript and App Router)
  spinner.stop();
  const nextjsAnswers = await inquirer.prompt([
    {
      type: "confirm",
      name: "eslint",
      message: "Would you like to use ESLint?",
      default: true,
    },
    {
      type: "confirm",
      name: "tailwind",
      message: "Would you like to use Tailwind CSS?",
      default: true,
    },
    {
      type: "confirm",
      name: "srcDir",
      message: "Would you like to use `src/` directory?",
      default: false,
    },
  ]);

  // Build create-next-app command with TypeScript and App Router locked
  const createNextAppArgs = [
    "create-next-app@latest",
    projectName,
    "--yes", // Skip confirmation prompts
    "--typescript", // Always use TypeScript (mandatory)
    "--app", // Always use App Router (mandatory)
    "--import-alias",
    "@/*",
  ];

  if (nextjsAnswers.eslint) createNextAppArgs.push("--eslint");
  else createNextAppArgs.push("--no-eslint");

  if (nextjsAnswers.tailwind) createNextAppArgs.push("--tailwind");
  else createNextAppArgs.push("--no-tailwind");

  if (nextjsAnswers.srcDir) createNextAppArgs.push("--src-dir");
  else createNextAppArgs.push("--no-src-dir");

  spinner.start("Creating Next.js project...");
  // Create Next.js app using the detected package manager
  if (packageManager.name === "npm") {
    await execa("npx", createNextAppArgs, { stdio: "pipe" });
  } else if (packageManager.name === "pnpm") {
    const pnpmArgs = [
      "create",
      "next-app@latest",
      ...createNextAppArgs.slice(1),
    ];
    await execa("pnpm", pnpmArgs, { stdio: "pipe" });
  } else if (packageManager.name === "yarn") {
    const yarnArgs = ["create", "next-app", ...createNextAppArgs.slice(1)];
    await execa("yarn", yarnArgs, { stdio: "pipe" });
  } else if (packageManager.name === "bun") {
    await execa("bunx", createNextAppArgs, { stdio: "pipe" });
  }

  spinner.text = "Installing dependencies...";
  // Install Privy dependencies
  const dependencies = ["@privy-io/react-auth"];

  // Add Wagmi dependencies if flag is enabled
  if (useWagmi) {
    dependencies.push("@privy-io/wagmi", "@tanstack/react-query", "wagmi");
  }

  // Install using the detected package manager
  const addCmd =
    packageManager.name === "npm"
      ? "install"
      : packageManager.name === "yarn"
      ? "add"
      : "add";

  await execa(packageManager.command, [addCmd, ...dependencies], {
    cwd: projectName,
    stdio: "pipe",
  });

  spinner.text = "Setting up Privy integration...";

  // Determine the correct paths (TypeScript mandatory, src dir dynamic)
  const appDir = nextjsAnswers.srcDir ? "src/app" : "app";
  const isTypeScript = true; // Always TypeScript
  const providersDir = path.join(projectName, appDir, "providers");
  const layoutPath = path.join(projectName, appDir, "layout.tsx");

  // Create providers directory
  await fs.ensureDir(providersDir);

  // Create providers file
  const providersFileName = "providers.tsx";
  const formattedWallets = formatSelectedWallets(selectedWallets);
  const loginMethods =
    selectedWallets.length > 0 ? ["email", ...formattedWallets] : ["email"];

  const providersContent = useWagmi
    ? `"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig } from "@privy-io/wagmi";
import { mainnet } from "wagmi/chains";
import { http } from "wagmi";

const queryClient = new QueryClient();

const wagmiConfig = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http(),
  },
});

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      clientId={process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID!}
      config={{${
        useGlobalWallets
          ? `
        loginMethodsAndOrder: {
          primary: ${JSON.stringify(loginMethods, null, 10)},
        },`
          : ""
      }
        embeddedWallets: {
          createOnLogin: "users-without-wallets",
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}`
    : `"use client";

import { PrivyProvider } from "@privy-io/react-auth";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      clientId={process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID!}
      config={{${
        useGlobalWallets
          ? `
        loginMethodsAndOrder: {
          primary: ${JSON.stringify(loginMethods, null, 10)},
        },`
          : ""
      }
        embeddedWallets: {
          createOnLogin: "users-without-wallets",
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}`;

  await fs.writeFile(
    path.join(providersDir, providersFileName),
    providersContent
  );

  // Create .env.local file for Next.js
  const envContent = `# Privy Configuration
# Get these values from your Privy dashboard: https://dashboard.privy.io
NEXT_PUBLIC_PRIVY_APP_ID=${privyAppId || "your_privy_app_id_here"}
NEXT_PUBLIC_PRIVY_CLIENT_ID=${privyClientId || "your_privy_client_id_here"}`;

  await fs.writeFile(path.join(projectName, ".env.local"), envContent);

  // Create .env.example file
  const envExampleContent = `# Privy Configuration
# Get these values from your Privy dashboard: https://dashboard.privy.io
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id_here
NEXT_PUBLIC_PRIVY_CLIENT_ID=your_privy_client_id_here`;

  await fs.writeFile(path.join(projectName, ".env.example"), envExampleContent);

  // Ensure .env.local is in .gitignore (Next.js should already include this, but let's be safe)
  const gitignorePath = path.join(projectName, ".gitignore");
  const gitignoreExists = await fs.pathExists(gitignorePath);
  if (gitignoreExists) {
    let gitignoreContent = await fs.readFile(gitignorePath, "utf-8");
    if (!gitignoreContent.includes(".env*.local")) {
      gitignoreContent += "\n# Environment variables\n.env*.local\n";
      await fs.writeFile(gitignorePath, gitignoreContent);
    }
  }

  // Update layout.tsx to include Providers
  const layoutExists = await fs.pathExists(layoutPath);
  if (layoutExists) {
    let layoutContent = await fs.readFile(layoutPath, "utf-8");

    // Add import for Providers
    const importRegex = /import.*from.*['"]\./;
    const importMatch = layoutContent.match(importRegex);

    if (importMatch) {
      layoutContent = layoutContent.replace(
        importMatch[0],
        `${importMatch[0]}\nimport Providers from './providers/providers'`
      );
    } else {
      // If no relative imports found, add after the last import
      const lastImportRegex = /import.*from.*['"][^.]/g;
      const imports = layoutContent.match(lastImportRegex);
      if (imports && imports.length > 0) {
        const lastImport = imports[imports.length - 1];
        layoutContent = layoutContent.replace(
          lastImport,
          `${lastImport}\nimport Providers from './providers/providers'`
        );
      } else {
        // Add at the beginning if no imports found
        layoutContent = `import Providers from './providers/providers'\n${layoutContent}`;
      }
    }

    // Wrap children with Providers
    layoutContent = layoutContent.replace(
      /(\s*{children}\s*)/,
      "\n      <Providers>$1</Providers>"
    );

    await fs.writeFile(layoutPath, layoutContent);
  }

  spinner.text = "Setting up your first page...";

  // Update page file with Privy authentication example
  const pagePath = path.join(projectName, appDir, "page.tsx");
  const pageExists = await fs.pathExists(pagePath);
  if (pageExists) {
    const pageContent = `"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
${useWagmi ? `import { useAccount } from "wagmi";` : ""}

export default function Home() {
  const { ready, authenticated, login, logout } = usePrivy();
  ${
    useWagmi
      ? `const { address } = useAccount();`
      : `const { wallets } = useWallets();`
  }
  if (!ready) {
    return (
      <div style={containerStyle}>
        <h1 style={titleStyle}>Next.js + Privy App</h1>
        <div style={cardStyle}>
          <div style={loadingStyle}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <h1 style={titleStyle}>Next.js + Privy App</h1>
      <div style={cardStyle}>
        <p style={textStyle}>
          {authenticated ? "You're logged in! 🎉" : "Please log in to continue"}
        </p>

        {authenticated ? (
          <>
            <button onClick={logout} style={logoutButtonStyle}>
              Logout
            </button>
            ${
              useWagmi
                ? `
            <div style={walletInfoStyle}>
              <label style={walletLabelStyle}>Wallet Address</label>
              <p style={walletAddressStyle}>{address}</p>
            </div>`
                : `
            <div style={walletInfoStyle}>
              <label style={walletLabelStyle}>Wallet Address</label>
              <p style={walletAddressStyle}>{wallets[0]?.address}</p>
            </div>`
            }
          </>
        ) : (
          <button onClick={login} style={loginButtonStyle}>
            Login with Privy
          </button>
        )}
      </div>
                   <div style={instructionsStyle}>
               <p>
                 📁 Visit <code>/${appDir}/providers/providers.tsx</code> to view and update
                 your Privy config
               </p>
               <p>
                 🎉 Your app is now fully integrated with Privy! You can now provision
                 embedded wallets, smart wallets for your users and much more.
               </p>${
                 useWagmi
                   ? `
               <p>
                 ⚡ Your app is fully integrated with Wagmi! You can simply use Wagmi hooks to interact with the embedded wallets provisioned by Privy.
               </p>`
                   : ""
               }${
      selectedWallets.length > 0
        ? `
               <p style={warningStyle}>
                 ⚠️ Important: You have ${selectedWallets.length} global wallet(s) configured.
                 Enable them in your{" "}
                 <a
                   href="https://dashboard.privy.io/apps?tab=integrations&page=ecosystem"
                   target="_blank"
                   rel="noopener noreferrer"
                   style={linkStyle}
                 >
                   Privy Dashboard
                 </a>
               </p>`
        : ""
    }
               <p>
                 📖 Read more in docs:{" "}
                 <a
                   href="https://docs.privy.io/"
                   target="_blank"
                   rel="noopener noreferrer"
                   style={linkStyle}
                 >
                   https://docs.privy.io/
                 </a>
               </p>
             </div>
    </div>
  );
}

const containerStyle = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#fefefe",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  padding: "1rem",
};

const cardStyle = {
  backgroundColor: "white",
  padding: "3rem 2rem",
  borderRadius: "16px",
  border: "1px solid #f0f0f0",
  textAlign: "center" as const,
  maxWidth: "420px",
  width: "100%",
};

const titleStyle = {
  fontSize: "2rem",
  fontWeight: "600",
  color: "#1a1a1a",
  marginBottom: "0.5rem",
};

const textStyle = {
  fontSize: "1rem",
  color: "#666666",
  marginBottom: "2.5rem",
  lineHeight: "1.5",
};

const loginButtonStyle = {
  backgroundColor: "#1a1a1a",
  color: "white",
  border: "none",
  padding: "0.875rem 2rem",
  borderRadius: "12px",
  fontSize: "1rem",
  fontWeight: "500",
  cursor: "pointer",
  transition: "all 0.2s ease",
  width: "100%",
  maxWidth: "200px",
};

const logoutButtonStyle = {
  backgroundColor: "#f5f5f5",
  color: "#333333",
  border: "none",
  padding: "0.875rem 2rem",
  borderRadius: "12px",
  fontSize: "1rem",
  fontWeight: "500",
  cursor: "pointer",
  transition: "all 0.2s ease",
  width: "100%",
  maxWidth: "200px",
};

const loadingStyle = {
  fontSize: "1rem",
  color: "#666666",
};

const instructionsStyle = {
  marginTop: "2rem",
  padding: "1.5rem",
  backgroundColor: "#f8f9fa",
  borderRadius: "8px",
  fontSize: "0.875rem",
  color: "#666666",
  textAlign: "center" as const,
};

const linkStyle = {
  color: "#1a1a1a",
  textDecoration: "underline",
};

const warningStyle = {
  color: "#d97706",
  fontWeight: "500",
};

const walletInfoStyle = {
  marginTop: "1.5rem",
  padding: "1rem",
  backgroundColor: "#f8f9fa",
  borderRadius: "8px",
  border: "1px solid #e9ecef",
};

const walletLabelStyle = {
  display: "block",
  fontSize: "0.875rem",
  fontWeight: "500",
  color: "#495057",
  marginBottom: "0.5rem",
  textTransform: "uppercase" as const,
  letterSpacing: "0.025em",
};

const walletAddressStyle = {
  fontSize: "0.875rem",
  color: "#1a1a1a",
  fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
  backgroundColor: "white",
  padding: "0.75rem",
  borderRadius: "6px",
  border: "1px solid #dee2e6",
  wordBreak: "break-all" as const,
  margin: "0",
  lineHeight: "1.4",
};`;

    await fs.writeFile(pagePath, pageContent);
  }

  spinner.text = "✨ Finalizing your Privy-powered Next.js app...";
}
