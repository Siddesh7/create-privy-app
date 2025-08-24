import { execa } from "execa";
import fs from "fs-extra";
import path from "path";
import inquirer from "inquirer";
import type { Ora } from "ora";
import { formatSelectedWallets } from "../utils/wallet-providers";

export async function createViteApp(
  projectName: string,
  spinner: Ora,
  privyAppId: string,
  privyClientId: string,
  selectedWallets: string[]
) {
  // Ask Vite specific questions
  spinner.stop();
  const viteAnswers = await inquirer.prompt([
    {
      type: "list",
      name: "template",
      message: "Which Vite template would you like to use?",
      choices: [
        { name: "React + TypeScript", value: "react-ts" },
        { name: "React + JavaScript", value: "react" },
      ],
      default: "react-ts",
    },
  ]);

  spinner.start("Creating Vite project...");
  // Create Vite app with environment variable to skip prompts
  await execa(
    "npm",
    [
      "create",
      "vite@latest",
      projectName,
      "--",
      "--template",
      viteAnswers.template,
    ],
    {
      stdio: "pipe",
      env: { ...process.env, npm_config_yes: "true" },
    }
  );

  spinner.text = "Installing dependencies...";

  // Install dependencies
  await execa("pnpm", ["install"], {
    cwd: projectName,
    stdio: "pipe",
  });

  // Install Privy dependencies
  await execa("pnpm", ["add", "@privy-io/react-auth"], {
    cwd: projectName,
    stdio: "pipe",
  });

  spinner.text = "Setting up Privy integration...";

  // Create providers.tsx file
  const srcDir = path.join(projectName, "src");
  const providersPath = path.join(srcDir, "providers.tsx");
  const mainPath = path.join(srcDir, "main.tsx");

  // Create providers.tsx file with selected wallets
  const formattedWallets = formatSelectedWallets(selectedWallets);
  const loginMethods =
    selectedWallets.length > 0 ? ["email", ...formattedWallets] : ["email"];

  const providersContent = `"use client";

import { PrivyProvider } from "@privy-io/react-auth";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={import.meta.env.VITE_PRIVY_APP_ID}
      clientId={import.meta.env.VITE_PRIVY_CLIENT_ID}
      config={{
        loginMethodsAndOrder: {
          primary: ${JSON.stringify(loginMethods, null, 10)},
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}`;

  await fs.writeFile(providersPath, providersContent);

  // Create .env file for Vite
  const envContent = `# Privy Configuration
# Get these values from your Privy dashboard: https://dashboard.privy.io
VITE_PRIVY_APP_ID=${privyAppId || "your_privy_app_id_here"}
VITE_PRIVY_CLIENT_ID=${privyClientId || "your_privy_client_id_here"}`;

  await fs.writeFile(path.join(projectName, ".env"), envContent);

  // Create .env.example file
  const envExampleContent = `# Privy Configuration
# Get these values from your Privy dashboard: https://dashboard.privy.io
VITE_PRIVY_APP_ID=your_privy_app_id_here
VITE_PRIVY_CLIENT_ID=your_privy_client_id_here`;

  await fs.writeFile(path.join(projectName, ".env.example"), envExampleContent);

  // Ensure .env is in .gitignore
  const gitignorePath = path.join(projectName, ".gitignore");
  const gitignoreExists = await fs.pathExists(gitignorePath);
  if (gitignoreExists) {
    let gitignoreContent = await fs.readFile(gitignorePath, "utf-8");
    if (!gitignoreContent.includes(".env")) {
      gitignoreContent += "\n# Environment variables\n.env\n.env.local\n";
      await fs.writeFile(gitignorePath, gitignoreContent);
    }
  }

  // Update main.tsx to include Providers
  const mainExists = await fs.pathExists(mainPath);
  if (mainExists) {
    let mainContent = await fs.readFile(mainPath, "utf-8");

    // Add import for Providers
    const importRegex = /import.*from.*['"]\.\/App['"]/;
    const importMatch = mainContent.match(importRegex);

    if (importMatch) {
      mainContent = mainContent.replace(
        importMatch[0],
        `${importMatch[0]}\nimport Providers from './providers'`
      );
    } else {
      // Add after React import
      const reactImportRegex = /import.*React.*from.*['"]react['"]/;
      const reactImportMatch = mainContent.match(reactImportRegex);
      if (reactImportMatch) {
        mainContent = mainContent.replace(
          reactImportMatch[0],
          `${reactImportMatch[0]}\nimport Providers from './providers'`
        );
      } else {
        // Add at the beginning
        mainContent = `import Providers from './providers'\n${mainContent}`;
      }
    }

    // Wrap App with Providers
    mainContent = mainContent.replace(
      /(<App\s*\/>)/,
      "<Providers>$1</Providers>"
    );

    await fs.writeFile(mainPath, mainContent);
  }

  spinner.text = "Setting up your first page...";

  // Update App.tsx with Privy authentication example
  const appPath = path.join(srcDir, "App.tsx");
  const appExists = await fs.pathExists(appPath);
  if (appExists) {
    const appContent = `import { usePrivy } from "@privy-io/react-auth";
import "./App.css";

// Visit /src/providers.tsx to view and update your Privy config
// Your app is now fully integrated with Privy!

function App() {
  const { ready, authenticated, login, logout } = usePrivy();
  
  if (!ready) {
    return (
      <div className="container">
        <h1 className="title">Vite + Privy App</h1>
        <div className="card">
          <div className="loading">Loading...</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container">
      <h1 className="title">Vite + Privy App</h1>
      <div className="card">
        <p className="text">
          {authenticated ? "You're logged in! 🎉" : "Please log in to continue"}
        </p>

        {authenticated ? (
          <button onClick={logout} className="button logout-button">
            Logout
          </button>
        ) : (
          <button onClick={login} className="button login-button">
            Login with Privy
          </button>
        )}
      </div>
                   <div className="instructions">
               <p>
                 📁 Visit <code>/src/providers.tsx</code> to view and update your Privy config
               </p>
               <p>
                 🎉 Your app is now fully integrated with Privy! You can now provision
                 embedded wallets, smart wallets for your users and much more.
               </p>${
                 selectedWallets.length > 0
                   ? `
               <p className="warning">
                 ⚠️ Important: You have ${selectedWallets.length} global wallet(s) configured.
                 Enable them in your{" "}
                 <a
                   href="https://dashboard.privy.io/apps?tab=integrations&page=ecosystem"
                   target="_blank"
                   rel="noopener noreferrer"
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
                 >
                   https://docs.privy.io/
                 </a>
               </p>
             </div>
    </div>
  );
}

export default App;`;

    await fs.writeFile(appPath, appContent);
  }

  // Update App.css with modern styling
  const appCssPath = path.join(srcDir, "App.css");
  const appCssContent = `/* Privy-inspired design */
.container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100vw;
  justify-content: center;
  background-color: #fefefe;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  padding: 1rem;
}

.card {
  background-color: white;
  padding: 3rem 2rem;
  border-radius: 16px;
  border: 1px solid #f0f0f0;
  text-align: center;
  max-width: 420px;
  width: 100%;
}

.title {
  font-size: 2rem;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 0.5rem;
}

.text {
  font-size: 1rem;
  color: #666666;
  margin-bottom: 2.5rem;
  line-height: 1.5;
}

.button {
  padding: 0.875rem 2rem;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  max-width: 200px;
}

.login-button {
  background-color: #1a1a1a;
  color: white;
  border: none;
}

.login-button:hover {
  background-color: #333333;
  transform: translateY(-1px);
}

.logout-button {
  background-color: #f5f5f5;
  color: #333333;
  border: none;
}

.logout-button:hover {
  background-color: #e8e8e8;
}

.loading {
  font-size: 1rem;
  color: #666666;
}

.instructions {
  margin-top: 2rem;
  padding: 1.5rem;
  background-color: #f8f9fa;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #666666;
  text-align: center;
}

.instructions p {
  margin: 0.5rem 0;
}

.instructions code {
  background-color: #e9ecef;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.instructions a {
  color: #1a1a1a;
  text-decoration: underline;
}

.warning {
  color: #d97706;
  font-weight: 500;
}

/* Reset and base styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #fefefe;
}`;

  await fs.writeFile(appCssPath, appCssContent);

  spinner.text = "✨ Finalizing your Privy-powered Vite app...";
}
